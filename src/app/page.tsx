"use client";

import React, { useState } from "react";
import Spline from "@splinetool/react-spline";
import { motion } from "framer-motion";
import { Activity, Radio, ShieldAlert, Cpu, CornerRightDown, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [splineLoaded, setSplineLoaded] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-x-hidden flex flex-col justify-between selection:bg-blue-500/20 selection:text-blue-300">
      
      {/* Subtle top background glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-cyan-950/10 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Glassmorphic Navbar */}
      <header className="relative w-full z-50 border-b border-blue-950/40 bg-[#030712]/55 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Radio className="w-4.5 h-4.5 text-white animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
              WRECK LINK
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/live-map"
              className="text-xs font-mono tracking-widest text-slate-500 hover:text-blue-400 transition-colors duration-300"
            >
              LIVE_MAP
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-950/20 border border-blue-900/30 text-xs font-mono tracking-widest text-blue-400/90">
              <Activity className="w-3.5 h-3.5" />
              FLIGHT SIGNAL ANALYSIS
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none text-slate-100">
              Wreck Link
            </h1>

            <p className="text-sm md:text-base font-mono tracking-widest text-slate-400 uppercase max-w-lg leading-relaxed">
              INTELLIGENT ANOMALY TRACKING & IMPACT RECOVERY NETWORK.
            </p>

            <div className="w-16 h-[2px] bg-gradient-to-r from-blue-500 to-transparent" />

            <div className="pt-4 flex items-center gap-4">
              <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium text-xs tracking-widest font-mono border border-blue-400/20 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300 flex items-center gap-2 group">
                ENTER PLATFORM
                <CornerRightDown className="w-4 h-4 text-blue-200 group-hover:translate-y-0.5 transition-transform duration-300" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Right Side: 3D Spline Canvas */}
        <div className="lg:col-span-7 relative h-[450px] md:h-[600px] w-full rounded-2xl border border-blue-950/50 bg-[#060b18]/30 backdrop-blur-sm overflow-hidden flex items-center justify-center">
          
          {/* Loading Indicator */}
          {!splineLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#060b18]/80 z-20">
              <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-[10px] font-mono tracking-widest text-slate-500">INITIALIZING 3D ENGINE...</span>
            </div>
          )}

          {/* Spline Model */}
          <div className="w-full h-full relative overflow-hidden">
            <div className="absolute -top-16 -left-16 w-[calc(100%+128px)] h-[calc(100%+128px)]">
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
            <span className="text-[10px] font-mono tracking-widest text-blue-500 uppercase font-bold">SYSTEM MODULES</span>
            <div className="w-12 h-[1px] bg-blue-500" />
          </div>
          <span className="text-[10px] font-mono tracking-widest text-slate-600">CONFIDENCE FACTOR: 0.998</span>
        </div>

        {/* 4 Premium Styled Blank Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {[
            { id: "SYS_MOD_01", icon: Radio },
            { id: "SYS_MOD_02", icon: Activity },
            { id: "SYS_MOD_03", icon: ShieldAlert },
            { id: "SYS_MOD_04", icon: Cpu }
          ].map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="relative overflow-hidden group rounded-xl border border-blue-950/60 bg-[#050b18]/25 backdrop-blur-md p-6 flex flex-col justify-between h-56 transition-all duration-300 hover:border-blue-500/30 hover:bg-[#070e24]/40"
              >
                {/* Glow Overlay */}
                <div className="absolute -inset-px bg-gradient-to-br from-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />

                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 group-hover:text-blue-400 transition-colors duration-300">
                    {card.id}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-950/20 border border-blue-900/30 flex items-center justify-center text-blue-500 group-hover:text-blue-400 group-hover:bg-blue-950/40 transition-all duration-300">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                {/* Blank/Skeleton Blocks */}
                <div className="space-y-3 my-4">
                  {/* Headline skeleton */}
                  <div className="h-4 bg-slate-800/40 rounded w-2/3 group-hover:bg-slate-700/30 transition-colors duration-300" />
                  
                  {/* Body paragraphs skeleton */}
                  <div className="space-y-1.5">
                    <div className="h-2 bg-slate-900/60 rounded w-full" />
                    <div className="h-2 bg-slate-900/60 rounded w-5/6" />
                    <div className="h-2 bg-slate-900/60 rounded w-3/4" />
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-blue-950/30">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:animate-ping" />
                    <span className="text-[9px] font-mono tracking-wider text-slate-600 group-hover:text-blue-500 transition-colors duration-300">
                      STATUS: ACTIVE
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-700 group-hover:text-blue-400 transition-colors duration-300" />
                </div>
              </motion.div>
            );
          })}

        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-blue-950/30 bg-[#02050e] text-center z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-mono tracking-widest text-slate-600">
            &copy; 2026 WRECK LINK. ALL SYSTEM PROTOCOLS VERIFIED.
          </p>
          <div className="flex gap-6">
            <span className="text-[10px] font-mono tracking-widest text-slate-700">SECURE SHELL v2.4</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
