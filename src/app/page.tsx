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
          backgroundColor: "#0f0404",
          border: "1px solid rgba(220, 38, 38, 0.15)",
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
          className="absolute inset-0 z-0 bg-gradient-to-b from-[#0c0505] to-[#120404]"
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
              radial-gradient(ellipse at bottom right, rgba(239, 68, 68, 0.35) -10%, rgba(220, 38, 38, 0) 70%),
              radial-gradient(ellipse at bottom left, rgba(245, 158, 11, 0.35) -10%, rgba(220, 38, 38, 0) 70%)
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
              radial-gradient(circle at bottom center, rgba(185, 28, 28, 0.4) -20%, rgba(220, 38, 38, 0) 60%)
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
            background: "linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(239, 68, 68, 0.6) 50%, rgba(255, 255, 255, 0.05) 100%)",
          }}
          animate={{
            boxShadow: isHovered
              ? "0 0 20px 4px rgba(239, 68, 68, 0.85), 0 0 30px 6px rgba(245, 158, 11, 0.65), 0 0 40px 8px rgba(127, 29, 29, 0.4)"
              : "0 0 15px 3px rgba(239, 68, 68, 0.75), 0 0 25px 5px rgba(245, 158, 11, 0.55), 0 0 35px 7px rgba(127, 29, 29, 0.3)",
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
            <span className="text-[10px] font-mono tracking-wider text-red-500/80 font-bold bg-red-950/20 px-2 py-0.5 rounded border border-red-950/30">
              {id}
            </span>
          </div>

          {/* Icon circle with shadow - warning theme premium lighting */}
          <motion.div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-4 shrink-0"
            style={{
              background: "linear-gradient(225deg, #1d0707 0%, #0f0404 100%)",
              position: "relative",
              overflow: "hidden",
              border: "1px solid rgba(239, 68, 68, 0.2)"
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
            <div className="flex items-center justify-center w-full h-full relative z-10 text-red-500">
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
    <div className="relative min-h-screen bg-[#030712] overflow-x-hidden flex flex-col justify-between selection:bg-red-500/20 selection:text-red-300">
      
      {/* CSS Keyframes for Marquee */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 25s linear infinite;
        }
      `}</style>

      {/* Full-screen contrast vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.45)_100%)] z-20" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(0,0,0,0.2),transparent_10%,transparent_90%,rgba(0,0,0,0.2))] z-20" />

      {/* Clean dark glows for emergency aviation monitoring */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-slate-950/40 rounded-full blur-[130px] pointer-events-none z-0" />
      <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-slate-950/30 rounded-full blur-[160px] pointer-events-none z-0" />

      {/* Glassmorphic Navbar */}
      <header className="relative w-full z-50 border-b border-red-950/40 bg-[#030712]/55 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-red-700 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300 font-mono">
              WRECK LINK
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 font-sans">
            <Link
              href="/live-map"
              className="text-sm font-semibold tracking-wide text-slate-300 hover:text-red-400 transition-colors duration-300"
            >
              LIVE_MAP
            </Link>
            <Link
              href="/public-alarms"
              className="text-sm font-semibold tracking-wide text-slate-300 hover:text-red-400 transition-colors duration-300"
            >
              PUBLIC_ALARMS
            </Link>
            <Link
              href="/web-alerts"
              className="text-sm font-semibold tracking-wide text-slate-300 hover:text-red-400 transition-colors duration-300"
            >
              WEB_ALERTS
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {/* Auditory Caution Warning System Control Toggle */}
            <button
              onClick={toggleAudioAlerts}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono tracking-wider border cursor-pointer transition-all duration-300 ${
                audioActive 
                  ? "bg-red-900/40 border-red-500/60 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-pulse"
                  : "bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200"
              }`}
            >
              {audioActive ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-red-400" />
                  AUDIO ALARM SYNCED
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  ALARM MUTED (CLICK TO SYNC)
                </>
              )}
            </button>
            
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono tracking-wider bg-red-950/40 border border-red-900/50 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              SYSTEM_ALERT_ACTIVE
            </span>
          </div>
        </div>
      </header>

      {/* Flashing warning marquee banner */}
      <div className="w-full bg-red-950/20 border-b border-red-950/50 py-2.5 overflow-hidden whitespace-nowrap z-30 relative select-none">
        <div className="animate-marquee font-mono text-[10px] text-red-500/90 tracking-widest uppercase">
          [ACTIVE DEVIATION SIMULATOR] PREDICTING FLIGHT GLIDE STABILITY -- SCANNING CFIT HIGH-RISK TERRAIN ZONES -- WEATHER ANOMALY ALERTS -- SEARCH & RESCUE COORDINATION ACTIVE -- [ACTIVE DEVIATION SIMULATOR] PREDICTING FLIGHT GLIDE STABILITY -- SCANNING CFIT HIGH-RISK TERRAIN ZONES -- WEATHER ANOMALY ALERTS -- SEARCH & RESCUE COORDINATION ACTIVE --
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-950/30 border border-red-900/40 text-xs font-mono tracking-widest text-red-400 animate-pulse">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              AIRSPACE SAFETY & GLIDE ANGLE SIMULATIONS
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none text-slate-100 font-mono text-glow">
              Wreck Link
            </h1>

            <h2 className="text-lg md:text-xl font-semibold tracking-wide text-slate-200 font-mono uppercase mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 leading-relaxed">
              Check whether you can <span className="font-['Nosifer'] text-4xl md:text-5xl tracking-widest text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.95)] animate-pulse inline-block mx-2">SURVIVE</span> your next flight
            </h2>

            <p className="text-sm md:text-base font-sans tracking-wide text-slate-400 max-w-lg leading-relaxed font-mono uppercase">
              Analyzing telemetry link loss, Controlled Flight Into Terrain (CFIT) zones, and tracking severe weather anomalies.
            </p>

            <div className="w-16 h-[2px] bg-gradient-to-r from-red-500 to-transparent" />

            <div className="pt-2 flex items-center gap-4">
              <Link href="/live-map">
                <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white font-semibold text-xs tracking-widest font-mono border border-red-500/30 shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all duration-300 flex items-center gap-2 group cursor-pointer">
                  ENTER PLATFORM
                  <CornerRightDown className="w-4 h-4 text-red-200 group-hover:translate-y-0.5 transition-transform duration-300 animate-bounce" />
                </button>
              </Link>
            </div>

            {/* Airspace Telemetry Status Console */}
            <div className="pt-2">
              <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/15 text-xs font-mono text-red-400 space-y-2 max-w-lg border-l-4 border-l-red-500 shadow-md">
                <div className="flex items-center justify-between font-bold text-red-500 border-b border-red-950/40 pb-1.5 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    DEVIATION SCANNER: SECURE_LINK_ACTIVE
                  </div>
                  <span className="text-[10px] bg-red-950/80 px-1.5 py-0.5 rounded text-red-400 border border-red-900/40 font-mono">SIGNAL_LOCK</span>
                </div>
                <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                  <p className="text-[10px] text-red-300/80"><span className="text-red-500 font-bold">14:02:11 [ATC]</span> Telemetry divergence detected on transponder route.</p>
                  <p className="text-[10px] text-red-300/80"><span className="text-red-500 font-bold">14:02:13 [SYSTEM]</span> Initiating primary radar coordinate check...</p>
                  <p className="text-[10px] text-red-400 animate-pulse font-bold"><span className="text-red-500 font-bold">14:02:15 [PHYSICS]</span> Projected glide path intersecting risk coordinates.</p>
                  <p className="text-[10px] text-red-300/80"><span className="text-red-500 font-bold">14:02:16 [ATC]</span> Commencing search-and-rescue vector alignment.</p>
                  <p className="text-[10px] text-red-500/90 font-bold"><span className="text-red-500 font-bold">14:02:18 [STATUS]</span> 120 tracks active. Tactical coordinate database synced.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: 3D Spline Canvas */}
        <div className="lg:col-span-7 relative h-[450px] md:h-[600px] w-full rounded-2xl border border-red-500/20 bg-[#070e1b]/40 backdrop-blur-sm overflow-hidden flex items-center justify-center shadow-lg shadow-red-950/20 crt-screen">
          
          {/* Loading Indicator */}
          {!splineLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#030712]/90 z-20">
              <div className="w-10 h-10 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
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

      <section className="relative w-full max-w-7xl mx-auto px-6 py-16 border-t border-red-950/40 z-10">
        
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono tracking-wider text-red-500 uppercase font-bold bg-red-950/30 px-2.5 py-1 rounded border border-red-900/30">TACTICAL RADAR CHANNELS</span>
            <div className="w-12 h-[1px] bg-red-500 mt-2" />
          </div>
          <span className="text-xs font-mono tracking-wider text-slate-500 bg-stone-900/40 px-2 py-1 rounded border border-stone-800 font-mono">DISTRESS PROBABILITY RATE: HIGH</span>
        </div>

        {/* 6 Premium Dynamic 3D Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          
          {[
            { 
              id: "DANGER_ZONE_LINK", 
              title: "Telemetry Tracking",
              desc: "Global real-time tracking of commercial flights and transponder anomaly vectoring.",
              icon: Radio,
              link: "/live-map"
            },
            { 
              id: "WRECKAGE_DETECTOR", 
              title: "Visual Verification",
              desc: "Upload crowd-sourced alarm imagery to classify impact wreckage using visual models.",
              icon: Activity,
              link: "/public-alarms"
            },
            { 
              id: "DEATH_ZONE_COORD", 
              title: "Distress Coordinator",
              desc: "Correlate visual confirmation against telemetry database for maritime coordination.",
              icon: ShieldAlert,
              link: "/public-alarms"
            },
            { 
              id: "FEEDS_SCRAPER", 
              title: "Autonomous Scanners",
              desc: "Scrape real-time stream feeds and social channels to pick up early disaster signals.",
              icon: Cpu,
              link: "/web-alerts"
            },
            {
              id: "IMPACT_VECTOR_ENG",
              title: "Impact Physics Engine",
              desc: "Aeronautical glide vectors and leeway drift calculations.",
              icon: Compass,
              link: "/live-map"
            },
            {
              id: "SURVIVABILITY_RATING",
              title: "Precision Drift Solver",
              desc: "Computes glide projections and leeway drift vectors to locate debris & survivors.",
              icon: Target,
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
      <footer className="w-full py-8 border-t border-red-950/30 bg-[#02050d] text-center z-10 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs tracking-wider text-slate-500">
            &copy; 2026 WRECK LINK. EMERGENCY COCKPIT RADAR SYSTEM VERIFIED.
          </p>
          <div className="flex gap-6">
            <span className="text-xs tracking-wider text-red-500/80 animate-pulse bg-red-950/30 border border-red-950/60 px-2 py-0.5 rounded">SECURE SHELL v2.4 (GPWS LINK)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
