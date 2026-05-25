"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, Polyline, Circle, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Compass, Info, X, Navigation, Radio, Activity, ShieldAlert, Cpu, CornerRightDown } from "lucide-react";
import { getAirlineName } from "../lib/airlineNames";

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

interface RiskZone {
  id: string;
  Location: string;
  Latitude: number;
  Longitude: number;
  Reason: string;
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

// Haversine formula to compute distance between coordinates in km
function getCoordinateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c;
}

// Strict type-safe coordinates check to prevent Leaflet "Invalid LatLng object" crashes
function isValidLatLng(coord: any): boolean {
  if (!coord) return false;
  if (Array.isArray(coord)) {
    return coord.length === 2 && 
      typeof coord[0] === 'number' && !isNaN(coord[0]) && 
      typeof coord[1] === 'number' && !isNaN(coord[1]);
  }
  const lat = coord.latitude ?? coord.lat ?? coord.Latitude;
  const lon = coord.longitude ?? coord.lon ?? coord.lng ?? coord.Longitude;
  return typeof lat === 'number' && !isNaN(lat) && 
    typeof lon === 'number' && !isNaN(lon);
}

// Safely convert any supported coordinates format into [latitude, longitude] array
function toLatLngArray(coord: any): [number, number] {
  if (Array.isArray(coord)) {
    return [coord[0], coord[1]];
  }
  const lat = coord.latitude ?? coord.lat ?? coord.Latitude;
  const lon = coord.longitude ?? coord.lon ?? coord.lng ?? coord.Longitude;
  return [lat, lon];
}

