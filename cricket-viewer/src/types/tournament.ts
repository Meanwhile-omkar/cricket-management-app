export interface Team {
  team_id: string;
  name: string;
  short_name: string;
  logo_path: string;
}

export interface Player {
  player_id: string;
  name: string;
  team_id: string;
  role: string;
}

export interface TournamentFixture {
  id: string;
  teamA_id: string;
  teamB_id: string;
  group: "A" | "B" | "SEMI" | "FINAL";
  status: "SCHEDULED" | "LIVE" | "COMPLETED";
  matchId?: string; // Links to the actual match node in /matches
  winner_id?: string;
  resultStr?: string;
  round?: number;
}

export interface GroupStandings {
  team_id: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  nrr: number; // Simplified NRR or just placeholder
}

export interface TournamentState {
  config: {
    groups: {
      groupA: string[]; // team_ids
      groupB: string[]; // team_ids
    };
    isSetupComplete: boolean;
  };
  fixtures: Record<string, TournamentFixture>;
}