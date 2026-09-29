"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { Users, Truck, Wallet, Newspaper, LifeBuoy, LogOut, ShieldAlert } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .single();
        
      const { data: profile } = await supabase
        .from("profiles")
        .select("peran")
        .eq("id", user.id)
        .single();
        
      if (adminUser || (profile && profile.peran === "admin")) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center p-8 bg-white shadow-sm rounded-2xl max-w-md w-full border border-neutral-100">
          <ShieldAlert className="mx-auto h-16 w-16 text-orange-600 mb-4" />
          <h1 className="text-2xl font-black text-neutral-900 mb-2">Akses Ditolak</h1>
          <p className="text-neutral-600 mb-6 font-medium">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
          <button onClick={() => router.push("/")} className="bg-orange-600 text-white px-4 py-3 rounded-xl font-bold w-full hover:bg-orange-700 transition-colors">
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { name: "Dashboard", icon: ShieldAlert, path: "/admin" },
    { name: "Manajemen Pengguna", icon: Users, path: "/admin/users" },
    { name: "Verifikasi Kurir", icon: Truck, path: "/admin/couriers" },
    { name: "Pengaturan Biaya", icon: Wallet, path: "/admin/settings" },
    { name: "Berita", icon: Newspaper, path: "/admin/news" },
    { name: "Helpdesk", icon: LifeBuoy, path: "/admin/helpdesk" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-neutral-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-2xl font-black text-orange-600 tracking-tighter">LASTBITE</h2>
          <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">Admin Command Center</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <li key={item.path}>
                  <Link href={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive ? "bg-orange-50 text-orange-700" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"}`}>
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-neutral-200 px-8 py-3.5 flex justify-end items-center shadow-sm shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-2 bg-neutral-100 text-neutral-600 px-5 py-2 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 transition-colors group">
            <LogOut size={16} className="group-hover:text-red-600 transition-colors" />
            <span>Logout</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
