import { Team, TournamentFixture, GroupStandings } from "@/types/tournament";
import { MatchData } from "@/types";

// Generate Round Robin Fixtures
export function generateGroupFixtures(groupTeams: string[], groupName: "A" | "B"): TournamentFixture[] {
  const fixtures: TournamentFixture[] = [];
  // Simple round robin: every team plays every other team once
  for (let i = 0; i < groupTeams.length; i++) {
    for (let j = i + 1; j < groupTeams.length; j++) {
      fixtures.push({
        id: `fix_${groupName}_${groupTeams[i]}_${groupTeams[j]}`,
        teamA_id: groupTeams[i],
        teamB_id: groupTeams[j],
        group: groupName,
        status: "SCHEDULED"
      });
    }
  }
  return fixtures;
}

export function calculateStandings(
  teamIds: string[], 
  fixtures: TournamentFixture[], 
  matches: Record<string, MatchData>
): GroupStandings[] {
  const standings: Record<string, GroupStandings> = {};

  // Initialize
  teamIds.forEach(tid => {
    standings[tid] = { team_id: tid, played: 0, won: 0, lost: 0, tied: 0, points: 0, nrr: 0 };
  });

  fixtures.forEach(fixture => {
    if (fixture.status === "COMPLETED" && fixture.matchId && matches[fixture.matchId]) {
      const match = matches[fixture.matchId];
      const result = match.meta.matchResultType;
      const winner = match.meta.winningTeam; 
      
      // Note: Match meta stores Team Name, but we need Team ID. 
      // We assume mapping handles this or we rely on fixture team IDs.
      // For simplicity, we compare names or use the fixture result logic.
      
      const teamA = fixture.teamA_id;
      const teamB = fixture.teamB_id;

      if (standings[teamA]) standings[teamA].played++;
      if (standings[teamB]) standings[teamB].played++;

      if (result === "tie" || result === "no_result") {
        standings[teamA].points += 1;
        standings[teamA].tied++;
        standings[teamB].points += 1;
        standings[teamB].tied++;
      } else if (winner) {
         // This is a bit tricky since match meta has names, not IDs. 
         // In the new module, we ensure match meta team names match the JSON names exactly.
         const winnerId = winner === match.meta.teamA ? teamA : teamB; // Rough heuristic, usually correct if we pass names correctly
         const loserId = winnerId === teamA ? teamB : teamA;

         if (standings[winnerId]) {
           standings[winnerId].won++;
           standings[winnerId].points += 2;
         }
         if (standings[loserId]) {
           standings[loserId].lost++;
         }
      }
    }
  });

  return Object.values(standings).sort((a, b) => b.points - a.points); // Sort by points
}