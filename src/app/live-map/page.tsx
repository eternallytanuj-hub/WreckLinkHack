import React from "react";
import { Radio } from "lucide-react";
import Link from "next/link";
import { NavHeader } from "../../components/NavHeader";
import LiveMapWrapper from "@/components/LiveMapWrapper";

export const metadata = {
  title: "Wreck Link - Live Map",
  description: "Real-time global 2D flight telemetry and tracking map.",
};

export default function LiveMapPage() {
  return (
    <div className="h-screen w-screen bg-[#030712] text-[#F8FAFC] flex flex-col overflow-hidden antialiased">
      
      {/* Premium Framer-Motion Animated Navigation Bar */}
      <NavHeader />

      {/* Main Map Content */}
      <main className="flex-1 w-full relative overflow-hidden">
        <LiveMapWrapper />
      </main>

    </div>
  );
}
