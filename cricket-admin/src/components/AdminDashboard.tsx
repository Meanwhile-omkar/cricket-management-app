import { useState } from "react";
import AllMatches from "./AllMatches";
import TournamentDashboard from "./TournamentDashboard"; 
import CreateMatch from "./CreateMatch";
import LiveScoring from "./LiveScoring";

interface Props {
  adminId: string;
  adminUsername: string;
  onLogout: () => void;
}

type Tab = "matches" | "create" | "scoring" | "tournament"; // Update this

export default function AdminDashboard({ adminId, adminUsername, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("matches");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const handleMatchSelect = (matchId: string) => {
    setSelectedMatchId(matchId);
    setActiveTab("scoring");
  };

  const handleMatchCreated = (matchId: string) => {
    setSelectedMatchId(matchId);
    setActiveTab("scoring");
  };

  const handleBackToMatches = () => {
    setSelectedMatchId(null);
    setActiveTab("matches");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏏 Cricket Scorer</h1>
              <p className="text-sm text-gray-600">Welcome, {adminUsername}</p>
            </div>
            <button
              onClick={onLogout}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tabs - Only show when not in scoring mode */}
      {activeTab !== "scoring" && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab("matches")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                  activeTab === "matches"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                All Matches
              </button>
              <button
                onClick={() => setActiveTab("create")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                  activeTab === "create"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                + Create Match
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tournament")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                  activeTab === "tournament"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                🏆 VCL Tournament
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4">
        {activeTab === "matches" && (
          <AllMatches
            adminId={adminId}
            adminUsername={adminUsername}
            onMatchSelect={handleMatchSelect}
          />
        )}

        {activeTab === "create" && (
          <CreateMatch
            adminId={adminId}
            adminUsername={adminUsername}
            onMatchCreated={handleMatchCreated}
          />
        )}

        {activeTab === "tournament" && (
          <TournamentDashboard
            adminId={adminId}
            adminUsername={adminUsername}
            onBack={handleBackToMatches}
          />
        )}

        {activeTab === "scoring" && selectedMatchId && (
          <LiveScoring
            matchId={selectedMatchId}
            adminId={adminId}
            adminUsername={adminUsername}
            onBack={handleBackToMatches}
          />
        )}
      </div>
    </div>
  );
}
