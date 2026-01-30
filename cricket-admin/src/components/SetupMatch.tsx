import { useState } from "react";
import { ref, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { MatchData } from "@/types";

export default function SetupMatch() {
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [overs, setOvers] = useState(10);
  const [rosterA, setRosterA] = useState("");
  const [rosterB, setRosterB] = useState("");

  const handleStart = () => {
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

    const newMatch: MatchData = {
      meta: {
        teamA,
        teamB,
        battingTeam: teamA,
        bowlingTeam: teamB,
        oversPerInnings: Number(overs),
        status: "LIVE",
        innings: 1
      },
      squads: {
        teamA: squadA,
        teamB: squadB
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
        currentPartnershipBalls: 0
      },
      balls: [],
      lastUpdatedAt: Date.now()
    };

    set(ref(db, "match"), newMatch);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-blue-900">Create New Match</h1>
      
      <div className="space-y-4 bg-white p-6 rounded-xl shadow-md">
        <div>
          <label className="block text-sm font-bold mb-1">Team A Name (Batting First)</label>
          <input className="w-full border p-2 rounded" value={teamA} onChange={e => setTeamA(e.target.value)} placeholder="e.g. India" />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Team A Squad (Names)</label>
          <textarea 
            className="w-full border p-2 rounded h-24 text-sm" 
            placeholder="Paste names, one per line"
            value={rosterA}
            onChange={e => setRosterA(e.target.value)}
          />
        </div>

        <hr className="my-4" />

        <div>
          <label className="block text-sm font-bold mb-1">Team B Name (Bowling First)</label>
          <input className="w-full border p-2 rounded" value={teamB} onChange={e => setTeamB(e.target.value)} placeholder="e.g. Australia" />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Team B Squad (Names)</label>
          <textarea 
            className="w-full border p-2 rounded h-24 text-sm" 
            placeholder="Paste names, one per line"
            value={rosterB}
            onChange={e => setRosterB(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Overs Per Innings</label>
          <input type="number" className="w-full border p-2 rounded" value={overs} onChange={e => setOvers(Number(e.target.value))} />
        </div>

        <button 
          onClick={handleStart}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition"
        >
          START MATCH
        </button>
      </div>
    </div>
  );
}