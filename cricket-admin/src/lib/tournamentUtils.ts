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

  // Initialize with NRR tracking data
  const nrrData: Record<string, { runsScored: number; oversFaced: number; runsConceded: number; oversBowled: number }> = {};

  teamIds.forEach(tid => {
    standings[tid] = { team_id: tid, played: 0, won: 0, lost: 0, tied: 0, points: 0, nrr: 0 };
    nrrData[tid] = { runsScored: 0, oversFaced: 0, runsConceded: 0, oversBowled: 0 };
  });

  fixtures.forEach(fixture => {
    if (fixture.status === "COMPLETED" && fixture.matchId && matches[fixture.matchId]) {
      const match = matches[fixture.matchId];
      const result = match.meta.matchResultType;
      const winner = match.meta.winningTeam;

      const teamA = fixture.teamA_id;
      const teamB = fixture.teamB_id;

      if (standings[teamA]) standings[teamA].played++;
      if (standings[teamB]) standings[teamB].played++;

      // Calculate NRR data from innings
      if (match.innings1 && match.innings2) {
        const innings1Team = match.innings1.battingTeam === match.meta.teamA ? teamA : teamB;
        const innings2Team = innings1Team === teamA ? teamB : teamA;

        // Convert overs to decimal (e.g., "2.3" means 2 overs + 3 balls = 2.5 overs)
        const overs1 = match.innings1.oversBowled + (match.innings1.ballsInCurrentOver / 6);
        const overs2 = match.innings2.oversBowled + (match.innings2.ballsInCurrentOver / 6);

        // Update NRR data for innings 1 batting team
        if (nrrData[innings1Team]) {
          nrrData[innings1Team].runsScored += match.innings1.totalRuns;
          nrrData[innings1Team].oversFaced += overs1;
        }

        // Update NRR data for innings 2 batting team
        if (nrrData[innings2Team]) {
          nrrData[innings2Team].runsScored += match.innings2.totalRuns;
          nrrData[innings2Team].oversFaced += overs2;
        }

        // Update runs conceded data (innings 1 team bowled in innings 2)
        if (nrrData[innings1Team]) {
          nrrData[innings1Team].runsConceded += match.innings2.totalRuns;
          nrrData[innings1Team].oversBowled += overs2;
        }

        // Update runs conceded data (innings 2 team bowled in innings 1)
        if (nrrData[innings2Team]) {
          nrrData[innings2Team].runsConceded += match.innings1.totalRuns;
          nrrData[innings2Team].oversBowled += overs1;
        }
      }

      if (result === "tie" || result === "no_result") {
        standings[teamA].points += 1;
        standings[teamA].tied++;
        standings[teamB].points += 1;
        standings[teamB].tied++;
      } else if (winner) {
         // Determine winner ID by comparing winner name with team names
         const winnerId = winner === match.meta.teamA ? teamA : teamB;
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

  // Calculate final NRR for each team
  teamIds.forEach(tid => {
    const data = nrrData[tid];
    if (data.oversFaced > 0 && data.oversBowled > 0) {
      const runRate = data.runsScored / data.oversFaced;
      const concededRate = data.runsConceded / data.oversBowled;
      standings[tid].nrr = runRate - concededRate;
    }
  });

  // Sort by points first, then by NRR
  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.nrr - a.nrr;
  });
}