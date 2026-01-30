import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { MatchData } from "@/types";
import ScoringDashboard from "./ScoringDashboard";

interface Props {
  matchId: string;
  adminId: string;
  adminUsername: string;
  onBack: () => void;
}

export default function LiveScoring({ matchId, adminId, adminUsername, onBack }: Props) {
  const [match, setMatch] = useState<MatchData | null>(null);
  const [canScore, setCanScore] = useState(false);

  useEffect(() => {
    const matchRef = ref(db, `matches/${matchId}`);
    return onValue(matchRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMatch({ ...data, balls: data.balls || [] });

        // Check if this admin has the lock
        const hasLock = data.lock?.adminId === adminId;
        setCanScore(hasLock);

        if (!hasLock) {
          alert("This match is being scored by another admin");
        }
      }
    });
  }, [matchId, adminId]);

  const handleReleaseLock = async () => {
    if (confirm("Release lock and go back to matches?")) {
      await update(ref(db, `matches/${matchId}/lock`) as any, {
        adminId: null,
        adminUsername: null,
        lockedAt: null,
      });
      onBack();
    }
  };

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">🏏</div>
          <p className="text-gray-600">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!canScore) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-2">Match Locked</h2>
          <p className="text-gray-600 mb-4">
            This match is being scored by another admin
          </p>
          <button
            onClick={onBack}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with back button */}
      <div className="bg-white border-b mb-4 -mx-4 -mt-4 px-4 py-3 flex justify-between items-center sticky top-0 z-20">
        <button
          onClick={handleReleaseLock}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
        >
          ← Back to Matches
        </button>
        <div className="text-sm text-gray-600">
          Scoring as: <span className="font-medium text-gray-900">{adminUsername}</span>
        </div>
      </div>

      {/* Use existing ScoringDashboard */}
      <ScoringDashboard match={match} matchId={matchId} />
    </div>
  );
}
