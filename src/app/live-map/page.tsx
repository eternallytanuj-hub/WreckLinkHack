import React from "react";
import { Radio } from "lucide-react";
import Link from "next/link";
import LiveMapWrapper from "@/components/LiveMapWrapper";

export const metadata = {
  title: "Wreck Link - Live Map",
  description: "Real-time global 2D flight telemetry and tracking map.",
};

export default function LiveMapPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-[#F8FAFC] flex flex-col antialiased">
      
      {/* Glassmorphic Navbar */}
      <header className="relative w-full z-50 border-b border-blue-950/40 bg-[#030712]/55 backdrop-blur-md">
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
          </nav>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono tracking-widest bg-blue-950/30 border border-blue-900/40 text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              API_ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* Main Map Content */}
      <main className="flex-1 w-full relative">
        <LiveMapWrapper />
      </main>

    </div>
  );
}
