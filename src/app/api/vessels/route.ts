import { NextResponse } from "next/server";

// Helper: Haversine distance in kilometers
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");

    if (!latStr || !lonStr) {
      return NextResponse.json(
        { success: false, error: "Missing lat/lon query parameters." },
        { status: 400 }
      );
    }

    const latNum = parseFloat(latStr);
    const lonNum = parseFloat(lonStr);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid coordinates." },
        { status: 400 }
      );
    }

    const apiKey = process.env.AISSTREAM_API_KEY;

    // If API key is available, query aisstream.io live WebSocket stream
    if (apiKey) {
      console.log(`Connecting to aisstream.io for coordinates: [${latNum}, ${lonNum}]`);
      
      const vesselsMap = new Map<number, any>();
      
      try {
        const promise = new Promise<any[]>((resolve, reject) => {
          const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
          
          const timeout = setTimeout(() => {
            ws.close();
            console.log("AISStream WebSocket connection timed out. Returning collected vessels.");
            resolve(Array.from(vesselsMap.values()));
          }, 1800); // 1.8 seconds timeout to collect messages

          ws.onopen = () => {
            // Subscribe to a 1.0 degree bounding box around the flight coordinates
            const minLat = latNum - 0.5;
            const maxLat = latNum + 0.5;
            const minLon = lonNum - 0.5;
            const maxLon = lonNum + 0.5;

            const subscription = {
              APIKey: apiKey,
              BoundingBoxes: [[[minLat, minLon], [maxLat, maxLon]]],
              FilterMessageTypes: ["PositionReport"]
            };
            ws.send(JSON.stringify(subscription));
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data.toString());
              
              if (data && data.MetaData) {
                const mmsi = data.MetaData.MMSI;
                const name = (data.MetaData.ShipName || `Vessel #${mmsi}`).trim();
                const vLat = data.MetaData.Latitude;
                const vLon = data.MetaData.Longitude;
                const speed = data.Message?.PositionReport?.Sog || 0;
                const heading = data.Message?.PositionReport?.Cog || 0;
                
                // Determine ship type name
                let type = "General Cargo";
                const typeCode = data.MetaData.ShipType || 70;
                if (typeCode === 51) type = "Search & Rescue Vessel";
                else if (typeCode === 35) type = "Military Vessel";
                else if (typeCode >= 70 && typeCode <= 79) type = "Cargo Vessel";
                else if (typeCode >= 80 && typeCode <= 89) type = "Tanker Vessel";
                else if (typeCode >= 60 && typeCode <= 69) type = "Passenger Ship";
                else if (typeCode === 30) type = "Fishing Vessel";
                else if (typeCode === 52) type = "Tug Boat";
                
                const distance = getHaversineDistance(latNum, lonNum, vLat, vLon);

                vesselsMap.set(mmsi, {
                  mmsi,
                  name,
                  type,
                  typeCode,
                  latitude: vLat,
                  longitude: vLon,
                  speed: parseFloat(speed.toFixed(1)),
                  heading: Math.round(heading),
                  distance: parseFloat(distance.toFixed(2)),
                  isSimulated: false,
                });
              }
            } catch (err) {
              // Ignore parse errors on individual packets
            }
          };

          ws.onerror = (err) => {
            console.error("AISStream WebSocket error:", err);
            ws.close();
            clearTimeout(timeout);
            reject(err);
          };

          ws.onclose = () => {
            clearTimeout(timeout);
            resolve(Array.from(vesselsMap.values()));
          };
        });

        const liveVessels = await promise;

        if (liveVessels.length > 0) {
          // Sort by proximity
          liveVessels.sort((a, b) => a.distance - b.distance);
          return NextResponse.json({
            success: true,
            provider: "aisstream.io",
            vessels: liveVessels,
          });
        }
      } catch (wsErr) {
        console.warn("AISStream real-time call failed, falling back to mock generation.", wsErr);
      }
    }

    // Fallback: Mock data generation (when key is missing or socket yields 0 vessels)
    console.log(`Generating mock maritime vessels near [${latNum}, ${lonNum}]`);
    const mockData = [
      {
        mmsi: 235105348,
        name: "MV SEA SENTINEL",
        type: "Search & Rescue Vessel",
        typeCode: 51,
        latOffset: 0.12,
        lonOffset: -0.15,
        speed: 12.4,
        heading: 185,
      },
      {
        mmsi: 413809000,
        name: "MT PACIFIC TRADER",
        type: "Cargo Vessel",
        typeCode: 70,
        latOffset: -0.18,
        lonOffset: 0.22,
        speed: 16.2,
        heading: 90,
      },
      {
        mmsi: 563045600,
        name: "MT OCEAN POLARIS",
        type: "Crude Oil Tanker",
        typeCode: 80,
        latOffset: 0.25,
        lonOffset: 0.11,
        speed: 14.8,
        heading: 275,
      },
      {
        mmsi: 211281820,
        name: "JRCC RESCUE FORCE 4",
        type: "High-Speed Rescue Craft",
        typeCode: 51,
        latOffset: -0.08,
        lonOffset: -0.21,
        speed: 28.5,
        heading: 340,
      }
    ];

    const vessels = mockData.map((ship) => {
      const vLat = latNum + ship.latOffset;
      const vLon = lonNum + ship.lonOffset;
      const distance = getHaversineDistance(latNum, lonNum, vLat, vLon);

      return {
        mmsi: ship.mmsi,
        name: ship.name,
        type: ship.type,
        typeCode: ship.typeCode,
        latitude: vLat,
        longitude: vLon,
        speed: ship.speed,
        heading: ship.heading,
        distance: parseFloat(distance.toFixed(2)),
        isSimulated: true,
      };
    });

    // Sort by proximity
    vessels.sort((a, b) => a.distance - b.distance);

    return NextResponse.json({
      success: true,
      provider: "mock_generator",
      vessels: vessels,
    });

  } catch (error: any) {
    console.error("Failed to query vessels:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to query maritime assets" },
      { status: 500 }
    );
  }
}
