import { useState } from "react";
import { ref, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { MatchData } from "@/types";

interface Props {
  adminId: string;
  adminUsername: string;
  onMatchCreated: (matchId: string) => void;
}

export default function CreateMatch({ adminId, adminUsername, onMatchCreated }: Props) {
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [overs, setOvers] = useState(10);
  const [rosterA, setRosterA] = useState("");
  const [rosterB, setRosterB] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!teamA || !teamB || !rosterA || !rosterB) {
      alert("Please fill in all fields");
      return;
    }

    const squadA = rosterA.split("\n").map(s => s.trim()).filter(Boolean);
    const squadB = rosterB.split("\n").map(s => s.trim()).filter(Boolean);

    if (squadA.length < 2 || squadB.length < 2) {
      alert("Each team needs at least 2 players.");
      return;
    }

    setLoading(true);
    try {
      // Generate unique matchId
      const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newMatch: MatchData & { matchId: string; createdBy: string; lock: any } = {
        matchId,
        createdBy: adminId,
        lock: {
          adminId,
          adminUsername,
          lockedAt: Date.now(),
        },
        meta: {
          teamA,
          teamB,
          battingTeam: teamA,
          bowlingTeam: teamB,
          oversPerInnings: Number(overs),
          status: "LIVE",
          innings: 1,
        },
        squads: {
          teamA: squadA,
          teamB: squadB,
        },
        state: {
          totalRuns: 0,
          totalWickets: 0,
          legalBalls: 0,
          oversBowled: 0,
          ballsInCurrentOver: 0,
          currentStriker: null,
          currentNonStriker: null,
          currentBowler: null,
          isFreeHit: false,
          battingOrder: [],
          nextBatsmanIndex: 0,
          lastOverBowler: null,
          currentPartnershipRuns: 0,
          currentPartnershipBalls: 0,
        },
        balls: [],
        lastUpdatedAt: Date.now(),
      };

      await set(ref(db, `matches/${matchId}`), newMatch);
      onMatchCreated(matchId);
    } catch (error) {
      console.error("Error creating match:", error);
      alert("Failed to create match. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Create New Match</h2>

      <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700">Team A Name (Batting First)</label>
            <input
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              value={teamA}
              onChange={e => setTeamA(e.target.value)}
              placeholder="e.g. India"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700">Team B Name (Bowling First)</label>
            <input
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              value={teamB}
              onChange={e => setTeamB(e.target.value)}
              placeholder="e.g. Australia"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2 text-gray-700">Team A Squad</label>
          <textarea
            className="w-full border border-gray-300 p-3 rounded-lg h-32 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            placeholder="Enter player names, one per line"
            value={rosterA}
            onChange={e => setRosterA(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">Minimum 2 players required</p>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2 text-gray-700">Team B Squad</label>
          <textarea
            className="w-full border border-gray-300 p-3 rounded-lg h-32 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            placeholder="Enter player names, one per line"
            value={rosterB}
            onChange={e => setRosterB(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">Minimum 2 players required</p>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2 text-gray-700">Overs Per Innings</label>
          <input
            type="number"
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            value={overs}
            onChange={e => setOvers(Number(e.target.value))}
            min={1}
            max={50}
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "Creating Match..." : "Create & Start Match"}
        </button>
      </div>
    </div>
  );
}
