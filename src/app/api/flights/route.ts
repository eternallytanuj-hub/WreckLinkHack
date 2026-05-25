import { NextResponse } from "next/server";

// Cache token in memory across requests in the Node server instance
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken() {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("OpenSky credentials not configured in environment variables.");
    return null;
  }

  // If token is still valid (with a 30s buffer), return cached token
  if (cachedToken && Date.now() < tokenExpiresAt - 30000) {
    return cachedToken;
  }

  try {
    const tokenUrl = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      next: { revalidate: 0 }, // Do not cache token request
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Token request failed: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    // expires_in is in seconds
    tokenExpiresAt = Date.now() + (data.expires_in || 300) * 1000;
    
    console.log("Successfully retrieved and cached new OpenSky access token.");
    return cachedToken;
  } catch (error) {
    console.error("Error retrieving OpenSky token:", error);
    return null;
  }
}

async function getAuthHeader() {
  const username = process.env.OPENSKY_USERNAME;
  const password = process.env.OPENSKY_PASSWORD;

  if (username && password) {
    const credentials = `${username}:${password}`;
    const encoded = Buffer.from(credentials).toString("base64");
    return `Basic ${encoded}`;
  }

  const token = await getAccessToken();
  if (token) {
    return `Bearer ${token}`;
  }

  return null;
}

async function fetchFlightradar24(): Promise<any[]> {
  try {
    const url = "https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=75,-75,-180,180&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=1&air=1&vehicles=1&estimated=1&maxage=14400&gliders=1&stats=1";
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
      },
      next: { revalidate: 15 } // Cache for 15s in Next.js data cache to prevent spamming
    });

    if (!res.ok) {
      throw new Error(`Flightradar24 responded with ${res.status}`);
    }

    const data = await res.json();
    const flights = [];

    for (const key of Object.keys(data)) {
      if (key === "stats" || key === "full_count" || !Array.isArray(data[key])) {
        continue;
      }

      const flightArray = data[key];
      const icao24 = flightArray[0] || key;
      const lat = flightArray[1];
      const lon = flightArray[2];
      const heading = flightArray[3];
      const altitudeFeet = flightArray[4];
      const speedKnots = flightArray[5];
      const callsign = flightArray[13] || "N/A";
      const onGround = !!flightArray[14];
      const originCountry = "Unknown";

      if (lat === null || lon === null || lat === undefined || lon === undefined) {
        continue;
      }

      // Convert feet to meters and knots to km/h to maintain telemetry unit standards
      const altitudeMeters = Math.round(altitudeFeet * 0.3048);
      const velocityKmh = Math.round(speedKnots * 1.852);

      flights.push({
        icao24,
        callsign: callsign.trim() || "N/A",
        origin_country: originCountry,
        longitude: lon,
        latitude: lat,
        altitude: altitudeMeters,
        on_ground: onGround,
        velocity: velocityKmh,
        heading: heading || 0
      });

      if (flights.length >= 600) {
        break;
      }
    }

    return flights;
  } catch (error: any) {
    console.error("Flightradar24 fetch failed:", error.message);
    return [];
  }
}

