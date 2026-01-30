import { MatchState, MatchMeta, Ball } from "@/types";

/**
 * Validate bowler selection to enforce bowling restrictions
 * Rule: A bowler cannot bowl consecutive overs
 */
export function validateBowlerSelection(
  currentBowler: string | null,
  lastOverBowler: string | null | undefined,
  proposedBowler: string
): { valid: boolean; error?: string } {
  // If no last over bowler, any bowler can be selected
  if (!lastOverBowler) {
    return { valid: true };
  }

  // Check if proposed bowler is same as last over bowler
  if (proposedBowler === lastOverBowler) {
    return {
      valid: false,
      error: `${proposedBowler} bowled the last over and cannot bowl consecutive overs.`,
    };
  }

  return { valid: true };
}

/**
 * Validate batting order to ensure player hasn't already batted
 */
export function validateBattingOrder(
  squad: string[],
  battingOrder: string[] | undefined,
  batsmanStats: Record<string, any>,
  proposedBatsman: string
): { valid: boolean; error?: string } {
  // If no batting order tracking, allow any player
  if (!battingOrder || battingOrder.length === 0) {
    return { valid: true };
  }

  // Check if player is in the squad
  if (!squad.includes(proposedBatsman)) {
    return {
      valid: false,
      error: `${proposedBatsman} is not in the squad.`,
    };
  }

  // Check if player has already batted and is out
  if (batsmanStats[proposedBatsman]) {
    const stats = batsmanStats[proposedBatsman];
    if (stats.isOut) {
      return {
        valid: false,
        error: `${proposedBatsman} is already out and cannot bat again.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Check if innings is complete
 */
export function isInningsComplete(state: MatchState, meta: MatchMeta): boolean {
  // Innings complete if all overs bowled
  if (state.oversBowled >= meta.oversPerInnings) {
    return true;
  }

  // Innings complete if 10 wickets down
  if (state.totalWickets >= 10) {
    return true;
  }

  return false;
}

/**
 * Get next batsman from batting order
 */
export function getNextBatsman(
  battingOrder: string[] | undefined,
  nextBatsmanIndex: number | undefined,
  batsmanStats: Record<string, any>
): string | null {
  if (!battingOrder || battingOrder.length === 0) {
    return null;
  }

  const index = nextBatsmanIndex ?? 0;

  // Find next batsman who hasn't batted yet
  for (let i = index; i < battingOrder.length; i++) {
    const player = battingOrder[i];
    const stats = batsmanStats[player];

    // If player hasn't batted yet or is not out, they can bat
    if (!stats || !stats.isOut) {
      return player;
    }
  }

  return null;
}

/**
 * Validate if match can progress (all required players selected)
 */
export function canProgressMatch(state: MatchState): { valid: boolean; error?: string } {
  if (!state.currentStriker) {
    return { valid: false, error: "Please select a striker" };
  }

  if (!state.currentNonStriker) {
    return { valid: false, error: "Please select a non-striker" };
  }

  if (!state.currentBowler) {
    return { valid: false, error: "Please select a bowler" };
  }

  if (state.currentStriker === state.currentNonStriker) {
    return { valid: false, error: "Striker and non-striker cannot be the same player" };
  }

  return { valid: true };
}

/**
 * Get last over bowler from balls array
 */
export function getLastOverBowler(balls: Ball[], currentOverNumber: number): string | null {
  if (currentOverNumber === 0) return null;

  const lastOverNumber = currentOverNumber - 1;

  // Find balls from last over
  const lastOverBalls = balls.filter((b) => b.overNumber === lastOverNumber);

  // Return the bowler from the last over
  if (lastOverBalls.length > 0) {
    return lastOverBalls[0].bowler;
  }

  return null;
}

/**
 * Check if target has been chased in second innings
 */
export function isTargetChased(currentRuns: number, targetScore: number | undefined): boolean {
  if (!targetScore) return false;
  return currentRuns >= targetScore;
}
