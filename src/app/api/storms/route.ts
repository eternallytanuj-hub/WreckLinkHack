import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";
    const eonetUrl = `https://eonet.gsfc.nasa.gov/api/v3/events?category=severeStorms&status=open&api_key=${apiKey}`;
    
    const res = await fetch(eonetUrl, { next: { revalidate: 300 } }); // Cache for 5 minutes
    
    if (!res.ok) {
      throw new Error(`EONET API returned status ${res.status}`);
    }
    
    const data = await res.json();
    const events = data.events || [];
    
    const stormCells = events.map((event: any, index: number) => {
      const geomList = event.geometry || [];
      if (geomList.length === 0) return null;
      
      // Get the latest geometry point (active position)
      const latestGeom = geomList[geomList.length - 1];
      const coords = latestGeom.coordinates;
      if (!coords || coords.length < 2) return null;
      
      const lon = coords[0];
      const lat = coords[1];
      
      // Attempt to extract wind/pressure magnitude if available
      const magnitude = latestGeom.magnitudeValue;
      const magnitudeUnit = latestGeom.magnitudeUnit || "kt";
      
      let radius = 350000; // Default 350km
      let windSpeedInfo = "";
      
      if (magnitude) {
        windSpeedInfo = ` (Wind: ${magnitude} ${magnitudeUnit})`;
        // Scale storm radius with wind speed (1 kt wind approx translates to larger storm reach)
        radius = Math.min(600000, Math.max(250000, magnitude * 4500));
      }
      
      return {
        id: event.id || `eonet-storm-${index}`,
        name: event.title ? event.title.toUpperCase() : "ACTIVE CYCLONE CELL",
        lat: lat,
        lon: lon,
        radius: radius,
        type: `Live Severe Storm Tracker via NASA EONET${windSpeedInfo}. Heavy rain, severe turbulence and active wind shear warnings.`
      };
    }).filter(Boolean);
    
    return NextResponse.json({
      success: true,
      storms: stormCells,
      source: "NASA EONET API"
    });
    
  } catch (error: any) {
    console.error("NASA EONET fetch failed:", error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
      storms: []
    }, { status: 502 });
  }
}