export async function GET() {
  try {
    const authHeader = await getAuthHeader();
    const apiUrl = "https://opensky-network.org/api/states/all";

    const headers: HeadersInit = {};
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    // Fetch states with no caching to ensure real-time positions
    const response = await fetch(apiUrl, {
      headers,
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`OpenSky API responded with status ${response.status}`);
    }

    const rawData = await response.json();
    const rawStates = rawData.states || [];

    // Filter and map states into a lightweight, high-performance format
    const formattedFlights = [];
    
    for (const state of rawStates) {
      const icao24 = state[0];
      const callsign = (state[1] || "").trim();
      const originCountry = state[2];
      const lon = state[5];
      const lat = state[6];
      const baroAltitude = state[7];
      const onGround = state[8];
      const velocity = state[9]; // in m/s
      const trueTrack = state[10]; // heading in degrees

      // Filter out flights that don't have valid coordinates
      if (lon === null || lat === null || lon === undefined || lat === undefined) {
        continue;
      }

      formattedFlights.push({
        icao24,
        callsign: callsign || "N/A",
        origin_country: originCountry || "Unknown",
        longitude: lon,
        latitude: lat,
        altitude: baroAltitude ? Math.round(baroAltitude) : 0, // baro altitude in meters
        on_ground: !!onGround,
        velocity: velocity ? Math.round(velocity * 3.6) : 0, // convert m/s to km/h
        heading: trueTrack ? Math.round(trueTrack) : 0,
      });

      // Limit payload size to 600 flights to avoid map lag
      if (formattedFlights.length >= 600) {
        break;
      }
    }

    if (formattedFlights.length === 0) {
      console.warn("OpenSky API returned empty states. Querying Flightradar24 fallback...");
      const fr24Flights = await fetchFlightradar24();
      if (fr24Flights.length > 0) {
        console.log(`Successfully fetched ${fr24Flights.length} real-time flights from Flightradar24 fallback.`);
        return NextResponse.json({
          success: true,
          flights: fr24Flights,
          total_tracked: fr24Flights.length,
          timestamp: Date.now(),
          is_fr24: true
        });
      }

      console.warn("Flightradar24 fallback returned empty. Reverting to static mock flights.");
      const mockFlights = getDynamicMockFlights();
      return NextResponse.json({
        success: true,
        flights: mockFlights,
        total_tracked: mockFlights.length,
        timestamp: Date.now(),
        is_fallback: true
      });
    }

    return NextResponse.json({
      success: true,
      flights: formattedFlights,
      total_tracked: formattedFlights.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.warn("Error fetching live flights from OpenSky, querying Flightradar24 fallback:", error.message);
    try {
      const fr24Flights = await fetchFlightradar24();
      if (fr24Flights.length > 0) {
        console.log(`Successfully fetched ${fr24Flights.length} real-time flights from Flightradar24 fallback after OpenSky error.`);
        return NextResponse.json({
          success: true,
          flights: fr24Flights,
          total_tracked: fr24Flights.length,
          timestamp: Date.now(),
          is_fr24: true
        });
      }
    } catch (frError: any) {
      console.warn("Flightradar24 fallback failed:", frError.message);
    }

    console.warn("Utilizing dynamic mock fallback.");
    const mockFlights = getDynamicMockFlights();
    return NextResponse.json({
      success: true,
      flights: mockFlights,
      total_tracked: mockFlights.length,
      timestamp: Date.now(),
      is_fallback: true,
      error: error.message || "Failed to fetch live flights",
    });
  }
}

function getDynamicMockFlights() {
  const seedFlights = [
    { icao24: "A631FE", callsign: "AAL302", origin_country: "United States", baseLat: 34.0522, baseLon: -118.2437, altitude: 10400, velocity: 820, heading: 90 },
    { icao24: "3C6A21", callsign: "DLH419", origin_country: "Germany", baseLat: 52.5200, baseLon: 13.4050, altitude: 8200, velocity: 780, heading: 270 },
    { icao24: "C8D9E0", callsign: "UAL182", origin_country: "United States", baseLat: 40.7128, baseLon: -74.006, altitude: 9500, velocity: 810, heading: 180 },
    { icao24: "A1B2C3", callsign: "SIA318", origin_country: "Singapore", baseLat: 1.3521, baseLon: 103.8198, altitude: 10500, velocity: 900, heading: 135 },
    { icao24: "F4G5H6", callsign: "QFA001", origin_country: "Australia", baseLat: -33.8688, baseLon: 151.2093, altitude: 11500, velocity: 920, heading: 225 },
    { icao24: "I7J8K9", callsign: "AIC102", origin_country: "India", baseLat: 19.0760, baseLon: 72.8777, altitude: 9800, velocity: 810, heading: 180 },
    { icao24: "L0M1N2", callsign: "AFR066", origin_country: "France", baseLat: 48.8566, baseLon: 2.3522, altitude: 10200, velocity: 850, heading: 315 },
    { icao24: "O3P4Q5", callsign: "BAW227", origin_country: "United Kingdom", baseLat: 51.5074, baseLon: -0.1278, altitude: 9200, velocity: 830, heading: 60 },
    { icao24: "R6S7T8", callsign: "JAL006", origin_country: "Japan", baseLat: 35.6762, baseLon: 139.6503, altitude: 10800, velocity: 870, heading: 240 },
    { icao24: "U9V0W1", callsign: "ETD101", origin_country: "United Arab Emirates", baseLat: 24.4539, baseLon: 54.3773, altitude: 10000, velocity: 840, heading: 120 }
  ];

  const airlines = ["AAL", "UAL", "DAL", "SWR", "DLH", "BAW", "AFR", "JAL", "ANA", "QFA", "SIA", "AIC", "ETD", "UAE", "CCA", "CES", "EZY", "RYR", "KLM", "IBE"];
  const countries = ["United States", "Germany", "United Kingdom", "France", "Japan", "Australia", "Singapore", "India", "United Arab Emirates", "China", "Switzerland", "Ireland", "Netherlands", "Spain"];
  
  const regions = [
    { minLat: 25, maxLat: 49, minLon: -125, maxLon: -70 }, // North America
    { minLat: 35, maxLat: 60, minLon: -10, maxLon: 30 },   // Europe
    { minLat: 10, maxLat: 45, minLon: 70, maxLon: 140 },   // Asia
    { minLat: -38, maxLat: -12, minLon: 113, maxLon: 153 }, // Australia
    { minLat: 15, maxLat: 35, minLon: 35, maxLon: 60 }     // Middle East
  ];

  const nowSec = Date.now() / 1000;
  const flights = [...seedFlights];

  for (let i = 0; i < 110; i++) {
    const rand = (index: number) => {
      const x = Math.sin(index + 1) * 10000;
      return x - Math.floor(x);
    };

    const r1 = rand(i);
    const r2 = rand(i + 200);
    const r3 = rand(i + 400);
    const r4 = rand(i + 600);
    const r5 = rand(i + 800);

    const region = regions[i % regions.length];
    const baseLat = region.minLat + r1 * (region.maxLat - region.minLat);
    const baseLon = region.minLon + r2 * (region.maxLon - region.minLon);
    
    const airline = airlines[Math.floor(r3 * airlines.length)];
    const callsign = `${airline}${Math.floor(100 + r4 * 900)}`;
    const country = countries[Math.floor(r5 * countries.length)];
    const icao24 = Math.floor(10000000 + r1 * 89999999).toString(16);

    const altitude = Math.round(6000 + r2 * 6000);
    const velocity = Math.round(600 + r3 * 350);
    const heading = Math.round(r4 * 360);

    flights.push({
      icao24,
      callsign,
      origin_country: country,
      baseLat,
      baseLon,
      altitude,
      velocity,
      heading
    });
  }

  return flights.map((flight) => {
    const speedDegS = (flight.velocity / 3600) / 111;
    const headingRad = (flight.heading * Math.PI) / 180;
    
    // Total drift distance in degrees since a base time (loop coordinates every hour)
    const timeDelta = nowSec % 3600;
    const dLat = Math.cos(headingRad) * speedDegS * timeDelta;
    const cosLat = Math.max(0.01, Math.cos((flight.baseLat * Math.PI) / 180));
    const dLon = (Math.sin(headingRad) * speedDegS * timeDelta) / cosLat;
    
    return {
      icao24: flight.icao24,
      callsign: flight.callsign,
      origin_country: flight.origin_country,
      latitude: flight.baseLat + dLat,
      longitude: flight.baseLon + dLon,
      altitude: flight.altitude,
      on_ground: false,
      velocity: flight.velocity,
      heading: flight.heading
    };
  });
}
