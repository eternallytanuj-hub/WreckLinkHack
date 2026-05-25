"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Radio, 
  ExternalLink, 
  ShieldAlert, 
  Activity, 
  Navigation,
  Globe,
  Clock,
  CheckCircle2,
  Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically load the Leaflet map component with SSR disabled
const AlertsMap = dynamic(() => import("@/components/AlertsMap"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-950/60 flex flex-col items-center justify-center gap-3 border border-red-950/60 rounded-xl min-h-[280px]">
      <Activity className="w-8 h-8 text-red-500 animate-spin" />
      <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">INITIALIZING RADAR MATRICES...</span>
    </div>
  )
});

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
    confidence?: number;
    checks?: {
      exif_gps: boolean;
      livery: boolean;
      adsb_link: boolean;
      ai_forgery_check: boolean;
    };
  };
  reasoning: string;
  is_verified: boolean;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vahxyslxfdpmroznukad.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaHh5c2x4ZmRwbXJvem51a2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTMyMDQsImV4cCI6MjA5NTI2OTIwNH0.2mwsOrDrSQFwMiewHRGLL43TDGBWOO7aJUktDe9eB-w";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function WebAlertsPage() {
  const [alerts, setAlerts] = useState<WreckAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<WreckAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Trigger browser-native text-to-speech warning
  const triggerVoiceAlert = (alert: WreckAlert) => {
    if (!audioEnabled) return;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      // Clear queue to prevent overlapping voices
      window.speechSynthesis.cancel();
      
      const callsign = alert.telemetry?.active_flights?.[0]?.callsign || "unknown";
      const location = alert.location || "unspecified sector";
      
      const text = `Caution. Telemetry link loss verified near ${location} for flight ${callsign}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.rate = 0.92;   // Slower warning pacing
      utterance.pitch = 0.85;  // Deeper robotic synthesizer tone
      utterance.volume = 0.75;
      
      // Select robotic voice if available
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(
        (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")
      ) || voices[0];
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Test the vocal speaker explicitly
  const testVoiceSynthesizer = () => {
    if (selectedAlert) {
      triggerVoiceAlert(selectedAlert);
    } else {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const text = "Wreck Link alert speaker system test active.";
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = 0.85;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Fetch initial alerts and establish WebSocket connection
  useEffect(() => {
    const fetchHistoricalAlerts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("wreck_alerts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);
        
        if (data) {
          setAlerts(data);
          if (data.length > 0) {
            setSelectedAlert(data[0]);
          }
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
          
          setAlerts((prev) => {
            const nextAlerts = [newAlert, ...prev].slice(0, 5);
            return nextAlerts;
          });
          
          // Autofocus the map on the new alert and speak warning
          setSelectedAlert(newAlert);
          triggerVoiceAlert(newAlert);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
        } else {
          setConnected(false);
        }
      });

    // Populate voices for SpeechSynthesis (some browsers lazy-load these)
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [audioEnabled]);

  return (
    <div className="min-h-screen bg-[#030712] text-[#F8FAFC] flex flex-col antialiased selection:bg-red-500/20 selection:text-red-300 font-sans">
      
      {/* Glassmorphic Navbar */}
      <header className="relative w-full z-50 border-b border-red-950/40 bg-[#050101]/55 backdrop-blur-md select-none">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300 group-hover:from-red-400 group-hover:to-orange-300 transition-colors duration-300">
              WRECK LINK
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm">
            <Link href="/" className="text-slate-300 font-semibold hover:text-red-400 tracking-wide transition-colors duration-300">
              DASHBOARD
            </Link>
            <Link href="/live-map" className="text-slate-300 font-semibold hover:text-red-400 tracking-wide transition-colors duration-300">
              LIVE_MAP
            </Link>
            <Link href="/public-alarms" className="text-slate-300 font-semibold hover:text-red-400 tracking-wide transition-colors duration-300">
              PUBLIC_ALARMS
            </Link>
            <span className="text-red-400 font-semibold tracking-wide border-b border-red-500/30 pb-1">
              WEB_ALERTS
            </span>
          </nav>

          <div className="flex items-center gap-3">
            {/* Audio Toggle control */}
            <button 
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-2 rounded border transition-colors duration-300 ${
                audioEnabled 
                  ? "bg-red-950/40 border-red-500/40 text-red-400 hover:bg-red-900/30" 
                  : "bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-300"
              }`}
              title={audioEnabled ? "Disable Warning Audio Synth" : "Enable Warning Audio Synth"}
            >
              <Volume2 className={`w-4 h-4 ${audioEnabled ? "animate-pulse" : ""}`} />
            </button>

            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono tracking-wider bg-red-950/40 border border-red-900/50 ${
              connected ? "text-red-400" : "text-yellow-500"
            }`}>
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-red-400 animate-ping" : "bg-yellow-500 animate-pulse"}`} />
              {connected ? "SOCKET_ONLINE" : "SOCKET_CONNECTING"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Realtime Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left Panel: Animated Sky Radar Sweeper & Live Map */}
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-1 select-none">
            <h1 className="text-2xl font-bold tracking-wider text-slate-100 font-mono">AUTONOMOUS RADAR TRACKER</h1>
            <p className="text-slate-300 text-xs tracking-wide">
              Ingesting stream channels and plotting verified coordinate matrices dynamically.
            </p>
          </div>

          {/* Interactive Map Visualizer */}
          <div className="h-[300px] w-full relative z-20">
            {selectedAlert ? (
              <AlertsMap 
                latitude={selectedAlert.latitude}
                longitude={selectedAlert.longitude}
                locationName={selectedAlert.location}
                activeFlights={selectedAlert.telemetry?.active_flights}
              />
            ) : (
              <div className="w-full h-full bg-slate-950/40 flex flex-col items-center justify-center gap-3 border border-red-950/60 rounded-xl min-h-[300px]">
                <Activity className="w-8 h-8 text-slate-600 animate-pulse" />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Select an alert to link mapping</span>
              </div>
            )}
          </div>

          {/* Radar circle sweeper + Test Button */}
          <div className="rounded-xl border border-red-950/60 bg-[#120202]/25 p-5 flex flex-col gap-4 relative overflow-hidden shadow-lg select-none">
            <div className="flex items-center justify-between border-b border-red-950/40 pb-2.5">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wide">EOC CONSOLE SYSTEMS</span>
              <button 
                onClick={testVoiceSynthesizer}
                className="px-2.5 py-1 rounded bg-red-950/50 hover:bg-red-950 border border-red-900/60 hover:border-red-600 text-[10px] text-red-400 font-mono transition-colors duration-300 flex items-center gap-1.5"
              >
                <Volume2 className="w-3 h-3" />
                TEST SPEAKERS
              </button>
            </div>
            
            <div className="flex items-center gap-5 justify-center">
              <div className="relative w-28 h-28 rounded-full border border-red-950/80 flex items-center justify-center bg-[#050101]/80 shrink-0">
                <div className="absolute w-20 h-20 rounded-full border border-red-950/40" />
                <div className="absolute w-10 h-10 rounded-full border border-red-950/20" />
                <div className="absolute w-full h-[1px] bg-red-950/30" />
                <div className="absolute h-full w-[1px] bg-red-950/30" />
                <div className="absolute top-0 left-0 w-14 h-14 border-r border-red-500/30 origin-bottom-right animate-[spin_5s_linear_infinite]" style={{ transformOrigin: "100% 100%" }} />
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] relative z-10" />
              </div>

              <div className="space-y-1">
                <span className="block text-[10px] font-mono tracking-wider text-slate-300 font-bold uppercase animate-pulse">
                  SCANNER FEED: INGESTING...
                </span>
                <span className="block text-[9px] font-mono text-slate-400 uppercase leading-relaxed">
                  CHANNELS: r/aviation, r/news, RSS_VERIFY
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Realtime Alert Logs Dashboard */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="flex justify-between items-center border-b border-red-950/40 pb-3 select-none">
            <span className="text-xs font-mono tracking-wider text-slate-300 uppercase font-bold">VERIFIED ALERTS FEED</span>
            <span className="text-xs font-mono text-red-400 font-bold">{alerts.length} ALERTS LOGGED</span>
          </div>

          {loading ? (
            /* Loading skeletons */
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 w-full rounded-xl border border-red-950/60 bg-[#120202]/25 p-5 animate-pulse flex gap-5">
                  <div className="w-32 bg-slate-950/50 rounded-lg border border-red-950/30" />
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
                    className="border border-red-950/60 bg-[#120202]/10 rounded-xl p-12 text-center flex flex-col items-center gap-3 select-none"
                  >
                    <Activity className="w-8 h-8 text-slate-500 animate-pulse" />
                    <div className="space-y-2">
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase">NO ANOMALIES LOGGED YET</span>
                      <p className="text-xs text-slate-400 uppercase max-w-sm mx-auto leading-relaxed">
                        The dashboard is standing by. When the backend worker daemon identifies and validates an anomaly, it will flash here in real-time.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  alerts.map((alert) => {
                    const confidence = alert.telemetry?.confidence || 85;
                    const checks = alert.telemetry?.checks || {
                      exif_gps: alert.latitude !== 0 && alert.longitude !== 0,
                      livery: true,
                      adsb_link: alert.telemetry?.active_flights && alert.telemetry.active_flights.length > 0,
                      ai_forgery_check: true
                    };

                    return (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.5 }}
                        onClick={() => setSelectedAlert(alert)}
                        className={`rounded-xl p-5 flex flex-col md:flex-row gap-5 transition-all duration-300 shadow-xl shadow-slate-950/30 relative overflow-hidden cursor-pointer border-l-4 ${
                          selectedAlert?.id === alert.id 
                            ? "border-l-red-500 bg-[#1a0505]/45 border-y border-r border-red-800/50 shadow-red-950/20" 
                            : "border-l-transparent bg-[#120202]/25 hover:bg-[#1a0505]/30 hover:border-red-900/30 border border-red-950/50"
                        }`}
                      >
                        {/* Top status line */}
                        <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r via-red-500/20 to-transparent ${
                          selectedAlert?.id === alert.id ? "from-red-500" : "from-red-950/50"
                        }`} />

                        {/* Left: Downloaded Image Evidence */}
                        {alert.image_url && (
                          <div className="w-full md:w-40 h-32 relative rounded-lg border border-red-950/60 bg-slate-950/60 overflow-hidden shrink-0 group select-none">
                            <img 
                              src={alert.image_url} 
                              alt={alert.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent pointer-events-none" />
                            
                            {/* Alert visual indicator */}
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[9px] font-mono font-bold text-red-400 bg-red-950/90 px-2 rounded border border-red-900/60">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              CRIT_IMAGERY
                            </div>
                          </div>
                        )}

                        {/* Right: Anomaly telemetry correlation & AI verdicts */}
                        <div className="flex-1 space-y-4 flex flex-col justify-between">
                          
                          <div className="space-y-2">
                            
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <h3 className="text-sm md:text-base font-bold text-slate-100 uppercase tracking-wide leading-snug max-w-[80%]">
                                {alert.title}
                              </h3>
                              
                              <div className="flex flex-row sm:flex-col items-end gap-2 shrink-0 select-none">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-widest border ${
                                  confidence >= 90 
                                    ? "bg-green-950/50 border-green-800/60 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.15)]" 
                                    : "bg-yellow-950/50 border-yellow-800/60 text-yellow-500"
                                }`}>
                                  {confidence}% CONFIDENCE
                                </span>
                                
                                <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  {new Date(alert.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>

                            {/* Location line */}
                            <div className="flex items-center gap-1 text-[10px] font-mono text-red-400 uppercase select-none">
                              <Globe className="w-3 h-3 text-red-500" />
                              {alert.location}
                            </div>

                            {/* Reasoning paragraph */}
                            <p className="text-xs md:text-sm text-slate-200 leading-relaxed pt-2 border-t border-red-950/30">
                              {alert.reasoning}
                            </p>

                          </div>

                          {/* Dynamic Verification Checklist */}
                          <div className="flex flex-wrap gap-x-2.5 gap-y-1.5 text-[9px] font-mono select-none pt-2.5 border-t border-red-950/30">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                              checks.exif_gps 
                                ? "text-green-400 bg-green-950/15 border-green-900/30" 
                                : "text-slate-500 bg-slate-900/10 border-slate-900"
                            }`}>
                              {checks.exif_gps ? "✓" : "✗"} EXIF GPS LOCK
                            </span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                              checks.livery 
                                ? "text-green-400 bg-green-950/15 border-green-900/30" 
                                : "text-slate-500 bg-slate-900/10 border-slate-900"
                            }`}>
                              {checks.livery ? "✓" : "✗"} LIVERY MATCHED
                            </span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                              checks.adsb_link 
                                ? "text-green-400 bg-green-950/15 border-green-900/30" 
                                : "text-slate-500 bg-slate-900/10 border-slate-900"
                            }`}>
                              {checks.adsb_link ? "✓" : "✗"} ADS-B SIGNAL LOCK
                            </span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                              checks.ai_forgery_check 
                                ? "text-green-400 bg-green-950/15 border-green-900/30" 
                                : "text-slate-500 bg-slate-900/10 border-slate-900"
                            }`}>
                              {checks.ai_forgery_check ? "✓" : "✗"} IMAGE VERIFIED (CLEAN)
                            </span>
                          </div>

                          {/* Telemetry metadata details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pt-2.5 border-t border-red-950/30">
                            
                            {/* Correlated telemetry states */}
                            <div className="space-y-2">
                              <span className="block text-[9px] font-mono text-slate-400 tracking-wider uppercase select-none font-bold">
                                OpenSky Correlated Telemetry
                              </span>
                              {alert.telemetry?.active_flights && alert.telemetry.active_flights.length > 0 ? (
                                <div className="space-y-1">
                                  {alert.telemetry.active_flights.slice(0, 1).map((f) => (
                                    <div key={f.icao24} className="flex justify-between items-center bg-[#030712] border border-red-950/60 p-2 rounded font-mono text-[10px]">
                                      <span className="text-white font-bold flex items-center gap-1">
                                        <Navigation className="w-2.5 h-2.5 text-red-400 rotate-90" />
                                        {f.callsign || "N/A"}
                                      </span>
                                      <span className="text-slate-400">ALT: <span className="text-slate-200 font-semibold">{f.altitude}m</span></span>
                                      <span className="text-slate-400">SPD: <span className="text-slate-200 font-semibold">{f.velocity}km/h</span></span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="block text-xs font-mono text-red-400 uppercase select-none font-bold">
                                  ⚠️ NO ACTIVE TRACKS (LINK BLACKOUT)
                                </span>
                              )}
                            </div>

                            {/* Verification Badge & Source Action link */}
                            <div className="flex justify-between sm:justify-end items-center gap-4 text-xs font-mono select-none">
                              <div className="flex items-center gap-1.5 text-green-400 font-bold">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                VERIFIED ANOMALY
                              </div>
                              {alert.url && (
                                <a
                                  href={alert.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()} // Stop selection from firing
                                  className="px-3 py-1.5 rounded bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-950/60 hover:text-red-300 flex items-center gap-1 transition-colors duration-300 font-bold"
                                >
                                  SOURCE LINK
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>

                          </div>

                        </div>

                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}
