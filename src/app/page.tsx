"use client";

import React, { useState, useRef, useEffect } from "react";
import Spline from "@splinetool/react-spline";
import { motion } from "framer-motion";
import { 
  Activity, 
  Radio, 
  ShieldAlert, 
  Cpu, 
  CornerRightDown, 
  Compass, 
  Target, 
  Volume2, 
  VolumeX
} from "lucide-react";
import Link from "next/link";
import { NavHeader } from "../components/NavHeader";

interface CardProps {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<any>;
  link: string;
}

const SystemModuleCard = ({ id, title, desc, icon: Icon, link }: CardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  // Handle mouse movement for 3D effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();

      // Calculate mouse position relative to card center
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      setMousePosition({ x, y });

      // Calculate rotation (limited range for subtle effect)
      const rotateX = -(y / rect.height) * 8; // Subtle 8-degree max rotation
      const rotateY = (x / rect.width) * 8;

      setRotation({ x: rotateX, y: rotateY });
    }
  };

  // Reset rotation when not hovering
  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <Link href={link} className="block w-full">
      <motion.div
        ref={cardRef}
        className="relative rounded-2xl overflow-hidden cursor-pointer"
        style={{
          width: "100%",
          height: "300px",
          transformStyle: "preserve-3d",
          backgroundColor: "#020617",
          border: "1px solid rgba(37, 99, 235, 0.15)",
        }}
        animate={{
          y: isHovered ? -5 : 0,
          rotateX: rotation.x,
          rotateY: rotation.y,
          perspective: 1000,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        {/* Subtle glass reflection overlay */}
        <motion.div
          className="absolute inset-0 z-30 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.03) 100%)",
            backdropFilter: "blur(0.5px)",
          }}
          animate={{
            opacity: isHovered ? 0.7 : 0.4,
            rotateX: -rotation.x * 0.2,
            rotateY: -rotation.y * 0.2,
            z: 1,
          }}
          transition={{
            duration: 0.4,
            ease: "easeOut"
          }}
        />

        {/* Dark background */}
        <motion.div
          className="absolute inset-0 z-0 bg-gradient-to-b from-[#000000] to-[#020617]"
          animate={{
            z: -1
          }}
        />

        {/* Noise texture overlay */}
        <motion.div
          className="absolute inset-0 opacity-[0.14] mix-blend-overlay z-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
          animate={{
            z: -0.5
          }}
        />

        {/* Finger smudge texture for realism */}
        <motion.div
          className="absolute inset-0 opacity-[0.06] mix-blend-soft-light z-11 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='smudge'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.01' numOctaves='3' seed='5' stitchTiles='stitch'/%3E%feGaussianBlur stdDeviation='10'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23smudge)'/%3E%3C/svg%3E")`,
            backdropFilter: "blur(0.5px)",
          }}
          animate={{
            z: -0.25
          }}
        />

        {/* Red/amber glow effect matching emergency warning brand */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-2/3 z-20 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at bottom right, rgba(6, 182, 212, 0.25) -10%, rgba(2, 6, 23, 0) 70%),
              radial-gradient(ellipse at bottom left, rgba(56, 189, 248, 0.25) -10%, rgba(2, 6, 23, 0) 70%)
            `,
            filter: "blur(30px)",
          }}
          animate={{
            opacity: isHovered ? 0.9 : 0.75,
            y: isHovered ? rotation.x * 0.5 : 0,
            z: 0
          }}
          transition={{
            duration: 0.4,
            ease: "easeOut"
          }}
        />

        {/* Central orange/crimson glow */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-2/3 z-21 pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at bottom center, rgba(30, 64, 175, 0.3) -20%, rgba(2, 6, 23, 0) 60%)
            `,
            filter: "blur(35px)",
          }}
          animate={{
            opacity: isHovered ? 0.85 : 0.65,
            y: isHovered ? `calc(10% + ${rotation.x * 0.3}px)` : "10%",
            z: 0
          }}
          transition={{
            duration: 0.4,
            ease: "easeOut"
          }}
        />

        {/* Enhanced bottom border glow for emergency radar HUD */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px] z-25 pointer-events-none"
          style={{
            background: "linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(6, 182, 212, 0.6) 50%, rgba(255, 255, 255, 0.05) 100%)",
          }}
          animate={{
            boxShadow: isHovered
              ? "0 0 20px 4px rgba(6, 182, 212, 0.85), 0 0 30px 6px rgba(56, 189, 248, 0.65), 0 0 40px 8px rgba(30, 58, 138, 0.4)"
              : "0 0 15px 3px rgba(6, 182, 212, 0.75), 0 0 25px 5px rgba(56, 189, 248, 0.55), 0 0 35px 7px rgba(30, 58, 138, 0.3)",
            opacity: isHovered ? 1 : 0.85,
            z: 0.5
          }}
          transition={{
            duration: 0.4,
            ease: "easeOut"
          }}
        />

        {/* Card content */}
        <motion.div
          className="relative flex flex-col h-full p-6 z-40"
          animate={{
            z: 2
          }}
        >
          {/* Header ID */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono tracking-wider text-cyan-400/85 font-bold bg-cyan-955/20 px-2 py-0.5 rounded border border-blue-950/30">
              {id}
            </span>
          </div>

          {/* Icon circle with shadow - warning theme premium lighting */}
          <motion.div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-4 shrink-0"
            style={{
              background: "linear-gradient(225deg, #0e172c 0%, #020617 100%)",
              position: "relative",
              overflow: "hidden",
              border: "1px solid rgba(6, 182, 212, 0.2)"
            }}
            animate={{
              boxShadow: isHovered
                ? "0 8px 16px -2px rgba(0, 0, 0, 0.5), 0 4px 8px -1px rgba(0, 0, 0, 0.4), inset 2px 2px 5px rgba(255, 255, 255, 0.05), inset -2px -2px 5px rgba(0, 0, 0, 0.9)"
                : "0 6px 12px -2px rgba(0, 0, 0, 0.4), 0 3px 6px -1px rgba(0, 0, 0, 0.3), inset 1px 1px 3px rgba(255, 255, 255, 0.03), inset -2px -2px 4px rgba(0, 0, 0, 0.7)",
              z: isHovered ? 10 : 5,
              y: isHovered ? -2 : 0,
              rotateX: isHovered ? -rotation.x * 0.5 : 0,
              rotateY: isHovered ? -rotation.y * 0.5 : 0
            }}
            transition={{
              duration: 0.4,
              ease: "easeOut"
            }}
          >
            {/* Top-left highlight for realistic lighting */}
            <div
              className="absolute top-0 left-0 w-2/3 h-2/3 opacity-30"
              style={{
                background: "radial-gradient(circle at top left, rgba(255, 255, 255, 0.2), transparent 80%)",
                pointerEvents: "none",
                filter: "blur(6px)"
              }}
            />

            {/* Bottom shadow for depth */}
            <div
              className="absolute bottom-0 left-0 w-full h-1/2 opacity-40"
              style={{
                background: "linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent)",
                pointerEvents: "none",
                backdropFilter: "blur(2px)"
              }}
            />

            {/* Matching Lucide icon */}
            <div className="flex items-center justify-center w-full h-full relative z-10 text-cyan-400">
              <Icon className="w-4.5 h-4.5" />
            </div>
          </motion.div>

          {/* Content section */}
          <motion.div
            className="mb-auto flex-1 flex flex-col justify-between"
            animate={{
              z: isHovered ? 5 : 2,
              rotateX: isHovered ? -rotation.x * 0.3 : 0,
              rotateY: isHovered ? -rotation.y * 0.3 : 0
            }}
            transition={{
              duration: 0.4,
              ease: "easeOut"
            }}
          >
            <div>
              <h3 className="text-base font-bold text-slate-100 mb-2 tracking-wide leading-snug font-mono">
                {title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans font-light">
                {desc}
              </p>
            </div>

            {/* Action with arrow - matching the template */}
            <div className="pt-3 border-t border-red-950/20 flex items-center justify-between mt-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 group-hover:animate-ping" />
                <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold">
                  STATUS: LIVE_MONITOR
                </span>
              </span>
              <div className="inline-flex items-center text-slate-200 text-xs font-semibold">
                Vector
                <motion.svg
                  className="ml-1 w-3.5 h-3.5"
                  width="8"
                  height="8"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  animate={{
                    x: isHovered ? 3 : 0
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut"
                  }}
                >
                  <path
                    d="M1 8H15M15 8L8 1M15 8L8 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </Link>
  );
};

export default function Home() {
  const [splineLoaded, setSplineLoaded] = useState(false);
  const [audioActive, setAudioActive] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);
  const rumbleOsc1Ref = useRef<OscillatorNode | null>(null);
  const rumbleOsc2Ref = useRef<OscillatorNode | null>(null);

  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "06:38:01 [JRCC] Salinity sensor data parsed for drift vectors.",
    "06:38:03 [ACOUSTIC] Undersea Ray-Tracing completed for seamount segment...",
    "06:38:05 [PHYSICS] Projected drift path intersecting marine coordinate bounds.",
    "06:38:06 [SAR] Commencing search-and-rescue vessel alignment.",
    "06:38:08 [STATUS] 120 nodes active. Tactical coordinate database synced."
  ]);

  // Handle active command log ticks on EOC console
  useEffect(() => {
    const LOG_POOL = [
      "[NASA_EONET] Severe Storm feed parsed: 4 active cyclones monitored.",
      "[TLE_API] Sentinel-2A NORAD element sets loaded. Recalculating orbital pass.",
      "[SIGHTENGINE] Neural photo-forensics filter active. 0 hoax warnings flagged.",
      "[METEO] Marine wind speed at active grid registered at 14.5 m/s.",
      "[ACOUSTIC] Passive Sonar SNR calculation complete. Ray refraction locked.",
      "[DISPATCH] USCG box spiral grid aligned at drift epicenter.",
      "[BATHYMETRY] Seamount ridge shadow zone identified. Sound speed minimum verified.",
      "[SAR] Dynamic sweep ETA updated to 1.8 hours (Quiet Mode Active).",
      "[SYS] Telemetry database synced against global transponder logs."
    ];

    const interval = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString("en-GB", { hour12: false });
      const randomMsg = LOG_POOL[Math.floor(Math.random() * LOG_POOL.length)];
      setConsoleLogs((prev) => {
        const next = [...prev, `${timeStr} ${randomMsg}`];
        if (next.length > 8) next.shift(); // keep it constrained to vertical space
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      if (rumbleOsc1Ref.current) {
        try { rumbleOsc1Ref.current.stop(); } catch(e){}
      }
      if (rumbleOsc2Ref.current) {
        try { rumbleOsc2Ref.current.stop(); } catch(e){}
      }
    };
  }, []);

  const toggleAudioAlerts = () => {
    if (audioActive) {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
      if (rumbleOsc1Ref.current) {
        try { rumbleOsc1Ref.current.stop(); } catch(e){}
        rumbleOsc1Ref.current = null;
      }
      if (rumbleOsc2Ref.current) {
        try { rumbleOsc2Ref.current.stop(); } catch(e){}
        rumbleOsc2Ref.current = null;
      }
      setAudioActive(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        // 1. Create a deep cockpit engine drone (ambient rumble) for physical immersion
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(45, ctx.currentTime); // Low engine hum
        
        osc2.type = "sawtooth";
        osc2.frequency.setValueAtTime(45.6, ctx.currentTime); // Beat frequency to create pulse/vibration

        const lowpassFilter = ctx.createBiquadFilter();
        lowpassFilter.type = "lowpass";
        lowpassFilter.frequency.setValueAtTime(65, ctx.currentTime);

        rumbleGain.gain.setValueAtTime(0.04, ctx.currentTime); // Very quiet atmospheric rumble

        osc1.connect(lowpassFilter);
        osc2.connect(lowpassFilter);
        lowpassFilter.connect(rumbleGain);
        rumbleGain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        rumbleOsc1Ref.current = osc1;
        rumbleOsc2Ref.current = osc2;

        // 2. Play double hazard chirps every 3.5s (Master Caution Beeper) - softened and less frequent
        const playCautionBeep = () => {
          const now = ctx.currentTime;
          
          const chirp = (time: number) => {
            const beepOsc = ctx.createOscillator();
            const beepGain = ctx.createGain();
            
            beepOsc.type = "sine";
            // Classic dual cockpit alarms
            beepOsc.frequency.setValueAtTime(940, time);
            
            beepGain.gain.setValueAtTime(0.03, time); // Quieter warning chime
            beepGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
            
            beepOsc.connect(beepGain);
            beepGain.connect(ctx.destination);
            beepOsc.start(time);
            beepOsc.stop(time + 0.15);
          };

          chirp(now);
          chirp(now + 0.22);
        };

        playCautionBeep();
        alarmIntervalRef.current = setInterval(playCautionBeep, 3500); // Beep every 3.5s
        setAudioActive(true);
      } catch (err) {
        console.error("Web Audio API not supported or user interaction blocked:", err);
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-x-hidden flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-300 tech-grid-bg">
      
      {/* CSS Keyframes for Marquee and Blueprint Background */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 28s linear infinite;
        }
        .tech-grid-bg {
          background-image: 
            linear-gradient(rgba(6, 182, 212, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.015) 1px, transparent 1px);
          background-size: 32px 32px;
        }
      `}</style>

      {/* Full-screen contrast vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.45)_100%)] z-20" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(0,0,0,0.2),transparent_10%,transparent_90%,rgba(0,0,0,0.2))] z-20" />

      {/* Clean dark glows for emergency aviation monitoring */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-slate-950/40 rounded-full blur-[130px] pointer-events-none z-0" />
      <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-slate-950/30 rounded-full blur-[160px] pointer-events-none z-0" />

      {/* Premium Framer-Motion Animated Navigation Bar */}
      <NavHeader>
        {/* Auditory Caution Warning System Control Toggle */}
        <button
          onClick={toggleAudioAlerts}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-mono tracking-wider border cursor-pointer transition-all duration-300 ${
            audioActive 
              ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] animate-pulse"
              : "bg-slate-950/40 border-blue-950/40 text-slate-500 hover:text-slate-350"
          }`}
        >
          {audioActive ? (
            <>
              <Volume2 className="w-3 h-3 text-cyan-400" />
              AUDIO ALARM SYNCED
            </>
          ) : (
            <>
              <VolumeX className="w-3 h-3" />
              ALARM MUTED (CLICK TO SYNC)
            </>
          )}
        </button>
        
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-mono tracking-wider bg-blue-950/40 border border-blue-900/50 text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          SYSTEM_ONLINE
        </span>
      </NavHeader>

      {/* Flashing warning marquee banner */}
      <div className="w-full bg-cyan-950/15 border-b border-cyan-500/20 py-2.5 overflow-hidden whitespace-nowrap z-30 relative select-none crt-screen">
        <div className="animate-marquee font-mono text-[10px] text-cyan-400/90 tracking-widest uppercase text-glow">
          [EOC TACTICAL DATA FEEDS ACTIVE] -- FUSING LIVE NASA EONET WEATHER ANOMALIES -- LOADING SENTINEL RAW TELEMETRY CORRELATIONS (TLE) -- RUNNING ACTIVE MACKENZIE SONAR PROPAGATION PATHS -- BLOCKING CROWD-SOURCED IMAGE HOAXES VIA NEURAL FORENSICS -- [EOC TACTICAL DATA FEEDS ACTIVE] -- FUSING LIVE NASA EONET WEATHER ANOMALIES -- LOADING SENTINEL RAW TELEMETRY CORRELATIONS (TLE) -- RUNNING ACTIVE MACKENZIE SONAR PROPAGATION PATHS -- BLOCKING CROWD-SOURCED IMAGE HOAXES VIA NEURAL FORENSICS --
        </div>
      </div>

      {/* Main Hero Section */}
      <main className="relative flex-1 max-w-7xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-12 z-10">
        
        {/* Left Side: Typography & Motto */}
        <div className="lg:col-span-5 flex flex-col justify-center text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-cyan-950/30 border border-blue-900/40 text-xs font-mono tracking-widest text-cyan-400">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              FLIGHT TELEMETRY & BLACKBOX SEARCH COMMAND
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none text-slate-100 font-mono">
              Wreck Link
            </h1>

            <h2 className="text-lg md:text-xl font-semibold tracking-wide text-slate-200 font-mono uppercase mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 leading-relaxed">
              Precision oceanographic ray-tracing and debris drift trajectory modeling
            </h2>

            <p className="text-sm md:text-base font-sans tracking-wide text-slate-400 max-w-lg leading-relaxed font-mono uppercase">
              Solving deep-sea acoustic shadow zones, calculating dynamic sound speed profiles, and tracking severe weather anomalies.
            </p>

            <div className="w-16 h-[2px] bg-gradient-to-r from-cyan-500 to-transparent" />

            <div className="pt-2 flex items-center gap-4">
              <Link href="/live-map">
                <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-700 to-blue-900 hover:from-cyan-600 hover:to-blue-800 text-white font-semibold text-xs tracking-widest font-mono border border-cyan-500/30 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-300 flex items-center gap-2 group cursor-pointer">
                  ENTER TACTICAL RADAR
                  <CornerRightDown className="w-4 h-4 text-cyan-200 group-hover:translate-y-0.5 transition-transform duration-300 animate-bounce" />
                </button>
              </Link>
            </div>

            {/* Tactical Search & Salvage Status Console */}
            <div className="pt-2">
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/15 text-xs font-mono text-cyan-400 space-y-2 max-w-lg border-l-4 border-l-cyan-500 shadow-md crt-screen">
                <div className="flex items-center justify-between font-bold text-cyan-500 border-b border-cyan-950/40 pb-1.5 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                    SALVAGE MONITORS: SEARCH_ACTIVE
                  </div>
                  <span className="text-[10px] bg-cyan-950/80 px-1.5 py-0.5 rounded text-cyan-400 border border-cyan-900/40 font-mono text-glow">SONAR_LOCK</span>
                </div>
                <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                  {consoleLogs.map((log, idx) => {
                    const parts = log.split(" ");
                    const timestamp = parts[0];
                    const tag = parts[1];
                    const message = parts.slice(2).join(" ");
                    
                    const isAlert = tag.includes("PHYSICS") || tag.includes("STATUS") || tag.includes("SYS") || tag.includes("DISPATCH") || tag.includes("SYS");
                    return (
                      <p key={idx} className={`text-[10px] leading-relaxed ${isAlert ? "text-cyan-300 font-bold" : "text-cyan-400/80"}`}>
                        <span className="text-cyan-500 font-bold">{timestamp} {tag}</span> {message}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: 3D Spline Canvas */}
        <div className="lg:col-span-7 relative h-[450px] md:h-[600px] w-full rounded-2xl border border-cyan-500/20 bg-[#020617]/40 backdrop-blur-sm overflow-hidden flex items-center justify-center shadow-lg shadow-blue-950/20 crt-screen">
          
          {/* Loading Indicator */}
          {!splineLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#030712]/90 z-20">
              <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
              <span className="text-[10px] font-mono tracking-widest text-slate-500">INITIALIZING 3D TELEMETRY MATRIX...</span>
            </div>
          )}

          {/* Spline Model */}
          <div className="w-full h-full relative overflow-hidden">
            <div className="absolute -top-16 -left-16 w-[calc(100%+128px)] h-[calc(100%+128px)] transform scale-[1.8] origin-center">
              <Spline
                scene="https://prod.spline.design/ceZUhzZqNhrrYDKw/scene.splinecode"
                onLoad={() => setSplineLoaded(true)}
              />
            </div>
          </div>
        </div>

      </main>

      <section className="relative w-full max-w-7xl mx-auto px-6 py-16 border-t border-blue-950/40 z-10">
        
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono tracking-wider text-cyan-400 uppercase font-bold bg-cyan-950/30 px-2.5 py-1 rounded border border-cyan-900/30">CORE TACTICAL ENGINES (SYSTEM USPs)</span>
            <div className="w-12 h-[1px] bg-cyan-500 mt-2" />
          </div>
          <span className="text-xs font-mono tracking-wider text-slate-500 bg-stone-900/40 px-2 py-1 rounded border border-stone-800 font-mono">SYSTEM UNIQUE PROPOSITIONS: SECURED</span>
        </div>

        {/* 4 Premium Dynamic 3D USP Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {[
            { 
              id: "SENTINEL_SAR_RADAR", 
              title: "Sentinel-1 SAR Radar",
              desc: "Cloud-Penetrator active C-band microwave mapping (5.405 GHz) to bypass storm cloud decks and absolute darkness, tracing metal debris and calm oil slicks.",
              icon: Radio,
              link: "/live-map"
            },
            { 
              id: "SONAR_LOSS_HEATMAP", 
              title: "Passive Sonar Heatmap",
              desc: "Models subsurface sound refraction (Snell's Law) and volcanic seamount blind shadow zones, calculating decibel propagation loss under active vs. muted engine states.",
              icon: Volume2,
              link: "/live-map"
            },
            { 
              id: "NEURAL_PHOTO_FORENSICS", 
              title: "Neural Photo-Forensics",
              desc: "Sightengine live API integration triaging coordinate reports in real-time, executing neural forensic validation filters to block out generated AI hoaxes.",
              icon: ShieldAlert,
              link: "/public-alarms"
            },
            { 
              id: "TELEMETRY_DRIFT_SOLVER", 
              title: "Distress Drift Solver",
              desc: "Correlates commercial transponder anomaly link-losses, gliding descent curves (PIP), and live wind-driven 6H/24H/48H/72H leeway debris drift coordinates.",
              icon: Activity,
              link: "/live-map"
            }
          ].map((card) => (
            <SystemModuleCard
              key={card.id}
              id={card.id}
              title={card.title}
              desc={card.desc}
              icon={card.icon}
              link={card.link}
            />
          ))}

        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-blue-950/30 bg-[#000000] text-center z-10 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs tracking-wider text-slate-500">
            &copy; 2026 WRECK LINK. NEXT-GEN FLIGHT DEVIATION & BLACKBOX SEARCH COMMAND CENTRE.
          </p>
          <div className="flex gap-6">
            <span className="text-xs tracking-wider text-cyan-400/80 animate-pulse bg-cyan-950/30 border border-cyan-955/60 px-2 py-0.5 rounded">SECURE SEARCH NETWORK VERIFIED (ACOUSTIC RAY INTERCEPTOR)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
