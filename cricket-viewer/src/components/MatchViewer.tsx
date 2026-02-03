"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { MatchData, Ball } from "@/types";
import PostMatchScorecard from "./PostMatchScorecard"; 
import {
  calculateBatsmanStats,
  calculateBowlerStats,
  calculateFallOfWickets,
  calculateRequiredRunRate,
  calculateRunRate,
} from "@/lib/statsCalculator";

interface Props {
  matchId: string;
  onBack: () => void;
}

export default function MatchViewer({ matchId, onBack }: Props) {
  const [match, setMatch] = useState<MatchData | null>(null);
  const [showBattingCard, setShowBattingCard] = useState(false);
  const [showBowlingCard, setShowBowlingCard] = useState(false);
  const [showFallOfWickets, setShowFallOfWickets] = useState(false);

  useEffect(() => {
    const matchRef = ref(db, `matches/${matchId}`);
    return onValue(matchRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setMatch({ ...data, balls: data.balls || [] });
    });
  }, [matchId]);

  if (!match) return (
    <div className="h-screen flex items-center justify-center text-slate-500">
      <div>
        <div className="text-6xl mb-4 text-center">🏏</div>
        <p>Loading match...</p>
      </div>
    </div>
  );

  const { state, meta, balls, squads } = match;
  const recentBalls = [...balls].reverse().slice(0, 6);

  const getBallBadge = (b: Ball) => {
    let text = b.runsScored.toString();
    let color = "bg-gray-100 text-gray-800 border-gray-200";

    if (b.isWicket) { text = "W"; color = "bg-red-500 text-white border-red-600"; }
    else if (b.runsScored === 4) { color = "bg-green-500 text-white border-green-600"; }
    else if (b.runsScored === 6) { color = "bg-indigo-600 text-white border-indigo-700"; }
    else if (b.isWide) { text = "WD"; color = "bg-orange-100 text-orange-800 border-orange-200"; }
    else if (b.isNoBall) { text = "NB"; color = "bg-yellow-100 text-yellow-800 border-yellow-200"; }
    else if (b.isBye) { text = `${b.runsScored}b`; color = "bg-blue-100 text-blue-800 border-blue-200"; }
    else if (b.isLegBye) { text = `${b.runsScored}lb`; color = "bg-purple-100 text-purple-800 border-purple-200"; }

    return <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${color} text-xs`}>{text}</div>;
  };

  // Calculate stats for current players
  const strikerStats = state.currentStriker ? calculateBatsmanStats(balls, state.currentStriker) : null;
  const nonStrikerStats = state.currentNonStriker ? calculateBatsmanStats(balls, state.currentNonStriker) : null;
  const bowlerStats = state.currentBowler ? calculateBowlerStats(balls, state.currentBowler) : null;

  // Calculate innings stats
  const isTeamABatting = meta.battingTeam === meta.teamA;
  const battingSquad = isTeamABatting ? squads.teamA : squads.teamB;
  const bowlingSquad = isTeamABatting ? squads.teamB : squads.teamA;

  const allBatsmanStats = Object.values(
    battingSquad.reduce((acc, player) => {
      const stats = calculateBatsmanStats(balls, player);
      if (stats.balls > 0 || stats.isOut) {
        acc[player] = stats;
      }
      return acc;
    }, {} as Record<string, any>)
  );

  const allBowlerStats = Object.values(
    bowlingSquad.reduce((acc, player) => {
      const stats = calculateBowlerStats(balls, player);
      if (stats.balls > 0 || stats.overs > 0) {
        acc[player] = stats;
      }
      return acc;
    }, {} as Record<string, any>)
  );

  const fallOfWickets = calculateFallOfWickets(balls);
  const currentRunRate = calculateRunRate(state.totalRuns, state.legalBalls);

  // Target tracking for innings 2
  const runsNeeded = meta.targetScore ? meta.targetScore - state.totalRuns : 0;
  const ballsRemaining = (meta.oversPerInnings * 6) - state.legalBalls;
  const requiredRunRate = meta.targetScore ? calculateRequiredRunRate(meta.targetScore, state.totalRuns, ballsRemaining) : 0;

  // Match completed display
  if (meta.status === "COMPLETED") {
    return <PostMatchScorecard match={match} onBack={onBack} />;
  }

  // Innings break display
  if (meta.status === "INNINGS_BREAK") {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="bg-white border-b p-4">
          <button onClick={onBack} className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Matches
          </button>
        </div>

        <div className="max-w-md mx-auto p-6">
          <div className="bg-white shadow-xl rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6 text-center text-blue-900">Innings Break</h2>

            <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-bold text-lg mb-3">{match.innings1?.battingTeam} Innings</h3>
              <p className="text-5xl font-bold text-blue-900 mb-2">
                {match.innings1?.totalRuns}/{match.innings1?.totalWickets}
              </p>
              <p className="text-sm text-slate-600">
                Overs: {match.innings1?.oversBowled}.{match.innings1?.ballsInCurrentOver}
              </p>
            </div>

            <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-300">
              <p className="text-center text-lg">
                <span className="font-bold">{meta.bowlingTeam}</span> needs{" "}
                <span className="text-3xl font-bold text-green-700 block mt-2">
                  {(match.innings1?.totalRuns ?? 0) + 1}
                </span>{" "}
                <span className="text-sm text-slate-600">runs to win</span>
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Live match display (same as original, but with back button)
  return (
    <main className="min-h-screen bg-slate-100 flex justify-center font-sans">
      <div className="w-full max-w-md bg-white shadow-xl min-h-screen flex flex-col relative">

        {/* Back Button */}
        <div className="bg-white border-b p-3 sticky top-0 z-20">
          <button onClick={onBack} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            ← Back to Matches
          </button>
        </div>

        {/* Scorecard Header */}
        <div className="bg-slate-900 text-white p-6 pb-16 rounded-b-[2rem] relative overflow-hidden">
          <div className="flex justify-between text-xs font-bold tracking-widest text-slate-400 mb-4 uppercase">
            <span>{meta.battingTeam}</span>
            <span>Innings {meta.innings}/2</span>
            <span>vs {meta.bowlingTeam}</span>
          </div>

          <div className="text-center">
            <h1 className="text-7xl font-black">{state.totalRuns}<span className="text-4xl font-light text-slate-400">/{state.totalWickets}</span></h1>
            <div className="mt-2 text-xl font-medium text-slate-300">
              Overs: {state.oversBowled}.{state.ballsInCurrentOver} <span className="text-sm opacity-50">/ {meta.oversPerInnings}</span>
            </div>

            {meta.innings === 2 && meta.targetScore && (
              <div className="mt-3 p-3 bg-yellow-500/20 rounded-lg border border-yellow-400">
                <div className="text-yellow-300 text-sm font-bold">TARGET: {meta.targetScore}</div>
                <div className="text-2xl font-bold text-yellow-100 mt-1">Need {runsNeeded} runs</div>
                <div className="text-xs text-yellow-200 mt-1">
                  CRR: {currentRunRate.toFixed(2)} | RRR: {requiredRunRate.toFixed(2)}
                </div>
              </div>
            )}

            {meta.innings !== 2 && (
              <div className="text-sm mt-2 text-blue-400 font-bold tracking-wide uppercase">
                {state.isFreeHit ? "⚠️ FREE HIT NEXT BALL ⚠️" : `Run Rate: ${currentRunRate.toFixed(2)}`}
              </div>
            )}
          </div>
        </div>

        {/* Current Players Card */}
        <div className="mx-4 -mt-10 bg-white p-4 rounded-xl shadow-lg border border-slate-100 relative z-10">
          <div className="flex justify-between items-center mb-3 pb-3 border-b border-dashed border-slate-200">
            <div className="text-sm font-bold text-slate-700">Batting</div>
            <button
              onClick={() => setShowBattingCard(!showBattingCard)}
              className="text-xs text-blue-600 underline"
            >
              {showBattingCard ? "Hide" : "Full Scorecard"}
            </button>
          </div>

          {strikerStats && (
            <div className="p-3 rounded bg-green-50 mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900">★ {strikerStats.name}</span>
                  {strikerStats.isOut && <span className="text-xs text-red-600 ml-2">{strikerStats.howOut}</span>}
                </div>
                <span className="text-lg font-bold">{strikerStats.runs}({strikerStats.balls})</span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                4s: {strikerStats.fours} | 6s: {strikerStats.sixes} | SR: {strikerStats.strikeRate.toFixed(0)}
              </div>
            </div>
          )}

          {nonStrikerStats && (
            <div className="p-3 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-800">{nonStrikerStats.name}</span>
                  {nonStrikerStats.isOut && <span className="text-xs text-red-600 ml-2">{nonStrikerStats.howOut}</span>}
                </div>
                <span className="text-lg font-bold">{nonStrikerStats.runs}({nonStrikerStats.balls})</span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                4s: {nonStrikerStats.fours} | 6s: {nonStrikerStats.sixes} | SR: {nonStrikerStats.strikeRate.toFixed(0)}
              </div>
            </div>
          )}
        </div>

        {/* Rest of the components (batting card, bowler card, etc.) - same as original */}
        {showBattingCard && allBatsmanStats.length > 0 && (
          <div className="mx-4 mt-3 bg-white p-4 rounded-xl shadow border border-slate-100">
            <h3 className="font-bold text-sm mb-3 text-slate-700">Full Batting Card</h3>
            <div className="space-y-2 text-sm">
              {allBatsmanStats.map((stats: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-2 rounded bg-slate-50">
                  <div className="flex-1">
                    <div className="font-semibold">{stats.name}</div>
                    {stats.howOut && <div className="text-xs text-red-600">{stats.howOut}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{stats.runs}({stats.balls})</div>
                    <div className="text-xs text-slate-500">
                      {stats.fours}×4 {stats.sixes}×6
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mx-4 mt-3 bg-white p-4 rounded-xl shadow border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs text-slate-400 uppercase font-bold">Bowling</div>
            <button
              onClick={() => setShowBowlingCard(!showBowlingCard)}
              className="text-xs text-blue-600 underline"
            >
              {showBowlingCard ? "Hide" : "All Bowlers"}
            </button>
          </div>

          {bowlerStats && (
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-800 text-lg">{bowlerStats.name}</div>
                <div className="text-sm text-slate-600">
                  {bowlerStats.overs}.{bowlerStats.balls} - {bowlerStats.runs}/{bowlerStats.wickets}
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-bold text-slate-600">Econ: {bowlerStats.economy}</div>
                {bowlerStats.maidens > 0 && <div className="text-xs">M: {bowlerStats.maidens}</div>}
              </div>
            </div>
          )}
        </div>

        {showBowlingCard && allBowlerStats.length > 0 && (
          <div className="mx-4 mt-3 bg-white p-4 rounded-xl shadow border border-slate-100">
            <h3 className="font-bold text-sm mb-3 text-slate-700">Full Bowling Card</h3>
            <div className="space-y-2 text-sm">
              {allBowlerStats.map((stats: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-2 rounded bg-slate-50">
                  <div className="font-semibold">{stats.name}</div>
                  <div className="text-right">
                    <div className="font-bold">
                      {stats.overs}.{stats.balls} - {stats.runs}/{stats.wickets}
                    </div>
                    <div className="text-xs text-slate-500">Econ: {stats.economy}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {fallOfWickets.length > 0 && (
          <div className="mx-4 mt-3 bg-white p-4 rounded-xl shadow border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm text-slate-700">Fall of Wickets</h3>
              <button
                onClick={() => setShowFallOfWickets(!showFallOfWickets)}
                className="text-xs text-blue-600 underline"
              >
                {showFallOfWickets ? "Hide" : "Show All"}
              </button>
            </div>

            {!showFallOfWickets && fallOfWickets.length > 0 && (
              <div className="text-sm text-slate-600">
                {fallOfWickets[fallOfWickets.length - 1].playerOut} ({fallOfWickets[fallOfWickets.length - 1].score}/{fallOfWickets[fallOfWickets.length - 1].wicketNumber}, {fallOfWickets[fallOfWickets.length - 1].oversBowled}.{fallOfWickets[fallOfWickets.length - 1].ballsInOver} ov)
              </div>
            )}

            {showFallOfWickets && (
              <div className="space-y-2 text-sm">
                {fallOfWickets.map((fow, i) => (
                  <div key={i} className="p-2 rounded bg-red-50 text-slate-800">
                    <span className="font-bold">{fow.wicketNumber}.</span> {fow.playerOut}{" "}
                    <span className="text-slate-600">
                      ({fow.score}/{fow.wicketNumber}, {fow.oversBowled}.{fow.ballsInOver} ov)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">This Over</h3>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {recentBalls.length === 0 ? <span className="text-sm text-slate-400 italic">No balls yet</span> : recentBalls.map((b, i) => (
              <div key={i} className="flex-shrink-0">{getBallBadge(b)}</div>
            ))}
          </div>
        </div>

        <div className="mt-auto p-4 bg-slate-50 text-center text-xs text-slate-400">
          Status: {meta.status}
        </div>
      </div>
    </main>
  );
}
