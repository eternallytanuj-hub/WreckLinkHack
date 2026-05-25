"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Radio, 
  ExternalLink, 
  ShieldAlert, 
  Compass, 
  Activity, 
  Navigation,
  Globe,
  Clock,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface WreckAlert {
  id: string;
  created_at: string;
  title: string;
  url: string;
  image_url: string;
  location: string;
  latitude: number;
  longitude: number;
  telemetry: {
    active_flights?: Array<{
      icao24: string;
      callsign: string;
      origin_country: string;
      altitude: number;
      velocity: number;
      heading: number;
    }>;
    success?: boolean;
  };
  reasoning: string;
  is_verified: boolean;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vahxyslxfdpmroznukad.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaHh5c2x4ZmRwbXJvem51a2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTMyMDQsImV4cCI6MjA5NTI2OTIwNH0.2mwsOrDrSQFwMiewHRGLL43TDGBWOO7aJUktDe9eB-w";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function WebAlertsPage() {
  const [alerts, setAlerts] = useState<WreckAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  // Fetch initial alerts and establish WebSocket connection
  useEffect(() => {
    const fetchHistoricalAlerts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("wreck_alerts")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (data) {
          setAlerts(data);
        }
      } catch (err) {
        console.error("Failed to load historical wreck alerts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalAlerts();

    // Subscribe to INSERT events in the wreck_alerts table
    const channel = supabase
      .channel("wreck_alerts_websocket")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wreck_alerts" },
        (payload) => {
          console.log("Realtime INSERT event intercepted:", payload);
          const newAlert = payload.new as WreckAlert;
          // Prepend new alert to dashboard feed
          setAlerts((prev) => [newAlert, ...prev]);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
        } else {
          setConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-[#F8FAFC] flex flex-col antialiased selection:bg-blue-500/20 selection:text-blue-300">
      
      {/* Glassmorphic Navbar */}
      <header className="relative w-full z-50 border-b border-blue-950/40 bg-[#030712]/55 backdrop-blur-md select-none">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Radio className="w-4.5 h-4.5 text-white animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 group-hover:from-blue-400 group-hover:to-cyan-300 transition-colors duration-300">
              WRECK LINK
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 font-mono text-xs">
            <Link href="/" className="text-slate-500 hover:text-blue-400 tracking-widest transition-colors duration-300">
              DASHBOARD
            </Link>
            <Link href="/live-map" className="text-slate-500 hover:text-blue-400 tracking-widest transition-colors duration-300">
              LIVE_MAP
            </Link>
            <Link href="/public-alarms" className="text-slate-500 hover:text-blue-400 tracking-widest transition-colors duration-300">
              PUBLIC_ALARMS
            </Link>
            <span className="text-blue-400 tracking-widest border-b border-blue-500/30 pb-1">
              WEB_ALERTS
            </span>
          </nav>

          <div className="flex items-center gap-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono tracking-widest bg-blue-950/30 border border-blue-900/40 ${
              connected ? "text-blue-400" : "text-yellow-500"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-blue-400 animate-ping" : "bg-yellow-500 animate-pulse"}`} />
              {connected ? "SOCKET_ONLINE" : "SOCKET_CONNECTING"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Realtime Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left Panel: Animated Sky Radar Sweeper */}
        <div className="lg:col-span-4 space-y-6 select-none">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-wider text-slate-100 font-mono">AUTONOMOUS RADAR TRACKER</h1>
            <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">
              Event-driven pipeline scanning social streams for verified distress reports.
            </p>
          </div>

          <div className="rounded-xl border border-blue-950/60 bg-[#050b18]/25 p-6 flex flex-col items-center justify-center gap-6 min-h-[300px] relative overflow-hidden">
            {/* Radar circle sweeper */}
            <div className="relative w-48 h-48 rounded-full border border-blue-950/80 flex items-center justify-center bg-[#02050f]/80">
              {/* Range rings */}
              <div className="absolute w-36 h-36 rounded-full border border-blue-950/40" />
              <div className="absolute w-24 h-24 rounded-full border border-blue-950/20" />
              <div className="absolute w-12 h-12 rounded-full border border-blue-950/10" />
              
              {/* Crosshairs */}
              <div className="absolute w-full h-[1px] bg-blue-950/40" />
              <div className="absolute h-full w-[1px] bg-blue-950/40" />
              
              {/* Sweeping line */}
              <div className="absolute top-0 left-0 w-24 h-24 border-r border-blue-500/30 origin-bottom-right animate-[spin_4s_linear_infinite]" style={{ transformOrigin: "100% 100%" }} />
              
              {/* Pulsing signal center */}
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] relative z-10" />
            </div>

            <div className="text-center space-y-1 z-10">
              <span className="block text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase animate-pulse">
                SCANNERS INGESTING DATASTREAM...
              </span>
              <span className="block text-[8px] font-mono text-slate-600 uppercase">
                TARGET SUBREDDITS: r/aviation, r/news
              </span>
            </div>
          </div>
        </div>

        {/* Right Panel: Realtime Alert Logs Dashboard */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="flex justify-between items-center border-b border-blue-950/40 pb-3 select-none">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold">VERIFIED ALERTS FEED</span>
            <span className="text-[9px] font-mono text-blue-500">{alerts.length} ALERTS LOGGED</span>
          </div>

          {loading ? (
            /* Loading skeletons */
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 w-full rounded-xl border border-blue-950/60 bg-[#050b18]/25 p-5 animate-pulse flex gap-5">
                  <div className="w-32 bg-slate-950/50 rounded-lg border border-blue-950/30" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-slate-950/50 rounded w-3/4" />
                    <div className="h-3 bg-slate-950/50 rounded w-1/2" />
                    <div className="h-10 bg-slate-950/50 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <AnimatePresence initial={false}>
                {alerts.length === 0 ? (
                  /* Empty state */
                  <motion.div
                    key="empty-dashboard"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border border-blue-950/60 bg-[#050b18]/10 rounded-xl p-12 text-center flex flex-col items-center gap-3 select-none"
                  >
                    <Activity className="w-8 h-8 text-slate-600 animate-pulse" />
                    <div className="space-y-1">
                      <span className="text-xs font-mono font-bold text-slate-400 uppercase">NO ANOMALIES LOGGED YET</span>
                      <p className="text-[9px] font-mono text-slate-600 uppercase max-w-sm mx-auto leading-relaxed">
                        The dashboard is standing by. When the backend worker daemon identifies and validates an anomaly, it will flash here in real-time.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  alerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 20, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.5 }}
                      className="rounded-xl border border-blue-950/60 bg-[#050b18]/20 hover:bg-[#070e24]/40 hover:border-blue-800/40 p-5 flex flex-col md:flex-row gap-5 transition-all duration-300 shadow-xl shadow-slate-950/30 relative overflow-hidden"
                    >
                      {/* Top Glowing status indicator */}
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-red-500/20 to-transparent" />

                      {/* Left: Downloded Image Evidence from Supabase Storage */}
                      {alert.image_url && (
                        <div className="w-full md:w-40 h-32 relative rounded-lg border border-blue-950/60 bg-slate-950/60 overflow-hidden shrink-0 group select-none">
                          <img 
                            src={alert.image_url} 
                            alt={alert.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent pointer-events-none" />
                          
                          {/* Alert visual indicator */}
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[8px] font-mono font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-900/50">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            CRIT_IMAGERY
                          </div>
                        </div>
                      )}

                      {/* Right: Anomaly telemetry correlation & AI verdicts */}
                      <div className="flex-1 space-y-3.5 flex flex-col justify-between">
                        
                        <div className="space-y-2">
                          
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 select-none">
                            <h3 className="text-[12px] font-bold font-mono text-slate-100 uppercase tracking-wide leading-snug">
                              {alert.title}
                            </h3>
                            <div className="flex items-center gap-3 shrink-0 text-[8px] font-mono text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(alert.created_at).toLocaleTimeString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Globe className="w-2.5 h-2.5 text-blue-500" />
                                {alert.location}
                              </span>
                            </div>
                          </div>

                          {/* Groq reasoning paragraph */}
                          <p className="text-[9.5px] font-mono text-slate-300 leading-relaxed pt-1.5 border-t border-blue-950/20">
                            {alert.reasoning}
                          </p>

                        </div>

                        {/* Telemetry metadata grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end pt-2 border-t border-blue-950/20">
                          
                          {/* OpenSky Trackers */}
                          <div className="space-y-1.5">
                            <span className="block text-[7.5px] font-mono text-slate-500 tracking-wider uppercase select-none">
                              OpenSky Active Correlated Telemetry
                            </span>
                            {alert.telemetry?.active_flights && alert.telemetry.active_flights.length > 0 ? (
                              <div className="space-y-1">
                                {alert.telemetry.active_flights.slice(0, 2).map((f) => (
                                  <div key={f.icao24} className="flex justify-between items-center bg-slate-950/40 border border-blue-950/40 p-1.5 rounded font-mono text-[8px]">
                                    <span className="text-slate-300 font-bold flex items-center gap-1">
                                      <Navigation className="w-2 h-2 text-blue-400 rotate-90" />
                                      {f.callsign || "N/A"}
                                    </span>
                                    <span className="text-slate-500">ALT: <span className="text-slate-200">{f.altitude}m</span></span>
                                    <span className="text-slate-500">SPD: <span className="text-slate-200">{f.velocity}km/h</span></span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="block text-[8px] font-mono text-red-500/80 uppercase select-none">
                                ⚠️ NO ACTIVE TRACKS IN AREA (CORRESPONDS TO LINK BLACKOUT)
                              </span>
                            )}
                          </div>

                          {/* Footer Action buttons */}
                          <div className="flex justify-between sm:justify-end items-center gap-4 text-[8px] font-mono select-none">
                            <div className="flex items-center gap-1.5 text-green-500 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              VERIFIED ANOMALY
                            </div>
                            {alert.url && (
                              <a
                                href={alert.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded bg-blue-950/30 border border-blue-900/40 text-blue-400 hover:bg-blue-950/60 hover:text-blue-300 flex items-center gap-1 transition-colors duration-300"
                              >
                                SOURCE LINK
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>

                        </div>

                      </div>

                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}
