import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { lat, lon, altitude, velocity, heading, callsign } = await request.json();

    if (lat === undefined || lon === undefined || altitude === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required tracking parameters (lat, lon, altitude)" },
        { status: 400 }
      );
    }

    const openWeatherKey = process.env.OPENWEATHER_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!openWeatherKey || !groqKey) {
      return NextResponse.json(
        { success: false, error: "API credentials for weather or Groq are missing on server." },
        { status: 500 }
      );
    }

    // 1. Fetch current weather from OpenWeather API at the flight's coordinates
    let weatherData = {
      wind_speed: 4.5,
      wind_deg: 240,
      temp: 15,
      description: "unverified conditions",
    };

    try {
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherKey}&units=metric`;
      const weatherRes = await fetch(weatherUrl, { next: { revalidate: 60 } }); // Cache weather for 60s
      
      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        weatherData = {
          wind_speed: wData.wind?.speed || 4.5,
          wind_deg: wData.wind?.deg || 240,
          temp: wData.main?.temp || 15,
          description: wData.weather?.[0]?.description || "clear sky",
        };
      }
    } catch (err) {
      console.warn("Could not retrieve live weather, falling back to nominal values.", err);
    }

    // 2. Construct physics-informed prompt for the simulation
    // We supply all parameters, the weather conditions, and ask it to calculate coordinates
    const prompt = `
You are an expert aviation accident investigator and drift physicist.
Calculate a simulated crash trajectory and debris drift prediction for a flight under distress.

Input Parameters:
- Callsign: "${callsign || "UNKNOWN"}"
- Last Known Coordinates: Latitude ${lat}, Longitude ${lon}
- Altitude: ${altitude} meters
- Velocity: ${velocity} km/h
- Heading: ${heading} degrees

Local Environmental Telemetry (via OpenWeather):
- Wind Speed: ${weatherData.wind_speed} m/s
- Wind Direction (Blowing From): ${weatherData.wind_deg} degrees
- Air Temp: ${weatherData.temp}°C
- Description: "${weatherData.description}"

Perform the following calculations using standard equations:
1. Gliding descent (PIP - Probable Impact Point):
   - Assume a distress glide ratio (Lift/Drag) of 4:1 (so glide distance = altitude * 4 meters).
   - Project the coordinates from the Last Known position along the heading direction by this glide distance.
   - Equation for Lat offset: d_glide * cos(heading) / 111320
   - Equation for Lon offset: d_glide * sin(heading) / (111320 * cos(lat))
2. Debris drift over 6 hours (DSAC - Debris Search Area Center):
   - Assume leeway wind drift speed = 0.03 * wind_speed (3% leeway coefficient).
   - Assume wind-driven leeway direction is wind_deg + 180 degrees (blowing towards).
   - Drift distance = leeway_speed * 6 hours (21600 seconds) in meters.
   - Project coordinates from the Impact Point (PIP) along the leeway direction by the drift distance.
3. Sea wave height estimation (H):
   - Equation: H = 0.015 * (wind_speed)^2 in meters.
4. Ocean Surface Leeway Debris Trajectory (24h, 48h, and 72h steps):
   - Combine a constant surface ocean current (speed = 0.25 m/s, direction = wind_deg - 45 degrees) with wind leeway (3% of wind speed, directed at wind_deg + 180 degrees) as a combined drift vector.
   - Calculate drift coordinate offsets from the Impact Point at:
     - 24 hours (86400 seconds)
     - 48 hours (172800 seconds)
     - 72 hours (259200 seconds)
   - Assign growing uncertainty search radiuses: 10km at 24h, 25km at 48h, and 50km at 72h.
5. Search & Rescue (SAR) Tactical Advisory:
   - Provide an optimized search pattern based on current vectors (e.g., "Sector Search" for tight 24h grids, "Creeping Line Search" or "Parallel Sweep Search" for long trajectories).
   - Calculate search area bounds and write an actionable search execution checklist.

Output a strictly formatted JSON response containing the exact calculated coordinates, values, equations, and a markdown explanation.
The JSON must match this schema:
{
  "impact_point": [number (lat), number (lon)],
  "drift_point": [number (lat), number (lon)],
  "glide_distance_km": number (rounded to 2 decimals),
  "drift_distance_km": number (rounded to 2 decimals),
  "wind_speed_ms": number,
  "wind_heading": number,
  "wave_height_meters": number (rounded to 2 decimals),
  "drift_trajectory": [
    {
      "time_hours": 24,
      "coordinates": [number (lat), number (lon)],
      "distance_km": number,
      "uncertainty_radius_km": number,
      "current_speed_ms": number,
      "current_heading": number
    },
    {
      "time_hours": 48,
      "coordinates": [number (lat), number (lon)],
      "distance_km": number,
      "uncertainty_radius_km": number,
      "current_speed_ms": number,
      "current_heading": number
    },
    {
      "time_hours": 72,
      "coordinates": [number (lat), number (lon)],
      "distance_km": number,
      "uncertainty_radius_km": number,
      "current_speed_ms": number,
      "current_heading": number
    }
  ],
  "sar_advisory": {
    "recommended_pattern": "string (e.g. Sector Search)",
    "search_area_sq_km": number,
    "weather_risk_factor": "string (LOW | MODERATE | CRITICAL)",
    "action_plan_markdown": "string (bulleted checklist of tactical actions)"
  },
  "equations": {
    "glide": "Formula used and numbers substituted, e.g., 'd_g = h * 4 = 1000 * 4 = 4.0km'",
    "drift": "Formula used and leeway calculation details",
    "waves": "Formula used, e.g., 'H = 0.015 * V_w^2 = 0.015 * 5^2 = 0.38m'"
  },
  "narrative": "A concise, professional 3-sentence summary of the flight's distress descent, wind velocity effects, wave hazard, and impact analysis."
}
Do not include any pre-text or post-text. Return only the JSON object.
`;

    // 3. Query the Groq API using native fetch with robust model fallbacks
    const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"];
    let groqRes: Response | null = null;
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
        const res = await fetch(groqUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            response_format: {
              type: "json_object",
            },
            temperature: 0.1,
          }),
        });

        if (res.ok) {
          groqRes = res;
          break;
        } else {
          const errText = await res.text();
          console.warn(`Model ${model} failed with status ${res.status}: ${errText}`);
          lastError = new Error(`Groq API error for ${model}: ${res.statusText} - ${errText}`);
        }
      } catch (err: any) {
        console.warn(`Request for model ${model} failed:`, err);
        lastError = err;
      }
    }

    if (!groqRes) {
      throw lastError || new Error("All fallback Groq models failed to process the request.");
    }

    const groqData = await groqRes.json();
    const rawText = groqData.choices?.[0]?.message?.content || "";
    
    // Parse Groq JSON output
    let cleanedText = rawText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/i, "");
      cleanedText = cleanedText.replace(/\n?```$/, "");
      cleanedText = cleanedText.trim();
    }
    const simulationResult = JSON.parse(cleanedText);

    return NextResponse.json({
      success: true,
      weather: weatherData,
      simulation: simulationResult,
    });

  } catch (error: any) {
    console.error("Crash simulation computation failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to calculate crash simulation",
      },
      { status: 500 }
    );
  }
}
