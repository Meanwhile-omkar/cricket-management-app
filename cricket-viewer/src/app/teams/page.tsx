"use client";

import Link from "next/link";
import teamsData from "@/data/fullteam.json";
import { useState } from "react";

export default function TeamsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            ← Back to Matches
          </Link>
          <h1 className="text-xl font-bold text-gray-900">VCL Teams</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-800 mb-2">VCL TEAMS</h2>
          <p className="text-slate-500">Select a team to view squad details</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {teamsData.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-slate-100 group cursor-pointer h-full flex flex-col items-center">
                
                {/* Logo Container */}
                <div className="w-32 h-32 mb-4 relative flex items-center justify-center bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <TeamLogo src={team.logo} alt={team.name} />
                </div>

                {/* Team Name */}
                <h3 className="font-bold text-lg text-center text-slate-800 group-hover:text-blue-600 transition-colors">
                  {team.name}
                </h3>

                {/* Player Count */}
                <div className="mt-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                  {team.players.length} Players
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper component to handle broken/missing team logos
function TeamLogo({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold text-3xl">
        {alt.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}
