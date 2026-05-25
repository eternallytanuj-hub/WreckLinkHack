"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, Polyline, Circle, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Compass, Info, X, Navigation, Radio, Activity, ShieldAlert, Cpu, CornerRightDown } from "lucide-react";

// Types for our flight data
interface Flight {
  icao24: string;
  callsign: string;
  origin_country: string;
  longitude: number;
  latitude: number;
  altitude: number;
  on_ground: boolean;
  velocity: number;
  heading: number;
}

interface ViewTarget {
  center: [number, number];
  zoom: number;
}

// Controller component to move/zoom map programmatically
function MapController({ 
  viewTarget, 
  onViewApplied 
}: { 
  viewTarget: ViewTarget | null; 
  onViewApplied: () => void; 
}) {
  const map = useMap();
  useEffect(() => {
    if (viewTarget) {
      map.setView(viewTarget.center, viewTarget.zoom, { animate: true, duration: 1 });
      onViewApplied();
    }
  }, [viewTarget, map, onViewApplied]);
  return null;
}

// Emergency Search & Rescue / ATC Helpline mapping based on aircraft origin country
const getHelplineForCountry = (country: string) => {
  const c = country.trim().toLowerCase();
  if (c.includes("india")) {
    return {
      agency: "Indian Coast Guard & Mumbai ATC",
      number: "+91 22 2438 8065",
      description: "SAR Operations Centre (MRCC Mumbai) / Air Traffic Distress Link"
    };
  } else if (c.includes("united states") || c.includes("usa") || c.includes("america")) {
    return {
      agency: "US Coast Guard & FAA Command Center",
      number: "+1 202 372 2100",
      description: "Search & Rescue Operations Liaison / FAA Safety Hotline"
    };
  } else if (c.includes("united kingdom") || c.includes("uk") || c.includes("great britain")) {
    return {
      agency: "UK Maritime & Coastguard Agency (MCA)",
      number: "+44 23 8032 9486",
      description: "UK SAR Command Center / HM Coastguard Operations"
    };
  } else if (c.includes("australia")) {
    return {
      agency: "Joint Rescue Coordination Centre (JRCC)",
      number: "+61 2 6230 6811",
      description: "Australian Maritime Safety Authority (AMSA) Emergency Helpline"
    };
  } else if (c.includes("thailand")) {
    return {
      agency: "JRCC Thailand & Bangkok Air Traffic Control",
      number: "+66 2 286 0506",
      description: "Thailand Civil Aviation Emergency Response Liaison"
    };
  } else if (c.includes("singapore")) {
    return {
      agency: "CAAS Singapore ATC & JRCC Singapore",
      number: "+65 6542 5580",
      description: "Singapore SAR Coordination Centre Helpline"
    };
  } else if (c.includes("france")) {
    return {
      agency: "CROSS Gris-Nez (French Maritime SAR)",
      number: "+33 3 21 87 21 87",
      description: "French National Rescue Coordination Centre"
    };
  } else if (c.includes("germany")) {
    return {
      agency: "MRCC Bremen (German Maritime SAR)",
      number: "+49 421 53 7070",
      description: "Germany Rescue Command Operations Centre"
    };
  } else {
    return {
      agency: "ICAO International SAR Liaison & JRCC Link",
      number: "+44 20 7735 7611",
      description: "Global Aeronautical & Maritime Distress Coordination"
    };
  }
};

