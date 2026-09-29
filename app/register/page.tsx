"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [peran, setPeran] = useState("pembeli");
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Pendaftaran kredensial ke sistem Supabase Auth
    const cleanEmail = email.trim();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Sinkronisasi UID Auth dengan tabel profil
    if (authData.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: authData.user.id,
            nama: nama,
            email: cleanEmail,
            peran: peran,
          },
        ]);

      if (profileError) {
        setError("Registrasi berhasil, namun gagal membuat profil: " + profileError.message);
        setLoading(false);
        return;
      }

      router.push("/login");
    }
  };

  return (
    <div className="h-[calc(100vh-68px)] flex w-full bg-white font-sans overflow-hidden">
      {/* Visual Image (Kiri) - Disembunyikan di Mobile */}
      <div 
        className="hidden lg:block lg:w-1/2 relative bg-neutral-900 overflow-hidden"
        style={{ animation: 'fadeIn 0.8s ease-out' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-neutral-900/20 to-transparent z-10 pointer-events-none"></div>
        <img 
          src="https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=2070&auto=format&fit=crop" 
          alt="Community sharing food" 
          className="absolute inset-0 w-full h-full object-cover opacity-90 scale-105"
        />
        <div className="absolute bottom-0 left-0 p-12 z-20 w-full">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl max-w-lg shadow-2xl">
            <h3 className="text-white text-2xl font-bold mb-3 leading-snug">
              "Langkah kecil Anda hari ini adalah makanan berarti bagi orang lain."
            </h3>
            <p className="text-neutral-300 font-medium text-sm">
              Bergabunglah sebagai pahlawan makanan, kurir, atau penjual, dan buat perubahan nyata di komunitas Anda.
            </p>
          </div>
        </div>
      </div>

      {/* Form Otorisasi (Kanan) */}
      <div 
        className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative z-10 transition-all duration-500 ease-out translate-x-0 opacity-100"
        style={{ animation: 'slideInRight 0.5s ease-out' }}
      >
        <div className="max-w-md w-full space-y-6">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight mb-2">Buat Akun</h2>
            <p className="text-neutral-500 font-medium text-sm lg:text-base leading-relaxed">
              Bergabung bersama LASTBITE dan mulai perjalanan dampak sosial Anda hari ini.
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
          
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-neutral-700">Nama Lengkap</label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all duration-200 outline-none text-neutral-900 placeholder:text-neutral-400"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-neutral-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all duration-200 outline-none text-neutral-900 placeholder:text-neutral-400"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-neutral-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all duration-200 outline-none text-neutral-900 placeholder:text-neutral-400"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-neutral-700">Daftar Sebagai</label>
                <select
                  value={peran}
                  onChange={(e) => setPeran(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all duration-200 outline-none text-neutral-900 font-medium"
                >
                  <option value="pembeli">Pembeli</option>
                  <option value="penjual">Penjual</option>
                  <option value="kurir">Kurir</option>
                </select>
              </div>
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl shadow-[0_8px_20px_rgba(234,88,12,0.2)] hover:shadow-[0_10px_25px_rgba(234,88,12,0.3)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Mendaftarkan...</span>
                  </>
                ) : (
                  "Bergabung Sekarang"
                )}
              </button>
            </div>
          </form>

          <div className="pt-4 text-center text-sm text-neutral-500">
            Sudah punya akun? <Link href="/login" className="font-bold text-neutral-900 hover:text-orange-600 transition-colors">Masuk di sini</Link>
          </div>
        </div>
      </div>
    </div>
  );
}