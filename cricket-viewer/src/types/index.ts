export type TeamName = "teamA" | "teamB";

export interface Player {
  id: string; // use name as ID for simplicity
  name: string;
}

export interface Wicket {
  isOut: boolean;
  kind?: "bowled" | "caught" | "run_out" | "lbw" | "stumped" | null;
  playerOut?: string; // name
}

// Player Statistics
export interface BatsmanStats {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  howOut?: string;
}

export interface BowlerStats {
  name: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  economy: number;
  maidens: number;
  wides: number;
  noBalls: number;
}

// Fall of Wickets
export interface FallOfWicket {
  playerOut: string;
  score: number;
  wicketNumber: number;
  oversBowled: number;
  ballsInOver: number;
  wicketKind: string;
  bowler: string;
  fielder?: string;
}

// Partnership
export interface Partnership {
  batsman1: string;
  batsman2: string;
  runs: number;
  balls: number;
  startWicket: number;
  endWicket?: number;
  isActive: boolean;
}

// Innings Data
export interface InningsData {
  battingTeam: string;
  bowlingTeam: string;
  totalRuns: number;
  totalWickets: number;
  oversBowled: number;
  ballsInCurrentOver: number;
  legalBalls: number;
  fallOfWickets: FallOfWicket[];
  partnerships: Partnership[];
  batsmanStats: Record<string, BatsmanStats>;
  bowlerStats: Record<string, BowlerStats>;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    total: number;
  };
}

export interface Ball {
  ballNumber: number; // Global index
  overNumber: number;
  ballInOver: number; // 1-6 (or more if extras)

  // Scoring
  runsScored: number; // Total runs from this ball
  runsByBatsman?: number; // NEW: Runs off bat (for stats)
  extraRuns?: number; // NEW: Extra runs

  // Extras
  isWide: boolean;
  isNoBall: boolean;
  isBye?: boolean; // NEW
  isLegBye?: boolean; // NEW

  // Wickets
  isWicket: boolean;
  wicketKind?: string;
  playerOut?: string;
  fielder?: string; // NEW: For caught/run out/stumped

  // Context (Snapshot for Undo/History)
  striker: string;
  nonStriker: string;
  bowler: string;
  isFreeHit: boolean;

  // Partnership
  partnershipRuns?: number; // NEW
}

export interface MatchMeta {
  teamA: string; // Name
  teamB: string; // Name
  oversPerInnings: number;
  status: "NOT_STARTED" | "LIVE" | "INNINGS_BREAK" | "COMPLETED";
  innings: number;
  battingTeam: string; // Name
  bowlingTeam: string; // Name
  winningTeam?: string;

  // NEW: Second innings support
  targetScore?: number;
  matchResult?: string;
  matchResultType?: "runs" | "wickets" | "tie" | "no_result";
}

export interface MatchState {
  totalRuns: number;
  totalWickets: number;
  legalBalls: number; // Total legal balls bowled
  oversBowled: number; // e.g., 2
  ballsInCurrentOver: number; // e.g., 4

  // Current Actors
  currentStriker: string | null;
  currentNonStriker: string | null;
  currentBowler: string | null;

  isFreeHit: boolean; // Next ball is free hit?

  // NEW: Batting order tracking
  battingOrder?: string[];
  nextBatsmanIndex?: number;

  // NEW: Over history for bowling restrictions
  lastOverBowler?: string | null;

  // NEW: Current partnership
  currentPartnershipRuns?: number;
  currentPartnershipBalls?: number;
}

// Roster Storage
export interface Squads {
  teamA: string[];
  teamB: string[];
}

export interface MatchData {
  meta: MatchMeta;
  squads: Squads;
  state: MatchState;
  balls: Ball[];

  // NEW: Innings-wise data
  innings1?: InningsData;
  innings2?: InningsData;

  lastUpdatedAt: number;
}