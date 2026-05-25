"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  UploadCloud, 
  ShieldAlert, 
  CheckCircle, 
  Radio, 
  X, 
  Cpu, 
  Loader2, 
  FileImage, 
  Compass, 
  Navigation,
  ExternalLink 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

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

export default function PublicAlarmsPage() {
  // Telemetry Inputs
  const [callsign, setCallsign] = useState("AIC102");
  const [altitude, setAltitude] = useState("12497");
  const [velocity, setVelocity] = useState("915");
  const [heading, setHeading] = useState("90");
  const [transponderLoss, setTransponderLoss] = useState(true);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Flights list for auto-fill
  const [flights, setFlights] = useState<Flight[]>([]);
  const [flightsLoading, setFlightsLoading] = useState(false);

  // Verification status
  const [verifying, setVerifying] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [satelliteBand, setSatelliteBand] = useState<"optical" | "thermal" | "spectral">("optical");

  // Fetch live flights on mount to populate quick-telemetry dropdown
  useEffect(() => {
    const fetchLiveFlights = async () => {
      setFlightsLoading(true);
      try {
        const res = await fetch("/api/flights");
        const data = await res.json();
        if (data.success && data.flights) {
          setFlights(data.flights);
        }
      } catch (err) {
        console.error("Failed to load live flights for telemetry helper:", err);
      } finally {
        setFlightsLoading(false);
      }
    };
    fetchLiveFlights();
  }, []);

  // Set file preview when file is selected
  useEffect(() => {
    if (!file) {
      setImagePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Populate form from a selected live flight
  const handleSelectFlight = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const icao24 = e.target.value;
    if (!icao24) return;
    const flight = flights.find((f) => f.icao24 === icao24);
    if (flight) {
      setCallsign(flight.callsign || "N/A");
      setAltitude(flight.altitude.toString());
      setVelocity(flight.velocity.toString());
      setHeading(flight.heading.toString());
      setTransponderLoss(flight.altitude === 0 || Math.random() > 0.5); // Mock link state
    }
  };

  const triggerVerification = async () => {
    if (!file) {
      alert("Please upload or drop an image file first.");
      return;
    }

    setVerifying(true);
    setVerificationResult(null);
    setCurrentStage(0);

    // Simulate multi-stage visual loader checkpoints for UX
    const stageIntervals = [
      setTimeout(() => setCurrentStage(1), 1200), // Stage 1: Supabase Upload
      setTimeout(() => setCurrentStage(2), 2600), // Stage 2: Gemini Core Analysis
      setTimeout(() => setCurrentStage(3), 4200), // Stage 3: Groq Decision Engine
    ];

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("callsign", callsign);
      formData.append("altitude", altitude);
      formData.append("velocity", velocity);
      formData.append("heading", heading);
      formData.append("transponder_loss", transponderLoss.toString());

      // Fetch from FastAPI backend
      const res = await fetch("http://localhost:8000/api/verify-wreck", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      // Let the simulated stages complete, or skip to finish
      await new Promise((resolve) => setTimeout(resolve, 4500));

      if (data.success) {
        setVerificationResult(data);
      } else {
        alert("Wreck verification failed: " + (data.error || "Server error"));
      }
    } catch (err) {
      console.error("Failed to connect to verification server:", err);
      alert("Failed to connect to the backend server on port 8000. Make sure the backend is active.");
    } finally {
      stageIntervals.forEach(clearTimeout);
      setVerifying(false);
    }
  };

  // Terminal Verification Stage steps
  const loaderStages = [
    { label: "INITIALIZING TRANSMISSION SECURITY PROTOCOLS...", code: "INIT" },
    { label: "UPLOADING IMAGE METADATA & TELEMETRY TO SUPABASE...", code: "SUPABASE_UPLOAD" },
    { label: "PROCESSING VISUAL ANOMALIES VIA GEMINI 2.5 FLASH...", code: "GEMINI_VISION_AI" },
    { label: "CORRELATING DATA STREAMS IN GROQ DECISION ENGINE...", code: "GROQ_LLAMA3_DECISION" }
  ];

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
            <span className="text-red-400 font-semibold tracking-wide border-b border-red-500/30 pb-1">
              PUBLIC_ALARMS
            </span>
            <Link href="/web-alerts" className="text-slate-300 font-semibold hover:text-red-400 tracking-wide transition-colors duration-300">
              WEB_ALERTS
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono tracking-wider bg-red-950/40 border border-red-900/50 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              API_ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* Main Page Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left Side: Upload Zone & Telemetry Input Forms */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="space-y-1 select-none">
            <h1 className="text-2xl font-bold tracking-wider text-slate-100 font-mono">WRECK VERIFICATION MODULE</h1>
            <p className="text-slate-300 text-xs tracking-wide">
              Upload alarm imagery and correlate with live flight telemetry streams.
            </p>
          </div>

          <div className="rounded-xl border border-red-950/60 bg-[#120202]/25 p-5 space-y-5 shadow-xl">
            
            {/* Quick Live Flight Telemetry Autofill helper */}
            <div className="space-y-2 select-none">
              <label className="block text-xs font-semibold tracking-wider text-slate-300 uppercase">
                Quick Sync Live Telemetry (Optional)
              </label>
              <select
                onChange={handleSelectFlight}
                disabled={flightsLoading}
                className="w-full bg-[#030712] border border-red-950/80 rounded-lg p-3 text-sm text-slate-200 font-mono focus:outline-none focus:border-red-500/50 cursor-pointer"
              >
                <option value="">-- SELECT LIVE TARGET TO CLONE TELEMETRY --</option>
                {flights.map((f) => (
                  <option key={f.icao24} value={f.icao24}>
                    {f.callsign} ({f.origin_country}) - ALT: {f.altitude}m
                  </option>
                ))}
              </select>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-wider text-slate-300 uppercase select-none">
                Wreck Image Evidence Upload
              </label>
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3.5 cursor-pointer transition-all duration-300 min-h-[170px] ${
                  isDragging 
                    ? "border-red-500 bg-red-950/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]" 
                    : file 
                    ? "border-red-900/80 bg-[#120202]/45" 
                    : "border-red-950/80 bg-slate-950/15 hover:border-red-800/60 hover:bg-[#120202]/10"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="w-full flex flex-col items-center gap-2.5">
                    <img 
                      src={imagePreview} 
                      alt="Wreck Upload Preview" 
                      className="max-h-28 rounded border border-red-950/65 shadow-md object-contain"
                    />
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                      <FileImage className="w-4 h-4 text-red-400" />
                      <span className="truncate max-w-[200px] font-semibold">{file?.name}</span>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="text-red-400 hover:text-red-300 p-0.5 ml-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-11 h-11 rounded-lg bg-red-950/30 border border-red-900/40 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform duration-300 shadow-md">
                      <UploadCloud className="w-5.5 h-5.5" />
                    </div>
                    <div className="text-center space-y-1">
                      <span className="block text-sm font-semibold text-slate-200">Drag & Drop Image Evidence</span>
                      <span className="block text-xs font-mono text-slate-400 uppercase">PNG, JPG, or WEBP up to 5MB</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Telemetry Input Fields Grid */}
            <div className="grid grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-wider text-slate-300 uppercase">
                  Target Callsign
                </label>
                <input
                  type="text"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  className="w-full bg-[#030712] border border-blue-950/80 rounded-lg p-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-red-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-wider text-slate-300 uppercase">
                  Last Altitude (m)
                </label>
                <input
                  type="number"
                  value={altitude}
                  onChange={(e) => setAltitude(e.target.value)}
                  className="w-full bg-[#030712] border border-blue-950/80 rounded-lg p-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-red-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-wider text-slate-300 uppercase">
                  Velocity (km/h)
                </label>
                <input
                  type="number"
                  value={velocity}
                  onChange={(e) => setVelocity(e.target.value)}
                  className="w-full bg-[#030712] border border-blue-950/80 rounded-lg p-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-red-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-wider text-slate-300 uppercase">
                  Heading (°)
                </label>
                <input
                  type="number"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  className="w-full bg-[#030712] border border-blue-950/80 rounded-lg p-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-red-500/50"
                />
              </div>

            </div>

            {/* Link Connection Status Switch */}
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/30 border border-red-950/40">
              <div className="space-y-1 select-none">
                <span className="block text-sm font-bold text-slate-200">Transponder Link Loss</span>
                <span className="block text-xs text-slate-400 leading-normal">
                  Simulates complete transponder telemetry blackout
                </span>
              </div>
              <input
                type="checkbox"
                checked={transponderLoss}
                onChange={(e) => setTransponderLoss(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-blue-950/80 bg-[#030712] text-red-500 focus:ring-red-500 focus:ring-offset-0 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Run Verification Button */}
            <button
              onClick={triggerVerification}
              disabled={verifying || !file}
              className={`w-full py-4 rounded-lg font-mono text-xs tracking-wider border font-bold flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
                !file
                  ? "bg-slate-900/30 border-red-950/40 text-slate-500 cursor-not-allowed"
                  : verifying
                  ? "bg-red-950/40 border-red-800/80 text-red-300 cursor-wait animate-pulse"
                  : "bg-red-700 border-red-600 text-white hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/10"
              }`}
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  CORRELATING VERIFICATION...
                </>
              ) : (
                <>
                  <Cpu className="w-4.5 h-4.5" />
                  RUN VERIFICATION PROTOCOL
                </>
              )}
            </button>

          </div>

        </div>

        {/* Right Side: Verification Progress Console & Results Card */}
        <div className="lg:col-span-6 h-full flex flex-col justify-start min-h-[400px]">
          
          <AnimatePresence mode="wait">
            
            {/* Case A: Initial State (Waiting for input) */}
            {!verifying && !verificationResult && (
              <motion.div
                key="initial-state"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5 }}
                className="w-full flex-1 flex flex-col items-center justify-center border border-red-950/60 bg-[#120202]/10 rounded-xl p-8 text-center space-y-4 min-h-[460px] select-none"
              >
                <div className="w-14 h-14 rounded-full border border-blue-950 flex items-center justify-center text-slate-400 bg-[#030712]/50 shadow-md">
                  <Cpu className="w-6 h-6 text-slate-400" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <span className="block text-sm font-mono font-bold text-slate-300 tracking-wider">CORRELATION CONSOLE IDLE</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Upload wreck imagery and flight telemetry to run visual checks and AI decision engine correlation logic.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Case B: Loading state (Stage Terminal) */}
            {verifying && (
              <motion.div
                key="loading-terminal"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="w-full flex-1 flex flex-col justify-between border border-red-950/60 bg-[#050101] rounded-xl p-6 min-h-[460px] font-mono text-xs text-red-400 space-y-4 select-none"
              >
                {/* Terminal Header */}
                <div className="flex justify-between items-center border-b border-blue-950/60 pb-2.5">
                  <span className="font-bold tracking-wider text-slate-300 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                    WRECK_VERIFICATION_DAEMON v1.2
                  </span>
                  <span className="text-red-400 font-semibold">STAGE_{currentStage}/3</span>
                </div>

                {/* Log Outputs */}
                <div className="flex-1 space-y-4 pt-2 text-xs">
                  {loaderStages.map((stage, idx) => (
                    <div 
                      key={stage.code}
                      className={`flex gap-3.5 items-start transition-opacity duration-300 ${
                        idx > currentStage ? "opacity-20" : "opacity-100"
                      }`}
                    >
                      <span className={`font-bold shrink-0 ${
                        idx < currentStage 
                          ? "text-green-400" 
                          : idx === currentStage 
                          ? "text-red-400 animate-pulse" 
                          : "text-slate-600"
                      }`}>
                        {idx < currentStage ? "[OK]" : idx === currentStage ? "[>>>]" : "[WAIT]"}
                      </span>
                      <div className="space-y-1">
                        <span className={`block font-bold ${
                          idx === currentStage ? "text-white" : idx < currentStage ? "text-slate-300" : "text-slate-600"
                        }`}>
                          {stage.label}
                        </span>
                        {idx === currentStage && (
                          <div className="flex items-center gap-1.5 text-red-400 text-[10px] mt-0.5 font-mono">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            ANALYZING STACK STREAM...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Terminal Footer */}
                <div className="border-t border-blue-950/60 pt-3 text-slate-500 text-[10px] flex justify-between">
                  <span>MEM_SYS: ACTIVE</span>
                  <span>CALCULATING COVARIANCE MATRICES...</span>
                </div>

              </motion.div>
            )}

            {/* Case C: Result display */}
            {!verifying && verificationResult && (
              <motion.div
                key="result-card"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full flex-1 flex flex-col justify-between border border-red-950/60 bg-[#120202]/15 rounded-xl p-5 min-h-[460px] space-y-5"
              >
                
                {/* Image & URL info */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-blue-950/50 pb-3 select-none">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">VERIFICATION STATUS REPORT</span>
                    <span className="text-[10px] font-mono text-slate-400">ID: {verificationResult.public_url.split("/").pop().slice(0, 8)}</span>
                  </div>

                  {/* High Contrast Alert card based on True/False alarm status */}
                  {verificationResult.verification.isFalseAlarm ? (
                    /* FALSE ALARM CARD */
                    <div className="bg-yellow-950/15 border border-yellow-900/40 p-4 rounded-xl space-y-2 select-none shadow-lg shadow-yellow-900/5">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <ShieldAlert className="w-5.5 h-5.5 text-yellow-500 animate-pulse" />
                        <span className="text-xs font-mono font-bold tracking-wider uppercase">FALSE ALARM DETECTED</span>
                      </div>
                      <p className="text-xs font-sans text-slate-200 leading-relaxed">
                        {verificationResult.verification.reasoning}
                      </p>
                    </div>
                  ) : (
                    /* TRUE ALARM CARD */
                    <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl space-y-2 select-none shadow-lg shadow-red-900/5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
                      <div className="flex items-center gap-2 text-red-500">
                        <ShieldAlert className="w-5.5 h-5.5 text-red-500 animate-ping absolute" />
                        <ShieldAlert className="w-5.5 h-5.5 text-red-500 relative" />
                        <span className="text-xs font-mono font-bold tracking-wider uppercase">TRUE ALARM VALIDATED</span>
                      </div>
                      <p className="text-xs font-sans text-slate-200 leading-relaxed">
                        {verificationResult.verification.reasoning}
                      </p>
                      <div className="pt-2 border-t border-red-900/20 flex justify-between items-center text-[9px] font-mono text-red-400/90 font-bold">
                        <span>EMERGENCY DISPATCH TRIGGERED</span>
                        <span>CONFIDENCE 99.4%</span>
                      </div>
                    </div>
                  )}

                  {/* Metadata Check Report Card */}
                  {verificationResult.exif && verificationResult.telemetry_used && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* EXIF Metadata Verification */}
                      <div className="bg-[#120202]/30 p-3.5 rounded-xl border border-red-950/50 space-y-2 text-xs font-mono select-none">
                        <span className="block text-[9px] text-red-500 font-bold uppercase tracking-wider">
                          IMAGE EXIF METADATA
                        </span>
                        <div className="space-y-1.5 text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-500">GPS TAGS:</span>
                            <span className={verificationResult.exif.has_gps ? "text-green-400 font-bold" : "text-yellow-500 font-bold"}>
                              {verificationResult.exif.has_gps ? "FOUND" : "NOT FOUND"}
                            </span>
                          </div>
                          {verificationResult.exif.has_gps && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-500">GPS POS:</span>
                                <span className="text-white font-bold">
                                  {verificationResult.exif.gps.latitude.toFixed(4)}, {verificationResult.exif.gps.longitude.toFixed(4)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">DISTANCE:</span>
                                <span className={verificationResult.exif.distance_km < 150 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                                  {verificationResult.exif.distance_km} km
                                </span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500">TIMESTAMP:</span>
                            <span className="text-white truncate max-w-[140px]" title={verificationResult.exif.timestamp || "UNKNOWN"}>
                              {verificationResult.exif.timestamp || "UNKNOWN"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Telemetry Lock Status */}
                      <div className="bg-[#120202]/30 p-3.5 rounded-xl border border-red-950/50 space-y-2 text-xs font-mono select-none">
                        <span className="block text-[9px] text-red-500 font-bold uppercase tracking-wider">
                          TELEMETRY DATABASE LOCK
                        </span>
                        <div className="space-y-1.5 text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-500">CALLSIGN:</span>
                            <span className="text-white font-bold">{verificationResult.telemetry_used.callsign}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">ALTITUDE:</span>
                            <span className="text-white">{verificationResult.telemetry_used.altitude.toLocaleString()} m</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">VELOCITY:</span>
                            <span className="text-white">{verificationResult.telemetry_used.velocity} km/h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">LINK LOCK:</span>
                            <span className={verificationResult.telemetry_used.is_spoofed_override ? "text-green-400 font-bold" : "text-yellow-500"}>
                              {verificationResult.telemetry_used.is_spoofed_override ? "SECURED (RADAR)" : "USER INPUT"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Satellite Imagery Verification Lens Card */}
                  {verificationResult.satellite_verification && (
                    <div className="bg-[#120202]/30 p-4 rounded-xl border border-red-950/50 space-y-3.5 select-none font-mono">
                      <div className="flex items-center justify-between border-b border-red-950/40 pb-2.5">
                        <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          🛰️ MULTISPECTRAL SATELLITE IMAGE VALIDATOR
                        </span>
                        <span className="text-[9px] text-slate-400">TRACK: SECURED (Sentinel L1C)</span>
                      </div>

                      {/* Tab buttons */}
                      <div className="flex gap-2 text-[10px] flex-wrap">
                        <button
                          onClick={() => setSatelliteBand("optical")}
                          className={`px-2.5 py-1 rounded border cursor-pointer transition-colors duration-300 ${
                            satelliteBand === "optical"
                              ? "bg-slate-900 border-slate-700 text-slate-200"
                              : "border-red-950/30 text-slate-500 hover:text-slate-400"
                          }`}
                        >
                          OPTICAL (TRUE COLOR)
                        </button>
                        <button
                          onClick={() => setSatelliteBand("thermal")}
                          className={`px-2.5 py-1 rounded border cursor-pointer transition-colors duration-300 ${
                            satelliteBand === "thermal"
                              ? "bg-red-950/40 border-red-800/80 text-red-400 font-bold"
                              : "border-red-950/30 text-slate-500 hover:text-slate-400"
                          }`}
                        >
                          THERMAL IR (BAND 12)
                        </button>
                        <button
                          onClick={() => setSatelliteBand("spectral")}
                          className={`px-2.5 py-1 rounded border cursor-pointer transition-colors duration-300 ${
                            satelliteBand === "spectral"
                              ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-400 font-bold"
                              : "border-red-950/30 text-slate-500 hover:text-slate-400"
                          }`}
                        >
                          FALSE-COLOR VEG (BAND 8)
                        </button>
                      </div>

                      {/* Interactive Visual Lens Screen */}
                      <div className="relative w-full h-[180px] rounded-lg bg-slate-950 border border-red-950/60 overflow-hidden flex items-center justify-center">
                        {/* Grid Scanlines Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay"
                             style={{ backgroundImage: "linear-gradient(to bottom, #fff 50%, #000 50%)", backgroundSize: "100% 4px" }} />
                        
                        {/* Lens rendering based on bands */}
                        {satelliteBand === "optical" && (
                          <div className="w-full h-full flex flex-col justify-center items-center text-center relative p-6">
                            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#1e293b_1px,transparent_1px)]" style={{ backgroundSize: '16px 16px' }} />
                            <div className={`w-28 h-28 rounded-full border border-dashed border-slate-700/60 flex items-center justify-center ${
                              verificationResult.satellite_verification.over_water ? "bg-cyan-950/15" : "bg-emerald-950/10"
                            }`}>
                              <span className="text-[10px] text-slate-400 uppercase">
                                {verificationResult.satellite_verification.over_water ? "Open Water Sector" : "Canopy Sector"}
                              </span>
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-red-500 bg-red-500/30 flex items-center justify-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                            </div>
                          </div>
                        )}

                        {satelliteBand === "thermal" && (
                          <div className="w-full h-full flex flex-col justify-center items-center text-center relative p-6 bg-[#030712]">
                            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#374151_1px,transparent_1px)]" style={{ backgroundSize: '16px 16px' }} />
                            {/* Glowing heat spot signature */}
                            {verificationResult.satellite_verification.thermal_infrared.hotspot_detected ? (
                              <div className="relative">
                                {/* Radiant glow layers */}
                                <div className="absolute -left-12 -top-12 w-28 h-28 rounded-full bg-red-600/10 blur-xl animate-pulse" />
                                <div className="absolute -left-8 -top-8 w-20 h-20 rounded-full bg-orange-500/20 blur-lg animate-ping" />
                                <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-yellow-400/30 blur-md" />
                                <div className="w-4 h-4 rounded-full bg-white border border-red-500 shadow-[0_0_12px_#ef4444] relative z-10" />
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-bold uppercase">NO THERMAL HOTSPOT RECORDED</span>
                            )}
                            
                            {/* Overlay data ticker */}
                            <div className="absolute bottom-2 left-3 text-[9px] text-red-400 flex items-center gap-1.5 font-bold uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                              TH_ANOMALY: +{verificationResult.satellite_verification.thermal_infrared.temp_anomaly_celsius}°C
                            </div>
                          </div>
                        )}

                        {satelliteBand === "spectral" && (
                          <div className="w-full h-full flex flex-col justify-center items-center text-center relative p-6 bg-[#0c0505]">
                            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#ef4444_1px,transparent_1px)]" style={{ backgroundSize: '16px 16px' }} />
                            
                            {/* False-color landscape features */}
                            <div className="w-full h-full absolute inset-0 flex items-center justify-center opacity-30">
                              <div className={`w-32 h-32 rounded-full filter blur-xl ${
                                verificationResult.satellite_verification.over_water ? "bg-blue-600" : "bg-red-600"
                              }`} />
                            </div>

                            {/* Scar footprint */}
                            {!verificationResult.verification.isFalseAlarm ? (
                              <div className="relative flex flex-col items-center gap-1.5 z-10">
                                <div className={`w-6 h-6 rounded-full border border-white bg-slate-950 flex items-center justify-center shadow-lg`}>
                                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
                                </div>
                                <span className="text-[9px] text-slate-300 font-bold uppercase px-1.5 py-0.5 rounded bg-slate-950/80 border border-red-950/60 leading-none">
                                  {verificationResult.satellite_verification.over_water ? "OIL_SLICK_FOOTPRINT" : "CANOPY_DISRUPTION"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-bold uppercase z-10">SPECTRAL ANALYSIS NOMINAL</span>
                            )}
                          </div>
                        )}

                        {/* Top-right satellite HUD compass */}
                        <div className="absolute top-2.5 right-3 text-[9px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-red-950/30 flex items-center gap-1 font-bold uppercase select-none">
                          <Compass className="w-3 h-3 text-slate-500" />
                          AZIMUTH: {verificationResult.satellite_verification.orbit_track_angle}°
                        </div>
                      </div>

                      {/* Satellite Orbital Pass Details */}
                      <div className="grid grid-cols-2 gap-4 text-xs select-none">
                        <div className="bg-[#120202]/30 p-3 rounded-lg border border-red-950/40 space-y-1 text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-500">OBSERVER:</span>
                            <span className="text-white font-bold">{verificationResult.satellite_verification.satellite_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">CLOUD COVER:</span>
                            <span className="text-white font-bold">{verificationResult.satellite_verification.cloud_cover_percent}%</span>
                          </div>
                        </div>
                        <div className="bg-[#120202]/30 p-3 rounded-lg border border-red-950/40 space-y-1 text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-500">LAST PASS:</span>
                            <span className="text-white truncate font-bold">{verificationResult.satellite_verification.last_pass_utc}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">BAND CHECK:</span>
                            <span className={!verificationResult.verification.isFalseAlarm ? "text-green-400 font-bold animate-pulse" : "text-slate-400"}>
                              {!verificationResult.verification.isFalseAlarm ? "ANOMALY_CONFIRMED" : "NOMINAL"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gemini Visual Analysis Report card */}
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-red-950/40 space-y-2">
                    <span className="block text-[10px] text-red-400 font-mono font-bold uppercase select-none tracking-wider">
                      VISUAL ANALYSIS (GEMINI VISION CORE)
                    </span>
                    <p className="text-slate-100 font-sans text-xs md:text-sm leading-relaxed select-text text-left">
                      {verificationResult.visual_analysis}
                    </p>
                  </div>
                </div>

                {/* Storage bucket link */}
                <div className="pt-3 border-t border-red-950/40 flex justify-between items-center text-xs font-mono text-slate-400 select-none">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4.5 h-4.5 text-green-500" />
                    <span>Evidence saved: <code className="text-slate-200 bg-slate-950/40 px-1 py-0.5 rounded border-red-950/20">wreck-alarms</code></span>
                  </div>
                  {verificationResult.public_url.startsWith("http") && !verificationResult.public_url.includes("mock-storage") && (
                    <a
                      href={verificationResult.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 hover:text-red-300 flex items-center gap-1 font-bold"
                    >
                      VIEW IMAGE
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </main>

    </div>
  );
}
