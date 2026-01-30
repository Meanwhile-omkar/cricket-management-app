import { Ball, MatchState, MatchMeta } from "@/types";

export interface BallInput {
  runs: number;
  extrasType: "NONE" | "WD" | "NB" | "BYE" | "LB";
  isWicket: boolean;
  wicketKind?: "bowled" | "caught" | "run_out" | "lbw" | "stumped" | "hit_wicket";
  playerOut?: string; // "striker" or "nonStriker" or player name
  fielder?: string;
}

export interface BallProcessingResult {
  newBall: Ball;
  newState: MatchState;
  newMeta: MatchMeta;
  stateChanges: {
    strikeChanged: boolean;
    overCompleted: boolean;
    wicketFell: boolean;
    needNewBatsman: boolean;
    needNewBowler: boolean;
    inningsCompleted: boolean;
  };
}

/**
 * Process a ball delivery and return new state
 */
export function processBallDelivery(
  currentState: MatchState,
  currentMeta: MatchMeta,
  ballInput: BallInput,
  ballNumber: number,
  activeStriker: string,
  activeNonStriker: string,
  activeBowler: string
): BallProcessingResult {
  // 1. Calculate runs and extras
  const isWide = ballInput.extrasType === "WD";
  const isNoBall = ballInput.extrasType === "NB";
  const isBye = ballInput.extrasType === "BYE";
  const isLegBye = ballInput.extrasType === "LB";
  const isLegal = !isWide && !isNoBall;

  // Runs off bat (0 for wides, byes, leg-byes)
  const runsByBatsman = (isWide || isBye || isLegBye) ? 0 : ballInput.runs;

  // Extra runs (1 for wide/no-ball, 0 otherwise)
  const extraRuns = (isWide || isNoBall) ? 1 : 0;

  // Total runs from this ball
  const totalBallRuns = ballInput.runs + extraRuns;

  // 2. Create ball object (Firebase doesn't accept undefined, use null or omit)
  const newBall: Ball = {
    ballNumber,
    overNumber: currentState.oversBowled,
    ballInOver: currentState.ballsInCurrentOver + 1,
    runsScored: totalBallRuns,
    runsByBatsman,
    extraRuns,
    isWide,
    isNoBall,
    isBye,
    isLegBye,
    isWicket: ballInput.isWicket,
    wicketKind: (ballInput.isWicket && ballInput.wicketKind) ? ballInput.wicketKind : null as any,
    playerOut: ballInput.isWicket ? ballInput.playerOut : null as any,
    fielder: ballInput.fielder || null as any,
    striker: activeStriker,
    nonStriker: activeNonStriker,
    bowler: activeBowler,
    isFreeHit: currentState.isFreeHit,
    partnershipRuns: (currentState.currentPartnershipRuns ?? 0) + totalBallRuns,
  };

  // 3. Update state
  let newState = { ...currentState };

  // Update runs
  newState.totalRuns += totalBallRuns;

  // Update partnership
  newState.currentPartnershipRuns = (newState.currentPartnershipRuns ?? 0) + totalBallRuns;

  // Update legal balls and over count
  if (isLegal) {
    newState.legalBalls += 1;
    newState.ballsInCurrentOver += 1;
    newState.isFreeHit = false;
    newState.currentPartnershipBalls = (newState.currentPartnershipBalls ?? 0) + 1;
  } else {
    // Set free hit for next ball if no-ball
    if (isNoBall) {
      newState.isFreeHit = true;
    }
  }

  // 4. Handle wicket
  let wicketFell = false;
  let needNewBatsman = false;

  if (ballInput.isWicket) {
    newState.totalWickets += 1;
    wicketFell = true;
    needNewBatsman = true;

    // Clear the batsman who got out
    if (ballInput.playerOut === activeStriker || ballInput.playerOut === "striker") {
      newState.currentStriker = null;
    } else {
      newState.currentNonStriker = null;
    }

    // Increment next batsman index
    newState.nextBatsmanIndex = (newState.nextBatsmanIndex ?? 0) + 1;

    // Reset partnership
    newState.currentPartnershipRuns = 0;
    newState.currentPartnershipBalls = 0;
  }

  // 5. Handle strike rotation (for odd runs)
  let strikeChanged = false;
  const runIsOdd = runsByBatsman % 2 !== 0;

  if (runIsOdd && !wicketFell) {
    const temp = newState.currentStriker;
    newState.currentStriker = newState.currentNonStriker;
    newState.currentNonStriker = temp;
    strikeChanged = true;
  }

  // 6. Handle over completion
  let overCompleted = false;
  let needNewBowler = false;

  if (newState.ballsInCurrentOver === 6) {
    newState.oversBowled += 1;
    newState.ballsInCurrentOver = 0;
    newState.lastOverBowler = newState.currentBowler;
    newState.currentBowler = null;
    overCompleted = true;
    needNewBowler = true;

    // Rotate strike at end of over
    const temp = newState.currentStriker;
    newState.currentStriker = newState.currentNonStriker;
    newState.currentNonStriker = temp;
    strikeChanged = true;
  }

  // 7. Check innings completion
  let inningsCompleted = false;
  let newStatus = currentMeta.status;

  if (newState.oversBowled >= currentMeta.oversPerInnings || newState.totalWickets >= 10) {
    inningsCompleted = true;
    // Don't set COMPLETED here if first innings
    if (currentMeta.innings === 1) {
      newStatus = "INNINGS_BREAK";
    } else {
      newStatus = "COMPLETED";
    }
  }

  // Check if target chased in second innings
  if (currentMeta.innings === 2 && currentMeta.targetScore) {
    if (newState.totalRuns >= currentMeta.targetScore) {
      inningsCompleted = true;
      newStatus = "COMPLETED";
    }
  }

  const newMeta = { ...currentMeta, status: newStatus };

  return {
    newBall,
    newState,
    newMeta,
    stateChanges: {
      strikeChanged,
      overCompleted,
      wicketFell,
      needNewBatsman,
      needNewBowler,
      inningsCompleted,
    },
  };
}

/**
 * Handle strike rotation manually
 */
export function handleStrikeRotation(state: MatchState): MatchState {
  const newState = { ...state };
  const temp = newState.currentStriker;
  newState.currentStriker = newState.currentNonStriker;
  newState.currentNonStriker = temp;
  return newState;
}

/**
 * Handle wicket manually
 */
export function handleWicket(
  state: MatchState,
  playerOut: string,
  role: "striker" | "nonStriker"
): MatchState {
  const newState = { ...state };
  newState.totalWickets += 1;

  if (role === "striker") {
    newState.currentStriker = null;
  } else {
    newState.currentNonStriker = null;
  }

  newState.nextBatsmanIndex = (newState.nextBatsmanIndex ?? 0) + 1;
  newState.currentPartnershipRuns = 0;
  newState.currentPartnershipBalls = 0;

  return newState;
}

/**
 * Handle over completion manually
 */
export function handleOverCompletion(state: MatchState): MatchState {
  const newState = { ...state };
  newState.oversBowled += 1;
  newState.ballsInCurrentOver = 0;
  newState.lastOverBowler = state.currentBowler;
  newState.currentBowler = null;

  // Rotate strike
  const temp = newState.currentStriker;
  newState.currentStriker = newState.currentNonStriker;
  newState.currentNonStriker = temp;

  return newState;
}
