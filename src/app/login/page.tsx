"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { user, loading: authLoading, login, loginWithGoogle } = useAuth();
  const router = useRouter();

  // 🚀 Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  if (authLoading || (user && !authLoading)) {
    return <div className="min-h-screen bg-[#fafafa] flex items-center justify-center font-black animate-pulse text-xs tracking-widest">VERIFYING SESSION...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // NOTE: Still using the mock auth by email per current system design
      await login(email);
    } catch (err: any) {
      setError(err.message || "Gagal masuk. Pastikan email sudah terdaftar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      setError("Silakan masukkan email Anda terlebih dahulu untuk mereset password.");
      return;
    }
    alert(`Instruksi reset password telah dikirim ke ${email}. (Mock)`);
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || "Gagal masuk dengan Google.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black rounded-3xl p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-300 rounded-bl-full -z-10 border-b-4 border-l-4 border-black translate-x-4 -translate-y-4"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-fuchsia-400 rounded-tr-full -z-10 border-t-4 border-r-4 border-black -translate-x-4 translate-y-4"></div>

        <h1 className="text-4xl font-black italic tracking-tighter mb-2 z-10 relative">WELCOME BACK</h1>
        <p className="font-mono text-sm font-bold text-black mb-8 uppercase tracking-widest z-10 relative">Login to Your Planner</p>

        {error && (
          <div className="bg-red-100 border-2 border-red-500 text-red-700 font-bold font-mono text-xs p-3 rounded-xl mb-6 relative z-10 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10 text-left">
          <div className="group">
            <label className="text-[10px] font-black font-mono text-black uppercase mb-1 ml-1 block">Email Address</label>
            <input 
              type="email" 
              required 
              placeholder="creator@example.com"
              className="w-full px-5 py-4 bg-gray-50 border-2 border-black rounded-2xl focus:bg-white focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] outline-none font-mono text-sm font-bold transition-all text-black placeholder-black/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="group">
            <div className="flex justify-between items-center mb-1 ml-1">
              <label className="text-[10px] font-black font-mono text-black uppercase block">Password</label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="text-[10px] font-black font-mono text-fuchsia-600 hover:text-fuchsia-500 uppercase tracking-wider block"
              >
                Lupa Password?
              </button>
            </div>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              className="w-full px-5 py-4 bg-gray-50 border-2 border-black rounded-2xl focus:bg-white focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] outline-none font-mono text-sm font-bold transition-all text-black placeholder-black/40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || isGoogleLoading}
            className="w-full bg-cyan-400 text-black border-2 border-black px-4 py-4 rounded-2xl font-black text-sm tracking-widest hover:bg-cyan-300 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "LOADING..." : "MASUK SEKARANG ➔"}
          </button>
        </form>

        <div className="relative z-10 mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-black/10"></div>
          </div>
          <div className="relative flex justify-center text-xs font-mono font-bold">
            <span className="bg-white px-bg-white text-black/40 px-2 bg-white">ATAU</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          className="w-full relative z-10 bg-white text-black border-2 border-black px-4 py-4 rounded-2xl font-black text-sm tracking-widest hover:bg-gray-50 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none mt-6 flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {isGoogleLoading ? "LOADING..." : "MASUK DENGAN GOOGLE"}
        </button>

        <p className="mt-8 font-mono text-xs font-bold text-black relative z-10">
          Belum punya akun? <Link href="/register" className="text-fuchsia-600 hover:text-fuchsia-500 underline decoration-2 underline-offset-4">Daftar di sini</Link>
        </p>
      </div>
    </div>
  );
}
