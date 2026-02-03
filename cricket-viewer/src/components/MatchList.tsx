"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { MatchData } from "@/types";
import Link from "next/link"; // Added for better navigation performance

interface MatchWithId extends MatchData {
  matchId: string;
}

interface Props {
  onSelectMatch: (matchId: string) => void;
  onViewTournament: () => void;
}

export default function MatchList({ onSelectMatch, onViewTournament }: Props) {
  const [matches, setMatches] = useState<MatchWithId[]>([]);
  const [filter, setFilter] = useState<"all" | "live" | "completed">("live");

  useEffect(() => {
    const matchesRef = ref(db, "matches");
    return onValue(matchesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const matchList: MatchWithId[] = Object.entries(data).map(([id, match]: any) => ({
          ...match,
          matchId: id,
        }));
        setMatches(matchList.sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt));
      } else {
        setMatches([]);
      }
    });
  }, []);

  const filteredMatches = matches.filter((match) => {
    if (filter === "live") return match.meta.status === "LIVE" || match.meta.status === "INNINGS_BREAK";
    if (filter === "completed") return match.meta.status === "COMPLETED";
    return true;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      NOT_STARTED: "bg-gray-100 text-gray-700",
      LIVE: "bg-green-100 text-green-700 animate-pulse",
      INNINGS_BREAK: "bg-yellow-100 text-yellow-700",
      COMPLETED: "bg-blue-100 text-blue-700",
    };
    return badges[status as keyof typeof badges] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* --- Premium Hero Header --- */}
      <div className="relative bg-slate-900 border-b border-slate-800 shadow-xl overflow-hidden">
        
        {/* Decorative Background Elements (Glow effects) */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Left Side: Branding & Title */}
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-sm mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">Live Action</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                VCL <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">2026</span>
              </h1>
              <p className="text-slate-400 mt-1 text-lg font-medium">Live Cricket Match Center</p>
            </div>

            {/* Right Side: Action Buttons (Glassmorphism) */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              
              {/* Tournament Standings Button - Primary/Gold Accent */}
              <button
                onClick={onViewTournament}
                className="group relative px-6 py-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 group-hover:bg-transparent transition-colors"></div>
                <div className="relative flex items-center justify-center gap-2">
                  <span className="text-lg">🏆</span>
                  <span>View Standings</span>
                </div>
              </button>

              {/* Teams Button - Secondary/Glass Style */}
              <Link
                href="/teams"
                className="group px-6 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-slate-200 font-semibold backdrop-blur-md transition-all duration-300 hover:text-white hover:border-slate-500 w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <span className="group-hover:scale-110 transition-transform duration-300">👥</span>
                <span>View Teams</span>
              </Link>

            </div>
          </div>
        </div>
      </div>

      {/* --- Filter Tabs --- */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center space-x-2 md:space-x-4 py-4">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 md:px-6 py-2 rounded-lg font-medium text-sm md:text-base transition ${
                filter === "all" ? "bg-slate-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              All Matches
            </button>
            <button
              onClick={() => setFilter("live")}
              className={`
                px-5 py-2
                rounded-full
                font-medium text-sm md:text-base
                flex items-center gap-2
                shadow-md transition-all duration-300
                ${filter === "live" 
                  ? "bg-green-500 text-white hover:shadow-lg" 
                  : "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }
              `}
            >
              {filter === "live" && (
                <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
              )}
              Live
            </button>


            <button
              onClick={() => setFilter("completed")}
              className={`px-4 md:px-6 py-2 rounded-lg font-medium text-sm md:text-base transition ${
                filter === "completed" ? "bg-slate-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* --- Match Cards --- */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredMatches.length === 0 ? (
          <div className="bg-white rounded-xl p-16 text-center shadow-lg border border-slate-100">
            <div className="text-6xl mb-4 grayscale opacity-50">🏏</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No matches found</h3>
            <p className="text-gray-500">
              {filter === "live" ? "No live action at the moment" : "No completed matches yet"}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMatches.map((match) => (
              <div
                key={match.matchId}
                onClick={() => onSelectMatch(match.matchId)}
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-slate-100 hover:border-blue-500/30 relative overflow-hidden"
              >
                 {/* Card Hover Gradient Effect */}
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/0 group-hover:to-blue-50/50 transition-all duration-300"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-5">
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-800 mb-1 leading-tight">
                        {match.meta.teamA} <span className="text-slate-300 font-light">vs</span> {match.meta.teamB}
                        </h3>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{match.meta.oversPerInnings} overs match</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${getStatusBadge(match.meta.status)}`}>
                        {match.meta.status.replace("_", " ")}
                    </span>
                    </div>

                    {match.meta.status !== "NOT_STARTED" && (
                    <div className="mb-5">
                        <div className="text-5xl font-black text-slate-900 mb-1 tracking-tighter">
                        {match.state.totalRuns}<span className="text-3xl text-slate-400 font-bold">/{match.state.totalWickets}</span>
                        </div>
                        <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <span>Ov: {match.state.oversBowled}.{match.state.ballsInCurrentOver}</span>
                            <span className="text-slate-300">|</span>
                            {match.meta.innings === 2 && <span className="text-blue-600 font-bold">Innings 2</span>}
                        </div>

                        {match.meta.innings === 2 && match.meta.targetScore && match.meta.status !== "COMPLETED" && (
                        <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-100 flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                            <p className="text-sm font-bold text-green-800">
                            Target: {match.meta.targetScore} <span className="mx-1 opacity-50">•</span> Need {match.meta.targetScore - match.state.totalRuns} runs
                            </p>
                        </div>
                        )}
                    </div>
                    )}

                    {match.meta.status === "COMPLETED" && match.meta.matchResult && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                        <p className="text-sm font-bold text-amber-900 text-center flex items-center justify-center gap-2">
                            <span>🎉</span> {match.meta.matchResult}
                        </p>
                    </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button className="text-blue-600 group-hover:text-blue-700 font-bold text-sm flex items-center gap-1 transition-colors">
                        {match.meta.status === "LIVE" || match.meta.status === "INNINGS_BREAK" ? "Watch Live" : "Scorecard"} 
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
