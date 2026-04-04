"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types/index";
import { loginUser, registerUser, loginWithGoogleService } from "@/lib/services";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  register: (email: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check local storage for session on mount
    const storedUser = localStorage.getItem("tiktokPlannerUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("tiktokPlannerUser");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string) => {
    try {
      const userData = await loginUser(email);
      setUser(userData);
      localStorage.setItem("tiktokPlannerUser", JSON.stringify(userData));
      router.push("/dashboard");
    } catch (error: any) {
      throw error;
    }
  };

  const register = async (email: string, name: string) => {
    try {
      const userData = await registerUser(email, name);
      setUser(userData);
      localStorage.setItem("tiktokPlannerUser", JSON.stringify(userData));
      router.push("/dashboard");
    } catch (error: any) {
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const userData = await loginWithGoogleService();
      setUser(userData);
      localStorage.setItem("tiktokPlannerUser", JSON.stringify(userData));
      router.push("/dashboard");
    } catch (error: any) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("tiktokPlannerUser");
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
