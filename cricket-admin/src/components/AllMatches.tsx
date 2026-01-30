import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { MatchData } from "@/types";

interface Props {
  adminId: string;
  adminUsername: string;
  onMatchSelect: (matchId: string) => void;
}

interface MatchWithId extends MatchData {
  matchId: string;
  createdBy?: string;
  lock?: {
    adminId: string | null;
    adminUsername: string | null;
    lockedAt: number | null;
  };
}

export default function AllMatches({ adminId, adminUsername, onMatchSelect }: Props) {
  const [matches, setMatches] = useState<MatchWithId[]>([]);
  const [filter, setFilter] = useState<"all" | "live" | "completed">("all");

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

  const handleLock = async (matchId: string) => {
    const matchRef = ref(db, `matches/${matchId}/lock`);
    await update(matchRef as any, {
      adminId,
      adminUsername,
      lockedAt: Date.now(),
    });
    onMatchSelect(matchId);
  };

  const filteredMatches = matches.filter((match) => {
    if (filter === "live") return match.meta.status === "LIVE" || match.meta.status === "INNINGS_BREAK";
    if (filter === "completed") return match.meta.status === "COMPLETED";
    return true;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      NOT_STARTED: "bg-gray-100 text-gray-700",
      LIVE: "bg-green-100 text-green-700",
      INNINGS_BREAK: "bg-yellow-100 text-yellow-700",
      COMPLETED: "bg-blue-100 text-blue-700",
    };
    return badges[status as keyof typeof badges] || "bg-gray-100 text-gray-700";
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">All Matches</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("live")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === "live" ? "bg-green-600 text-white" : "bg-white text-gray-700 border"
            }`}
          >
            Live
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === "completed" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border"
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center border">
          <div className="text-6xl mb-4">🏏</div>
          <p className="text-gray-600 mb-4">No matches found</p>
          <p className="text-sm text-gray-500">Create your first match to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMatches.map((match) => (
            <div
              key={match.matchId}
              className="bg-white rounded-lg p-6 border hover:shadow-lg transition cursor-pointer"
              onClick={() => match.lock?.adminId === adminId || !match.lock?.adminId ? handleLock(match.matchId) : null}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {match.meta.teamA} vs {match.meta.teamB}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {match.meta.oversPerInnings} overs
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(match.meta.status)}`}>
                  {match.meta.status.replace("_", " ")}
                </span>
              </div>

              {match.meta.status !== "NOT_STARTED" && (
                <div className="mb-4">
                  <div className="text-3xl font-bold text-gray-900">
                    {match.state.totalRuns}/{match.state.totalWickets}
                  </div>
                  <div className="text-sm text-gray-600">
                    {match.state.oversBowled}.{match.state.ballsInCurrentOver} overs
                  </div>
                  {match.meta.innings === 2 && match.meta.targetScore && (
                    <div className="text-sm text-green-600 font-medium mt-1">
                      Target: {match.meta.targetScore} runs
                    </div>
                  )}
                </div>
              )}

              {match.meta.status === "COMPLETED" && match.meta.matchResult && (
                <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm font-medium text-yellow-900">{match.meta.matchResult}</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-xs text-gray-500">
                  {match.lock?.adminId ? (
                    <span className="flex items-center gap-1">
                      🔒 {match.lock.adminId === adminId ? "You" : match.lock.adminUsername}
                    </span>
                  ) : (
                    <span className="text-green-600">🟢 Available</span>
                  )}
                </div>
                <button
                  className={`text-sm font-medium ${
                    match.lock?.adminId === adminId || !match.lock?.adminId
                      ? "text-blue-600 hover:text-blue-700"
                      : "text-gray-400"
                  }`}
                  onClick={() => match.lock?.adminId === adminId || !match.lock?.adminId ? handleLock(match.matchId) : null}
                >
                  {match.lock?.adminId === adminId ? "Continue" : !match.lock?.adminId ? "Start Scoring" : "Locked"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
