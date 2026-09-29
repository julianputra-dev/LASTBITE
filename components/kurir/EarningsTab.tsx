"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";

export default function EarningsTab({ userId }: { userId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("pesanan")
        .select(`
          id, created_at, status, 
          produk(nama_makanan)
        `)
        .eq("kurir_id", userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTotalEarnings(data.length * 10000);
      }
      setLoading(false);
    };

    fetchEarnings();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-neutral-900 mb-4">Ringkasan Pendapatan</h2>
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <p className="text-orange-50 font-bold uppercase tracking-wider text-xs mb-1">Total Saldo Pendapatan</p>
          <h3 className="text-4xl font-black tracking-tight">{formatCurrency(totalEarnings)}</h3>
          <p className="text-xs text-orange-100 mt-5 font-medium leading-relaxed">
            Pencairan otomatis diproses setiap hari Senin ke rekening yang terdaftar di profil Anda.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5">
        <h4 className="font-extrabold text-neutral-900 mb-4 text-sm uppercase tracking-wide">Riwayat Pengantaran Selesai</h4>
        {history.length === 0 ? (
          <p className="text-neutral-400 text-sm font-medium py-4 text-center">Belum ada riwayat pendapatan.</p>
        ) : (
          <div className="space-y-3">
            {history.map((tx) => {
              const orderId = tx.id.split('-')[0].toUpperCase();
              const namaMakanan = Array.isArray(tx.produk) ? tx.produk[0]?.nama_makanan : tx.produk?.nama_makanan || "Produk";
              return (
                <div key={tx.id} className="flex justify-between items-center py-3 border-b border-neutral-100 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="font-bold text-neutral-800 text-sm">Ongkir #{orderId}</p>
                    <p className="text-xs text-neutral-500 font-medium line-clamp-1 mt-0.5">{namaMakanan}</p>
                    <p className="text-[10px] text-neutral-400 font-bold mt-1">{formatDate(tx.created_at)}</p>
                  </div>
                  <div className="bg-green-50 px-3 py-1.5 rounded-lg shrink-0">
                    <span className="font-black text-green-600 text-sm">+Rp 10.000</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
