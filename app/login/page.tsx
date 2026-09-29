"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Verifikasi kredensial ke Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Kueri peran pengguna dari tabel profiles
    if (authData.user) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("peran")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profileData) {
        setError("Profil pengguna tidak ditemukan dalam sistem.");
        setLoading(false);
        return;
      }

      // 3. Pengalihan rute berdasarkan otorisasi peran
      const peran = profileData.peran;
      if (peran === "admin") router.push("/admin");
      else if (peran === "penjual") router.push("/penjual");
      else if (peran === "pembeli") router.push("/pembeli");
      else if (peran === "kurir") router.push("/kurir");
      else router.push("/");
    }
  };

  return (
    <div className="h-[calc(100vh-68px)] flex w-full bg-white font-sans overflow-hidden">
      {/* Form Otorisasi (Kiri) */}
      <div 
        className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative z-10 transition-all duration-500 ease-out translate-x-0 opacity-100"
        style={{ animation: 'slideInLeft 0.5s ease-out' }}
      >
        <div className="max-w-md w-full space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight mb-2">Selamat Datang</h2>
            <p className="text-neutral-500 font-medium text-sm lg:text-base leading-relaxed">
              Masuk ke akun Anda untuk melanjutkan misi penyelamatan makanan bersama LASTBITE.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-neutral-700">Email</label>
              <input
                type="email"
                name="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all duration-200 outline-none text-neutral-900 placeholder:text-neutral-400"
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-neutral-700">Password</label>
              </div>
              <input
                type="password"
                name="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all duration-200 outline-none text-neutral-900 placeholder:text-neutral-400"
                required
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3.5 rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Memproses...</span>
                  </>
                ) : (
                  "Masuk ke Akun"
                )}
              </button>
            </div>
          </form>

          <div className="pt-6 text-center text-sm text-neutral-500">
            Belum punya akun? <Link href="/register" className="font-bold text-orange-600 hover:text-orange-700 hover:underline underline-offset-4 transition-colors">Daftar sekarang</Link>
          </div>
        </div>
      </div>

      {/* Visual Image (Kanan) - Disembunyikan di Mobile */}
      <div 
        className="hidden lg:block lg:w-1/2 relative bg-neutral-900 overflow-hidden"
        style={{ animation: 'fadeIn 0.8s ease-out' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-neutral-900/20 to-transparent z-10 pointer-events-none"></div>
        <img 
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop" 
          alt="Food visual" 
          className="absolute inset-0 w-full h-full object-cover opacity-90 scale-105"
        />
        <div className="absolute bottom-0 left-0 p-12 z-20 w-full">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl max-w-lg shadow-2xl">
            <h3 className="text-white text-2xl font-bold mb-3 leading-snug">
              "Menyelamatkan porsi terakhir sama dengan merawat kelestarian bumi."
            </h3>
            <p className="text-neutral-300 font-medium text-sm">
              Bergabunglah dengan komunitas LASTBITE untuk mengelola makanan Anda dengan lebih bijak dan estetis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}