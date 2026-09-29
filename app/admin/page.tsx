"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { Users, Truck, LifeBuoy, Activity } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    couriers: 0,
    tickets: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [usersRes, couriersRes, ticketsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('couriers').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from('help_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open')
      ]);

      setStats({
        users: usersRes.count || 0,
        couriers: couriersRes.count || 0,
        tickets: ticketsRes.count || 0
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-neutral-900">Dashboard</h1>
        <p className="text-neutral-600 mt-1 font-medium">Pusat kontrol LastBite</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Total Pengguna</h3>
            <p className="text-4xl font-black text-orange-600 mt-2">{loading ? "--" : stats.users}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl">
            <Users className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Kurir Menunggu</h3>
            <p className="text-4xl font-black text-orange-600 mt-2">{loading ? "--" : stats.couriers}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl">
            <Truck className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Tiket Terbuka</h3>
            <p className="text-4xl font-black text-orange-600 mt-2">{loading ? "--" : stats.tickets}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl">
            <LifeBuoy className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-100">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-6 h-6 text-orange-600" />
          <h2 className="text-xl font-bold text-neutral-900">Aktivitas Cepat</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/users" className="p-4 border border-neutral-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group">
            <h4 className="font-bold text-neutral-900 group-hover:text-orange-700">Kelola Pengguna</h4>
            <p className="text-sm text-neutral-600 mt-1">Cari dan tindak akun pelanggar.</p>
          </Link>
          <Link href="/admin/news" className="p-4 border border-neutral-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group">
            <h4 className="font-bold text-neutral-900 group-hover:text-orange-700">Terbitkan Berita</h4>
            <p className="text-sm text-neutral-600 mt-1">Berikan info terbaru ke pengguna.</p>
          </Link>
          <Link href="/admin/settings" className="p-4 border border-neutral-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group">
            <h4 className="font-bold text-neutral-900 group-hover:text-orange-700">Ubah Biaya</h4>
            <p className="text-sm text-neutral-600 mt-1">Sesuaikan biaya admin & kurir.</p>
          </Link>
          <Link href="/admin/helpdesk" className="p-4 border border-neutral-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group">
            <h4 className="font-bold text-neutral-900 group-hover:text-orange-700">Balas Keluhan</h4>
            <p className="text-sm text-neutral-600 mt-1">Tanggapi tiket bantuan terbuka.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
