"use client";

import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-purple-500 selection:text-white">
      
      {/* --- Background Effects (Ambient Glow) --- */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        
        {/* --- 1. VGCT Logo Section --- */}
        <div className="mb-8 flex justify-center animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-500">
            {/* Replace src with your actual logo path */}
            <LogoPlaceholder /> 
          </div>
        </div>

        {/* --- 2. Main Title & Typography --- */}
        <div className="space-y-6 mb-12 animate-in fade-in zoom-in duration-1000 delay-150 fill-mode-backwards">
          <div className="inline-block">
            <span className="px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-bold tracking-[0.2em] uppercase mb-4 inline-block backdrop-blur-sm">
              Organized by VGCT
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[0.9]">
            VAISHYA <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-amber-300">
              CRICKET LEAGUE
            </span>
          </h1>
          
          <div className="flex items-center justify-center gap-3">
             <div className="h-[1px] w-12 bg-slate-700"></div>
             <span className="text-2xl md:text-3xl font-light text-slate-300 uppercase tracking-widest">Season 2</span>
             <div className="h-[1px] w-12 bg-slate-700"></div>
          </div>
        </div>

        {/* --- 3. Mission / Context --- */}
        <div className="max-w-2xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-backwards">
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed font-light">
            More than just cricket. <br className="hidden md:block"/>
            <strong className="text-slate-200 font-semibold">VCL 2026</strong> is a celebration of unity, networking, and the spirit of our community. Join us to bond, compete, and create lasting memories.
          </p>
        </div>

        {/* --- 4. Call to Action Buttons --- */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 fill-mode-backwards">
          
          {/* Primary: Go to Dashboard */}
          <Link 
            href="/dashboard"
            className="group relative w-full sm:w-auto min-w-[200px] px-8 py-4 bg-white text-slate-900 font-bold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative flex items-center justify-center gap-2">
              Enter Match Center <span className="text-xl">→</span>
            </span>
          </Link>

          {/* Secondary: View Teams */}
          <Link 
            href="/teams"
            className="group w-full sm:w-auto min-w-[200px] px-8 py-4 bg-slate-800/50 text-white font-semibold rounded-xl border border-slate-700 hover:bg-slate-800 hover:border-slate-500 backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span>👥</span> Meet the Teams
          </Link>

        </div>
      </div>

      {/* Footer / Credit */}
      <div className="absolute bottom-6 text-slate-600 text-xs tracking-widest uppercase opacity-50">
        Vaishya Global Charitable Trust
      </div>
    </div>
  );
}

// --- Helper Component for Logo ---
function LogoPlaceholder() {
    const [error, setError] = useState(false);
    const logoPath = "/images/vgct-logo.png"; // Ensure you put the logo here

    if (error) {
        // Fallback if image fails
        return (
            <div className="w-24 h-24 flex items-center justify-center bg-slate-800 rounded-full border border-slate-600">
                <span className="text-3xl font-bold text-slate-400">VGCT</span>
            </div>
        );
    }

    return (
        <img 
            src={logoPath} 
            alt="VGCT Logo" 
            className="h-24 md:h-32 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            onError={() => setError(true)}
        />
    );
}