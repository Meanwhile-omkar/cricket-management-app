"use client";

import { useParams, useRouter } from "next/navigation";
import teamsData from "@/data/fullteam.json";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Player {
  name: string;
  role: string;
  image: string;
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [team, setTeam] = useState<any>(null);

  useEffect(() => {
    // Find the team from JSON based on the URL ID
    const foundTeam = teamsData.find((t) => t.id === params.id);
    if (foundTeam) {
      setTeam(foundTeam);
    }
  }, [params.id]);

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-slate-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white pb-12 pt-6">
        <div className="max-w-7xl mx-auto px-4">
            <Link href="/teams" className="text-slate-400 hover:text-white text-sm font-medium mb-6 inline-block">
                ← Back to All Teams
            </Link>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-full p-2 flex items-center justify-center shadow-lg">
               <TeamLogo src={team.logo} alt={team.name} />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-black mb-2">{team.name}</h1>
              <div className="inline-block px-3 py-1 bg-blue-600 rounded-lg text-xs font-bold tracking-wider uppercase">
                VCL Season 2
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Squad Grid */}
      <div className="max-w-7xl mx-auto px-4 -mt-8 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.players.map((player: Player, index: number) => (
            <PlayerCard key={index} player={player} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ player }: { player: Player }) {
  const isOwner = player.role === "Owner";
  
  return (
    <div className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex items-center p-4 border-l-4 ${isOwner ? 'border-amber-400 ring-1 ring-amber-400/20' : 'border-blue-500'}`}>
      
      {/* Avatar */}
      <div className="flex-shrink-0 mr-4">
        <Avatar src={player.image} name={player.name} size="lg" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-lg font-bold text-gray-900 truncate">{player.name}</h3>
            {isOwner && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">
                    Owner
                </span>
            )}
        </div>
        <p className="text-sm text-gray-500 capitalize">{isOwner ? 'Team Owner & Player' : 'Player'}</p>
      </div>
    </div>
  );
}

// Robust Image Component that falls back to Initials
function Avatar({ src, name, size = "md" }: { src: string; name: string; size?: "md" | "lg" }) {
  const [error, setError] = useState(false);
  
  // Get initials (e.g., "Aniket Jaitapkar" -> "AJ")
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sizeClasses = size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-sm";

  if (error || !src) {
    return (
      <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center font-bold text-slate-600 border-2 border-white shadow-sm`}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`${sizeClasses} rounded-full object-cover border-2 border-white shadow-sm`}
      onError={() => setError(true)}
    />
  );
}

function TeamLogo({ src, alt }: { src: string; alt: string }) {
    const [error, setError] = useState(false);
    if (error) return <div className="text-slate-300 font-bold text-2xl">{alt.substring(0,2)}</div>;
    return <img src={src} alt={alt} className="w-full h-full object-contain" onError={() => setError(true)} />;
}