"use client";

import { useState, useMemo } from "react";
import { MatchData, Ball } from "@/types";
import { 
  calculateAllBatsmanStats, 
  calculateAllBowlerStats, 
  calculateFallOfWickets, 
  calculateExtras 
} from "@/lib/statsCalculator";

interface Props {
  match: MatchData;
  onBack: () => void;
}

export default function PostMatchScorecard({ match, onBack }: Props) {
  const { meta, balls, squads } = match;

  // --- CORE LOGIC: PROCESSED DATA ---
  const {
    innings1,
    innings2,
    team1Name,
    team2Name
  } = useMemo(() => {
    // FIX: Use saved innings data if available (from admin app)
    // The admin app saves innings1 and innings2 objects with all stats calculated.
    // Only fall back to manual calculation if these don't exist.
    if (match.innings1 && match.innings2) {
      return {
        team1Name: match.innings1.battingTeam,
        team2Name: match.innings2.battingTeam,
        innings1: {
          balls: [], // Not needed when using saved data
          batStats: match.innings1.batsmanStats || {},
          bowlStats: match.innings1.bowlerStats || {},
          fow: match.innings1.fallOfWickets || [],
          extras: match.innings1.extras || { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 },
          score: match.innings1.totalRuns,
          wickets: match.innings1.totalWickets,
          overs: `${match.innings1.oversBowled}.${match.innings1.ballsInCurrentOver}`
        },
        innings2: {
          balls: [], // Not needed when using saved data
          batStats: match.innings2.batsmanStats || {},
          bowlStats: match.innings2.bowlerStats || {},
          fow: match.innings2.fallOfWickets || [],
          extras: match.innings2.extras || { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 },
          score: match.innings2.totalRuns,
          wickets: match.innings2.totalWickets,
          overs: `${match.innings2.oversBowled}.${match.innings2.ballsInCurrentOver}`
        }
      };
    }

    // FALLBACK: Manual calculation from balls (for old matches or live scoring)
    // 1. SPLIT INNINGS (Role Reversal Logic)
    // We scan through the balls. The moment we see a player who was a BOWLER
    // in the earlier balls appear as a BATTER, we know the innings has changed.
    let splitIndex = balls.length;

    // Track unique players seen in first phase
    const p1Batters = new Set<string>();
    const p1Bowlers = new Set<string>();

    if (balls.length > 0) {
        // Initialize with first ball
        p1Batters.add(balls[0].striker);
        p1Batters.add(balls[0].nonStriker);
        p1Bowlers.add(balls[0].bowler);

        for (let i = 1; i < balls.length; i++) {
            const { striker, nonStriker, bowler } = balls[i];

            // STOP CONDITION:
            // 1. If current STRIKER was previously a BOWLER -> Innings changed
            // 2. If current BOWLER was previously a BATTER -> Innings changed
            if (p1Bowlers.has(striker) || p1Batters.has(bowler)) {
                splitIndex = i;
                break;
            }

            // Otherwise, keep building the sets for Innings 1
            p1Batters.add(striker);
            p1Batters.add(nonStriker);
            p1Bowlers.add(bowler);
        }
    }

    const balls1 = balls.slice(0, splitIndex);
    const balls2 = balls.slice(splitIndex);

    // 2. GENERATE DYNAMIC SQUADS (The Fix for "No Stats")
    // Instead of relying on the 'squads' object which might have typos,
    // we extract the list of players who actually played from the balls.
    const getPlayersFromBalls = (ballList: Ball[]) => {
        const batters = new Set<string>();
        const bowlers = new Set<string>();
        ballList.forEach(b => {
            batters.add(b.striker);
            batters.add(b.nonStriker);
            bowlers.add(b.bowler);
        });
        return {
            battingSquad: Array.from(batters),
            bowlingSquad: Array.from(bowlers)
        };
    };

    const i1Players = getPlayersFromBalls(balls1);
    const i2Players = getPlayersFromBalls(balls2);

    // 3. IDENTIFY TEAMS
    // We compare the players we found in Innings 1 with the DB squads to guess the name.
    const countMatches = (players: string[], squad: string[]) =>
        players.filter(p => squad?.some(s => s.toLowerCase() === p.toLowerCase())).length;

    const t1MatchesTeamA = countMatches(i1Players.battingSquad, squads.teamA);
    const t1MatchesTeamB = countMatches(i1Players.battingSquad, squads.teamB);

    // Determine Names
    let t1Name = "Innings 1";
    let t2Name = "Innings 2";

    if (t1MatchesTeamA > t1MatchesTeamB) {
        t1Name = meta.teamA;
        t2Name = meta.teamB;
    } else if (t1MatchesTeamB > t1MatchesTeamA) {
        t1Name = meta.teamB;
        t2Name = meta.teamA;
    } else {
        // Fallback: Use meta if available
        if (match.innings1?.battingTeam) t1Name = match.innings1.battingTeam;
        if (match.innings2?.battingTeam) t2Name = match.innings2.battingTeam;
    }

    // 4. CALCULATE STATS
    // We pass the DYNAMIC SQUAD (i1Players.battingSquad) to the calculator.
    // This ensures every player in the balls gets a row.
    return {
        team1Name: t1Name,
        team2Name: t2Name,
        innings1: {
            balls: balls1,
            batStats: calculateAllBatsmanStats(balls1, i1Players.battingSquad),
            bowlStats: calculateAllBowlerStats(balls1, i1Players.bowlingSquad),
            fow: calculateFallOfWickets(balls1),
            extras: calculateExtras(balls1),
            score: balls1.reduce((acc, b) => acc + b.runsScored, 0),
            wickets: balls1.filter(b => b.isWicket).length,
            overs: calculateOvers(balls1)
        },
        innings2: {
            balls: balls2,
            batStats: calculateAllBatsmanStats(balls2, i2Players.battingSquad),
            bowlStats: calculateAllBowlerStats(balls2, i2Players.bowlingSquad),
            fow: calculateFallOfWickets(balls2),
            extras: calculateExtras(balls2),
            score: balls2.reduce((acc, b) => acc + b.runsScored, 0),
            wickets: balls2.filter(b => b.isWicket).length,
            overs: calculateOvers(balls2)
        }
    };
  }, [match]);

  const [activeTab, setActiveTab] = useState<"summary" | "innings1" | "innings2">("summary");

  return (
    <div className="min-h-screen bg-slate-100 pb-10 font-sans">
      {/* Navbar */}
      <div className="bg-slate-900 text-white sticky top-0 z-20 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center text-slate-300 hover:text-white transition">
            <span className="mr-1">←</span> Matches
          </button>
          <div className="font-bold text-lg hidden sm:block">Match Center</div>
          <div className="w-16"></div> 
        </div>
        
        {/* Match Header Info */}
        <div className="bg-slate-800 py-6 px-4 text-center border-t border-slate-700">
            <div className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">
                {meta.status.replace("_", " ")}
            </div>
            <div className="text-2xl font-bold mb-1">
                {team1Name} <span className="text-slate-400 text-lg mx-2">vs</span> {team2Name}
            </div>
            <div className="text-yellow-400 font-bold text-lg mt-2 animate-pulse">
                {meta.matchResult || "Match Completed"}
            </div>
        </div>

        {/* Tabs */}
        <div className="flex text-sm font-medium bg-slate-900 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab("summary")}
            className={`flex-1 min-w-[100px] py-3 border-b-4 transition-colors ${activeTab === "summary" ? "border-blue-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            Summary
          </button>
          <button 
            onClick={() => setActiveTab("innings1")}
            className={`flex-1 min-w-[120px] py-3 border-b-4 transition-colors ${activeTab === "innings1" ? "border-blue-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            {team1Name}
          </button>
          <button 
            onClick={() => setActiveTab("innings2")}
            className={`flex-1 min-w-[120px] py-3 border-b-4 transition-colors ${activeTab === "innings2" ? "border-blue-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            {team2Name}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-2 mt-4">
        
        {activeTab === "summary" && (
            <div className="space-y-4">
                <ScoreCardSummary 
                    teamName={team1Name} data={innings1} 
                />
                 <ScoreCardSummary 
                    teamName={team2Name} data={innings2}
                />
            </div>
        )}

        {activeTab === "innings1" && (
            <FullScorecard 
                teamName={team1Name}
                data={innings1}
            />
        )}

        {activeTab === "innings2" && (
            <FullScorecard 
                teamName={team2Name}
                data={innings2}
            />
        )}

      </div>
    </div>
  );
}

// --- HELPERS ---
function calculateOvers(balls: Ball[]) {
    const legalBalls = balls.filter(b => !b.isWide && !b.isNoBall).length;
    return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

function getTopPerformers(statsObj: any, type: 'bat' | 'bowl') {
    const arr = Object.values(statsObj);
    if (type === 'bat') {
        return arr.sort((a: any, b: any) => {
            if (b.runs !== a.runs) return b.runs - a.runs;
            return a.balls - b.balls;
        }).slice(0, 3);
    } else {
        return arr.sort((a: any, b: any) => {
             if (b.wickets !== a.wickets) return b.wickets - a.wickets;
             return a.runs - b.runs; 
        }).slice(0, 3);
    }
}

// --- SUB COMPONENTS ---

function ScoreCardSummary({ teamName, data }: { teamName: string, data: any }) {
    const topBatters = getTopPerformers(data.batStats, 'bat');
    const topBowlers = getTopPerformers(data.bowlStats, 'bowl');

    return (
        <div className="bg-white rounded-xl text-slate-800 shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">{teamName}</h3>
                <span className="text-xl font-bold">{data.score}/{data.wickets} <span className="text-sm font-normal text-slate-800">({data.overs} ov)</span></span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <div className="text-xs font-bold text-slate-800 uppercase mb-2">Top Batters</div>
                    {topBatters.length > 0 ? topBatters.map((b: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm mb-1 pb-1 border-b border-dashed border-slate-100 last:border-0">
                            <span>{b.name}</span>
                            <span className="font-bold">{b.runs} <span className="text-xs font-normal text-slate-800">({b.balls})</span></span>
                        </div>
                    )) : <div className="text-xs text-slate-800 italic">No batting stats available</div>}
                </div>
                <div>
                    <div className="text-xs font-bold text-slate-800 uppercase mb-2">Top Bowlers</div>
                    {topBowlers.length > 0 ? topBowlers.map((b: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm mb-1 pb-1 border-b border-dashed border-slate-100 last:border-0">
                            <span>{b.name}</span>
                            <span className="font-bold">{b.wickets}-{b.runs} <span className="text-xs font-normal text-slate-800">({b.overs}.{b.balls})</span></span>
                        </div>
                    )) : <div className="text-xs text-slate-800 italic">No bowling stats available</div>}
                </div>
            </div>
        </div>
    )
}

function FullScorecard({ teamName, data }: { teamName: string, data: any }) {
    const batsmen = Object.values(data.batStats);
    const bowlers = Object.values(data.bowlStats);
    
    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Batting Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-800">{teamName} Batting</span>
                    <span className="text-xs font-bold text-slate-500">R (B)</span>
                </div>
                
                <div className="divide-y divide-slate-100">
                    {batsmen.length > 0 ? batsmen.map((stat: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 transition">
                            <div className="flex flex-col">
                                <span className="font-semibold text-slate-800 text-sm">{stat.name}</span>
                                <span className="text-xs text-red-500">{stat.howOut || "not out"}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                                <div className="text-slate-400 hidden sm:block text-xs">
                                    <span className="mr-2">4s: {stat.fours}</span>
                                    <span>6s: {stat.sixes}</span>
                                </div>
                                <div className="text-right min-w-[60px]">
                                    <span className="font-bold text-slate-900">{stat.runs}</span>
                                    <span className="text-slate-500 ml-1">({stat.balls})</span>
                                </div>
                            </div>
                        </div>
                    )) : <div className="p-4 text-center text-sm text-slate-400 italic">No batting data available</div>}
                </div>
                
                {/* Extras & Total */}
                <div className="bg-slate-50/80 p-3 text-sm">
                    <div className="flex justify-between mb-2">
                        <span className="text-slate-600">Extras</span>
                        <span className="font-medium">{data.extras.total} <span className="text-xs text-slate-400">(w {data.extras.wides}, nb {data.extras.noBalls}, b {data.extras.byes}, lb {data.extras.legByes})</span></span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                        <span className="font-bold text-slate-900 text-base">Total Score</span>
                        <div className="text-right">
                            <span className="text-xl font-black text-slate-900">{data.score}/{data.wickets}</span>
                            <span className="text-sm text-slate-500 ml-1">({data.overs} Ov)</span>
                        </div>
                    </div>
                </div>
            </div>

             {/* Bowling Card */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-800">Bowling</span>
                    <span className="text-xs font-bold text-slate-500">O-M-R-W</span>
                </div>
                <div className="divide-y divide-slate-100">
                    {bowlers.length > 0 ? bowlers.map((stat: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 transition">
                            <span className="font-semibold text-slate-800 text-sm">{stat.name}</span>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-xs text-slate-400 hidden sm:block">Econ: {stat.economy}</span>
                                <span className="font-mono font-medium text-slate-700">
                                    {stat.overs}.{stat.balls}-{stat.maidens}-{stat.runs}-<span className="font-bold text-slate-900">{stat.wickets}</span>
                                </span>
                            </div>
                        </div>
                    )) : <div className="p-4 text-center text-sm text-slate-400 italic">No bowling data available</div>}
                </div>
            </div>

            {/* Fall of Wickets */}
            {data.fow.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4">
                    <div className="font-bold text-xs uppercase text-slate-500 mb-3 tracking-wider">Fall of Wickets</div>
                    <div className="flex flex-wrap gap-2">
                        {data.fow.map((fow: any, i: number) => (
                            <span key={i} className="text-xs bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-700">
                                <span className="font-bold text-slate-900">{fow.score}-{fow.wicketNumber}</span> 
                                <span className="ml-1 opacity-75">({fow.playerOut}, {fow.oversBowled}.{fow.ballsInOver})</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}