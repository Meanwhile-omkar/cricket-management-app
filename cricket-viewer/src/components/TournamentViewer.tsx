import { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database"; // Import off or handle unsubscribe
import { db } from "@/lib/firebase";
import teamsData from "@/data/teams.json";
import { TournamentState } from "@/types/tournament";
import { calculateStandings } from "@/lib/tournamentUtils";
import { MatchData } from "@/types";

interface Props {
  onSelectMatch: (matchId: string) => void;
  onBack: () => void;
}

export default function TournamentViewer({ onSelectMatch, onBack }: Props) {
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [matches, setMatches] = useState<Record<string, MatchData>>({});

  useEffect(() => {
    const tourneyRef = ref(db, "tournaments/vcl2026");
    const matchesRef = ref(db, "matches");
    
    // 1. Capture the unsubscribe functions returned by onValue
    const unsubTourney = onValue(tourneyRef, (sn) => setTournament(sn.val()));
    const unsubMatches = onValue(matchesRef, (sn) => setMatches(sn.val() || {}));

    // 2. Cleanup function to stop listening when component unmounts
    return () => {
      unsubTourney();
      unsubMatches();
    };
  }, []);

  if (!tournament || !tournament.config?.isSetupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center text-slate-500">
          <p className="text-xl font-bold">Tournament Loading...</p>
          <p className="text-sm">Or setup not completed by admin.</p>
        </div>
      </div>
    );
  }

  // Safe check for fixtures object
  const fixtureList = tournament.fixtures ? Object.values(tournament.fixtures) : [];
  
  const standingsA = calculateStandings(tournament.config.groups.groupA, fixtureList, matches);
  const standingsB = calculateStandings(tournament.config.groups.groupB, fixtureList, matches);

  const getTeamName = (id: string) => teamsData.find(t => t.team_id === id)?.short_name || id;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-purple-900 text-white p-6 pb-12">
        {/* Fixed Arrow Character */}
        <button onClick={onBack} className="text-purple-200 text-sm mb-4 hover:text-white transition">
          ← Back to All Matches
        </button>
        <h1 className="text-3xl font-bold">VCL 2026</h1>
        <p className="opacity-80">Vaishya Cricket League</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-8 pb-10">
        {/* Points Tables */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {[standingsA, standingsB].map((table, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-100">
              <div className="bg-slate-100 p-3 font-bold text-slate-700 border-b flex justify-between">
                <span>Group {i === 0 ? "A" : "B"}</span>
                <span className="text-xs font-normal text-slate-500 mt-1">PTS (NRR)</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 border-b bg-slate-50">
                    <th className="p-3 text-left font-medium">Team</th>
                    <th className="p-3 text-center font-medium">P</th>
                    <th className="p-3 text-center font-medium">W</th>
                    <th className="p-3 text-center font-medium">L</th>
                    <th className="p-3 text-center font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row) => (
                    <tr key={row.team_id} className="border-b last:border-0 hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-800">{getTeamName(row.team_id)}</td>
                      <td className="p-3 text-center text-slate-600">{row.played}</td>
                      <td className="p-3 text-center text-green-600 font-medium">{row.won}</td>
                      <td className="p-3 text-center text-red-600 font-medium">{row.lost}</td>
                      <td className="p-3 text-center font-black text-slate-900 bg-slate-50">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Matches Grid */}
        <h2 className="text-xl font-bold text-slate-800 mb-4 px-1">Tournament Fixtures</h2>
        {fixtureList.length === 0 ? (
          <p className="text-slate-500 italic">No fixtures scheduled yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {fixtureList.map((fix) => {
              const match = fix.matchId ? matches[fix.matchId] : null;
              // If match exists, use its status, otherwise use fixture status
              const status = match ? match.meta.status : "SCHEDULED";
              
              const isClickable = !!fix.matchId;

              return (
                <div 
                  key={fix.id} 
                  onClick={() => isClickable && onSelectMatch(fix.matchId!)}
                  className={`bg-white p-4 rounded-lg shadow border border-slate-100 transition relative overflow-hidden ${
                    isClickable 
                      ? "cursor-pointer hover:border-purple-400 hover:shadow-md" 
                      : "opacity-80"
                  }`}
                >
                  {/* Status Label */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      GROUP {fix.group}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                      status === "LIVE" ? "bg-red-100 text-red-600 animate-pulse" : 
                      status === "COMPLETED" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {status.replace("_", " ")}
                    </span>
                  </div>
                  
                  {/* Teams */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-bold text-slate-800 text-lg">{getTeamName(fix.teamA_id)}</div>
                    <div className="text-xs font-bold text-slate-300 px-2">VS</div>
                    <div className="font-bold text-slate-800 text-lg">{getTeamName(fix.teamB_id)}</div>
                  </div>

                  {/* Live/Final Score */}
                  {match && match.meta.status !== "NOT_STARTED" ? (
                    <div className="mt-3 pt-3 border-t border-dashed border-slate-200 text-center">
                      <div className="font-black text-xl text-slate-900 tracking-tight">
                        {match.state.totalRuns}/{match.state.totalWickets}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {match.state.oversBowled}.{match.state.ballsInCurrentOver} overs
                        {match.meta.innings === 2 && ` • Target: ${match.meta.targetScore}`}
                      </div>
                      {match.meta.matchResult && (
                        <div className="text-xs text-amber-700 font-bold mt-2 bg-amber-50 py-1 rounded">
                          {match.meta.matchResult}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-center text-xs text-slate-400 italic">
                      Match not started
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}