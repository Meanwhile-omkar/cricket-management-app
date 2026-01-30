import { useState } from "react";
import { ref, set, get } from "firebase/database";
import { db } from "@/lib/firebase";

interface Props {
  onLogin: (adminId: string, username: string) => void;
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }

    setLoading(true);
    try {
      // Simple hash for adminId (in production, use proper auth)
      const adminId = btoa(username.toLowerCase().trim()).replace(/=/g, '');

      const adminRef = ref(db, `admins/${adminId}`);
      const snapshot = await get(adminRef);

      if (!snapshot.exists()) {
        // Create new admin
        await set(adminRef, {
          username: username.trim(),
          createdAt: Date.now(),
        });
      }

      // Store in localStorage
      localStorage.setItem('cricketAdminId', adminId);
      localStorage.setItem('cricketAdminUsername', username.trim());

      onLogin(adminId, username.trim());
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏏</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cricket Scorer</h1>
          <p className="text-gray-600">Enter your username to continue</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || !username.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {loading ? "Logging in..." : "Continue"}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          No password required • Simple username-based login
        </p>
      </div>
    </div>
  );
}
