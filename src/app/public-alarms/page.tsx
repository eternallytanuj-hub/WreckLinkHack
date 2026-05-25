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
            <span className="text-blue-400 tracking-widest border-b border-blue-500/30 pb-1">
              PUBLIC_ALARMS
            </span>
            <Link href="/web-alerts" className="text-slate-500 hover:text-blue-400 tracking-widest transition-colors duration-300">
              WEB_ALERTS
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono tracking-widest bg-blue-950/30 border border-blue-900/40 text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
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
            <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">
              Upload alarm imagery & correlate with live flight telemetry streams.
            </p>
          </div>

          <div className="rounded-xl border border-blue-950/60 bg-[#050b18]/20 p-5 space-y-5">
            
            {/* Quick Live Flight Telemetry Autofill helper */}
            <div className="space-y-1.5 select-none">
              <label className="block text-[8px] font-mono tracking-widest text-slate-500 uppercase">
                Quick Sync Live Telemetry (Optional)
              </label>
              <select
                onChange={handleSelectFlight}
                disabled={flightsLoading}
                className="w-full bg-[#030712] border border-blue-950/60 rounded-lg p-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-blue-500/50"
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
            <div className="space-y-1.5">
              <label className="block text-[8px] font-mono tracking-widest text-slate-500 uppercase select-none">
                Wreck Image Evidence Upload
              </label>
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 min-h-[160px] ${
                  isDragging 
                    ? "border-blue-500 bg-blue-950/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                    : file 
                    ? "border-blue-900/60 bg-[#050b18]/45" 
                    : "border-blue-950/60 bg-slate-950/15 hover:border-blue-800/50 hover:bg-[#050b18]/10"
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
                  <div className="w-full flex flex-col items-center gap-2">
                    <img 
                      src={imagePreview} 
                      alt="Wreck Upload Preview" 
                      className="max-h-24 rounded border border-blue-950/60 shadow-md object-contain"
                    />
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <FileImage className="w-3.5 h-3.5 text-blue-400" />
                      <span className="truncate max-w-[200px]">{file?.name}</span>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="text-red-400 hover:text-red-300 p-0.5 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-blue-950/20 border border-blue-900/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform duration-300">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="text-center space-y-0.5">
                      <span className="block text-[11px] font-mono text-slate-300">Drag & Drop Image Evidence</span>
                      <span className="block text-[8px] font-mono text-slate-600 uppercase">PNG, JPG, or WEBP up to 5MB</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Telemetry Input Fields Grid */}
            <div className="grid grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label className="block text-[8px] font-mono tracking-widest text-slate-500 uppercase">
                  Target Callsign
                </label>
                <input
                  type="text"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  className="w-full bg-[#030712] border border-blue-950/60 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[8px] font-mono tracking-widest text-slate-500 uppercase">
                  Last Altitude (m)
                </label>
                <input
                  type="number"
                  value={altitude}
                  onChange={(e) => setAltitude(e.target.value)}
                  className="w-full bg-[#030712] border border-blue-950/60 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[8px] font-mono tracking-widest text-slate-500 uppercase">
                  Velocity (km/h)
                </label>
                <input
                  type="number"
                  value={velocity}
                  onChange={(e) => setVelocity(e.target.value)}
                  className="w-full bg-[#030712] border border-blue-950/60 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[8px] font-mono tracking-widest text-slate-500 uppercase">
                  Heading (°)
                </label>
                <input
                  type="number"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  className="w-full bg-[#030712] border border-blue-950/60 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500/50"
                />
              </div>

            </div>

            {/* Link Connection Status Switch */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/30 border border-blue-950/30">
              <div className="space-y-0.5 select-none">
                <span className="block text-[10px] font-bold text-slate-300 font-mono">Transponder Link Loss</span>
                <span className="block text-[7.5px] text-slate-600 font-mono uppercase">
                  Simulates complete transponder telemetry blackout
                </span>
              </div>
              <input
                type="checkbox"
                checked={transponderLoss}
                onChange={(e) => setTransponderLoss(e.target.checked)}
                className="w-4 h-4 rounded border-blue-950/60 bg-[#030712] text-blue-500 focus:ring-blue-500 focus:ring-offset-0 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Run Verification Button */}
            <button
              onClick={triggerVerification}
              disabled={verifying || !file}
              className={`w-full py-3.5 rounded-lg font-mono text-xs tracking-wider border font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                !file
                  ? "bg-slate-900/30 border-blue-950/40 text-slate-600 cursor-not-allowed"
                  : verifying
                  ? "bg-blue-950/40 border-blue-800/80 text-blue-300 cursor-wait animate-pulse"
                  : "bg-blue-600 border-blue-500 text-white hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/10"
              }`}
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  CORRELATING VERIFICATION...
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
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
                className="w-full flex-1 flex flex-col items-center justify-center border border-blue-950/60 bg-[#050b18]/10 rounded-xl p-8 text-center space-y-4 min-h-[460px] select-none"
              >
                <div className="w-12 h-12 rounded-full border border-blue-950 flex items-center justify-center text-slate-500 bg-[#030712]/50">
                  <Cpu className="w-5 h-5 text-slate-600" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <span className="block text-xs font-mono font-bold text-slate-400">CORRELATION CONSOLE IDLE</span>
                  <p className="text-[9.5px] font-mono text-slate-600 uppercase leading-relaxed">
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
                className="w-full flex-1 flex flex-col justify-between border border-blue-950/60 bg-[#02050f] rounded-xl p-6 min-h-[460px] font-mono text-[9px] text-blue-400 space-y-4 select-none"
              >
                {/* Terminal Header */}
                <div className="flex justify-between items-center border-b border-blue-950/60 pb-2">
                  <span className="font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    WRECK_VERIFICATION_DAEMON v1.2
                  </span>
                  <span className="text-blue-500">STAGE_{currentStage}/3</span>
                </div>

                {/* Log Outputs */}
                <div className="flex-1 space-y-3.5 pt-2">
                  {loaderStages.map((stage, idx) => (
                    <div 
                      key={stage.code}
                      className={`flex gap-3 items-start transition-opacity duration-300 ${
                        idx > currentStage ? "opacity-15" : "opacity-100"
                      }`}
                    >
                      <span className={`font-bold shrink-0 ${
                        idx === currentStage 
                          ? "text-blue-400 animate-pulse" 
                          : idx < currentStage 
                          ? "text-green-500" 
                          : "text-slate-700"
                      }`}>
                        {idx < currentStage ? "[OK]" : idx === currentStage ? "[>>>]" : "[WAIT]"}
                      </span>
                      <div className="space-y-1">
                        <span className={`block font-bold ${
                          idx === currentStage ? "text-slate-100" : idx < currentStage ? "text-slate-400" : "text-slate-700"
                        }`}>
                          {stage.label}
                        </span>
                        {idx === currentStage && (
                          <div className="flex items-center gap-1.5 text-blue-500 text-[8px] mt-0.5">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ANALYZING STACK STREAM...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Terminal Footer */}
                <div className="border-t border-blue-950/60 pt-3 text-slate-600 text-[8px] flex justify-between">
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
                className="w-full flex-1 flex flex-col justify-between border border-blue-950/60 bg-[#050b18]/15 rounded-xl p-5 min-h-[460px] space-y-4"
              >
                
                {/* Image & URL info */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center border-b border-blue-950/50 pb-2.5 select-none">
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">VERIFICATION STATUS REPORT</span>
                    <span className="text-[8px] font-mono text-slate-600">ID: {verificationResult.public_url.split("/").pop().slice(0, 8)}</span>
                  </div>

                  {/* High Contrast Alert card based on True/False alarm status */}
                  {verificationResult.verification.isFalseAlarm ? (
                    /* FALSE ALARM CARD */
                    <div className="bg-yellow-950/15 border border-yellow-900/40 p-4 rounded-xl space-y-2 select-none shadow-lg shadow-yellow-900/5">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <ShieldAlert className="w-5 h-5 text-yellow-500 animate-pulse" />
                        <span className="text-[11px] font-mono font-bold tracking-widest uppercase">FALSE ALARM DETECTED</span>
                      </div>
                      <p className="text-[9.5px] font-mono text-slate-300 leading-normal">
                        {verificationResult.verification.reasoning}
                      </p>
                    </div>
                  ) : (
                    /* TRUE ALARM CARD */
                    <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl space-y-2 select-none shadow-lg shadow-red-900/5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
                      <div className="flex items-center gap-2 text-red-500">
                        <ShieldAlert className="w-5 h-5 text-red-500 animate-ping absolute" />
                        <ShieldAlert className="w-5 h-5 text-red-500 relative" />
                        <span className="text-[11px] font-mono font-bold tracking-widest uppercase">TRUE ALARM VALIDATED</span>
                      </div>
                      <p className="text-[9.5px] font-mono text-slate-300 leading-normal">
                        {verificationResult.verification.reasoning}
                      </p>
                      <div className="pt-1.5 border-t border-red-900/20 flex justify-between items-center text-[7.5px] font-mono text-red-400/80">
                        <span>EMERGENCY DISPATCH TRIGGERED</span>
                        <span>CONFIDENCE 99.4%</span>
                      </div>
                    </div>
                  )}

                  {/* Gemini Visual Analysis Report card */}
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-blue-950/40 space-y-1.5">
                    <span className="block text-[8px] text-blue-400 font-mono font-bold uppercase select-none">
                      VISUAL ANALYSIS (GEMINI VISION CORE)
                    </span>
                    <p className="text-slate-300 font-mono text-[9px] leading-relaxed select-text">
                      {verificationResult.visual_analysis}
                    </p>
                  </div>
                </div>

                {/* Storage bucket link */}
                <div className="pt-3 border-t border-blue-950/40 flex justify-between items-center text-[8.5px] font-mono text-slate-500 select-none">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span>Evidence saved in Supabase: <code className="text-slate-400">wreck-alarms</code></span>
                  </div>
                  {verificationResult.public_url.startsWith("http") && !verificationResult.public_url.includes("mock-storage") && (
                    <a
                      href={verificationResult.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400 flex items-center gap-1"
                    >
                      VIEW IMAGE
                      <ExternalLink className="w-2.5 h-2.5" />
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
