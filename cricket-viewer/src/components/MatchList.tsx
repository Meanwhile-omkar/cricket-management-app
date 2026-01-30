"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { MatchData } from "@/types";

interface MatchWithId extends MatchData {
  matchId: string;
}

interface Props {
  onSelectMatch: (matchId: string) => void;
  onViewTournament: () => void;
}

export default function MatchList({ onSelectMatch,onViewTournament  }: Props) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className="text-5xl mb-3">🏏</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Cricket Matches</h1>

            {/* 2. ADD TOURNAMENT BUTTON HERE */}
            <div className="mt-4 mb-2">
              <button
                onClick={onViewTournament}
                className="bg-purple-700 text-white px-8 py-2 rounded-full font-bold shadow-md hover:bg-purple-800 transition-colors flex items-center mx-auto gap-2"
              >
                <span>🏆</span> View VCL 2026 Standings
              </button>
            </div>

            <p className="text-gray-600">Select a match to watch live scores</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center space-x-4 py-4">
            <button
              onClick={() => setFilter("all")}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                filter === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border hover:bg-gray-50"
              }`}
            >
              All Matches
            </button>
            <button
              onClick={() => setFilter("live")}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                filter === "live" ? "bg-green-600 text-white" : "bg-white text-gray-700 border hover:bg-gray-50"
              }`}
            >
              🔴 Live
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                filter === "completed" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border hover:bg-gray-50"
              }`}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* Match Cards */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredMatches.length === 0 ? (
          <div className="bg-white rounded-xl p-16 text-center shadow-lg">
            <div className="text-6xl mb-4">🏏</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No matches found</h3>
            <p className="text-gray-600">
              {filter === "live" ? "No live matches at the moment" : "No completed matches yet"}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMatches.map((match) => (
              <div
                key={match.matchId}
                onClick={() => onSelectMatch(match.matchId)}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-blue-500"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                      {match.meta.teamA} vs {match.meta.teamB}
                    </h3>
                    <p className="text-sm text-gray-500">{match.meta.oversPerInnings} overs per innings</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(match.meta.status)}`}>
                    {match.meta.status.replace("_", " ")}
                  </span>
                </div>

                {match.meta.status !== "NOT_STARTED" && (
                  <div className="mb-4">
                    <div className="text-4xl font-black text-gray-900 mb-1">
                      {match.state.totalRuns}/{match.state.totalWickets}
                    </div>
                    <div className="text-sm text-gray-600">
                      {match.state.oversBowled}.{match.state.ballsInCurrentOver} / {match.meta.oversPerInnings} overs
                      {match.meta.innings === 2 && <span className="ml-2">• Innings {match.meta.innings}</span>}
                    </div>

                    {match.meta.innings === 2 && match.meta.targetScore && (
                      <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm font-semibold text-green-800">
                          Target: {match.meta.targetScore} • Need {match.meta.targetScore - match.state.totalRuns} runs
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {match.meta.status === "COMPLETED" && match.meta.matchResult && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-2 border-yellow-300">
                    <p className="text-sm font-bold text-yellow-900 text-center">{match.meta.matchResult}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <button className="w-full text-blue-600 hover:text-blue-700 font-semibold text-sm">
                    {match.meta.status === "LIVE" || match.meta.status === "INNINGS_BREAK" ? "Watch Live →" : "View Scorecard →"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
