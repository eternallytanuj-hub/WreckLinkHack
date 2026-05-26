"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio } from "lucide-react";

interface TabItem {
  name: string;
  path: string;
}

export function NavHeader({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  
  const tabs: TabItem[] = [
    { name: "DASHBOARD", path: "/" },
    { name: "LIVE MAP", path: "/live-map" },
    { name: "PUBLIC ALARMS", path: "/public-alarms" },
    { name: "METEOROLOGICAL ALERTS", path: "/web-alerts" },
  ];

  const [position, setPosition] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  // Track the active tab reference to return to it on mouse leave
  const activeTabRef = useRef<HTMLLIElement | null>(null);

  // Function to align cursor with the currently active page tab
  const setCursorToActiveTab = () => {
    if (activeTabRef.current) {
      const { width } = activeTabRef.current.getBoundingClientRect();
      setPosition({
        width,
        opacity: 1,
        left: activeTabRef.current.offsetLeft,
      });
    } else {
      setPosition((pv) => ({ ...pv, opacity: 0 }));
    }
  };

  useEffect(() => {
    // Small timeout to guarantee DOM offset positions are calculated
    const timer = setTimeout(() => {
      setCursorToActiveTab();
    }, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <header className="relative shrink-0 w-full z-50 border-b border-blue-950/45 bg-[#020617]/55 backdrop-blur-md select-none">
      <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
        
        {/* Left Side: Brand Logo */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Radio className="w-6 h-6 text-white animate-pulse" />
          </div>
          <span className="text-xl font-mono font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300 group-hover:from-blue-400 group-hover:to-cyan-300 transition-colors duration-300">
            WRECK LINK
          </span>
        </Link>

        {/* Center: Premium Animated Nav Links */}
        <nav className="hidden md:block">
          <ul
            className="relative flex w-fit rounded-full border border-blue-950 bg-slate-950/40 p-1.5 font-mono"
            onMouseLeave={setCursorToActiveTab}
          >
            {tabs.map((tab) => {
              const isActive = pathname === tab.path;
              return (
                <Tab
                  key={tab.path}
                  path={tab.path}
                  isActive={isActive}
                  activeRef={isActive ? activeTabRef : null}
                  setPosition={setPosition}
                >
                  {tab.name}
                </Tab>
              );
            })}

            <Cursor position={position} />
          </ul>
        </nav>

        {/* Right Side: Page-specific children or API Status Ticker */}
        <div className="flex items-center gap-4 select-none">
          {children ? children : (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-mono tracking-wider bg-blue-950/40 border border-blue-900/50 text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              API_ONLINE
            </span>
          )}
        </div>

      </div>
    </header>
  );
}

interface TabProps {
  children: string;
  path: string;
  isActive: boolean;
  activeRef: React.RefObject<HTMLLIElement | null> | null;
  setPosition: React.Dispatch<React.SetStateAction<{ left: number; width: number; opacity: number }>>;
}

const Tab = ({ children, path, isActive, activeRef, setPosition }: TabProps) => {
  const localRef = useRef<HTMLLIElement>(null);
  
  // Combine localRef and activeRef if this is the active tab
  const setRefs = (node: HTMLLIElement | null) => {
    (localRef as any).current = node;
    if (activeRef) {
      (activeRef as any).current = node;
    }
  };

  return (
    <li
      ref={setRefs}
      onMouseEnter={() => {
        if (!localRef.current) return;

        const { width } = localRef.current.getBoundingClientRect();
        setPosition({
          width,
          opacity: 1,
          left: localRef.current.offsetLeft,
        });
      }}
      className="relative z-10 block cursor-pointer"
    >
      <Link
        href={path}
        className={`block px-5 py-2.5 text-[11px] font-bold tracking-wider transition-colors duration-300 ${
          isActive ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        {children}
      </Link>
    </li>
  );
};

const Cursor = ({ position }: { position: any }) => {
  return (
    <motion.li
      animate={position}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="absolute z-0 h-[36px] rounded-full bg-gradient-to-r from-blue-950/80 to-cyan-950/80 border border-cyan-500/35 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
    />
  );
};

export default NavHeader;
