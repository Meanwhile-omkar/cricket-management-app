import { MatchData, MatchMeta, MatchState, InningsData, Ball } from "@/types";
import {
  calculateAllBatsmanStats,
  calculateAllBowlerStats,
  calculateFallOfWickets,
  calculatePartnerships,
  calculateExtras,
} from "./statsCalculator";

/**
 * Check if should transition to innings break
 */
export function shouldTransitionToInningsBreak(state: MatchState, meta: MatchMeta): boolean {
  // Only transition if in first innings
  if (meta.innings !== 1) return false;

  // Check if innings is complete
  if (state.oversBowled >= meta.oversPerInnings || state.totalWickets >= 10) {
    return true;
  }

  return false;
}

/**
 * Save innings data snapshot
 */
export function saveInningsData(
  matchData: MatchData,
  inningsNumber: 1 | 2,
  balls: Ball[]
): InningsData {
  const { state, meta, squads } = matchData;

  // Determine batting and bowling squads
  const battingSquad = meta.battingTeam === meta.teamA ? squads.teamA : squads.teamB;
  const bowlingSquad = meta.battingTeam === meta.teamA ? squads.teamB : squads.teamA;

  const inningsData: InningsData = {
    battingTeam: meta.battingTeam,
    bowlingTeam: meta.bowlingTeam,
    totalRuns: state.totalRuns,
    totalWickets: state.totalWickets,
    oversBowled: state.oversBowled,
    ballsInCurrentOver: state.ballsInCurrentOver,
    legalBalls: state.legalBalls,
    fallOfWickets: calculateFallOfWickets(balls),
    partnerships: calculatePartnerships(balls),
    batsmanStats: calculateAllBatsmanStats(balls, battingSquad),
    bowlerStats: calculateAllBowlerStats(balls, bowlingSquad),
    extras: calculateExtras(balls),
  };

  return inningsData;
}

/**
 * Prepare state and meta for second innings
 */
export function prepareInnings2State(matchData: MatchData): {
  meta: MatchMeta;
  state: MatchState;
} {
  const { meta, state } = matchData;

  // Calculate target score (innings1 total + 1)
  const targetScore = state.totalRuns + 1;

  // Swap batting and bowling teams
  const newMeta: MatchMeta = {
    ...meta,
    innings: 2,
    battingTeam: meta.bowlingTeam,
    bowlingTeam: meta.battingTeam,
    targetScore,
    status: "LIVE",
  };

  // Reset state for new innings
  const newState: MatchState = {
    totalRuns: 0,
    totalWickets: 0,
    legalBalls: 0,
    oversBowled: 0,
    ballsInCurrentOver: 0,
    currentStriker: null,
    currentNonStriker: null,
    currentBowler: null,
    isFreeHit: false,
    battingOrder: state.battingOrder ?? [],
    nextBatsmanIndex: 0,
    lastOverBowler: null,
    currentPartnershipRuns: 0,
    currentPartnershipBalls: 0,
  };

  return { meta: newMeta, state: newState };
}

/**
 * Calculate match result from both innings
 */
export function calculateMatchResult(
  innings1: InningsData,
  innings2: InningsData
): {
  winningTeam: string;
  resultText: string;
  resultType: "runs" | "wickets" | "tie" | "no_result";
} {
  const team1 = innings1.battingTeam;
  const team2 = innings2.battingTeam;
  const team1Score = innings1.totalRuns;
  const team2Score = innings2.totalRuns;

  // Check if tie
  if (team1Score === team2Score) {
    return {
      winningTeam: "Tie",
      resultText: "Match tied",
      resultType: "tie",
    };
  }

  // Team 2 won
  if (team2Score > team1Score) {
    const wicketsRemaining = 10 - innings2.totalWickets;
    return {
      winningTeam: team2,
      resultText: `${team2} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? "" : "s"}`,
      resultType: "wickets",
    };
  }

  // Team 1 won
  const runsDifference = team1Score - team2Score;
  return {
    winningTeam: team1,
    resultText: `${team1} won by ${runsDifference} run${runsDifference === 1 ? "" : "s"}`,
    resultType: "runs",
  };
}

/**
 * Check if second innings should end early (target chased)
 */
export function shouldEndInnings2Early(
  currentRuns: number,
  targetScore: number | undefined
): boolean {
  if (!targetScore) return false;
  return currentRuns >= targetScore;
}

/**
 * Get match summary text
 */
export function getMatchSummary(matchData: MatchData): string {
  const { meta, innings1, innings2 } = matchData;

  if (meta.status === "NOT_STARTED") {
    return "Match not started";
  }

  if (meta.status === "LIVE") {
    if (meta.innings === 1) {
      return `${meta.battingTeam} batting`;
    } else {
      return `${meta.battingTeam} chasing ${meta.targetScore}`;
    }
  }

  if (meta.status === "INNINGS_BREAK") {
    if (innings1) {
      return `Innings break - ${innings1.battingTeam}: ${innings1.totalRuns}/${innings1.totalWickets}`;
    }
    return "Innings break";
  }

  if (meta.status === "COMPLETED" && meta.matchResult) {
    return meta.matchResult;
  }

  return "Match completed";
}
