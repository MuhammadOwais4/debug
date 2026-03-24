import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token    = localStorage.getItem("accessToken");
    const role     = localStorage.getItem("userRole");
    const username = localStorage.getItem("username");
    if (token && role) setUser({ token, role, username });
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await fetch("https://debug-nxby.vercel.app/api/auth/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Login failed");
    }
    // Backend returns: { token, role, userId }
    // role lowercase: 'user' | 'admin' | 'developer'
    const data = await response.json();
    localStorage.setItem("accessToken", data.token);
    localStorage.setItem("userRole",    data.role);
    localStorage.setItem("username",    username);
    setUser({ token: data.token, role: data.role, username });
    return data.role;
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("username");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}