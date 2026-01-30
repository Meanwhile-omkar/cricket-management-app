import { Ball, BatsmanStats, BowlerStats, FallOfWicket, Partnership, InningsData, MatchState } from "@/types";

/**
 * Calculate batsman statistics from ball history
 */
export function calculateBatsmanStats(balls: Ball[], playerName: string): BatsmanStats {
  let runs = 0;
  let ballsFaced = 0;
  let fours = 0;
  let sixes = 0;
  let isOut = false;
  let howOut = "";

  balls.forEach((ball) => {
    // Check if this player was the striker
    if (ball.striker === playerName) {
      // Count balls faced (only legal balls)
      if (!ball.isWide && !ball.isNoBall) {
        ballsFaced++;
      }

      // Count runs (only runs off bat, not extras)
      const runsOffBat = ball.runsByBatsman ?? (ball.isBye || ball.isLegBye ? 0 : ball.runsScored);
      runs += runsOffBat;

      // Count boundaries
      if (runsOffBat === 4) fours++;
      if (runsOffBat === 6) sixes++;

      // Check if out
      if (ball.isWicket && ball.playerOut === playerName) {
        isOut = true;
        if (ball.wicketKind) {
          if (ball.wicketKind === "bowled") {
            howOut = `b ${ball.bowler}`;
          } else if (ball.wicketKind === "caught") {
            howOut = ball.fielder ? `c ${ball.fielder} b ${ball.bowler}` : `c & b ${ball.bowler}`;
          } else if (ball.wicketKind === "lbw") {
            howOut = `lbw b ${ball.bowler}`;
          } else if (ball.wicketKind === "stumped") {
            howOut = ball.fielder ? `st ${ball.fielder} b ${ball.bowler}` : `st b ${ball.bowler}`;
          } else if (ball.wicketKind === "run_out") {
            howOut = ball.fielder ? `run out (${ball.fielder})` : "run out";
          } else if (ball.wicketKind === "hit_wicket") {
            howOut = `hit wicket b ${ball.bowler}`;
          } else {
            howOut = "out";
          }
        }
      }
    }

    // Also check if non-striker and got run out
    if (ball.nonStriker === playerName && ball.isWicket && ball.playerOut === playerName) {
      isOut = true;
      howOut = ball.fielder ? `run out (${ball.fielder})` : "run out";
    }
  });

  const strikeRate = ballsFaced > 0 ? (runs / ballsFaced) * 100 : 0;

  const stats: any = {
    name: playerName,
    runs,
    balls: ballsFaced,
    fours,
    sixes,
    strikeRate: parseFloat(strikeRate.toFixed(2)),
    isOut,
  };

  // Only add howOut if player is actually out (Firebase doesn't accept undefined)
  if (isOut && howOut) {
    stats.howOut = howOut;
  }

  return stats;
}

/**
 * Calculate bowler statistics from ball history
 */
export function calculateBowlerStats(balls: Ball[], playerName: string): BowlerStats {
  let ballsBowled = 0;
  let runs = 0;
  let wickets = 0;
  let maidens = 0;
  let wides = 0;
  let noBalls = 0;

  // Group balls by over to calculate maidens
  const overBalls: Record<number, Ball[]> = {};

  balls.forEach((ball) => {
    if (ball.bowler === playerName) {
      // Count legal balls
      if (!ball.isWide && !ball.isNoBall) {
        ballsBowled++;
      }

      // Count runs (all runs conceded)
      runs += ball.runsScored;

      // Count wickets (excluding run outs)
      if (ball.isWicket && ball.wicketKind !== "run_out") {
        wickets++;
      }

      // Count extras
      if (ball.isWide) wides++;
      if (ball.isNoBall) noBalls++;

      // Group by over for maiden calculation
      if (!overBalls[ball.overNumber]) {
        overBalls[ball.overNumber] = [];
      }
      overBalls[ball.overNumber].push(ball);
    }
  });

  // Calculate maidens (overs with 0 runs)
  Object.values(overBalls).forEach((overBallsArray) => {
    const legalBallsInOver = overBallsArray.filter((b) => !b.isWide && !b.isNoBall).length;
    const runsInOver = overBallsArray.reduce((sum, b) => sum + b.runsScored, 0);

    // Maiden: 6 legal balls with 0 runs
    if (legalBallsInOver === 6 && runsInOver === 0) {
      maidens++;
    }
  });

  const overs = Math.floor(ballsBowled / 6);
  const remainingBalls = ballsBowled % 6;
  const economy = ballsBowled > 0 ? (runs / ballsBowled) * 6 : 0;

  return {
    name: playerName,
    overs,
    balls: remainingBalls,
    runs,
    wickets,
    economy: parseFloat(economy.toFixed(2)),
    maidens,
    wides,
    noBalls,
  };
}

/**
 * Calculate fall of wickets from ball history
 */
