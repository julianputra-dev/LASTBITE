"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { 
  Users, 
  Truck, 
  Wallet, 
  Newspaper, 
  LifeBuoy, 
  LogOut, 
  ShieldAlert, 
  CreditCard, 
  ShieldCheck, 
  LayoutDashboard,
  Menu,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Muat preferensi sidebar dari localStorage jika ada
    const saved = localStorage.getItem("admin_sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("admin_sidebar_collapsed", String(next));
      return next;
    });
  };

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
    { name: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { name: "Verifikasi Transaksi", icon: ShieldCheck, path: "/admin/transactions" },
    { name: "Pencairan Dana", icon: CreditCard, path: "/admin/withdrawals" },
    { name: "Manajemen Pengguna", icon: Users, path: "/admin/users" },
    { name: "Verifikasi Kurir", icon: Truck, path: "/admin/couriers" },
    { name: "Pengaturan Biaya", icon: Wallet, path: "/admin/settings" },
    { name: "Berita", icon: Newspaper, path: "/admin/news" },
    { name: "Helpdesk", icon: LifeBuoy, path: "/admin/helpdesk" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex overflow-hidden">
      {/* SIDEBAR (Bisa Dibuka / Ditutup) */}
      <aside 
        className={`${
          isCollapsed ? "w-20" : "w-64"
        } bg-white border-r border-neutral-200 flex flex-col shadow-xs transition-all duration-300 shrink-0 select-none z-20`}
      >
        {/* Header Sidebar & Toggle Button */}
        <div className={`p-4 border-b border-neutral-100 flex items-center ${isCollapsed ? "justify-center flex-col gap-2" : "justify-between"} min-h-[72px]`}>
          {!isCollapsed ? (
            <div>
              <h2 className="text-xl font-black text-orange-600 tracking-tight">LASTBITE</h2>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Admin Command Center</p>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
              LB
            </div>
          )}

          <button
            onClick={toggleSidebar}
            title={isCollapsed ? "Buka Menu Sidebar" : "Tutup Menu Sidebar"}
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Daftar Navigasi Menu */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    title={isCollapsed ? item.name : undefined}
                    className={`flex items-center ${
                      isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
                    } rounded-xl font-bold text-sm transition-all relative group ${
                      isActive 
                        ? "bg-orange-50 text-orange-700 shadow-2xs border border-orange-100" 
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                    }`}
                  >
                    {/* LOGO DARI SETIAP MENU (Tetap tampil saat ditutup) */}
                    <item.icon className="w-5 h-5 shrink-0" />
                    
                    {/* Label Teks Menu (Hanya tampil saat dibuka) */}
                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}

                    {/* Tooltip saat ditutup agar tetap informatif saat hover */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-2.5 py-1 bg-neutral-900 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity shadow-lg whitespace-nowrap z-50">
                        {item.name}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="bg-white border-b border-neutral-200 px-6 py-3.5 flex justify-between items-center shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              title={isCollapsed ? "Buka Menu Sidebar" : "Tutup Menu Sidebar"}
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <Menu size={18} />
            </button>
            <span className="text-xs font-bold text-neutral-500 hidden sm:inline-block">
              {menuItems.find(m => m.path === pathname)?.name || "Admin"}
            </span>
          </div>

          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 bg-neutral-100 text-neutral-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 transition-colors group cursor-pointer"
          >
            <LogOut size={16} className="group-hover:text-red-600 transition-colors" />
            <span>Logout</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}