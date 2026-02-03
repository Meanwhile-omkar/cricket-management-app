"use client";

import { useState } from "react";
import MatchList from "@/components/MatchList";
import MatchViewer from "@/components/MatchViewer";
import TournamentViewer from "@/components/TournamentViewer"; 

type ViewMode = "LIST" | "MATCH" | "TOURNAMENT";

export default function ViewerPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("LIST");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // LOGIC: Show specific match
  if (viewMode === "MATCH" && selectedMatchId) {
    return (
      <MatchViewer 
        matchId={selectedMatchId} 
        onBack={() => setViewMode("LIST")} 
      />
    );
  }

  // LOGIC: Show Tournament Dashboard
  if (viewMode === "TOURNAMENT") {
    return (
      <TournamentViewer 
        onSelectMatch={(matchId) => {
          setSelectedMatchId(matchId);
          setViewMode("MATCH");
        }}
        onBack={() => setViewMode("LIST")} 
      />
    );
  }

  // LOGIC: Show Home List (Default)
  return (
    <MatchList 
      onSelectMatch={(matchId) => {
        setSelectedMatchId(matchId);
        setViewMode("MATCH");
      }} 
      onViewTournament={() => setViewMode("TOURNAMENT")}
    />
  );
}
