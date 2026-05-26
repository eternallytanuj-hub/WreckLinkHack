import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const norad = searchParams.get("norad") || "40697"; // Default to Sentinel-2A (40697)
    
    const tleUrl = `https://tle.ivanstanojevic.me/api/tle/${norad}`;
    const res = await fetch(tleUrl, { next: { revalidate: 3600 } }); // Cache TLE for 1 hour since orbital updates are slow
    
    if (!res.ok) {
      throw new Error(`TLE API returned status ${res.status}`);
    }
    
    const data = await res.json();
    
    // Parse standard parameters from TLE line 2
    // Line 2 format: 2 40697  98.5663 218.4231 0001141  78.2912 281.8543 14.30823298570234
    const line2 = data.line2 || "";
    let inclination = 98.566;
    let raan = 218.423;
    let meanMotion = 14.308;
    
    if (line2.length > 50) {
      try {
        const parts = line2.trim().split(/\s+/);
        if (parts.length >= 8) {
          inclination = parseFloat(parts[2]);
          raan = parseFloat(parts[3]);
          meanMotion = parseFloat(parts[7].substring(0, 11));
        }
      } catch (err) {
        console.warn("Failed to parse detailed TLE parameters, using nominal values.");
      }
    }
    
    // Derived values
    const orbitalPeriodMinutes = meanMotion > 0 ? (24 * 60) / meanMotion : 100.6;
    const altitudeKm = 705 + (100.6 - orbitalPeriodMinutes) * 15; // approximate orbital altitude mapping
    
    return NextResponse.json({
      success: true,
      satelliteId: data.satelliteId,
      name: data.name,
      date: data.date,
      line1: data.line1,
      line2: data.line2,
      parameters: {
        inclination: inclination,
        raan: raan,
        meanMotion: meanMotion,
        orbitalPeriodMinutes: Math.round(orbitalPeriodMinutes * 100) / 100,
        approxAltitudeKm: Math.round(altitudeKm * 10) / 10
      }
    });
    
  } catch (error: any) {
    console.error("NASA TLE fetch failed:", error.message);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 502 });
  }
}
