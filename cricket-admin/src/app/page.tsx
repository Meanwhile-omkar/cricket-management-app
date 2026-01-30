"use client";

import { useEffect, useState } from "react";
import Login from "@/components/Login";
import AdminDashboard from "@/components/AdminDashboard";

export default function AdminPage() {
  const [adminId, setAdminId] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedAdminId = localStorage.getItem('cricketAdminId');
    const storedUsername = localStorage.getItem('cricketAdminUsername');

    if (storedAdminId && storedUsername) {
      setAdminId(storedAdminId);
      setAdminUsername(storedUsername);
    }
    setLoading(false);
  }, []);

  const handleLogin = (id: string, username: string) => {
    setAdminId(id);
    setAdminUsername(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('cricketAdminId');
    localStorage.removeItem('cricketAdminUsername');
    setAdminId(null);
    setAdminUsername(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-6xl">🏏</div>
      </div>
    );
  }

  if (!adminId || !adminUsername) {
    return <Login onLogin={handleLogin} />;
  }

  return <AdminDashboard adminId={adminId} adminUsername={adminUsername} onLogout={handleLogout} />;
}