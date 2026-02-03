import { useState, useEffect, useMemo } from "react";
import { ref, onValue, set, update } from "firebase/database";
import { db } from "@/lib/firebase";
import fullTeamsData from "@/data/fullteam.json";
import { Team, TournamentState, TournamentFixture } from "@/types/tournament";
import { generateGroupFixtures, calculateStandings } from "@/lib/tournamentUtils";
import { MatchData } from "@/types";
import LiveScoring from "./LiveScoring";

interface Props {
  adminId: string;
  adminUsername: string;
  onBack: () => void;
}

// Helper function to generate short name from full name
function generateShortName(name: string): string {
  // Extract capital letters or first letters of words
  const words = name.split(' ');
  if (words.length === 1) {
    return name.substring(0, 3).toUpperCase();
  }
  return words.map(w => w[0]).join('').toUpperCase().substring(0, 4);
}

export default function TournamentDashboard({ adminId, adminUsername, onBack }: Props) {
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [matches, setMatches] = useState<Record<string, MatchData>>({});
  const [activeTab, setActiveTab] = useState<"groups" | "fixtures" | "standings">("fixtures");
  const [setupStep, setSetupStep] = useState(0); // 0=Loading, 1=Setup, 2=Dashboard
  
  // Selection state for Setup
  const [selectedGroupA, setSelectedGroupA] = useState<string[]>([]);
  const [selectedGroupB, setSelectedGroupB] = useState<string[]>([]);
  
  // Scoring State
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // Transform fullteam.json data to expected format
  const teamsData: Team[] = useMemo(() => {
    return fullTeamsData.map(team => ({
      team_id: team.id,
      name: team.name,
      short_name: generateShortName(team.name),
      logo_path: team.logo
    }));
  }, []);

  // Create a map of team_id -> player names
  const teamPlayersMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    fullTeamsData.forEach(team => {
      map[team.id] = team.players.map(p => p.name);
    });
    return map;
  }, []);

  useEffect(() => {
    let mounted = true;

    // Timeout fallback - if Firebase doesn't respond in 3 seconds, show setup screen
    const timeoutId = setTimeout(() => {
      if (mounted && setupStep === 0) {
        console.log("Firebase timeout - showing setup screen");
        setSetupStep(1);
      }
    }, 3000);

    // Listen to Tournament Data
    const tourneyRef = ref(db, "tournaments/vcl2026");
    const unsubTourney = onValue(tourneyRef, (snapshot) => {
      if (!mounted) return;
      clearTimeout(timeoutId); // Clear timeout once we get a response

      const data = snapshot.val();
      console.log("Tournament data:", data); // Debug log
      if (data && data.config?.isSetupComplete) {
        setTournament(data);
        setSetupStep(2);
      } else {
        setSetupStep(1); // Need setup
      }
    }, (error: any) => {
      if (!mounted) return;
      clearTimeout(timeoutId);
      console.error("Firebase error:", error);

      // Set user-friendly error message
      if (error.code === "PERMISSION_DENIED") {
        setFirebaseError("Firebase permission denied. Please update your database rules to allow read/write access.");
      } else {
        setFirebaseError(`Firebase error: ${error.message}`);
      }

      setSetupStep(1); // Fallback to setup on error
    });

    // Listen to All Matches (for linking results)
    const matchesRef = ref(db, "matches");
    const unsubMatches = onValue(matchesRef, (snapshot) => {
      if (!mounted) return;
      setMatches(snapshot.val() || {});
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubTourney();
      unsubMatches();
    };
  }, [setupStep]);

  // --- ACTIONS ---

  const handleSetup = async () => {
    if (selectedGroupA.length !== 4 || selectedGroupB.length !== 4) {
      alert("Please assign exactly 4 teams to each group.");
      return;
    }

    const fixturesA = generateGroupFixtures(selectedGroupA, "A");
    const fixturesB = generateGroupFixtures(selectedGroupB, "B");
    
    const fixturesObj: Record<string, TournamentFixture> = {};
    [...fixturesA, ...fixturesB].forEach(f => fixturesObj[f.id] = f);

    const newState: TournamentState = {
      config: {
        groups: { groupA: selectedGroupA, groupB: selectedGroupB },
        isSetupComplete: true
      },
      fixtures: fixturesObj
    };

    await set(ref(db, "tournaments/vcl2026"), newState);
  };

  const handleStartMatch = async (fixture: TournamentFixture, tossWinner: string, batFirst: boolean, overs: number) => {
    // 1. Get Team Data
    const teamA = teamsData.find(t => t.team_id === fixture.teamA_id);
    const teamB = teamsData.find(t => t.team_id === fixture.teamB_id);
    if (!teamA || !teamB) return;

    // 2. Get Squads from fullteam.json
    const squadA = teamPlayersMap[teamA.team_id] || [];
    const squadB = teamPlayersMap[teamB.team_id] || [];

    // 3. Create Match ID
    const matchId = `match_${fixture.id}_${Date.now()}`;

    // 4. Determine Batting/Bowling Team
    const battingTeam = batFirst ? tossWinner : (tossWinner === teamA.name ? teamB.name : teamA.name);
    const bowlingTeam = battingTeam === teamA.name ? teamB.name : teamA.name;

    // 5. Construct Match Object (Using existing type)
    const newMatch: MatchData & { matchId: string; createdBy: string; lock: any; tournamentId?: string; fixtureId?: string } = {
      matchId,
      createdBy: adminId,
      lock: { adminId, adminUsername, lockedAt: Date.now() },
      tournamentId: "vcl2026",
      fixtureId: fixture.id,
      meta: {
        teamA: teamA.name,
        teamB: teamB.name,
        battingTeam,
        bowlingTeam,
        oversPerInnings: overs,
        status: "LIVE",
        innings: 1,
      },
      squads: { teamA: squadA, teamB: squadB },
      state: {
        totalRuns: 0, totalWickets: 0, legalBalls: 0, oversBowled: 0, ballsInCurrentOver: 0,
        currentStriker: null, currentNonStriker: null, currentBowler: null,
        isFreeHit: false, battingOrder: [], nextBatsmanIndex: 0, lastOverBowler: null,
        currentPartnershipRuns: 0, currentPartnershipBalls: 0
      },
      balls: [],
      lastUpdatedAt: Date.now(),
    };

    // 6. Atomic Write: Create Match AND Update Fixture
    const updates: any = {};
    updates[`matches/${matchId}`] = newMatch;
    updates[`tournaments/vcl2026/fixtures/${fixture.id}/status`] = "LIVE";
    updates[`tournaments/vcl2026/fixtures/${fixture.id}/matchId`] = matchId;

    await update(ref(db), updates);
    setScoringMatchId(matchId);
  };

  const handleToggleGroupSelection = (teamId: string, group: "A" | "B") => {
    if (group === "A") {
      if (selectedGroupA.includes(teamId)) setSelectedGroupA(prev => prev.filter(id => id !== teamId));
      else if (selectedGroupA.length < 4 && !selectedGroupB.includes(teamId)) setSelectedGroupA(prev => [...prev, teamId]);
    } else {
      if (selectedGroupB.includes(teamId)) setSelectedGroupB(prev => prev.filter(id => id !== teamId));
      else if (selectedGroupB.length < 4 && !selectedGroupA.includes(teamId)) setSelectedGroupB(prev => [...prev, teamId]);
    }
  };
  
  // --- SUB-COMPONENTS ---

  // Renders the Setup Screen
  if (setupStep === 1) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">🏆 VCL 2026 Setup</h1>
          <button onClick={onBack} className="text-gray-600 hover:text-gray-800">← Back</button>
        </div>

        {/* Firebase Error Banner */}
        {firebaseError && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Firebase Configuration Issue</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{firebaseError}</p>
                  <p className="mt-2">
                    <strong>Solution:</strong> Go to Firebase Console → Realtime Database → Rules, and set read/write to true.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="font-bold text-lg mb-3 text-blue-900">Group A ({selectedGroupA.length}/4)</h2>
            {teamsData.map(team => (
              <label key={team.team_id} className="flex items-center space-x-3 p-3 bg-white mb-2 rounded border border-gray-300 hover:border-blue-500 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={selectedGroupA.includes(team.team_id)}
                  disabled={selectedGroupB.includes(team.team_id)}
                  onChange={() => handleToggleGroupSelection(team.team_id, "A")}
                  className="w-5 h-5 text-blue-600 cursor-pointer"
                />
                <span className="text-gray-900 font-medium">{team.name}</span>
              </label>
            ))}
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="font-bold text-lg mb-3 text-green-900">Group B ({selectedGroupB.length}/4)</h2>
            {teamsData.map(team => (
              <label key={team.team_id} className="flex items-center space-x-3 p-3 bg-white mb-2 rounded border border-gray-300 hover:border-green-500 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={selectedGroupB.includes(team.team_id)}
                  disabled={selectedGroupA.includes(team.team_id)}
                  onChange={() => handleToggleGroupSelection(team.team_id, "B")}
                  className="w-5 h-5 text-green-600 cursor-pointer"
                />
                <span className="text-gray-900 font-medium">{team.name}</span>
              </label>
            ))}
          </div>
        </div>
        <button onClick={handleSetup} className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700">Initialize Tournament</button>
      </div>
    );
  }

  // Render Live Scoring if active
  if (scoringMatchId) {
    return (
      <LiveScoring 
        matchId={scoringMatchId} 
        adminId={adminId} 
        adminUsername={adminUsername} 
        onBack={() => setScoringMatchId(null)} 
      />
    );
  }

  // Renders the Main Dashboard
  if (setupStep === 2 && tournament) {
    const fixtureList = Object.values(tournament.fixtures);
    const standingsA = calculateStandings(tournament.config.groups.groupA, fixtureList, matches);
    const standingsB = calculateStandings(tournament.config.groups.groupB, fixtureList, matches);

    return (
      <div className="min-h-screen !text-slate-900 bg-gray-50">
         <div className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
           <h1 className="text-2xl font-bold">🏆 VCL 2026 Admin</h1>
           <button onClick={onBack} className="text-gray-600 hover:text-gray-800">← Back to Home</button>
         </div>

         <div className="px-6 py-4">
           <div className="flex space-x-4 border-b mb-6">
             {["fixtures", "standings"].map((tab) => (
               <button 
                 key={tab}
                 onClick={() => setActiveTab(tab as any)}
                 className={`pb-2 px-4 capitalize font-medium ${activeTab === tab ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
               >
                 {tab}
               </button>
             ))}
           </div>

           {activeTab === "fixtures" && (
             <div className="grid md:grid-cols-2 gap-6">
               {["A", "B"].map(group => (
                 <div key={group}>
                   <h3 className="font-bold text-lg mb-4 text-gray-700">Group {group} Matches</h3>
                   <div className="space-y-3">
                     {fixtureList.filter(f => f.group === group).map(fix => {
                       const tA = teamsData.find(t => t.team_id === fix.teamA_id);
                       const tB = teamsData.find(t => t.team_id === fix.teamB_id);
                       const linkedMatch = fix.matchId ? matches[fix.matchId] : null;
                       const isCompleted = linkedMatch?.meta.status === "COMPLETED";

                       return (
                         <div key={fix.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                           <div className="flex justify-between items-center mb-2">
                             <span className="font-bold">{tA?.short_name} vs {tB?.short_name}</span>
                             <span className={`text-xs px-2 py-1 rounded ${fix.matchId ? (isCompleted ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800 animate-pulse") : "bg-gray-100"}`}>
                               {fix.matchId ? (isCompleted ? "DONE" : "LIVE") : "UPCOMING"}
                             </span>
                           </div>
                           
                           {linkedMatch ? (
                             <div>
                               <div className="text-sm text-gray-600 mb-2">
                                 {linkedMatch.state.totalRuns}/{linkedMatch.state.totalWickets} ({linkedMatch.state.oversBowled}.{linkedMatch.state.ballsInCurrentOver})
                               </div>
                               {isCompleted && linkedMatch.meta.matchResult && (
                                 <div className="text-xs font-semibold text-green-700 bg-green-50 p-2 rounded">
                                   {linkedMatch.meta.matchResult}
                                 </div>
                               )}
                             </div>
                           ) : (
                             <button
                               onClick={() => {
                                 const overs = prompt("Overs per innings?", "4");
                                 const toss = prompt(`Who won toss? (${tA?.name} or ${tB?.name})`, tA?.name);
                                 const batFirstStr = prompt(`Does ${toss} bat first? (yes/no)`, "yes");
                                 const batFirst = batFirstStr?.toLowerCase() === "yes";
                                 if (overs && toss) handleStartMatch(fix, toss, batFirst, parseInt(overs));
                               }}
                               className="w-full mt-2 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                             >
                               Start Match
                             </button>
                           )}
                           
                           {/* Quick access to scoring if live */}
                           {!isCompleted && fix.matchId && (
                             <button 
                               onClick={() => setScoringMatchId(fix.matchId!)}
                               className="w-full mt-2 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                             >
                               Resume Scoring
                             </button>
                           )}
                         </div>
                       );
                     })}
                   </div>
                 </div>
               ))}
             </div>
           )}

           {activeTab === "standings" && (
             <div className="grid md:grid-cols-2 gap-8">
               {[standingsA, standingsB].map((table, idx) => (
                 <div key={idx} className="bg-white rounded-lg shadow overflow-hidden">
                   <div className={`p-3 font-bold text-white ${idx === 0 ? "bg-blue-800" : "bg-green-800"}`}>
                     Group {idx === 0 ? "A" : "B"} Table
                   </div>
                   <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 text-gray-600 border-b">
                       <tr>
                         <th className="p-3">Team</th>
                         <th className="p-3">P</th>
                         <th className="p-3">W</th>
                         <th className="p-3">L</th>
                         <th className="p-3">Pts</th>
                         <th className="p-3">NRR</th>
                       </tr>
                     </thead>
                     <tbody>
                       {table.map((row) => {
                         const team = teamsData.find(t => t.team_id === row.team_id);
                         return (
                           <tr key={row.team_id} className="border-b">
                             <td className="p-3 font-medium">{team?.short_name}</td>
                             <td className="p-3">{row.played}</td>
                             <td className="p-3">{row.won}</td>
                             <td className="p-3">{row.lost}</td>
                             <td className="p-3 font-bold">{row.points}</td>
                             <td className="p-3">{row.nrr.toFixed(2)}</td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               ))}
             </div>
           )}
         </div>
      </div>
    );
  }

  return <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="text-4xl mb-2">🏏</div>
      <p className="text-gray-600">Loading tournament...</p>
    </div>
  </div>;
}