export default function LiveMap() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewTarget, setViewTarget] = useState<ViewTarget | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("Never");

  // Crash Simulation state
  const [simulating, setSimulating] = useState(false);
  const [simulationData, setSimulationData] = useState<any | null>(null);

  // Maritime Vessel state
  const [nearestVessel, setNearestVessel] = useState<any | null>(null);
  const [vesselLoading, setVesselLoading] = useState(false);

  // Live Warnings Feed state
  const [signalLossFeed, setSignalLossFeed] = useState<any[]>([
    {
      id: "seed-1",
      timestamp: new Date(Date.now() - 45000).toLocaleTimeString(),
      callsign: "AAL302",
      icao24: "A631FE",
      lat: "34.0522",
      lon: "-118.2437",
      altitude: 10400,
      type: "SIGNAL_LOSS",
      description: "Primary radar echo loss over ocean boundary."
    },
    {
      id: "seed-2",
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
      callsign: "DLH419",
      icao24: "3C6A21",
      lat: "52.5200",
      lon: "13.4050",
      altitude: 8200,
      type: "ALTITUDE_ALERT",
      description: "Rapid uncommanded descent detected (-32m/s)."
    }
  ]);

  // Keep track of ref for marker icon cache to avoid recreating them
  const iconCacheRef = useRef<Record<string, L.DivIcon>>({});

  // Get Custom rotating SVG airplane icon
  const getAirplaneIcon = (icao24: string, heading: number, isSelected: boolean) => {
    const cacheKey = `${icao24}-${heading}-${isSelected}`;
    if (iconCacheRef.current[cacheKey]) {
      return iconCacheRef.current[cacheKey];
    }

    const color = isSelected ? "#3b82f6" : "#cbd5e1";
    const glow = isSelected ? "drop-shadow(0 0 6px rgba(59,130,246,0.9))" : "drop-shadow(0 0 2px rgba(0,0,0,0.5))";
    const size = isSelected ? 28 : 22;

    const html = `
      <div style="transform: rotate(${heading}deg); width: ${size}px; height: ${size}px; filter: ${glow}; transition: transform 0.5s ease-out; display: flex; align-items: center; justify-content: center;">
        <svg style="width: 100%; height: 100%;" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l8 2.5z"/>
        </svg>
      </div>
    `;

    const icon = L.divIcon({
      className: "custom-airplane-icon-container",
      html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

    iconCacheRef.current[cacheKey] = icon;
    return icon;
  };

  // Custom icons for impact and drift
  const getShipIcon = (typeCode: number) => {
    const isRescue = typeCode === 51;
    const color = isRescue ? "#10b981" : "#14b8a6"; // emerald for rescue, teal for other ships
    const glow = isRescue ? "drop-shadow(0 0 6px rgba(16,185,129,0.9))" : "drop-shadow(0 0 4px rgba(20,184,166,0.6))";
    
    return L.divIcon({
      html: `
        <div style="display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; filter: ${glow};">
          <svg style="width: 100%; height: 100%; color: ${color};" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.64 2.62.99 4 .99h2v-2h-2zM3.93 11L2 17h20l-1.93-6H3.93zm3.57-6l-1.2 3.6L12 12l5.7-3.4-1.2-3.6H7.5z"/>
          </svg>
        </div>
      `,
      className: "custom-ship-icon",
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  };

  const getImpactIcon = () => {
    return L.divIcon({
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
          <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(239,68,68,0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 10px; height: 10px; border-radius: 50%; background: #ef4444; border: 1.5px solid #ffffff; box-shadow: 0 0 6px rgba(239,68,68,0.8);"></div>
        </div>
      `,
      className: "custom-impact-icon",
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  const getDriftIcon = () => {
    return L.divIcon({
      html: `
        <div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; animation: pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;">
          <svg style="width: 24px; height: 24px; color: #fbbf24; filter: drop-shadow(0 0 5px rgba(251,191,36,0.9));" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
      `,
      className: "custom-drift-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  // Fetch flights from Next.js server API
  const fetchFlights = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const response = await fetch("/api/flights");
      const data = await response.json();
      if (data.success && data.flights) {
        setFlights(data.flights);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error("Failed to fetch flight telemetry:", error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Initial fetch and 3-second polling interval
  useEffect(() => {
    fetchFlights(true);

    const interval = setInterval(() => {
      fetchFlights(false);
    }, 3000); // 3-second delay to prevent UI/network lag

    return () => clearInterval(interval);
  }, []);
  // Filter flights based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredFlights(flights);
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    const filtered = flights.filter(
      (f) =>
        f.callsign.toLowerCase().includes(query) ||
        f.icao24.toLowerCase().includes(query) ||
        f.origin_country.toLowerCase().includes(query)
    );
    setFilteredFlights(filtered);
  }, [searchQuery, flights]);

  // Sync selectedFlight coordinates when live polling yields fresh position updates
  useEffect(() => {
    if (!selectedFlight) return;
    const freshFlight = flights.find((f) => f.icao24 === selectedFlight.icao24);
    if (freshFlight) {
      setSelectedFlight(freshFlight);
    }
  }, [flights]);

  // Fetch nearest maritime vessel when selectedFlight changes
  useEffect(() => {
    if (!selectedFlight) {
      setNearestVessel(null);
      return;
    }

    const fetchNearestVessel = async () => {
      setVesselLoading(true);
      try {
        const res = await fetch(`/api/vessels?lat=${selectedFlight.latitude}&lon=${selectedFlight.longitude}`);
        const data = await res.json();
        if (data.success && data.vessels && data.vessels.length > 0) {
          setNearestVessel(data.vessels[0]); // Pick the closest vessel
        } else {
          setNearestVessel(null);
        }
      } catch (err) {
        console.error("Failed to fetch nearest vessel:", err);
        setNearestVessel(null);
      } finally {
        setVesselLoading(false);
      }
    };

    fetchNearestVessel();
  }, [selectedFlight?.icao24]);

  // Generate simulated signal loss alerts dynamically based on active flights list
  useEffect(() => {
    if (flights.length === 0) return;

    const interval = setInterval(() => {
      // Pick a random flight
      const randomFlight = flights[Math.floor(Math.random() * flights.length)];
      if (!randomFlight) return;

      const alertTypes = [
        { type: "SIGNAL_LOSS", desc: "Telemetry link interrupted - ping timeout (5s)" },
        { type: "ALTITUDE_ALERT", desc: `Uncommanded descent: -${Math.round(Math.random() * 15 + 25)} m/s` },
        { type: "HEADING_DRIFT", desc: "Abnormal heading yaw offset (>18 deg)" }
      ];

      const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];

      const newWarning = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        callsign: randomFlight.callsign,
        icao24: randomFlight.icao24.toUpperCase(),
        lat: randomFlight.latitude.toFixed(4),
        lon: randomFlight.longitude.toFixed(4),
        altitude: randomFlight.altitude,
        type: alert.type,
        description: alert.desc
      };

      setSignalLossFeed((prev) => [newWarning, ...prev].slice(0, 15)); // Keep only 15 items
    }, 12000); // Trigger every 12 seconds

    return () => clearInterval(interval);
  }, [flights]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredFlights.length > 0) {
      const match = filteredFlights[0];
      setSelectedFlight(match);
      setViewTarget({ center: [match.latitude, match.longitude], zoom: 6 });
    }
  };

  // Run crash simulation using Gemini API and OpenWeather API
  const runCrashSimulation = async (flight: Flight) => {
    setSimulating(true);
    setSimulationData(null);
    try {
      const res = await fetch("/api/simulate-crash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat: flight.latitude,
          lon: flight.longitude,
          altitude: flight.altitude,
          velocity: flight.velocity,
          heading: flight.heading,
          callsign: flight.callsign,
        }),
      });

      const data = await res.json();
      if (data.success && data.simulation) {
        setSimulationData(data.simulation);
        
        // Pan the map to focus on the predicted crash zone
        setViewTarget({
          center: data.simulation.impact_point,
          zoom: 6,
        });

        // Add a simulation alert warning log to the feed
        const simAlert = {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          callsign: flight.callsign,
          icao24: flight.icao24.toUpperCase(),
          lat: data.simulation.impact_point[0].toFixed(4),
          lon: data.simulation.impact_point[1].toFixed(4),
          altitude: 0,
          type: "SIMULATION_ACTIVE",
          description: `PIP & DSAC plotted. Estimated sea state wave height: ${data.simulation.wave_height_meters}m.`
        };
        setSignalLossFeed((prev) => [simAlert, ...prev]);

      } else {
        alert("Failed to compute simulation: " + (data.error || "Server error"));
      }
    } catch (error) {
      console.error("Simulation run failed:", error);
      alert("API request error running simulation.");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-80px)] flex flex-row bg-[#02050d] overflow-hidden">
      
      {/* Docked Left Control Panel Sidebar */}
      <div className="w-80 border-r border-blue-950/60 bg-[#030712] p-4 flex flex-col justify-start gap-4 h-full overflow-y-auto shrink-0 z-10 select-none">
        
        {/* Title / Module Code */}
        <div className="flex items-center gap-2 border-b border-blue-950/40 pb-3">
          <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
          <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">CONTROL_CONSOLE v1.08</span>
        </div>

        {/* Search Bar Panel */}
        <form
          onSubmit={handleSearchSubmit}
          className="w-full flex items-center gap-2 p-2 rounded-xl border border-blue-950/60 bg-[#060b18]/50 shadow-inner"
        >
          <div className="flex-1 flex items-center gap-2 px-2">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search Callsign / ICAO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="p-1 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Telemetry Status Card */}
        <div className="p-3.5 rounded-xl border border-blue-950/60 bg-[#050b18]/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono tracking-widest text-slate-500">LIVE FEED</span>
            <span className="inline-flex items-center gap-1 text-[8px] font-mono text-blue-400">
              <span className="w-1 h-1 rounded-full bg-blue-500 animate-ping" />
              CONNECTED
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="bg-slate-950/40 p-2 rounded border border-blue-950/30">
              <span className="block text-[8px] font-mono text-slate-500">ACTIVE TRACKS</span>
              <span className="text-sm font-bold font-mono text-slate-300">
                {loading ? "..." : flights.length}
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded border border-blue-950/30">
              <span className="block text-[8px] font-mono text-slate-500">LAST SYNC</span>
              <span className="text-sm font-bold font-mono text-slate-300 truncate">
                {lastUpdated}
              </span>
            </div>
          </div>
        </div>

        {/* SIGNAL LOSS & ANOMALY LOG FEED */}
        <div className="flex-1 flex flex-col justify-start min-h-[250px]">
          <div className="flex items-center justify-between border-b border-blue-950/40 pb-2 mb-2">
            <span className="text-[9px] font-mono tracking-widest text-slate-500 font-bold uppercase">SIGNAL LOSS & ALERTS</span>
            <span className="text-[8px] font-mono text-red-500 uppercase">SYS_CRIT</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {signalLossFeed.map((alert) => (
              <div 
                key={alert.id}
                className={`p-2.5 rounded border text-[10px] font-mono space-y-1.5 transition-colors duration-300 ${
                  alert.type === "SIMULATION_ACTIVE" 
                    ? "bg-blue-950/10 border-blue-900/50 hover:bg-blue-950/20" 
                    : "bg-red-950/5 border-red-950/50 hover:bg-red-950/10"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`font-bold ${alert.type === "SIMULATION_ACTIVE" ? "text-blue-400" : "text-red-500"}`}>
                    {alert.type}
                  </span>
                  <span className="text-[8px] text-slate-600">{alert.timestamp}</span>
                </div>
                
                <div className="flex justify-between text-slate-400">
                  <span>FLIGHT: <span className="text-slate-200">{alert.callsign}</span></span>
                  <span>HEX: <span className="text-slate-200">{alert.icao24}</span></span>
                </div>

                <p className="text-slate-500 leading-normal border-t border-blue-950/20 pt-1 text-[9px]">
                  {alert.description}
                </p>

                <div className="text-[8px] text-slate-600 text-right">
                  COORD: {alert.lat}, {alert.lon}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Map Panel (Right side) */}
      <div className="flex-1 h-full relative">
        
        {/* Leaflet Map */}
        <MapContainer
          center={[20, 0]}
          zoom={3}
          minZoom={2.5}
          preferCanvas={true} // Enable high-performance canvas marker rendering
          className="w-full h-full"
          zoomControl={false} // Disable default zoom control to make it minimal
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Renders all filtered tracked flights */}
          {filteredFlights.map((flight) => (
            <Marker
              key={flight.icao24}
              position={[flight.latitude, flight.longitude]}
              icon={getAirplaneIcon(
                flight.icao24,
                flight.heading,
                selectedFlight?.icao24 === flight.icao24
              )}
              eventHandlers={{
                click: () => {
                  setSelectedFlight(flight);
                  setViewTarget({ center: [flight.latitude, flight.longitude], zoom: 5 });
                },
              }}
            />
          ))}

          {/* Render Crash Simulation overlays if active */}
          {simulationData && (
            <>
              {/* 1. Glide path line (Flight initial coord -> Impact Point) */}
              {selectedFlight && (
                <Polyline 
                  positions={[
                    [selectedFlight.latitude, selectedFlight.longitude],
                    simulationData.impact_point
                  ]}
                  pathOptions={{
                    color: "#ef4444",
                    dashArray: "6, 6",
                    weight: 2.5,
                    opacity: 0.8
                  }}
                />
              )}

              {/* 2. Debris drift path line (Impact Point -> Drift Center) */}
              <Polyline 
                positions={[
                  simulationData.impact_point,
                  simulationData.drift_point
                ]}
                pathOptions={{
                  color: "#fbbf24",
                  dashArray: "4, 4",
                  weight: 2,
                  opacity: 0.8
                }}
              />

              {/* 3. Impact Point (PIP) Marker */}
              <Marker 
                position={simulationData.impact_point}
                icon={getImpactIcon()}
              />

              {/* 4. Drift Center (DSAC) Marker */}
              <Marker 
                position={simulationData.drift_point}
                icon={getDriftIcon()}
              />

              {/* 5. Uncertainty Search Radius Circle */}
              <Circle 
                center={simulationData.drift_point}
                radius={5000} // 5km search zone
                pathOptions={{
                  color: "#fbbf24",
                  fillColor: "#fbbf24",
                  fillOpacity: 0.1,
                  dashArray: "5, 5",
                  weight: 1.5
                }}
              />
            </>
          )}

          {/* Render Nearest Vessel connection and marker */}
          {selectedFlight && nearestVessel && (
            <>
              {/* Proximity link line between Flight and nearest Ship */}
              <Polyline
                positions={[
                  [selectedFlight.latitude, selectedFlight.longitude],
                  [nearestVessel.latitude, nearestVessel.longitude]
                ]}
                pathOptions={{
                  color: "#10b981", // Emerald green
                  dashArray: "3, 6",
                  weight: 1.5,
                  opacity: 0.8
                }}
              />
              
              {/* Vessel position marker */}
              <Marker
                position={[nearestVessel.latitude, nearestVessel.longitude]}
                icon={getShipIcon(nearestVessel.typeCode)}
              >
                <Popup>
                  <div className="p-2.5 font-mono text-[10px] bg-[#02050d]/95 text-slate-200 border border-blue-950/80 rounded-lg shadow-xl space-y-1 select-none">
                    <span className="block font-bold text-teal-400 border-b border-blue-950/40 pb-1">{nearestVessel.name}</span>
                    <span className="block text-[8px] text-slate-500 uppercase">{nearestVessel.type}</span>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1">
                      <span className="text-slate-500">MMSI:</span>
                      <span className="text-slate-300 font-bold">{nearestVessel.mmsi}</span>
                      <span className="text-slate-500">SPEED:</span>
                      <span className="text-slate-300 font-bold">{nearestVessel.speed} kts</span>
                      <span className="text-slate-500">RANGE:</span>
                      <span className="text-teal-400 font-bold">{nearestVessel.distance} km</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Custom zoom / center movements controller */}
          <MapController 
            viewTarget={viewTarget} 
            onViewApplied={() => setViewTarget(null)} 
          />
        </MapContainer>

        {/* Floating Flight Detail Panel (Right) */}
        {selectedFlight && (
          <div className="absolute top-6 right-6 z-[1000] w-80 max-h-[calc(100vh-140px)] overflow-y-auto rounded-xl border border-blue-950/70 bg-[#04091a]/85 backdrop-blur-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-950/50 pb-3">
              <div className="space-y-0.5">
                <span className="text-[8px] font-mono text-blue-400 tracking-widest uppercase">TELEMETRY_LINK</span>
                <h3 className="text-lg font-bold font-mono text-slate-100 flex items-center gap-2">
                  <Navigation
                    className="w-4 h-4 text-blue-500"
                    style={{ transform: `rotate(${selectedFlight.heading}deg)` }}
                  />
                  {selectedFlight.callsign}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedFlight(null);
                  setSimulationData(null);
                }}
                className="p-1 rounded bg-blue-950/30 border border-blue-900/30 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-950/30 p-2 rounded border border-blue-950/30">
                <span className="text-[9px] font-mono text-slate-500 uppercase">ICAO24 HEX</span>
                <span className="text-xs font-mono font-bold text-slate-300 uppercase">{selectedFlight.icao24}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-950/30 p-2 rounded border border-blue-950/30">
                <span className="text-[9px] font-mono text-slate-500 uppercase">ORIGIN REGION</span>
                <span className="text-xs font-mono font-bold text-slate-300 truncate max-w-[150px]">
                  {selectedFlight.origin_country}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950/30 p-2 rounded border border-blue-950/30">
                  <span className="block text-[8px] font-mono text-slate-500 uppercase">ALTITUDE</span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {selectedFlight.altitude ? `${selectedFlight.altitude.toLocaleString()} m` : "0 m"}
                  </span>
                  <span className="block text-[7px] text-slate-600 font-mono mt-0.5">
                    {selectedFlight.altitude ? `~${Math.round(selectedFlight.altitude * 3.28084).toLocaleString()} ft` : "0 ft"}
                  </span>
                </div>
                
                <div className="bg-slate-950/30 p-2 rounded border border-blue-950/30">
                  <span className="block text-[8px] font-mono text-slate-500 uppercase">VELOCITY</span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {selectedFlight.velocity ? `${selectedFlight.velocity} km/h` : "0 km/h"}
                  </span>
                  <span className="block text-[7px] text-slate-600 font-mono mt-0.5">
                    {selectedFlight.velocity ? `~${Math.round(selectedFlight.velocity * 0.539957)} kts` : "0 kts"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-blue-950/40 pb-4">
                <div className="bg-slate-950/30 p-2 rounded border border-blue-950/30">
                  <span className="block text-[8px] font-mono text-slate-500 uppercase">COORDINATES</span>
                  <span className="text-[9px] font-mono font-bold text-slate-300 block truncate">
                    LAT: {selectedFlight.latitude.toFixed(4)}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-slate-300 block truncate">
                    LON: {selectedFlight.longitude.toFixed(4)}
                  </span>
                </div>

                <div className="bg-slate-950/30 p-2 rounded border border-blue-950/30 flex flex-col justify-between">
                  <div>
                    <span className="block text-[8px] font-mono text-slate-500 uppercase">HEADING</span>
                    <span className="text-xs font-mono font-bold text-slate-200">{selectedFlight.heading}°</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Compass className="w-3 h-3 text-blue-500 animate-spin" style={{ animationDuration: '6s' }} />
                    <span className="text-[7px] font-mono text-slate-600">MAGNETIC YAW</span>
                  </div>
                </div>
              </div>

              {/* Nearest Maritime Vessel Display */}
              {nearestVessel && (
                <div className="bg-teal-950/15 border border-teal-900/40 p-3 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5 text-teal-400">
                    <svg className="w-3.5 h-3.5 text-teal-500 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.64 2.62.99 4 .99h2v-2h-2zM3.93 11L2 17h20l-1.93-6H3.93zm3.57-6l-1.2 3.6L12 12l5.7-3.4-1.2-3.6H7.5z"/>
                    </svg>
                    <span className="text-[9px] font-mono font-bold tracking-wider uppercase">NEAREST MARITIME VESSEL</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-bold text-slate-200">{nearestVessel.name}</span>
                      <span className="block text-[8px] text-slate-500 uppercase">{nearestVessel.type}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-bold text-teal-400 font-mono">{nearestVessel.distance} km</span>
                      <span className="block text-[7px] text-slate-600 font-mono">PROXIMITY</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ATC / SAR Emergency Helpline */}
              {(() => {
                const helpline = getHelplineForCountry(selectedFlight.origin_country);
                return (
                  <div className="bg-red-950/20 border border-red-900/40 p-3 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5 text-red-400">
                      <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                      <span className="text-[9px] font-mono font-bold tracking-wider uppercase">EMERGENCY ATC/SAR LIAISON</span>
                    </div>
                    <div className="space-y-0.5 select-text">
                      <span className="block text-[10px] font-bold text-slate-200">{helpline.agency}</span>
                      <span className="block text-[11px] font-mono font-bold text-red-400 cursor-pointer">{helpline.number}</span>
                      <p className="text-[8px] text-slate-500 leading-normal">{helpline.description}</p>
                    </div>
                  </div>
                );
              })()}

              {/* SIMULATE CRASH ACTION ENGINE */}
              <div className="pt-2">
                <button
                  onClick={() => runCrashSimulation(selectedFlight)}
                  disabled={simulating || selectedFlight.on_ground}
                  className={`w-full py-3 rounded-lg font-mono text-xs tracking-wider border font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                    selectedFlight.on_ground
                      ? "bg-slate-950/20 border-slate-900 text-slate-700 cursor-not-allowed"
                      : simulating
                      ? "bg-blue-950/40 border-blue-800/80 text-blue-300 cursor-wait animate-pulse"
                      : "bg-red-950/40 border-red-900/60 text-red-400 hover:bg-red-950/70 hover:border-red-500 hover:text-red-300 shadow-lg shadow-red-900/10"
                  }`}
                >
                  <ShieldAlert className={`w-4 h-4 ${simulating ? "animate-spin" : ""}`} />
                  {selectedFlight.on_ground 
                    ? "ASSET GROUNDED" 
                    : simulating 
                    ? "RUNNING PHYSICS HUD..." 
                    : "SIMULATE CRASH"}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* BOTTOM FLOATING TACTICAL SIMULATION HUD */}
        {simulationData && (
          <div className="absolute bottom-6 left-6 right-6 md:left-6 md:right-auto md:w-[calc(100%-20rem)] max-w-4xl z-[1000] rounded-xl border border-blue-950/70 bg-[#040817]/90 backdrop-blur-md shadow-2xl p-5 font-mono text-[10px] space-y-4 select-none">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-blue-950/60 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-bold text-slate-200 tracking-wider">CRASH TRAJECTORY HUD & DRIFT METRICS</span>
              </div>
              <button 
                onClick={() => setSimulationData(null)}
                className="text-slate-500 hover:text-slate-300 p-0.5 border border-blue-900/30 rounded bg-blue-950/20"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Calculations & Weather grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Column 1: Descent glide math */}
              <div className="bg-slate-950/40 p-3 rounded-lg border border-blue-950/40 space-y-2">
                <span className="block text-[8px] text-blue-400 font-bold uppercase">1. GLIDE descent (PIP)</span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">GLIDE DISTANCE:</span>
                    <span className="text-slate-300 font-bold">{simulationData.glide_distance_km} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">IMPACT COORD:</span>
                    <span className="text-slate-300 font-bold">
                      {simulationData.impact_point[0].toFixed(4)}, {simulationData.impact_point[1].toFixed(4)}
                    </span>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-blue-950/30">
                  <span className="block text-[7px] text-slate-600 uppercase font-bold mb-1">Glide Equation:</span>
                  <code className="text-slate-400 text-[8px] bg-[#02050f]/80 p-1.5 rounded block whitespace-pre-wrap leading-relaxed">
                    {simulationData.equations.glide}
                  </code>
                </div>
              </div>

              {/* Column 2: Ocean leeway drift math */}
              <div className="bg-slate-950/40 p-3 rounded-lg border border-blue-950/40 space-y-2">
                <span className="block text-[8px] text-yellow-500 font-bold uppercase">2. LEEWAY DEBRIS DRIFT (6H)</span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">DRIFT RANGE:</span>
                    <span className="text-slate-300 font-bold">{simulationData.drift_distance_km} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SEARCH CENTER:</span>
                    <span className="text-slate-300 font-bold">
                      {simulationData.drift_point[0].toFixed(4)}, {simulationData.drift_point[1].toFixed(4)}
                    </span>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-blue-950/30">
                  <span className="block text-[7px] text-slate-600 uppercase font-bold mb-1">Drift Equation (3% coefficient):</span>
                  <code className="text-slate-400 text-[8px] bg-[#02050f]/80 p-1.5 rounded block whitespace-pre-wrap leading-relaxed">
                    {simulationData.equations.drift}
                  </code>
                </div>
              </div>

              {/* Column 3: Local weather & waves math */}
              <div className="bg-slate-950/40 p-3 rounded-lg border border-blue-950/40 space-y-2">
                <span className="block text-[8px] text-cyan-400 font-bold uppercase">3. WEATHER & WAVE PROFILE</span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">LOCAL WIND SPEED:</span>
                    <span className="text-slate-300 font-bold">{simulationData.wind_speed_ms} m/s ({Math.round(simulationData.wind_speed_ms * 3.6)} km/h)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">EST. WAVE HEIGHT:</span>
                    <span className="text-slate-300 font-bold">{simulationData.wave_height_meters} m</span>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-blue-950/30">
                  <span className="block text-[7px] text-slate-600 uppercase font-bold mb-1">Sea State Equation:</span>
                  <code className="text-slate-400 text-[8px] bg-[#02050f]/80 p-1.5 rounded block whitespace-pre-wrap leading-relaxed">
                    {simulationData.equations.waves}
                  </code>
                </div>
              </div>

            </div>

            {/* AI Reasoning Narrative */}
            <div className="bg-blue-950/10 border border-blue-950/50 p-3.5 rounded-lg space-y-1">
              <span className="block text-[8px] text-blue-400 font-bold uppercase">AI IMPACT ANALYTICS (GEMINI REASONING ENGINE)</span>
              <p className="text-slate-300 text-[9px] leading-relaxed">
                {simulationData.narrative}
              </p>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
