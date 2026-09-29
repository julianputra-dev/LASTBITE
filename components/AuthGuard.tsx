"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banUntil, setBanUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBanStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setLoading(false);
        return;
      }
      
      const { data: bans } = await supabase
        .from('bans')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (bans && bans.length > 0) {
        const activeBan = bans.find(b => !b.banned_until || new Date(b.banned_until) > new Date());
        if (activeBan) {
          setIsBanned(true);
          setBanReason(activeBan.reason);
          setBanUntil(activeBan.banned_until);
        } else {
          setIsBanned(false);
        }
      } else {
        setIsBanned(false);
      }
      
      setLoading(false);
    };

    checkBanStatus();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkBanStatus();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsBanned(false);
    router.push("/login");
  };

  if (loading) {
    // Optional: add a subtle loading state or just render children normally 
    // to prevent flickering on every page load, we'll just render nothing while checking initially.
    // However, to ensure fast paints, we might just render children if we want to risk a 100ms flash.
    // Let's render children and let the effect catch up, or return null to avoid flash.
    // Returning null causes blank screen on reload for a fraction of a second.
    // We'll return null to strictly prevent access.
    return null; 
  }

  if (isBanned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-neutral-100">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-neutral-900 mb-2">Akun Diblokir</h1>
          <p className="text-neutral-600 font-medium mb-6">
            Akses Anda ke platform telah dibatasi karena pelanggaran aturan.
          </p>
          <div className="bg-neutral-50 rounded-2xl p-4 text-left mb-8 border border-neutral-200">
            <p className="text-xs font-black text-neutral-400 uppercase mb-1">Alasan Pelanggaran</p>
            <p className="text-neutral-900 font-bold mb-4">{banReason}</p>
            
            <p className="text-xs font-black text-neutral-400 uppercase mb-1">Status Blokir</p>
            <p className="text-red-600 font-black text-lg">
              {banUntil ? `Hingga ${new Date(banUntil).toLocaleDateString()}` : "Permanen"}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full bg-neutral-900 text-white font-black py-4 rounded-xl hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-900/20"
          >
            Keluar (Logout)
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
