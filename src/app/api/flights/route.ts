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

export async function GET() {
  try {
    const token = await getAccessToken();
    const apiUrl = "https://opensky-network.org/api/states/all";

    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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

    return NextResponse.json({
      success: true,
      flights: formattedFlights,
      total_tracked: formattedFlights.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Error fetching live flights from OpenSky:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch live flights",
        flights: [],
      },
      { status: 500 }
    );
  }
}
