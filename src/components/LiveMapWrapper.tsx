"use client";

import React from "react";
import dynamic from "next/dynamic";

// Dynamically import LiveMap with SSR disabled to prevent Leaflet window reference errors
const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#02050d] flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      <span className="text-[10px] font-mono tracking-widest text-slate-500">HYDRATING GEOSPATIAL DATABASE...</span>
    </div>
  ),
});

export default function LiveMapWrapper() {
  return <LiveMap />;
}
