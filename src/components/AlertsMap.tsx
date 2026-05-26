"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

interface Flight {
  icao24: string;
  callsign: string;
  origin_country: string;
  altitude: number;
  velocity: number;
  heading: number;
}

interface AlertsMapProps {
  latitude: number;
  longitude: number;
  locationName: string;
  activeFlights?: Flight[];
}

// Controller component to pan the map automatically when the center shifts
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, 6, { animate: true, duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

// Custom pulsing Red Alert Pin
const getAlertIcon = () => {
  return L.divIcon({
    className: "alert-target-icon",
    html: `<div class="relative flex items-center justify-center">
             <div class="absolute w-8 h-8 rounded-full bg-cyan-500/40 animate-ping"></div>
             <div class="w-4.5 h-4.5 rounded-full bg-cyan-600 border-2 border-slate-100 shadow-[0_0_15px_#06b6d4]"></div>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Custom rotating airplane pointer
const getFlightIcon = (heading: number) => {
  return L.divIcon({
    className: "flight-marker-icon-alert",
    html: `<div style="transform: rotate(${heading}deg)" class="flex items-center justify-center text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.7)]">
             <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="#0e7490" stroke-width="1.5">
               <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3-1 3 1v-1.5L14 19v-5.5l8 2.5z"/>
             </svg>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

export default function AlertsMap({ latitude, longitude, locationName, activeFlights = [] }: AlertsMapProps) {
  const isValidNum = (v: any): boolean => typeof v === 'number' && !isNaN(v);
  const mapCenter: [number, number] = [
    isValidNum(latitude) ? latitude : 20.0,
    isValidNum(longitude) ? longitude : 0.0
  ];

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-blue-950/60 shadow-inner">
      <MapContainer
        center={mapCenter}
        zoom={4}
        preferCanvas={true}
        zoomControl={false}
        className="w-full h-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapController center={mapCenter} />

        {/* Pulse red marker at crash location */}
        {isValidNum(latitude) && isValidNum(longitude) && latitude !== 0 && longitude !== 0 && (
          <Marker position={[latitude, longitude]} icon={getAlertIcon()}>
            <Popup>
              <div className="p-2 text-xs font-mono bg-slate-950/90 text-cyan-200 border border-blue-950/40 rounded">
                <span className="font-bold text-cyan-400 uppercase block border-b border-blue-950 pb-1 mb-1">REPORTED IMPACT SITE</span>
                <span className="block">LOC: {locationName}</span>
                <span className="block">LAT/LON: {latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Correlated Active Flights in the Area */}
        {isValidNum(latitude) && isValidNum(longitude) && activeFlights.map((f, idx) => {
          // If flight doesn't have offset, offset it slightly for display relative to crash center
          const offsetLat = latitude + (idx === 0 ? 0.2 : idx === 1 ? -0.25 : 0.15);
          const offsetLon = longitude + (idx === 0 ? -0.3 : idx === 1 ? 0.2 : -0.2);

          return (
            <Marker
              key={`${f.icao24}-${idx}`}
              position={[offsetLat, offsetLon]}
              icon={getFlightIcon(f.heading || 0)}
            >
              <Popup>
                <div className="p-2 text-xs font-mono bg-slate-950/90 text-cyan-200 border border-blue-950/40 rounded">
                  <span className="font-bold text-cyan-400 uppercase block border-b border-blue-950 pb-1 mb-1">CORRELATED FLIGHT</span>
                  <span className="block">CALLSIGN: {f.callsign || "N/A"}</span>
                  <span className="block">ALTITUDE: {f.altitude}m</span>
                  <span className="block">VELOCITY: {f.velocity}km/h</span>
                  <span className="block">HEADING: {f.heading}°</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Coordinate HUD overlay */}
      <div className="absolute bottom-3 left-3 z-20 bg-slate-950/80 border border-blue-950/60 p-2.5 rounded text-[10px] font-mono text-cyan-400 select-none shadow-md backdrop-blur-sm">
        <span className="block text-cyan-400 font-bold uppercase mb-0.5">TACTICAL RADAR BOX</span>
        <span>LAT: {latitude.toFixed(4)} | LON: {longitude.toFixed(4)}</span>
      </div>
    </div>
  );
}
