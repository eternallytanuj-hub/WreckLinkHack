import { NextResponse } from "next/server";

// Cache in-memory: key is "latRound_lonRound", value is { data, expiresAt }
const weatherCache: Record<string, { data: any; expiresAt: number }> = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");

    if (!latStr || !lonStr) {
      return NextResponse.json({ success: false, error: "Latitude and Longitude are required." }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ success: false, error: "Invalid coordinate values." }, { status: 400 });
    }

    // Grid-based caching (round to nearest 0.5 degree, approx 50km resolution)
    // This reduces the unique cache keys dramatically for flights flying in similar corridors!
    const gridLat = Math.round(lat * 2) / 2;
    const gridLon = Math.round(lon * 2) / 2;
    const cacheKey = `${gridLat.toFixed(1)}_${gridLon.toFixed(1)}`;

    const now = Date.now();
    if (weatherCache[cacheKey] && weatherCache[cacheKey].expiresAt > now) {
      return NextResponse.json({
        success: true,
        weather: weatherCache[cacheKey].data,
        cached: true,
      });
    }

    const openWeatherKey = process.env.OPENWEATHER_API_KEY;
    if (!openWeatherKey) {
      return NextResponse.json({
        success: true,
        weather: getFallbackWeather(lat, lon),
        isFallback: true,
        error: "OpenWeather API Key missing on server."
      });
    }

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherKey}&units=metric`;
    const res = await fetch(weatherUrl, { next: { revalidate: 600 } }); // Next.js level fetch cache

    if (!res.ok) {
      throw new Error(`OpenWeather API responded with status ${res.status}`);
    }

    const wData = await res.json();
    const weatherResult = {
      temp: Math.round(wData.main?.temp || 15),
      wind_speed: wData.wind?.speed || 0,
      wind_deg: wData.wind?.deg || 0,
      description: wData.weather?.[0]?.description || "clear sky",
      main: wData.weather?.[0]?.main || "Clear",
      humidity: wData.main?.humidity || 50,
      visibility: wData.visibility || 10000
    };

    // Cache the resolved grid cell
    weatherCache[cacheKey] = {
      data: weatherResult,
      expiresAt: now + CACHE_TTL_MS
    };

    return NextResponse.json({
      success: true,
      weather: weatherResult,
      cached: false,
    });

  } catch (error: any) {
    console.warn("Weather fetch failed, returning fallback weather profile:", error.message);
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lon = parseFloat(searchParams.get("lon") || "0");
    return NextResponse.json({
      success: true,
      weather: getFallbackWeather(lat, lon),
      isFallback: true,
      error: error.message
    });
  }
}

function getFallbackWeather(lat: number, lon: number) {
  // Generate a realistic weather profile deterministically based on coordinates
  const rand = Math.sin(lat) * Math.cos(lon);
  const isStormy = Math.abs(rand) > 0.7; // 30% chance of rain/storm

  if (isStormy) {
    return {
      temp: Math.round(18 + (rand * 8)),
      wind_speed: Math.round(12 + Math.abs(rand * 15)),
      wind_deg: Math.round(Math.abs(rand * 360)) % 360,
      description: rand > 0 ? "heavy intensity rain" : "thunderstorm with rain",
      main: rand > 0 ? "Rain" : "Thunderstorm",
      humidity: 85,
      visibility: 4000
    };
  }

  return {
    temp: Math.round(20 + (rand * 10)),
    wind_speed: Math.round(3 + Math.abs(rand * 6)),
    wind_deg: Math.round(Math.abs(rand * 360)) % 360,
    description: "scattered clouds",
    main: "Clouds",
    humidity: 60,
    visibility: 10000
  };
}