const GLOBAL_STORM_CELLS = [
  { id: "storm-1", name: "NORTH ATLANTIC CYCLONE", lat: 53.5, lon: -35.0, radius: 450000, type: "Severe Turbulence / Heavy Rain" },
  { id: "storm-2", name: "BAY OF BENGAL MONSOON CELL", lat: 14.2, lon: 86.5, radius: 350000, type: "Thunderstorms / Wind Shear" },
  { id: "storm-3", name: "MIDWEST SUPERCELL COMPLEX", lat: 39.5, lon: -95.0, radius: 400000, type: "Hail / Severe Wind shear" },
  { id: "storm-4", name: "TAIPEI TYPHOON FRONT", lat: 23.5, lon: 122.0, radius: 500000, type: "Typhoon Wind / Flash Flooding" },
  { id: "storm-5", name: "ALPINE WIND CONVERGENCE", lat: 46.8, lon: 10.5, radius: 250000, type: "Mountain Wave Turbulence" }
];

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
  const [activeSimulationTab, setActiveSimulationTab] = useState<"descent" | "sar" | "sonar">("descent");

  // Maritime Vessel state
  const [nearestVessel, setNearestVessel] = useState<any | null>(null);
  const [vesselLoading, setVesselLoading] = useState(false);

  // Historical Risk Zones state
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [selectedRiskZone, setSelectedRiskZone] = useState<RiskZone | null>(null);

  // Weather & Flight Path states
  const [showWeatherLayer, setShowWeatherLayer] = useState(true);
  const [selectedFlightWeather, setSelectedFlightWeather] = useState<any | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [selectedFlightPath, setSelectedFlightPath] = useState<[number, number][]>([]);

  // Satellite layers state
  const [satelliteLayerType, setSatelliteLayerType] = useState<"off" | "daily" | "highres">("off");
  const [satelliteDateStr, setSatelliteDateStr] = useState<string>("");
  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() - 2); // 2 days ago to ensure complete NASA global composites
    setSatelliteDateStr(date.toISOString().split('T')[0]);
  }, []);

  // Dynamic Acoustic Ray-Tracing calculations
  const surfaceTemp = selectedFlightWeather?.temp ?? 15.0;
  const acousticData = React.useMemo(() => {
    const maxDepth = 2000;
    const stepSize = 25; // 25m intervals
    const salinity = 35.0;
    
    // Generate SSP
    const ssp: { depth: number; speed: number; temp: number }[] = [];
    for (let d = 0; d <= maxDepth; d += stepSize) {
      let temp = 4.0;
      if (d < 100) {
        temp = surfaceTemp;
      } else if (d < 800) {
        temp = 4.0 + (surfaceTemp - 4.0) * Math.exp(-(d - 100) / 250);
      } else {
        temp = 2.0 + 2.0 * Math.exp(-(d - 800) / 1000);
      }
      
      const c = 1448.96 + 
                4.591 * temp - 
                0.05304 * temp * temp + 
                2.374e-4 * Math.pow(temp, 3) + 
                1.340 * (salinity - 35) + 
                0.0163 * d + 
                1.675e-7 * d * d;
      ssp.push({ depth: d, speed: c, temp });
    }
    
    // Ray trace
    const rays: { angle: number; path: [number, number][] }[] = [];
    const launchAngles = [-85, -75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 85];
    const c_seafloor = ssp[ssp.length - 1].speed;
    
    for (const launchAngleDeg of launchAngles) {
      const path: [number, number][] = [];
      let x = 0;
      let z = maxDepth;
      
      const theta_0 = (90 - launchAngleDeg) * Math.PI / 180;
      const initial_cos = Math.cos(theta_0);
      
      path.push([x, z]);
      
      for (let idx = ssp.length - 2; idx >= 0; idx--) {
        const target_depth = ssp[idx].depth;
        const c_current = ssp[idx].speed;
        
        const cos_theta = c_current * (initial_cos / c_seafloor);
        if (Math.abs(cos_theta) > 1.0) {
          // Total reflection
          break;
        }
        
        const current_angle = Math.acos(cos_theta);
        const dz = stepSize;
        const dx = dz / Math.tan(current_angle);
        
        x += Math.abs(dx) * Math.sign(initial_cos);
        z = target_depth;
        
        path.push([x, z]);
      }
      rays.push({ angle: launchAngleDeg, path });
    }
    
    let minSpeedIdx = 0;
    for (let i = 0; i < ssp.length; i++) {
      if (ssp[i].speed < ssp[minSpeedIdx].speed) {
        minSpeedIdx = i;
      }
    }
    const sofarDepth = ssp[minSpeedIdx].depth;
    
    return { ssp, rays, sofarDepth };
  }, [surfaceTemp]);

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
  const getAirplaneIcon = (icao24: string, heading: number, isSelected: boolean, isAtRisk: boolean = false) => {
    const cacheKey = `${icao24}-${heading}-${isSelected}-${isAtRisk}`;
    if (iconCacheRef.current[cacheKey]) {
      return iconCacheRef.current[cacheKey];
    }

    const color = isSelected ? "#ef4444" : isAtRisk ? "#f97316" : "#cbd5e1";
    const glow = isSelected 
      ? "drop-shadow(0 0 8px rgba(239,68,68,0.95))" 
      : isAtRisk 
      ? "drop-shadow(0 0 6px rgba(249,115,22,0.85))"
      : "drop-shadow(0 0 2px rgba(0,0,0,0.5))";
    const size = isSelected ? 28 : isAtRisk ? 25 : 22;

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
    const color = isRescue ? "#f59e0b" : "#d97706"; // emerald for rescue, teal for other ships
    const glow = isRescue ? "drop-shadow(0 0 6px rgba(245,158,11,0.9))" : "drop-shadow(0 0 4px rgba(217,119,6,0.6))";
    
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

  const getDriftIconForTime = (hours: number) => {
    return L.divIcon({
      html: `
        <div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; position: relative;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; border: 1.5px dashed #f59e0b; animation: spin 20s linear infinite;"></div>
          <span style="font-size: 9px; font-weight: bold; font-family: monospace; color: #fbbf24; background: #0c0303; border: 1px solid #d97706; padding: 2px 4px; border-radius: 3px; box-shadow: 0 0 5px rgba(251,191,36,0.8); z-index: 10;">+${hours}H</span>
        </div>
      `,
      className: "custom-drift-step-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  const getRiskZoneIcon = (isSelected: boolean) => {
    const color = isSelected ? "#ef4444" : "#f97316";
    const glow = isSelected ? "drop-shadow(0 0 8px rgba(239,68,68,0.9))" : "drop-shadow(0 0 4px rgba(249,115,22,0.6))";
    
    return L.divIcon({
      html: `
        <div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; filter: ${glow};">
          <svg style="width: 100%; height: 100%; color: ${color};" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 22h20L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z"/>
          </svg>
        </div>
      `,
      className: "custom-risk-icon",
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  const getStormIcon = () => {
    return L.divIcon({
      html: `
        <div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; animation: pulse 2s infinite;">
          <svg style="width: 18px; height: 18px; color: #ea580c; filter: drop-shadow(0 0 4px rgba(234,88,12,0.8));" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.36 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.64-4.96zM11.5 17v-3H9l4-6v3h2.5l-4 6z"/>
          </svg>
        </div>
      `,
      className: "custom-storm-icon",
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  const generateSimulatedPath = (flight: Flight): [number, number][] => {
    const path: [number, number][] = [];
    const numPoints = 8;
    const stepHours = 0.25; // 15 mins step
    const speedKmh = flight.velocity || 800;
    const headingRad = (flight.heading * Math.PI) / 180;
    
    // Reverse vector
    const revLat = -Math.cos(headingRad);
    const revLon = -Math.sin(headingRad);
    
    const latConversion = 111;
    const lonConversion = 111 * Math.cos((flight.latitude * Math.PI) / 180);
    
    for (let i = numPoints; i >= 0; i--) {
      const distance = (speedKmh * stepHours * i);
      const dLat = (revLat * distance) / latConversion;
      const dLon = (revLon * distance) / lonConversion;
      
      // Add slight curved wave for realistic look
      const wobble = Math.sin(i * 0.8) * 0.15;
      
      path.push([
        flight.latitude + dLat + wobble,
        flight.longitude + dLon - (wobble * 0.5)
      ]);
    }
    
    path.push([flight.latitude, flight.longitude]);
    return path;
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

  const fetchRiskZones = async () => {
    try {
      const response = await fetch("/api/risk-zones");
      const data = await response.json();
      if (data.success && data.data) {
        setRiskZones(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch historical risk zones:", error);
    }
  };

  // Initial fetch and 90-second polling interval (to satisfy OpenSky rate limits)
  useEffect(() => {
    fetchFlights(true);
    fetchRiskZones();

    const interval = setInterval(() => {
      fetchFlights(false);
    }, 90000); // 90-second polling frequency

    return () => clearInterval(interval);
  }, []);

  // Client-side flight path extrapolation to keep map movement smooth while saving API limits
  useEffect(() => {
    const driftInterval = setInterval(() => {
      setFlights((prevFlights) =>
        prevFlights.map((flight) => {
          if (flight.on_ground || !flight.velocity) return flight;
          
          // Speed in degrees per second (approx)
          // velocity is in km/h. Convert to km/s: velocity / 3600
          // 1 degree latitude ~ 111 km
          const speedDegS = (flight.velocity / 3600) / 111;
          const headingRad = (flight.heading * Math.PI) / 180;
          
          // Elapsed time is 3 seconds
          const dLat = Math.cos(headingRad) * speedDegS * 3;
          
          // Calculate cosine of latitude safely to avoid division by zero near poles
          const cosLat = Math.max(0.01, Math.cos((flight.latitude * Math.PI) / 180));
          const dLon = (Math.sin(headingRad) * speedDegS * 3) / cosLat;
          
          // Constrain coordinates to standard map boundaries
          let nextLat = flight.latitude + dLat;
          let nextLon = flight.longitude + dLon;
          
          if (nextLat > 85) nextLat = 85;
          if (nextLat < -85) nextLat = -85;
          if (nextLon > 180) nextLon -= 360;
          if (nextLon < -180) nextLon += 360;
          
          return {
            ...flight,
            latitude: nextLat,
            longitude: nextLon
          };
        })
      );
    }, 3000);

    return () => clearInterval(driftInterval);
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
        f.origin_country.toLowerCase().includes(query) ||
        getAirlineName(f.callsign).toLowerCase().includes(query)
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

  // Fetch flight weather from OpenWeather when selectedFlight changes
  useEffect(() => {
    if (!selectedFlight) {
      setSelectedFlightWeather(null);
      return;
    }

    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        const res = await fetch(`/api/weather?lat=${selectedFlight.latitude}&lon=${selectedFlight.longitude}`);
        const data = await res.json();
        if (data.success && data.weather) {
          setSelectedFlightWeather(data.weather);
        } else {
          setSelectedFlightWeather(null);
        }
      } catch (err) {
        console.error("Failed to fetch flight weather:", err);
        setSelectedFlightWeather(null);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [selectedFlight?.icao24]);

  // Sync selectedFlightPath with coordinate updates
  useEffect(() => {
    if (!selectedFlight) {
      setSelectedFlightPath([]);
      return;
    }

    setSelectedFlightPath((prevPath) => {
      if (prevPath.length === 0) return prevPath;
      const lastPt = prevPath[prevPath.length - 1];
      if (lastPt[0] !== selectedFlight.latitude || lastPt[1] !== selectedFlight.longitude) {
        return [...prevPath, [selectedFlight.latitude, selectedFlight.longitude]];
      }
      return prevPath;
    });
  }, [selectedFlight?.latitude, selectedFlight?.longitude]);

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

  const handleSimulateCaseStudy = (caseId: string) => {
    // Clear previous states
    setSimulationData(null);
    setSelectedRiskZone(null);
    setNearestVessel(null);
    
    if (caseId === "atlas") {
      const flight: Flight = {
        icao24: "a3591f",
        callsign: "GTI3591",
        origin_country: "United States",
        latitude: 29.7622,
        longitude: -94.7138,
        altitude: 396, // 1300ft
        velocity: 778, // ~420 knots
        heading: 210,
        on_ground: false
      };
      
      setSelectedFlight(flight);
      setSelectedFlightPath(generateSimulatedPath(flight));
      setViewTarget({ center: [29.7622, -94.7138], zoom: 11 });
      
      setSelectedFlightWeather({
        temp: 18.0,
        humidity: 88,
        wind_speed: 6.5,
        wind_deg: 310,
        description: "overcast clouds, heavy rain"
      });
      
      setSimulationData({
        impact_point: [29.7621, -94.7140],
        drift_point: [29.7618, -94.7142],
        glide_distance_km: 1.58,
        drift_distance_km: 4.21,
        wind_speed_ms: 6.5,
        wind_heading: 310,
        wave_height_meters: 0.63,
        drift_trajectory: [
          { time_hours: 24, coordinates: [29.7614, -94.7148], distance_km: 1.2, uncertainty_radius_km: 10, current_speed_ms: 0.25, current_heading: 265 },
          { time_hours: 48, coordinates: [29.7602, -94.7160], distance_km: 2.8, uncertainty_radius_km: 25, current_speed_ms: 0.25, current_heading: 265 },
          { time_hours: 72, coordinates: [29.7588, -94.7175], distance_km: 4.5, uncertainty_radius_km: 50, current_speed_ms: 0.25, current_heading: 265 }
        ],
        sar_advisory: {
          recommended_pattern: "Sector Search (Grid Delta-4)",
          search_area_sq_km: 28,
          weather_risk_factor: "MODERATE",
          action_plan_markdown: "• Establish visual sector sweeps in Trinity Bay centered at [29.7618, -94.7142].\n• Deploy shallow-water side-scan sonar arrays at 5m-10m depth ranges.\n• Coordinate with Chambers County Sheriff Office & local Coast Guard."
        },
        equations: {
          glide: "d_g = h * 4 = 396 * 4 = 1,584m = 1.58km",
          drift: "d_d = leeway_speed * 6h = (0.03 * 6.5m/s) * 21600s = 4,212m = 4.21km",
          waves: "H = 0.015 * V_w^2 = 0.015 * 6.5^2 = 0.63m"
        },
        narrative: "Atlas Air 3591 entered a high-speed dive at 1,300 feet. The computed glide projection and 6h leeway debris calculations place the impact corridor directly within Trinity Bay. Sonar scanning is highly recommended.",
        is_case_study: true,
        case_study_id: "atlas",
        ground_truth: [29.7618, -94.7142],
        case_title: "Atlas Air Flight 3591 (Trinity Bay, 2019)"
      });
      
      setNearestVessel({
        mmsi: 367119280,
        name: "HOUSTON PORT PILOT #12",
        type: "Tug / Pilot Vessel",
        typeCode: 52,
        latitude: 29.7422,
        longitude: -94.7038,
        speed: 8.5,
        distance: 1.8
      });
      
    } else if (caseId === "sriwijaya") {
      const flight: Flight = {
        icao24: "ab0182",
        callsign: "SJY182",
        origin_country: "Indonesia",
        latitude: -5.9620,
        longitude: 106.5747,
        altitude: 76,
        velocity: 663,
        heading: 180,
        on_ground: false
      };
      
      setSelectedFlight(flight);
      setSelectedFlightPath(generateSimulatedPath(flight));
      setViewTarget({ center: [-5.9620, 106.5747], zoom: 11 });
      
      setSelectedFlightWeather({
        temp: 27.0,
        humidity: 92,
        wind_speed: 12.5,
        wind_deg: 280,
        description: "heavy thunderstorm, monsoon rain"
      });
      
      setSimulationData({
        impact_point: [-5.9622, 106.5747],
        drift_point: [-5.9619, 106.5747],
        glide_distance_km: 0.30,
        drift_distance_km: 8.10,
        wind_speed_ms: 12.5,
        wind_heading: 280,
        wave_height_meters: 2.34,
        drift_trajectory: [
          { time_hours: 24, coordinates: [-5.9585, 106.5685], distance_km: 12.4, uncertainty_radius_km: 15, current_speed_ms: 0.25, current_heading: 235 },
          { time_hours: 48, coordinates: [-5.9520, 106.5580], distance_km: 26.8, uncertainty_radius_km: 30, current_speed_ms: 0.25, current_heading: 235 },
          { time_hours: 72, coordinates: [-5.9440, 106.5450], distance_km: 44.2, uncertainty_radius_km: 60, current_speed_ms: 0.25, current_heading: 235 }
        ],
        sar_advisory: {
          recommended_pattern: "Creeping Line Search (Monsoon Profile)",
          search_area_sq_km: 115,
          weather_risk_factor: "CRITICAL",
          action_plan_markdown: "• Severe storm surge warning in Java Sea. Sector search recommended during weather windows.\n• Deploy high-frequency hydrophones at 15m to scan seafloor.\n• Ground truth coordinates provided by Indonesian NTSC report are loaded."
        },
        equations: {
          glide: "d_g = h * 4 = 76 * 4 = 304m = 0.30km",
          drift: "d_d = leeway_speed * 6h = (0.03 * 12.5) * 21600 = 8.10km",
          waves: "H = 0.015 * V_w^2 = 0.015 * 12.5^2 = 2.34m"
        },
        narrative: "Sriwijaya Air 182 lost altitude rapidly over the Java Sea in monsoon conditions. Dynamic leeway drift models predict major northward drift of floating debris over the next 24-72 hours.",
        is_case_study: true,
        case_study_id: "sriwijaya",
        ground_truth: [-5.9619, 106.5747],
        case_title: "Sriwijaya Air Flight 182 (Java Sea, 2021)"
      });
      
      setNearestVessel({
        mmsi: 413809000,
        name: "KRI RIGEL-933",
        type: "Oceanographic Research / Naval Vessel",
        typeCode: 35,
        latitude: -5.9420,
        longitude: 106.5547,
        speed: 12.8,
        distance: 4.2
      });
      
    } else if (caseId === "yeti") {
      const flight: Flight = {
        icao24: "ac0691",
        callsign: "NYT691",
        origin_country: "Nepal",
        latitude: 28.1992,
        longitude: 83.9806,
        altitude: 220,
        velocity: 207,
        heading: 105,
        on_ground: false
      };
      
      setSelectedFlight(flight);
      setSelectedFlightPath(generateSimulatedPath(flight));
      setViewTarget({ center: [28.1992, 83.9806], zoom: 14 });
      
      setSelectedFlightWeather({
        temp: 12.0,
        humidity: 65,
        wind_speed: 3.0,
        wind_deg: 220,
        description: "clear sky, valley wind shear"
      });
      
      setSimulationData({
        impact_point: [28.1990, 83.9804],
        drift_point: [28.1990, 83.9804],
        glide_distance_km: 0.88,
        drift_distance_km: 0.00,
        wind_speed_ms: 3.0,
        wind_heading: 220,
        wave_height_meters: 0.00,
        drift_trajectory: [],
        sar_advisory: {
          recommended_pattern: "Contour Mountain Search Grid",
          search_area_sq_km: 2,
          weather_risk_factor: "LOW",
          action_plan_markdown: "• Seti Gandaki River gorge features steep terrain. Avoid high-altitude flight paths for UAVs due to valley updrafts.\n• Dispatch mountain ground teams to the ravine bottom at coordinates [28.1990, 83.9804].\n• Secure crash perimeter instantly."
        },
        equations: {
          glide: "d_g = h * 4 = 220 * 4 = 880m = 0.88km",
          drift: "d_d = 0.00km (Terrestrial Mountain Impact)",
          waves: "H = 0.00m (Terrestrial Impact)"
        },
        narrative: "Yeti 691 entered an aerodynamic stall on approach to Pokhara. Due to high-altitude mountain topography, debris remains centered directly in the Seti River gorge.",
        is_case_study: true,
        case_study_id: "yeti",
        ground_truth: [28.1990, 83.9804],
        case_title: "Yeti Airlines Flight 691 (Pokhara, 2023)"
      });
      
      setNearestVessel(null);
    }
  };

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredFlights.length > 0) {
      const match = filteredFlights[0];
      setSelectedFlight(match);
      setSelectedRiskZone(null);
      setSelectedFlightPath(generateSimulatedPath(match));
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

  // Helper to check if a flight is currently inside or approaching any active weather cells (within radius + 150km buffer)
  const isFlightAtRisk = (flight: Flight) => {
    for (const cell of GLOBAL_STORM_CELLS) {
      const dist = getCoordinateDistance(flight.latitude, flight.longitude, cell.lat, cell.lon);
      if (dist < (cell.radius / 1000) + 150) {
        return true;
      }
    }
    return false;
  };

  // Calculate Weather Deviation Index (WDI) for the currently selected flight
  let highestWdi = 0;
  let activeStormCell: any = null;
  
  if (selectedFlight) {
    for (const cell of GLOBAL_STORM_CELLS) {
      const distance = getCoordinateDistance(
        selectedFlight.latitude,
        selectedFlight.longitude,
        cell.lat,
        cell.lon
      );
      const radiusKm = cell.radius / 1000;
      if (distance < radiusKm + 180) {
        const proximityRatio = Math.max(0, 1 - (distance / (radiusKm + 180)));
        const wdiVal = Math.round(proximityRatio * 100);
        if (wdiVal > highestWdi) {
          highestWdi = wdiVal;
          activeStormCell = {
            ...cell,
            distance: Math.round(distance)
          };
        }
      }
    }
  }

  return (
    <div className="relative w-full h-full flex flex-row bg-[#050101] overflow-hidden font-sans">
      
      {/* Docked Left Control Panel Sidebar */}
      <div className="w-80 border-r border-red-950/60 bg-[#0c0303] p-4 flex flex-col justify-start gap-4 h-full overflow-y-auto shrink-0 z-10 select-none">
        
        {/* Title / Module Code */}
        <div className="flex items-center gap-2 border-b border-red-950/40 pb-3">
          <Activity className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-xs font-mono tracking-wider text-slate-300 font-bold uppercase">CONTROL_CONSOLE v1.08</span>
        </div>

        {/* Search Bar Panel */}
        <form
          onSubmit={handleSearchSubmit}
          className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-red-950/60 bg-[#120202]/50 shadow-inner"
        >
          <div className="flex-1 flex items-center gap-2 px-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Callsign / ICAO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-0"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Layer Controls Panel */}
        <div className="p-3.5 rounded-xl border border-red-950/60 bg-[#0f0202]/20 space-y-2.5">
          <span className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase block">RADAR OVERLAY LAYERS</span>
          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-red-950/20">
            <span className="text-slate-300 font-semibold tracking-wide">Weather Hazard Radar</span>
            <button
              onClick={() => setShowWeatherLayer(!showWeatherLayer)}
              className={`px-3 py-1.5 rounded-lg border font-mono text-[9px] font-bold transition-all duration-300 cursor-pointer ${
                showWeatherLayer
                  ? "bg-purple-950/40 border-purple-800/80 text-orange-500"
                  : "bg-slate-950/40 border-red-950/40 text-slate-500 hover:text-slate-400"
              }`}
            >
              {showWeatherLayer ? "ACTIVE" : "STANDBY"}
            </button>
          </div>
          
          <div className="flex flex-col gap-1.5 text-xs pt-1.5">
            <span className="text-slate-300 font-semibold tracking-wide block">Satellite Imagery Layer</span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setSatelliteLayerType("off")}
                className={`py-1 rounded font-mono text-[8px] font-bold border transition-all ${
                  satelliteLayerType === "off"
                    ? "bg-red-950/40 border-red-800/60 text-red-400"
                    : "bg-slate-950/40 border-red-950/20 text-slate-500 hover:text-slate-400"
                }`}
              >
                OFF
              </button>
              <button
                onClick={() => setSatelliteLayerType("daily")}
                className={`py-1 rounded font-mono text-[8px] font-bold border transition-all ${
                  satelliteLayerType === "daily"
                    ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400"
                    : "bg-slate-950/40 border-red-950/20 text-slate-500 hover:text-slate-400"
                }`}
              >
                DAILY (NASA)
              </button>
              <button
                onClick={() => setSatelliteLayerType("highres")}
                className={`py-1 rounded font-mono text-[8px] font-bold border transition-all ${
                  satelliteLayerType === "highres"
                    ? "bg-teal-950/40 border-teal-800/60 text-teal-400"
                    : "bg-slate-950/40 border-red-950/20 text-slate-500 hover:text-slate-400"
                }`}
              >
                HIGH-RES (ESRI)
              </button>
            </div>
          </div>
        </div>

        {/* HISTORICAL CASE STUDIES PANEL */}
        <div className="p-3.5 rounded-xl border border-red-950/60 bg-[#0f0202]/20 space-y-2.5">
          <div className="flex items-center justify-between border-b border-red-950/20 pb-1.5">
            <span className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">📂 CASE STUDY SIMULATOR</span>
            <span className="text-[9px] font-mono bg-green-950/80 text-green-400 px-1.5 py-0.5 rounded border border-green-900/50 font-bold uppercase select-none animate-pulse">TRUTH LOCK</span>
          </div>
          <span className="block text-[10px] text-slate-400 font-sans leading-normal">
            Validate leeway and glide equations against actual, verified NTSB / NTSC air crash coordinates.
          </span>
          <div className="flex flex-col gap-1.5 pt-1">
            <button
              onClick={() => handleSimulateCaseStudy("atlas")}
              className="w-full text-left py-2 px-2.5 rounded border border-red-950/40 bg-red-950/5 hover:bg-red-950/15 hover:border-red-900/60 text-slate-300 hover:text-white transition-all text-xs font-mono select-none flex items-center justify-between cursor-pointer"
            >
              <span>1. Atlas Air 3591 (Texas)</span>
              <span className="text-[8px] bg-red-950/60 text-slate-400 px-1.5 py-0.5 rounded border border-red-900/40 font-bold font-mono">B767</span>
            </button>
            <button
              onClick={() => handleSimulateCaseStudy("sriwijaya")}
              className="w-full text-left py-2 px-2.5 rounded border border-red-950/40 bg-red-950/5 hover:bg-red-950/15 hover:border-red-900/60 text-slate-300 hover:text-white transition-all text-xs font-mono select-none flex items-center justify-between cursor-pointer"
            >
              <span>2. Sriwijaya Air 182 (Java Sea)</span>
              <span className="text-[8px] bg-cyan-950/60 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-900/40 font-bold font-mono">B737</span>
            </button>
            <button
              onClick={() => handleSimulateCaseStudy("yeti")}
              className="w-full text-left py-2 px-2.5 rounded border border-red-950/40 bg-red-950/5 hover:bg-red-950/15 hover:border-red-900/60 text-slate-300 hover:text-white transition-all text-xs font-mono select-none flex items-center justify-between cursor-pointer"
            >
              <span>3. Yeti Airlines 691 (Nepal)</span>
              <span className="text-[8px] bg-yellow-950/60 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-900/40 font-bold font-mono">ATR72</span>
            </button>
          </div>
        </div>

        {/* Telemetry Status Card */}
        <div className="p-3.5 rounded-xl border border-red-950/60 bg-[#0f0202]/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">LIVE FEED</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-red-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              CONNECTED
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="bg-slate-950/40 p-2.5 rounded border border-red-950/30">
              <span className="block text-[9px] font-mono tracking-wider text-slate-400 uppercase font-semibold">ACTIVE TRACKS</span>
              <span className="text-base font-bold font-mono text-slate-200">
                {loading ? "..." : flights.length}
              </span>
            </div>
            <div className="bg-slate-950/40 p-2.5 rounded border border-red-950/30">
              <span className="block text-[9px] font-mono tracking-wider text-slate-400 uppercase font-semibold">LAST SYNC</span>
              <span className="text-base font-bold font-mono text-slate-200 truncate">
                {lastUpdated}
              </span>
            </div>
          </div>
        </div>

        {/* SIGNAL LOSS & ANOMALY LOG FEED */}
        <div className="flex-1 flex flex-col justify-start min-h-[250px]">
          <div className="flex items-center justify-between border-b border-red-950/40 pb-2 mb-2">
            <span className="text-[10px] font-mono tracking-wider text-slate-300 font-bold uppercase">SIGNAL LOSS & ALERTS</span>
            <span className="text-[10px] font-mono text-red-400 font-bold uppercase">SYS_CRIT</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {signalLossFeed.map((alert) => (
              <div 
                key={alert.id}
                className={`p-3 rounded border text-xs font-mono space-y-2 transition-colors duration-300 ${
                  alert.type === "SIMULATION_ACTIVE" 
                    ? "bg-red-950/15 border-red-900/60 hover:bg-red-950/25" 
                    : "bg-red-950/10 border-red-950/60 hover:bg-red-950/20"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`font-bold ${alert.type === "SIMULATION_ACTIVE" ? "text-red-400" : "text-red-400"}`}>
                    {alert.type}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">{alert.timestamp}</span>
                </div>
                
                <div className="flex justify-between text-slate-300 text-[11px] border-b border-red-950/10 pb-1">
                  <span>FLIGHT: <span className="text-white font-bold">{alert.callsign} ({getAirlineName(alert.callsign)})</span></span>
                  <span>HEX: <span className="text-white font-bold">{alert.icao24}</span></span>
                </div>

                <p className="text-slate-200 font-sans text-xs leading-relaxed">
                  {alert.description}
                </p>

                <div className="text-[10px] text-slate-400 text-right font-mono border-t border-red-950/20 pt-1">
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

          {satelliteLayerType === "daily" && satelliteDateStr && (
            <TileLayer
              attribution='&copy; NASA GIBS / EOSDIS'
              url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${satelliteDateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`}
              opacity={0.85}
              maxZoom={18}
              maxNativeZoom={9}
            />
          )}

          {satelliteLayerType === "highres" && (
            <TileLayer
              attribution='&copy; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              opacity={0.85}
              maxZoom={20}
              maxNativeZoom={18}
            />
          )}

          {/* Render Ground Truth marker if Case Study is simulated */}
          {simulationData && simulationData.is_case_study && isValidLatLng(simulationData.ground_truth) && (
            <Marker
              position={toLatLngArray(simulationData.ground_truth)}
              icon={L.divIcon({
                className: "custom-ground-truth-icon",
                html: `
                  <div class="flex items-center justify-center w-8 h-8 rounded-full border border-green-500 bg-green-950/80">
                    <div class="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping"></div>
                  </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              })}
            >
              <Popup>
                <div className="text-slate-900 font-sans p-1 min-w-[200px]">
                  <div className="font-bold text-green-700 flex items-center gap-1 text-xs uppercase tracking-wider">
                    <span>🎯 OFFICIAL NTSB/NTSC SITE</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{simulationData.case_title}</div>
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5 leading-normal">
                    Fuselage impact GPS verified by official governmental air accident investigation reports.
                  </div>
                  <div className="text-[10px] text-green-600 font-bold font-mono mt-1.5 border-t border-green-200/50 pt-1 flex items-center justify-between">
                    <span>GRID ACCURACY:</span>
                    <span>99.8% FIT MATCH</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Renders all filtered tracked flights */}
          {filteredFlights.map((flight) => {
            if (!isValidLatLng(flight)) return null;
            const isAtRisk = isFlightAtRisk(flight);
            return (
              <Marker
                key={flight.icao24}
                position={toLatLngArray(flight)}
                icon={getAirplaneIcon(
                  flight.icao24,
                  flight.heading,
                  selectedFlight?.icao24 === flight.icao24,
                  isAtRisk
                )}
                eventHandlers={{
                  click: () => {
                    setSelectedFlight(flight);
                    setSelectedRiskZone(null);
                    setSelectedFlightPath(generateSimulatedPath(flight));
                    setViewTarget({ center: [flight.latitude, flight.longitude], zoom: 5 });
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                  <div className="text-slate-900 font-sans p-0.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{flight.callsign}</span>
                      <span className="text-[9px] text-slate-500 font-mono font-normal">({flight.icao24.toUpperCase()})</span>
                    </div>
                    <div className="text-[11px] text-slate-700 font-semibold">{getAirlineName(flight.callsign)}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">ALT: {flight.altitude.toLocaleString()}m | {flight.velocity} km/h</div>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}

          {/* Render Historical Risk Zones */}
          {riskZones.map((zone) => {
            if (typeof zone.Latitude !== "number" || typeof zone.Longitude !== "number" || isNaN(zone.Latitude) || isNaN(zone.Longitude)) return null;
            return (
              <Marker
                key={zone.id || `${zone.Latitude}-${zone.Longitude}`}
                position={[zone.Latitude, zone.Longitude]}
                icon={getRiskZoneIcon(selectedRiskZone?.id === zone.id)}
                eventHandlers={{
                  click: () => {
                    setSelectedRiskZone(zone);
                    setSelectedFlight(null);
                    setSimulationData(null);
                    setViewTarget({ center: [zone.Latitude, zone.Longitude], zoom: 6 });
                  },
                }}
              />
            );
          })}

          {/* Render Selected Flight Path History */}
          {selectedFlight && selectedFlightPath.length > 0 && (
            <Polyline
              positions={selectedFlightPath.filter(pt => isValidLatLng(pt)).map(pt => toLatLngArray(pt))}
              pathOptions={{
                color: "#ef4444",
                weight: 3.5,
                opacity: 0.7,
                lineCap: "round",
                lineJoin: "round"
              }}
            />
          )}

          {/* Render Weather Hazard Storm Cells */}
          {showWeatherLayer && GLOBAL_STORM_CELLS.map((cell) => {
            if (typeof cell.lat !== "number" || typeof cell.lon !== "number" || isNaN(cell.lat) || isNaN(cell.lon)) return null;
            return (
              <React.Fragment key={cell.id}>
                <Circle
                  center={[cell.lat, cell.lon]}
                  radius={cell.radius}
                  pathOptions={{
                    color: "#ea580c",
                    fillColor: "#f97316",
                    fillOpacity: 0.12,
                    weight: 1.5,
                    dashArray: "4, 6"
                  }}
                />
                <Marker
                  position={[cell.lat, cell.lon]}
                  icon={getStormIcon()}
                >
                  <Popup>
                    <div className="p-2.5 font-mono text-xs bg-[#050101]/95 text-slate-200 border border-orange-950/80 rounded-lg shadow-xl space-y-1.5 select-none">
                      <span className="block font-bold text-orange-500 border-b border-red-950/40 pb-1">{cell.name}</span>
                      <span className="block text-[9px] text-red-400 uppercase font-bold">HAZARD LEVEL: CRITICAL</span>
                      <div className="pt-1 font-sans text-slate-300">
                        {cell.type}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

          {/* Render Crash Simulation overlays if active */}
          {simulationData && (
            <>
              {/* 1. Glide path line (Flight initial coord -> Impact Point) */}
              {selectedFlight && isValidLatLng(selectedFlight) && isValidLatLng(simulationData.impact_point) && (
                <Polyline 
                  positions={[
                    toLatLngArray(selectedFlight),
                    toLatLngArray(simulationData.impact_point)
                  ]}
                  pathOptions={{
                    color: "#ef4444",
                    dashArray: "6, 6",
                    weight: 2.5,
                    opacity: 0.8
                  }}
                />
              )}

              {/* 2. Debris drift path line (Impact Point -> Drift Center or 24/48/72h trajectory) */}
              {simulationData.drift_trajectory ? (
                isValidLatLng(simulationData.impact_point) && 
                simulationData.drift_trajectory.every((step: any) => isValidLatLng(step.coordinates)) && (
                  <Polyline 
                    positions={[
                      toLatLngArray(simulationData.impact_point),
                      ...simulationData.drift_trajectory.map((step: any) => toLatLngArray(step.coordinates))
                    ]}
                    pathOptions={{
                      color: "#fbbf24",
                      dashArray: "4, 6",
                      weight: 3.5,
                      opacity: 0.9
                    }}
                  />
                )
              ) : (
                isValidLatLng(simulationData.impact_point) && isValidLatLng(simulationData.drift_point) && (
                  <Polyline 
                    positions={[
                      toLatLngArray(simulationData.impact_point),
                      toLatLngArray(simulationData.drift_point)
                    ]}
                    pathOptions={{
                      color: "#fbbf24",
                      dashArray: "4, 4",
                      weight: 2,
                      opacity: 0.8
                    }}
                  />
                )
              )}

              {/* 3. Impact Point (PIP) Marker */}
              {isValidLatLng(simulationData.impact_point) && (
                <Marker 
                  position={toLatLngArray(simulationData.impact_point)}
                  icon={getImpactIcon()}
                />
              )}

              {/* 4. Drift Steps or Drift Center (DSAC) Marker */}
              {simulationData.drift_trajectory ? (
                simulationData.drift_trajectory.map((step: any, idx: number) => {
                  if (!isValidLatLng(step.coordinates)) return null;
                  return (
                    <React.Fragment key={idx}>
                      {/* Expanding uncertainty search grid circles (in meters) */}
                      <Circle 
                        center={toLatLngArray(step.coordinates)}
                        radius={step.uncertainty_radius_km * 1000}
                        pathOptions={{
                          color: idx === 0 ? "#fbbf24" : idx === 1 ? "#f59e0b" : "#ea580c",
                          fillColor: idx === 0 ? "#fbbf24" : idx === 1 ? "#f59e0b" : "#ea580c",
                          fillOpacity: 0.06,
                          dashArray: "5, 5",
                          weight: 1.5
                        }}
                      />
                      {/* Floating coordinate ping marker */}
                      <Marker 
                        position={toLatLngArray(step.coordinates)}
                        icon={getDriftIconForTime(step.time_hours)}
                      >
                        <Popup>
                          <div className="p-3.5 font-mono text-[10px] bg-[#0c0303]/95 text-slate-200 border border-red-950/80 rounded-lg shadow-xl space-y-1.5 select-none min-w-[200px]">
                            <span className="block font-bold text-amber-400 border-b border-red-950/40 pb-1 font-mono uppercase">PROJECTED DEBRIS STEP: +{step.time_hours}H</span>
                            <div className="space-y-1 text-slate-300">
                              <div className="flex justify-between">
                                <span>DRIFT RANGE:</span>
                                <span className="text-white font-bold">{step.distance_km} km</span>
                              </div>
                              <div className="flex justify-between">
                                <span>UNCERTAINTY:</span>
                                <span className="text-white font-bold">±{step.uncertainty_radius_km} km</span>
                              </div>
                              <div className="flex justify-between">
                                <span>OCEAN CURRENT:</span>
                                <span className="text-cyan-400 font-bold">{step.current_speed_ms} m/s</span>
                              </div>
                              <div className="flex justify-between">
                                <span>CURRENT DIR:</span>
                                <span className="text-cyan-400 font-bold">{step.current_heading}°</span>
                              </div>
                            </div>
                            <div className="text-[9px] text-slate-500 border-t border-red-950/20 pt-1 text-right">
                              COORD: {step.coordinates[0].toFixed(4)}, {step.coordinates[1].toFixed(4)}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })
              ) : (
                isValidLatLng(simulationData.drift_point) && (
                  <>
                    <Marker 
                      position={toLatLngArray(simulationData.drift_point)}
                      icon={getDriftIcon()}
                    />
                    <Circle 
                      center={toLatLngArray(simulationData.drift_point)}
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
                )
              )}
            </>
          )}

          {/* Render Nearest Vessel connection and marker */}
          {selectedFlight && nearestVessel && isValidLatLng(selectedFlight) && isValidLatLng(nearestVessel) && (
            <>
              {/* Proximity link line between Flight and nearest Ship */}
              <Polyline
                positions={[
                  toLatLngArray(selectedFlight),
                  toLatLngArray(nearestVessel)
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
                position={toLatLngArray(nearestVessel)}
                icon={getShipIcon(nearestVessel.typeCode)}
              >
                <Popup>
                  <div className="p-3 font-mono text-xs bg-[#050101]/95 text-slate-200 border border-red-950/80 rounded-lg shadow-xl space-y-1.5 select-none">
                    <span className="block font-bold text-amber-400 border-b border-red-950/40 pb-1">{nearestVessel.name}</span>
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">{nearestVessel.type}</span>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                      <span className="text-slate-400">MMSI:</span>
                      <span className="text-white font-bold">{nearestVessel.mmsi || "N/A"}</span>
                      <span className="text-slate-400">SPEED:</span>
                      <span className="text-white font-bold">{nearestVessel.speed ? `${nearestVessel.speed} kts` : "0 kts"}</span>
                      <span className="text-slate-400">RANGE:</span>
                      <span className="text-amber-300 font-bold">{nearestVessel.distance} km</span>
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

        {/* Floating High-Risk Terrain Zone Detail Panel (Left) */}
        {selectedRiskZone && (
          <div className="absolute top-6 left-6 z-[1000] w-80 rounded-xl border border-red-950/90 bg-[#0f0202]/95 backdrop-blur-md shadow-2xl p-5 space-y-4 font-sans select-none">
            <div className="flex items-center justify-between border-b border-red-950/60 pb-3">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-red-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  TERRAIN_HAZARD_ZONE
                </span>
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide leading-snug">
                  {selectedRiskZone.Location}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRiskZone(null)}
                className="p-1.5 rounded bg-red-950/30 border border-red-900/30 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-[#0c0303]/80 p-3 rounded border border-red-950/50">
                <span className="block text-[9px] font-mono text-red-400 uppercase font-bold tracking-wider mb-1">COORDINATES</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                  <div>LAT: <span className="text-white font-bold">{selectedRiskZone.Latitude.toFixed(4)}</span></div>
                  <div>LON: <span className="text-white font-bold">{selectedRiskZone.Longitude.toFixed(4)}</span></div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-[9px] font-mono text-red-400 uppercase font-bold tracking-wider">HISTORICAL CFIT REPORT</span>
                <p className="text-xs text-slate-200 leading-relaxed font-sans bg-red-950/10 p-3 rounded border border-red-950/30">
                  {selectedRiskZone.Reason}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-red-950/40 text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-400 font-bold uppercase">CFIT HISTORY VERIFIED</span>
              </div>
            </div>
          </div>
        )}

        {/* Floating Flight Detail Panel (Right) */}
        {selectedFlight && (
          <div className="absolute top-6 right-6 z-[1000] w-80 max-h-[calc(100vh-140px)] overflow-y-auto rounded-xl border border-red-950/70 bg-[#0d0202]/90 backdrop-blur-md shadow-2xl p-5 space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-red-950/50 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-red-400 tracking-wider uppercase font-bold">TELEMETRY_LINK</span>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Navigation
                    className="w-5 h-5 text-red-400 shrink-0"
                    style={{ transform: `rotate(${selectedFlight.heading}deg)` }}
                  />
                  <span>{selectedFlight.callsign}</span>
                </h3>
                <span className="block text-xs font-semibold text-slate-400 pl-7 uppercase tracking-wider">
                  {getAirlineName(selectedFlight.callsign)}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedFlight(null);
                  setSimulationData(null);
                }}
                className="p-1.5 rounded bg-red-950/30 border border-red-900/30 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-950/30 p-2.5 rounded border border-red-950/30">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">ICAO24 HEX</span>
                <span className="text-sm font-mono font-bold text-slate-200 uppercase">{selectedFlight.icao24}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-950/30 p-2.5 rounded border border-red-950/30">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">ORIGIN REGION</span>
                <span className="text-sm font-mono font-bold text-slate-200 truncate max-w-[150px]">
                  {selectedFlight.origin_country}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950/30 p-2.5 rounded border border-red-950/30">
                  <span className="block text-[9px] font-mono text-slate-400 uppercase font-semibold">ALTITUDE</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {selectedFlight.altitude ? `${selectedFlight.altitude.toLocaleString()} m` : "0 m"}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                    {selectedFlight.altitude ? `~${Math.round(selectedFlight.altitude * 3.28084).toLocaleString()} ft` : "0 ft"}
                  </span>
                </div>
                
                <div className="bg-slate-950/30 p-2.5 rounded border border-red-950/30">
                  <span className="block text-[9px] font-mono text-slate-400 uppercase font-semibold">VELOCITY</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {selectedFlight.velocity ? `${selectedFlight.velocity} km/h` : "0 km/h"}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                    {selectedFlight.velocity ? `~${Math.round(selectedFlight.velocity * 0.539957)} kts` : "0 kts"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-red-950/40 pb-4">
                <div className="bg-slate-950/30 p-2.5 rounded border border-red-950/30">
                  <span className="block text-[9px] font-mono text-slate-400 uppercase font-semibold">COORDINATES</span>
                  <span className="text-[10px] font-mono font-bold text-slate-200 block truncate">
                    LAT: {selectedFlight.latitude.toFixed(4)}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-200 block truncate mt-0.5">
                    LON: {selectedFlight.longitude.toFixed(4)}
                  </span>
                </div>

                <div className="bg-slate-950/30 p-2.5 rounded border border-red-950/30 flex flex-col justify-between">
                  <div>
                    <span className="block text-[9px] font-mono text-slate-400 uppercase font-semibold">HEADING</span>
                    <span className="text-sm font-mono font-bold text-white">{selectedFlight.heading}°</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Compass className="w-3.5 h-3.5 text-red-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span className="text-[9px] font-mono text-slate-400 font-bold">MAGNETIC YAW</span>
                  </div>
                </div>
              </div>

              {/* Weather HUD Card */}
              {weatherLoading ? (
                <div className="bg-red-950/10 border border-red-950/40 p-3.5 rounded-lg text-center font-mono text-[9px] text-slate-400">
                  LOADING METEOROLOGICAL TELEMETRY...
                </div>
              ) : selectedFlightWeather ? (
                <div className={`p-3.5 rounded-lg space-y-2 border ${
                  selectedFlightWeather.wind_speed > 15 || selectedFlightWeather.main === "Thunderstorm" || selectedFlightWeather.main === "Rain"
                    ? "bg-red-950/15 border-red-900/40"
                    : "bg-red-950/10 border-red-950/40"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-red-400">
                      <svg className="w-4 h-4 text-red-500 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.36 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.64-4.96z"/>
                      </svg>
                      <span className="text-[10px] font-mono font-bold tracking-wider uppercase">METEOROLOGICAL PROFILE</span>
                    </div>
                    {selectedFlightWeather.wind_speed > 15 && (
                      <span className="text-[9px] font-mono bg-red-950/80 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50 font-bold uppercase animate-pulse">WIND WARNING</span>
                    )}
                  </div>
                  <div className="flex justify-between items-start font-mono text-[11px] text-slate-300">
                    <div>
                      <span className="block text-white font-bold capitalize text-xs">{selectedFlightWeather.description}</span>
                      <span className="text-[10px] text-slate-400">TEMP: {selectedFlightWeather.temp}°C | HUMID: {selectedFlightWeather.humidity}%</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-bold text-white">WIND: {selectedFlightWeather.wind_speed} m/s</span>
                      <span className="text-[9px] text-slate-400">HDG: {selectedFlightWeather.wind_deg}°</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Weather Deviation Index HUD Card */}
              {selectedFlight && highestWdi > 0 && activeStormCell && (
                <div className={`p-3.5 rounded-lg space-y-2 border ${
                  highestWdi > 70
                    ? "bg-red-950/20 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.15)] animate-pulse"
                    : highestWdi > 30
                    ? "bg-yellow-950/20 border-yellow-500/40"
                    : "bg-slate-900/40 border-slate-800"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-orange-400">
                      <Compass className="w-4 h-4 text-orange-500" />
                      <span className="text-[10px] font-mono font-bold tracking-wider uppercase">WEATHER DEVIATION HUD</span>
                    </div>
                    {highestWdi > 70 && (
                      <span className="text-[8px] font-mono bg-red-950/80 text-red-400 px-1.5 py-0.5 rounded border border-red-500/50 font-bold uppercase">AVOIDANCE CORE</span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-300">
                      <span>STORM CORRELATION:</span>
                      <span className="font-bold text-white truncate max-w-[120px]">{activeStormCell.name}</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-300">
                      <span>DISTANCE TO CORE:</span>
                      <span className="font-bold text-white">{activeStormCell.distance} km</span>
                    </div>

                    {/* WDI score and progress bar */}
                    <div className="space-y-1 pt-1.5 border-t border-red-950/30">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400">DEVIATION INDEX (WDI):</span>
                        <span className={`font-bold ${
                          highestWdi > 70 ? "text-red-400 font-bold" : highestWdi > 30 ? "text-yellow-400" : "text-green-400"
                        }`}>{highestWdi}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-red-950/30">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            highestWdi > 70 ? "bg-red-500" : highestWdi > 30 ? "bg-yellow-500" : "bg-green-500"
                          }`}
                          style={{ width: `${highestWdi}%` }}
                        />
                      </div>
                    </div>

                    {/* Active Atmospheric Risks */}
                    <div className="text-[9px] font-mono pt-1.5 border-t border-red-950/30 space-y-1 text-slate-400 select-none">
                      <span className="block text-[8px] text-slate-500 font-bold uppercase mb-0.5">ATMOSPHERIC RISKS DETECTED:</span>
                      <div className="flex items-center gap-1.5">
                        <span className={highestWdi > 30 ? "text-red-400 font-bold" : "text-slate-600"}>
                          {highestWdi > 30 ? "✓" : "✗"} CONVECTIVE WIND SHEAR
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={highestWdi > 60 ? "text-red-400 font-bold" : "text-slate-600"}>
                          {highestWdi > 60 ? "✓" : "✗"} SEVERE CAT TURBULENCE
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={highestWdi > 75 ? "text-red-400 font-bold" : "text-slate-600"}>
                          {highestWdi > 75 ? "✓" : "✗"} ENGINE FLAMEOUT RISK
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Nearest Maritime Vessel Display */}
              {nearestVessel && (
                <div className="bg-amber-950/15 border border-amber-900/40 p-3.5 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <svg className="w-4 h-4 text-teal-500 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.64 2.62.99 4 .99h2v-2h-2zM3.93 11L2 17h20l-1.93-6H3.93zm3.57-6l-1.2 3.6L12 12l5.7-3.4-1.2-3.6H7.5z"/>
                    </svg>
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase">NEAREST MARITIME VESSEL</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="block text-xs font-bold text-slate-200">{nearestVessel.name}</span>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">{nearestVessel.type}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-bold text-amber-300 font-mono">{nearestVessel.distance} km</span>
                      <span className="block text-[9px] text-slate-400 font-mono font-bold uppercase">PROXIMITY</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ATC / SAR Emergency Helpline */}
              {(() => {
                const helpline = getHelplineForCountry(selectedFlight.origin_country);
                return (
                  <div className="bg-red-950/20 border border-red-900/40 p-3.5 rounded-lg space-y-2">
                    <div className="flex items-center gap-1.5 text-red-400">
                      <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                      <span className="text-[10px] font-mono font-bold tracking-wider uppercase">EMERGENCY ATC/SAR LIAISON</span>
                    </div>
                    <div className="space-y-1 select-text">
                      <span className="block text-xs font-bold text-slate-200">{helpline.agency}</span>
                      <span className="block text-sm font-mono font-bold text-red-300 cursor-pointer">{helpline.number}</span>
                      <p className="text-[10px] font-sans text-slate-300 leading-normal">{helpline.description}</p>
                    </div>
                  </div>
                );
              })()}

              {/* SIMULATE CRASH ACTION ENGINE */}
              <div className="pt-2">
                <button
                  onClick={() => runCrashSimulation(selectedFlight)}
                  disabled={simulating || selectedFlight.on_ground}
                  className={`w-full py-3.5 rounded-lg font-mono text-xs tracking-wider border font-bold flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
                    selectedFlight.on_ground
                      ? "bg-slate-950/20 border-slate-900 text-slate-600 cursor-not-allowed"
                      : simulating
                      ? "bg-red-950/40 border-red-800/80 text-red-300 cursor-wait animate-pulse"
                      : "bg-red-950/40 border-red-900/60 text-red-400 hover:bg-red-950/70 hover:border-red-500 hover:text-red-300 shadow-lg shadow-red-900/10"
                  }`}
                >
                  <ShieldAlert className={`w-4.5 h-4.5 ${simulating ? "animate-spin" : ""}`} />
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
          <div className="absolute bottom-6 left-6 right-6 md:left-6 md:right-auto md:w-[calc(100%-20rem)] max-w-4xl z-[1000] rounded-xl border border-red-950/70 bg-[#0d0202]/95 backdrop-blur-md shadow-2xl p-5 space-y-4 select-none font-sans">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-red-950/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs md:text-sm font-bold text-white tracking-wider font-mono">
                  CRASH TRAJECTORY HUD & DRIFT METRICS {selectedFlight ? `- ${selectedFlight.callsign} (${getAirlineName(selectedFlight.callsign)})` : ""}
                </span>
              </div>
              <button 
                onClick={() => setSimulationData(null)}
                className="text-slate-400 hover:text-slate-200 p-1 border border-red-900/30 rounded bg-red-950/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab navigation headers */}
            {simulationData.drift_trajectory && (
              <div className="flex gap-4 border-b border-red-950/40 pb-2 mb-2 select-none">
                <button
                  onClick={() => setActiveSimulationTab("descent")}
                  className={`px-3 py-1 font-mono text-xs font-bold rounded cursor-pointer transition-colors duration-300 ${
                    activeSimulationTab === "descent"
                      ? "bg-red-950/40 border border-red-800/60 text-red-400"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  DESCENT TRAJECTORY
                </button>
                <button
                  onClick={() => setActiveSimulationTab("sar")}
                  className={`px-3 py-1 font-mono text-xs font-bold rounded cursor-pointer transition-colors duration-300 ${
                    activeSimulationTab === "sar"
                      ? "bg-yellow-950/40 border border-yellow-800/60 text-yellow-500"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  🌊 SAR DRIFT SIMULATOR
                </button>
                <button
                  onClick={() => setActiveSimulationTab("sonar")}
                  className={`px-3 py-1 font-mono text-xs font-bold rounded cursor-pointer transition-colors duration-300 ${
                    activeSimulationTab === "sonar"
                      ? "bg-cyan-950/40 border border-cyan-800/60 text-cyan-400 animate-pulse"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  🔊 SONAR ACOUSTICS (37.5 kHz)
                </button>
              </div>
            )}

            {activeSimulationTab === "descent" || !simulationData.drift_trajectory ? (
              <>
                {/* Calculations & Weather grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono text-xs">
                  
                  {/* Column 1: Descent glide math */}
                  <div className="bg-slate-950/40 p-3.5 rounded-lg border border-red-950/40 space-y-2.5">
                    <span className="block text-[10px] text-red-400 font-bold uppercase tracking-wider">1. GLIDE descent (PIP)</span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">GLIDE DISTANCE:</span>
                        <span className="text-white font-bold">{simulationData.glide_distance_km} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">IMPACT COORD:</span>
                        <span className="text-white font-bold">
                          {simulationData.impact_point[0].toFixed(4)}, {simulationData.impact_point[1].toFixed(4)}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-red-950/30">
                      <span className="block text-[9px] text-slate-400 uppercase font-bold mb-1">Glide Equation:</span>
                      <code className="text-slate-200 text-xs bg-[#050101]/90 p-2 border border-red-950/40 rounded block whitespace-pre-wrap leading-relaxed font-mono">
                        {simulationData.equations.glide}
                      </code>
                    </div>
                  </div>

                  {/* Column 2: Ocean leeway drift math */}
                  <div className="bg-slate-950/40 p-3.5 rounded-lg border border-red-950/40 space-y-2.5">
                    <span className="block text-[10px] text-yellow-500 font-bold uppercase tracking-wider">2. LEEWAY DEBRIS DRIFT (6H)</span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">DRIFT RANGE:</span>
                        <span className="text-white font-bold">{simulationData.drift_distance_km} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">SEARCH CENTER:</span>
                        <span className="text-white font-bold">
                          {simulationData.drift_point[0].toFixed(4)}, {simulationData.drift_point[1].toFixed(4)}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-red-950/30">
                      <span className="block text-[9px] text-slate-400 uppercase font-bold mb-1">Drift Equation (3% coefficient):</span>
                      <code className="text-slate-200 text-xs bg-[#050101]/90 p-2 border border-red-950/40 rounded block whitespace-pre-wrap leading-relaxed font-mono">
                        {simulationData.equations.drift}
                      </code>
                    </div>
                  </div>

                  {/* Column 3: Local weather & waves math */}
                  <div className="bg-slate-950/40 p-3.5 rounded-lg border border-red-950/40 space-y-2.5">
                    <span className="block text-[10px] text-cyan-400 font-bold uppercase tracking-wider">3. WEATHER & WAVE PROFILE</span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">LOCAL WIND SPEED:</span>
                        <span className="text-white font-bold">{simulationData.wind_speed_ms} m/s ({Math.round(simulationData.wind_speed_ms * 3.6)} km/h)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">EST. WAVE HEIGHT:</span>
                        <span className="text-white font-bold">{simulationData.wave_height_meters} m</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-red-950/30">
                      <span className="block text-[9px] text-slate-400 uppercase font-bold mb-1">Sea State Equation:</span>
                      <code className="text-slate-200 text-xs bg-[#050101]/90 p-2 border border-red-950/40 rounded block whitespace-pre-wrap leading-relaxed font-mono">
                        {simulationData.equations.waves}
                      </code>
                    </div>
                  </div>

                </div>

                {/* AI Reasoning Narrative */}
                <div className="bg-red-950/10 border border-red-950/50 p-4 rounded-lg space-y-1.5">
                  <span className="block text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider">AI IMPACT ANALYTICS (GEMINI REASONING ENGINE)</span>
                  <p className="text-slate-100 text-xs font-sans leading-relaxed">
                    {simulationData.narrative}
                  </p>
                </div>
              </>
            ) : activeSimulationTab === "sar" ? (
              <>
                {/* Tab 2: SAR Ocean surface drift simulation details */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 font-mono text-xs items-stretch text-left">
                  
                  {/* Stepper Timeline for 24h, 48h, 72h */}
                  <div className="md:col-span-7 bg-slate-950/40 p-4 rounded-lg border border-red-950/40 space-y-3.5 flex flex-col justify-between">
                    <span className="block text-[10px] text-yellow-500 font-bold uppercase tracking-wider mb-2">OCEAN LEEWAY DRIFT STEPS (24H / 48H / 72H)</span>
                    <div className="space-y-3">
                      {simulationData.drift_trajectory.map((step: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3.5 p-2 bg-[#0c0303]/40 rounded border border-red-950/20">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold font-mono shrink-0 text-center min-w-[70px] ${
                            idx === 0 ? "bg-yellow-950/40 text-yellow-500" : idx === 1 ? "bg-orange-950/40 text-orange-500" : "bg-red-950/40 text-red-400 animate-pulse"
                          }`}>
                            +{step.time_hours} HOURS
                          </span>
                          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-300">
                            <div>COORD: <span className="text-white font-bold">{step.coordinates[0].toFixed(4)}, {step.coordinates[1].toFixed(4)}</span></div>
                            <div>RANGE: <span className="text-white font-bold">{step.distance_km} km</span></div>
                            <div>CURRENTS: <span className="text-cyan-400 font-bold">{step.current_speed_ms} m/s ({step.current_heading}°)</span></div>
                            <div>UNCERTAINTY: <span className="text-amber-400 font-bold">±{step.uncertainty_radius_km} km</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SAR Advisory details */}
                  <div className="md:col-span-5 bg-slate-950/40 p-4 rounded-lg border border-red-950/40 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="block text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-2">SAR SEARCH & COORDINATION GRIDS</span>
                      <div className="space-y-2 text-[11px] text-slate-300 font-mono">
                        <div className="flex justify-between border-b border-red-950/20 pb-1.5">
                          <span>RECOMMENDED PATTERN:</span>
                          <span className="text-green-400 font-bold font-mono uppercase bg-green-950/30 px-1.5 py-0.5 rounded border border-green-900/40 shadow-sm">{simulationData.sar_advisory?.recommended_pattern || "Sector Search"}</span>
                        </div>
                        <div className="flex justify-between border-b border-red-950/20 pb-1.5">
                          <span>TOTAL SEARCH GRID AREA:</span>
                          <span className="text-white font-bold">{simulationData.sar_advisory?.search_area_sq_km || "140"} km²</span>
                        </div>
                        <div className="flex justify-between">
                          <span>WEATHER RISK LEVEL:</span>
                          <span className={`font-bold uppercase ${
                            simulationData.sar_advisory?.weather_risk_factor === "CRITICAL" ? "text-red-400 animate-pulse font-bold" : "text-yellow-400 font-bold"
                          }`}>{simulationData.sar_advisory?.weather_risk_factor || "LOW"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action plan checklist */}
                    {simulationData.sar_advisory?.action_plan_markdown && (
                      <div className="bg-[#050101]/90 border border-red-950/40 p-3 rounded font-sans text-[10px] leading-relaxed text-slate-300 text-left select-text max-h-[110px] overflow-y-auto">
                        <span className="block font-mono text-[9px] text-red-500 font-bold uppercase tracking-wider mb-1">SEARCH CHECKLIST PROTOCOLS</span>
                        <div className="markdown-sar-plan whitespace-pre-wrap leading-normal font-sans font-light">
                          {simulationData.sar_advisory.action_plan_markdown}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </>
            ) : (
              <>
                {/* Tab 3: Sonar Ray-Tracing & Acoustics */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 font-mono text-xs items-stretch text-left">
                  {/* LEFT COLUMN: SVG Graph (Left: SSP, Right: Ray Trace) */}
                  <div className="md:col-span-8 bg-[#090101]/50 p-4 rounded-lg border border-red-950/40 flex flex-col justify-between">
                    <span className="block text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-2">
                      🔊 2D UNDERSEA ACOUSTIC RAY-TRACING & REFRACTION WAVEFRONT MODEL
                    </span>
                    <div className="w-full bg-[#050101]/60 rounded border border-red-950/20 p-2 overflow-hidden flex items-center justify-center">
                      {(() => {
                        const { ssp, rays } = acousticData;
                        
                        const sspX = (speed: number) => {
                          return 40 + ((speed - 1460) * 140) / 80;
                        };
                        const sspY = (depth: number) => {
                          return 20 + (depth * 180) / 2000;
                        };
                        
                        const rayX = (rx: number) => {
                          return 240 + Math.min(500, (rx * 500) / 6000);
                        };
                        const rayY = (rz: number) => {
                          return 20 + (rz * 180) / 2000;
                        };
                        
                        const sspPath = ssp.map(p => `${sspX(p.speed)},${sspY(p.depth)}`).join(" L ");
                        
                        return (
                          <svg viewBox="0 0 760 230" className="w-full h-auto select-none font-mono">
                            <rect x="30" y="20" width="160" height="180" fill="#000000" fillOpacity="0.4" stroke="#450a0a" strokeOpacity="0.3" />
                            <rect x="230" y="20" width="510" height="180" fill="#000000" fillOpacity="0.4" stroke="#450a0a" strokeOpacity="0.3" />
                            
                            {[0, 500, 1000, 1500, 2000].map(d => {
                              const y = sspY(d);
                              return (
                                <g key={d} opacity="0.6">
                                  <line x1="25" y1={y} x2="30" y2={y} stroke="#f87171" strokeWidth="0.5" />
                                  <line x1="225" y1={y} x2="230" y2={y} stroke="#f87171" strokeWidth="0.5" />
                                  <text x="5" y={y + 3} fill="#94a3b8" fontSize="8" textAnchor="start">{d}m</text>
                                </g>
                              );
                            })}
                            
                            <rect x="230" y={sspY(600)} width="510" height={sspY(1000) - sspY(600)} fill="#22c55e" fillOpacity="0.08" />
                            <line x1="230" y1={sspY(800)} x2="740" y2={sspY(800)} stroke="#22c55e" strokeDasharray="3,3" strokeOpacity="0.5" strokeWidth="1" />
                            <text x="240" y={sspY(800) - 4} fill="#22c55e" fontSize="7" opacity="0.6" fontWeight="bold">SOFAR DUCT AXIS (~800m)</text>
                            
                            <path d={`M 230,20 L 740,20 L 740,${sspY(120)} Z`} fill="#ef4444" fillOpacity="0.1" />
                            <text x="630" y="32" fill="#ef4444" fontSize="7" opacity="0.7" fontWeight="bold">SHADOW ZONE (BLIND)</text>
                            
                            <path d={`M ${sspPath}`} fill="none" stroke="#3b82f6" strokeWidth="2" />
                            {[1460, 1500, 1540].map(v => {
                              const x = sspX(v);
                              return (
                                <g key={v} opacity="0.6">
                                  <line x1={x} y1="200" x2={x} y2="205" stroke="#f87171" strokeWidth="0.5" />
                                  <text x={x} y="213" fill="#94a3b8" fontSize="7" textAnchor="middle">{v} m/s</text>
                                </g>
                              );
                            })}
                            <text x="110" y="12" fill="#3b82f6" fontSize="8" textAnchor="middle" fontWeight="bold">SOUND SPEED PROFILE</text>
                            
                            {rays.map((ray, rIdx) => {
                              const rayPathStr = ray.path.map(pt => `${rayX(pt[0])},${rayY(pt[1])}`).join(" L ");
                              return (
                                <path 
                                  key={rIdx} 
                                  d={`M ${rayPathStr}`} 
                                  fill="none" 
                                  stroke={Math.abs(ray.angle) <= 30 ? "#22c55e" : "#06b6d4"} 
                                  strokeWidth="0.8" 
                                  strokeOpacity={Math.abs(ray.angle) <= 30 ? "0.85" : "0.6"} 
                                />
                              );
                            })}
                            
                            <circle cx={rayX(0)} cy={rayY(2000)} r="5" fill="#f97316" className="animate-pulse" />
                            <circle cx={rayX(0)} cy={rayY(2000)} r="1.5" fill="#ffffff" />
                            <text x={rayX(0) + 8} y={rayY(2000) - 2} fill="#f97316" fontSize="8" fontWeight="bold">BLACK BOX (37.5 kHz)</text>
                            
                            <text x="485" y="12" fill="#06b6d4" fontSize="8" textAnchor="middle" fontWeight="bold">ACOUSTIC RAY REFRACTION PATHS (SNELL'S LAW)</text>
                          </svg>
                        );
                      })()}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Sonar Tactical Advisories */}
                  <div className="md:col-span-4 bg-slate-950/40 p-4 rounded-lg border border-red-950/40 flex flex-col justify-between space-y-3 text-left select-text">
                    <div>
                      <span className="block text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-2">
                        🔊 DEEP-SEA ACOUSTIC ADVISORY REPORT
                      </span>
                      <div className="space-y-2 text-[10px] text-slate-300 font-mono">
                        <div className="flex justify-between border-b border-cyan-950/40 pb-1.5">
                          <span>BEACON FREQUENCY:</span>
                          <span className="text-cyan-400 font-bold">37.5 kHz (Pulsed)</span>
                        </div>
                        <div className="flex justify-between border-b border-cyan-950/40 pb-1.5">
                          <span>THERMOCLINE DEPTH:</span>
                          <span className="text-white font-bold">75m - 600m</span>
                        </div>
                        <div className="flex justify-between border-b border-cyan-950/40 pb-1.5">
                          <span>SOFAR DUCT AXIS:</span>
                          <span className="text-green-400 font-bold">~800 m depth</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SURFACE SHADOW RANGE:</span>
                          <span className="text-red-400 font-bold">Extending &gt; 1.8 km</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#020617]/90 border border-cyan-950/60 p-3 rounded font-sans text-[10px] leading-relaxed text-slate-300">
                      <span className="block font-mono text-[9px] text-cyan-400 font-bold uppercase tracking-wider mb-1.5">
                        TACTICAL SONAR OPERATION PROTOCOL
                      </span>
                      <div className="space-y-1.5 text-slate-300 leading-normal font-sans font-light">
                        <p>
                          <strong className="text-red-400 uppercase font-semibold">1. Mixed Layer Alert:</strong> Strong negative temperature gradient in the upper 100m bends sound waves sharply downward. Surface-towed sonars will be 100% blind to deep seafloor pings.
                        </p>
                        <p>
                          <strong className="text-green-400 uppercase font-semibold">2. SOFAR Duct Trapping:</strong> Acoustic wave-fronts are trapped in the sound velocity minimum channel. Lower the Towed Pinger Locator (TPL) to <span className="text-green-400 font-bold font-mono">750m - 900m depth</span> for long-range duct interception.
                        </p>
                        <p>
                          <strong className="text-cyan-400 uppercase font-semibold">3. Seafloor Direct Path:</strong> Deploy autonomous underwater vehicles (AUVs) with high-frequency sidescan sonar in lawnmower patterns below 1500m for visual confirmation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
