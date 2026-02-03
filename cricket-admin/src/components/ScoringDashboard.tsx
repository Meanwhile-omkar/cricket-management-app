import { useState, useEffect } from "react";
import { ref, set, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { MatchData } from "@/types";
import { processBallDelivery } from "@/lib/ballProcessor";
import { validateBowlerSelection } from "@/lib/cricketRules";
import { calculateBatsmanStats, calculateBowlerStats } from "@/lib/statsCalculator";
import { saveInningsData, prepareInnings2State, calculateMatchResult } from "@/lib/inningsManager";

interface Props {
  match: MatchData;
  matchId?: string; // Optional for backward compatibility
}

export default function ScoringDashboard({ match, matchId }: Props) {
  const dbPath = matchId ? `matches/${matchId}` : "match"; // Support both old and new structure
  // --- LOCAL STATE (Buffers) ---
  const [localStriker, setLocalStriker] = useState(match.state?.currentStriker || "");
  const [localNonStriker, setLocalNonStriker] = useState(match.state?.currentNonStriker || "");
  const [localBowler, setLocalBowler] = useState(match.state?.currentBowler || "");
  const [bowlerError, setBowlerError] = useState("");

  // Sync Local State with DB
  useEffect(() => {
    if (match.state?.currentStriker) setLocalStriker(match.state.currentStriker);
    if (match.state?.currentNonStriker) setLocalNonStriker(match.state.currentNonStriker);
    if (match.state?.currentBowler) setLocalBowler(match.state.currentBowler);
  }, [match.state?.currentStriker, match.state?.currentNonStriker, match.state?.currentBowler]);

  // Scoring Inputs
  const [runs, setRuns] = useState(0);
  const [extrasType, setExtrasType] = useState<"NONE" | "WD" | "NB" | "BYE" | "LB">("NONE");

  // Wicket Inputs
  const [isWicket, setIsWicket] = useState(false);
  const [wicketWho, setWicketWho] = useState<"striker" | "nonStriker">("striker");
  const [wicketKind, setWicketKind] = useState<"bowled" | "caught" | "run_out" | "lbw" | "stumped" | "hit_wicket">("bowled");
  const [fielder, setFielder] = useState("");

  // Helpers
  const isTeamABatting = match.meta.battingTeam === match.meta.teamA;
  const battingSquad = isTeamABatting ? match.squads.teamA : match.squads.teamB;
  const bowlingSquad = isTeamABatting ? match.squads.teamB : match.squads.teamA;

  // Calculate current stats
  const strikerStats = localStriker ? calculateBatsmanStats(match.balls, localStriker) : null;
  const nonStrikerStats = localNonStriker ? calculateBatsmanStats(match.balls, localNonStriker) : null;
  const bowlerStats = localBowler ? calculateBowlerStats(match.balls, localBowler) : null;

  // --- ACTIONS ---

  const handleUpdatePlayer = (role: "striker" | "nonStriker" | "bowler", name: string) => {
    if (!match || !match.state) return;

    if (role === 'striker' && name === localNonStriker) {
      return alert("Player already at crease as non-striker");
    }
    if (role === 'nonStriker' && name === localStriker) {
      return alert("Player already at crease as striker");
    }

    // Validate bowler selection
    if (role === 'bowler') {
      const validation = validateBowlerSelection(
        match.state.currentBowler,
        match.state.lastOverBowler,
        name
      );

      if (!validation.valid) {
        setBowlerError(validation.error || "Invalid bowler selection");
        return;
      } else {
        setBowlerError("");
      }
    }

    // INSTANT UI UPDATE
    if (role === 'striker') setLocalStriker(name);
    if (role === 'nonStriker') setLocalNonStriker(name);
    if (role === 'bowler') setLocalBowler(name);

    // BACKGROUND DB UPDATE
    const stateKey = role === 'striker' ? 'currentStriker'
                   : role === 'nonStriker' ? 'currentNonStriker'
                   : 'currentBowler';

    update(ref(db, `${dbPath}/state`), {
      [stateKey]: name
    }).catch(err => console.error(err));
  };

  const submitBall = async () => {
    if (!match || !match.state) return;
    const { state, meta } = match;

    const activeStriker = localStriker || state.currentStriker;
    const activeNonStriker = localNonStriker || state.currentNonStriker;
    const activeBowler = localBowler || state.currentBowler;

    if (!activeStriker || !activeNonStriker || !activeBowler) {
      alert("Please select all players (Striker, Non-Striker, Bowler) before bowling.");
      return;
    }

    // Process ball using business logic
    const result = processBallDelivery(
      state,
      meta,
      {
        runs,
        extrasType,
        isWicket,
        wicketKind: isWicket ? wicketKind : undefined,
        playerOut: isWicket ? (wicketWho === 'striker' ? activeStriker : activeNonStriker) : undefined,
        fielder: isWicket && (wicketKind === 'caught' || wicketKind === 'run_out' || wicketKind === 'stumped') ? fielder : undefined,
      },
      match.balls.length + 1,
      activeStriker,
      activeNonStriker,
      activeBowler
    );

    // Update local state based on changes
    let updatedStriker = result.newState.currentStriker;
    let updatedNonStriker = result.newState.currentNonStriker;
    let updatedBowler = result.newState.currentBowler;

    setLocalStriker(updatedStriker || "");
    setLocalNonStriker(updatedNonStriker || "");
    setLocalBowler(updatedBowler || "");

    // Check if innings completed and handle accordingly
    let finalMeta = result.newMeta;
    let finalMatchData = {
      ...match,
      meta: finalMeta,
      state: result.newState,
      balls: [...match.balls, result.newBall],
      lastUpdatedAt: Date.now()
    };

    // If innings 1 completed, save innings data
    if (result.stateChanges.inningsCompleted && meta.innings === 1) {
      // Use updated state for saving innings data
      const matchWithNewState = {
        ...match,
        state: result.newState,
        meta: result.newMeta,
        balls: [...match.balls, result.newBall]
      };
      const innings1Data = saveInningsData(matchWithNewState, 1, [...match.balls, result.newBall]);
      finalMatchData = {
        ...finalMatchData,
        innings1: innings1Data
      };
    }

    // If innings 2 completed, calculate result
    if (result.stateChanges.inningsCompleted && meta.innings === 2 && match.innings1) {
      // Use updated state for saving innings data
      const matchWithNewState = {
        ...match,
        state: result.newState,
        meta: result.newMeta,
        balls: [...match.balls, result.newBall]
      };
      const innings2Data = saveInningsData(matchWithNewState, 2, [...match.balls, result.newBall]);
      const matchResult = calculateMatchResult(match.innings1, innings2Data);

      finalMatchData = {
        ...finalMatchData,
        innings2: innings2Data,
        meta: {
          ...finalMeta,
          winningTeam: matchResult.winningTeam,
          matchResult: matchResult.resultText,
          matchResultType: matchResult.resultType
        }
      };
    }

    // Save to Firebase
    await set(ref(db, dbPath), finalMatchData);

    // If this is a tournament match and it's now completed, update the fixture status
    const matchTyped = match as any;
    if (finalMatchData.meta.status === "COMPLETED" && matchTyped.tournamentId && matchTyped.fixtureId) {
      const fixtureStatusRef = ref(db, `tournaments/${matchTyped.tournamentId}/fixtures/${matchTyped.fixtureId}/status`);
      await set(fixtureStatusRef, "COMPLETED");
    }

    // Reset Form
    setRuns(0);
    setExtrasType("NONE");
    setIsWicket(false);
    setFielder("");
  };

  const handleUndo = () => {
    if (match.balls.length === 0) return;
    const newHistory = match.balls.slice(0, -1);

    let r = 0, w = 0, lb = 0;
    let partnershipRuns = 0, partnershipBalls = 0;

    newHistory.forEach(b => {
      r += b.runsScored;
      if(b.isWicket) w++;
      if(!b.isWide && !b.isNoBall) {
        lb++;
        partnershipBalls++;
      }
      partnershipRuns += b.runsScored;
    });

    const lastBall = newHistory[newHistory.length - 1];

    // Determine last over bowler
    const currentOverNumber = Math.floor(lb / 6);
    let lastOverBowler: string | null = null;
    if (currentOverNumber > 0) {
      const prevOverBalls = newHistory.filter(b => b.overNumber === currentOverNumber - 1);
      if (prevOverBalls.length > 0) {
        lastOverBowler = prevOverBalls[0].bowler;
      }
    }

    const restoredStriker = lastBall ? lastBall.striker : match.state.currentStriker;
    const restoredNonStriker = lastBall ? lastBall.nonStriker : match.state.currentNonStriker;
    const restoredBowler = lastBall ? lastBall.bowler : match.state.currentBowler;

    setLocalStriker(restoredStriker || "");
    setLocalNonStriker(restoredNonStriker || "");
    setLocalBowler(restoredBowler || "");

    const restoredState = {
      totalRuns: r,
      totalWickets: w,
      legalBalls: lb,
      oversBowled: Math.floor(lb / 6),
      ballsInCurrentOver: lb % 6,
      currentStriker: restoredStriker,
      currentNonStriker: restoredNonStriker,
      currentBowler: restoredBowler,
      isFreeHit: lastBall ? (lastBall.isNoBall) : false,
      lastOverBowler,
      battingOrder: match.state.battingOrder ?? [],
      nextBatsmanIndex: match.state.nextBatsmanIndex ?? 0,
      currentPartnershipRuns: partnershipRuns,
      currentPartnershipBalls: partnershipBalls,
    };

    set(ref(db, dbPath), {
      ...match,
      state: restoredState,
      balls: newHistory,
      lastUpdatedAt: Date.now()
    });
  };

  const handleStartInnings2 = () => {
    if (!match.innings1) {
      alert("Innings 1 data not found");
      return;
    }

    const { meta, state } = prepareInnings2State(match);

    set(ref(db, dbPath), {
      ...match,
      meta,
      state,
      balls: [], // Reset balls for innings 2
      lastUpdatedAt: Date.now()
    });

    // Reset local UI
    setLocalStriker("");
    setLocalNonStriker("");
    setLocalBowler("");
  };

  // --- RENDER ---
  if (!match.state) return <div>Loading State...</div>;

  // Show innings break UI
  if (match.meta.status === "INNINGS_BREAK") {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-center text-blue-900">Innings Break</h2>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-bold text-lg mb-2">{match.innings1?.battingTeam} Innings</h3>
            <p className="text-3xl font-bold text-blue-900">
              {match.innings1?.totalRuns}/{match.innings1?.totalWickets}
            </p>
            <p className="text-sm text-gray-600">
              Overs: {match.innings1?.oversBowled}.{match.innings1?.ballsInCurrentOver}
            </p>
          </div>

          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-center text-lg">
              <span className="font-bold">{match.meta.bowlingTeam}</span> needs{" "}
              <span className="text-2xl font-bold text-green-700">
                {(match.innings1?.totalRuns ?? 0) + 1}
              </span>{" "}
              runs to win
            </p>
          </div>

          <button
            onClick={handleStartInnings2}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-xl hover:bg-green-700 transition"
          >
            START INNINGS 2
          </button>
        </div>
      </div>
    );
  }

  // Show match completed UI
  if (match.meta.status === "COMPLETED") {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-center text-blue-900">Match Completed</h2>

          <div className="mb-6 p-6 bg-yellow-50 rounded-lg border-2 border-yellow-400">
            <p className="text-center text-2xl font-bold text-yellow-900">
              {match.meta.matchResult}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-bold mb-2">{match.innings1?.battingTeam}</h3>
              <p className="text-2xl font-bold">{match.innings1?.totalRuns}/{match.innings1?.totalWickets}</p>
              <p className="text-sm text-gray-600">
                {match.innings1?.oversBowled}.{match.innings1?.ballsInCurrentOver} overs
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-bold mb-2">{match.innings2?.battingTeam}</h3>
              <p className="text-2xl font-bold">{match.innings2?.totalRuns}/{match.innings2?.totalWickets}</p>
              <p className="text-sm text-gray-600">
                {match.innings2?.oversBowled}.{match.innings2?.ballsInCurrentOver} overs
              </p>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
          >
            Start New Match
          </button>
        </div>
      </div>
    );
  }

  const canPlay = localStriker && localNonStriker && localBowler && match.meta.status === 'LIVE';
  const needsFielder = isWicket && (wicketKind === 'caught' || wicketKind === 'run_out' || wicketKind === 'stumped');

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-blue-900 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold">{match.state.totalRuns}/{match.state.totalWickets}</h2>
            <p className="opacity-80">Ov: {match.state.oversBowled}.{match.state.ballsInCurrentOver} ({match.meta.oversPerInnings})</p>
            {match.meta.innings === 2 && match.meta.targetScore && (
              <p className="text-yellow-300 font-bold">
                Need {match.meta.targetScore - match.state.totalRuns} runs
              </p>
            )}
          </div>
          <div className="text-right text-sm">
            <p>{match.meta.battingTeam} Batting</p>
            <p className="text-xs">Innings {match.meta.innings}/2</p>
            <p className="text-yellow-400 font-bold">{match.state.isFreeHit ? "FREE HIT ACTIVE" : ""}</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {(strikerStats || nonStrikerStats) && (
        <div className="p-4 bg-white border-b">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Current Partnership</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {strikerStats && (
              <div className="p-2 bg-green-50 rounded">
                <p className="font-bold text-green-900">★ {strikerStats.name}</p>
                <p className="text-lg font-bold text-slate-600">{strikerStats.runs} ({strikerStats.balls})</p>
                <p className="text-xs text-gray-600">
                  4s: {strikerStats.fours} | 6s: {strikerStats.sixes} | SR: {strikerStats.strikeRate.toFixed(0)}
                </p>
              </div>
            )}
            {nonStrikerStats && (
              <div className="p-2 bg-gray-50 rounded">
                <p className="font-bold text-slate-600">{nonStrikerStats.name}</p>
                <p className="text-lg font-bold text-slate-600">{nonStrikerStats.runs} ({nonStrikerStats.balls})</p>
                <p className="text-xs text-gray-600">
                  4s: {nonStrikerStats.fours} | 6s: {nonStrikerStats.sixes} | SR: {nonStrikerStats.strikeRate.toFixed(0)}
                </p>
              </div>
            )}
          </div>

          {bowlerStats && (
            <div className="mt-2 p-2 bg-red-50 rounded text-sm">
              <p className="font-bold text-red-900">Bowler: {bowlerStats.name}</p>
              <p className="text-xs text-gray-600">
                {bowlerStats.overs}.{bowlerStats.balls} overs | {bowlerStats.runs} runs | {bowlerStats.wickets} wickets | Econ: {bowlerStats.economy}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Players */}
      <div className="p-4 grid gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Batting ({match.meta.battingTeam})</h3>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={localStriker}
              onChange={(e) => handleUpdatePlayer("striker", e.target.value)}
              className="border p-2 rounded w-full bg-green-50 text-slate-600
"
            >
              <option value="">Select Striker *</option>
              {battingSquad.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={localNonStriker}
              onChange={(e) => handleUpdatePlayer("nonStriker", e.target.value)}
              className="border p-2 rounded w-full text-slate-600"
            >
              <option value="">Select Non-Striker *</option>
              {battingSquad.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500 text-slate-600">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Bowling ({match.meta.bowlingTeam})</h3>
          <select
            value={localBowler}
            onChange={(e) => handleUpdatePlayer("bowler", e.target.value)}
            className="border p-2 rounded w-full bg-red-50 text-slate-600"
          >
            <option value="">Select Bowler *</option>
            {bowlingSquad.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {bowlerError && (
            <p className="text-red-600 text-sm mt-2 font-bold">{bowlerError}</p>
          )}
        </div>
      </div>

      {/* Scoring Pad */}
      <div className={`p-4 transition-all ${canPlay ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[0,1,2,3,4,6].map(r => (
            <button
              key={r}
              onClick={() => setRuns(r)}
              className={`h-14 rounded-lg font-bold text-xl shadow-sm border-2 ${runs === r ? 'bg-blue-600 text-white border-blue-800' : 'bg-white text-gray-800 border-gray-200'}`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-2 mb-4">
          {(["NONE", "WD", "NB", "BYE", "LB"] as const).map(type => (
            <button
              key={type}
              onClick={() => setExtrasType(type)}
              className={`h-10 rounded text-xs font-bold border ${extrasType === type ? 'bg-orange-500 text-white border-orange-700' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              {type === 'NONE' ? 'Legal' : type}
            </button>
          ))}
        </div>

        {/* Wicket Section */}
        <div className="mb-4 bg-red-50 p-3 rounded-lg border border-red-100">
          <label className="flex items-center space-x-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={isWicket}
              onChange={(e) => setIsWicket(e.target.checked)}
              className="w-6 h-6 text-red-600 rounded focus:ring-red-500"
            />
            <span className="font-bold text-red-700">Wicket Delivery?</span>
          </label>

          {isWicket && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setWicketWho("striker")}
                  className={`flex-1 py-2 text-sm font-bold border rounded transition-colors ${wicketWho === 'striker' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-red-600 border-red-200'}`}
                >
                  Striker Out
                </button>
                <button
                  onClick={() => setWicketWho("nonStriker")}
                  className={`flex-1 py-2 text-sm font-bold border rounded transition-colors ${wicketWho === 'nonStriker' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-red-600 border-red-200'}`}
                >
                  Non-Striker Out
                </button>
              </div>

              <select
                value={wicketKind}
                onChange={(e) => setWicketKind(e.target.value as any)}
                className="w-full border p-2 rounded text-sm"
              >
                <option value="bowled">Bowled</option>
                <option value="caught">Caught</option>
                <option value="lbw">LBW</option>
                <option value="run_out">Run Out</option>
                <option value="stumped">Stumped</option>
                <option value="hit_wicket">Hit Wicket</option>
              </select>

              {needsFielder && (
                <input
                  type="text"
                  value={fielder}
                  onChange={(e) => setFielder(e.target.value)}
                  placeholder="Fielder name"
                  className="w-full border p-2 rounded text-sm"
                />
              )}
            </div>
          )}
        </div>

        <button
          onClick={submitBall}
          className="w-full bg-blue-800 text-white h-16 rounded-xl font-bold text-xl shadow-lg active:scale-95 transition-transform"
        >
          BOWL DELIVERY
        </button>
      </div>

      <div className="p-4 border-t bg-white fixed bottom-0 w-full max-w-md">
        <button onClick={handleUndo} className="text-red-500 font-bold text-sm underline w-full text-center">Undo Last Ball</button>
      </div>
    </div>
  );
}