export function calculateFallOfWickets(balls: Ball[]): FallOfWicket[] {
  const fallOfWickets: FallOfWicket[] = [];
  let wicketCount = 0;
  let totalRuns = 0;

  balls.forEach((ball) => {
    totalRuns += ball.runsScored;

    if (ball.isWicket && ball.playerOut) {
      wicketCount++;
      const fow: any = {
        playerOut: ball.playerOut,
        score: totalRuns,
        wicketNumber: wicketCount,
        oversBowled: ball.overNumber,
        ballsInOver: ball.ballInOver,
        wicketKind: ball.wicketKind || "out",
        bowler: ball.bowler,
      };

      // Only add fielder if it exists (Firebase doesn't accept undefined)
      if (ball.fielder) {
        fow.fielder = ball.fielder;
      }

      fallOfWickets.push(fow);
    }
  });

  return fallOfWickets;
}

/**
 * Calculate partnerships from ball history
 */
export function calculatePartnerships(balls: Ball[]): Partnership[] {
  const partnerships: Partnership[] = [];
  let currentBatsman1: string | null = null;
  let currentBatsman2: string | null = null;
  let currentPartnershipRuns = 0;
  let currentPartnershipBalls = 0;
  let currentStartWicket = 0;

  balls.forEach((ball) => {
    // Initialize partnership if first ball
    if (!currentBatsman1 && !currentBatsman2) {
      currentBatsman1 = ball.striker;
      currentBatsman2 = ball.nonStriker;
    }

    // Check if batsmen changed (wicket fell or new partnership)
    const currentPair = [ball.striker, ball.nonStriker].sort();
    const previousPair = [currentBatsman1, currentBatsman2].sort();

    if (currentPair[0] !== previousPair[0] || currentPair[1] !== previousPair[1]) {
      // Save previous partnership
      if (currentBatsman1 && currentBatsman2) {
        partnerships.push({
          batsman1: currentBatsman1,
          batsman2: currentBatsman2,
          runs: currentPartnershipRuns,
          balls: currentPartnershipBalls,
          startWicket: currentStartWicket,
          endWicket: currentStartWicket + 1,
          isActive: false,
        });
      }

      // Start new partnership
      currentBatsman1 = ball.striker;
      currentBatsman2 = ball.nonStriker;
      currentPartnershipRuns = 0;
      currentPartnershipBalls = 0;
      currentStartWicket++;
    }

    // Count runs and balls for current partnership
    currentPartnershipRuns += ball.runsScored;
    if (!ball.isWide && !ball.isNoBall) {
      currentPartnershipBalls++;
    }
  });

  // Add final active partnership
  if (currentBatsman1 && currentBatsman2) {
    partnerships.push({
      batsman1: currentBatsman1,
      batsman2: currentBatsman2,
      runs: currentPartnershipRuns,
      balls: currentPartnershipBalls,
      startWicket: currentStartWicket,
      isActive: true,
    });
  }

  return partnerships;
}

/**
 * Calculate extras breakdown from ball history
 */
export function calculateExtras(balls: Ball[]): {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  total: number;
} {
  let wides = 0;
  let noBalls = 0;
  let byes = 0;
  let legByes = 0;

  balls.forEach((ball) => {
    if (ball.isWide) wides += ball.runsScored;
    if (ball.isNoBall) noBalls += 1; // No-ball is always 1 + any runs
    if (ball.isBye) byes += ball.runsScored;
    if (ball.isLegBye) legByes += ball.runsScored;
  });

  return {
    wides,
    noBalls,
    byes,
    legByes,
    total: wides + noBalls + byes + legByes,
  };
}

/**
 * Calculate run rate
 */
export function calculateRunRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  const overs = balls / 6;
  return parseFloat((runs / overs).toFixed(2));
}

/**
 * Calculate required run rate for chase
 */
export function calculateRequiredRunRate(
  target: number,
  runsScored: number,
  ballsRemaining: number
): number {
  if (ballsRemaining === 0) return 0;
  const runsNeeded = target - runsScored;
  if (runsNeeded <= 0) return 0;
  const oversRemaining = ballsRemaining / 6;
  return parseFloat((runsNeeded / oversRemaining).toFixed(2));
}

/**
 * Calculate all batsmen statistics for an innings
 */
export function calculateAllBatsmanStats(balls: Ball[], squad: string[]): Record<string, BatsmanStats> {
  const stats: Record<string, BatsmanStats> = {};

  squad.forEach((playerName) => {
    const playerStats = calculateBatsmanStats(balls, playerName);
    // Only include if player has faced balls or is out
    if (playerStats.balls > 0 || playerStats.isOut) {
      stats[playerName] = playerStats;
    }
  });

  return stats;
}

/**
 * Calculate all bowler statistics for an innings
 */
export function calculateAllBowlerStats(balls: Ball[], squad: string[]): Record<string, BowlerStats> {
  const stats: Record<string, BowlerStats> = {};

  squad.forEach((playerName) => {
    const playerStats = calculateBowlerStats(balls, playerName);
    // Only include if player has bowled balls
    if (playerStats.balls > 0 || playerStats.overs > 0) {
      stats[playerName] = playerStats;
    }
  });

  return stats;
}

/**
 * Get current partnership from state
 */
export function getCurrentPartnership(state: MatchState): { runs: number; balls: number } {
  return {
    runs: state.currentPartnershipRuns ?? 0,
    balls: state.currentPartnershipBalls ?? 0,
  };
}
