"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";

export default function AvailableOrders({ userId, setActiveTab }: { userId: string, setActiveTab: (tab: 'active') => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchAvailableOrders = async () => {
    const { data: ordersData, error: ordersError } = await supabase
      .from("pesanan")
      .select(`
        id, created_at, status, 
        produk_id, 
        pembeli_id,
        alamat_pengiriman,
        produk(nama_makanan, harga_diskon, penjual_id)
      `)
      .eq("metode_pengambilan", "delivery")
      .in("status", ["preparing", "ready", "delivering"])
      .is("kurir_id", null)
      .order("created_at", { ascending: true });

    if (ordersError) {
      console.error("Supabase Error detail:", JSON.stringify(ordersError));
      alert(`Gagal mengambil pesanan. Pastikan tabel pesanan memiliki kolom kurir_id. Error: ${ordersError.message || 'Unknown'}`);
      setLoading(false);
      return;
    }

    if (ordersData && ordersData.length > 0) {
      const enhancedOrders = await Promise.all(ordersData.map(async (order: any) => {
        let pembeli = null;
        let penjual = null;
        
        if (order.pembeli_id) {
          const { data: pData, error: pErr } = await supabase.from('profiles').select('nama, nomor_hp').eq('id', order.pembeli_id).single();
          if (pErr) console.error("Error fetching pembeli:", pErr);
          pembeli = pData;
        }
        
        const penjualId = Array.isArray(order.produk) ? order.produk[0]?.penjual_id : order.produk?.penjual_id;
        if (penjualId) {
          const { data: sData, error: sErr } = await supabase.from('profiles').select('nama, nomor_hp, lokasi, lokasi_gmaps').eq('id', penjualId).single();
          if (sErr) console.error("Error fetching penjual:", sErr);
          penjual = sData;
        }

        return {
          ...order,
          pembeli,
          produk: {
            ...order.produk,
            penjual
          }
        };
      }));
      
      setOrders(enhancedOrders);
    } else {
      setOrders([]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchAvailableOrders();
    
    const channel = supabase
      .channel('public:pesanan')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, () => {
        fetchAvailableOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleTakeOrder = async (orderId: string) => {
    try {
      setProcessingId(orderId);
      
      const { data: activeOrder } = await supabase
        .from("pesanan")
        .select("id")
        .eq("kurir_id", userId)
        .eq("status", "delivering")
        .limit(1);
        
      if (activeOrder && activeOrder.length > 0) {
        alert("Anda hanya bisa mengambil satu pesanan dalam satu waktu! Selesaikan pesanan aktif Anda terlebih dahulu.");
        setProcessingId(null);
        return;
      }

      const { data, error } = await supabase
        .from("pesanan")
        .update({ kurir_id: userId })
        .eq("id", orderId)
        .is("kurir_id", null)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        alert("Maaf, pesanan ini baru saja diambil oleh kurir lain.");
        fetchAvailableOrders();
        return;
      }

      alert("Pesanan berhasil diambil!");
      setActiveTab('active');
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mb-4"></div>
        <p className="text-neutral-500 font-bold">Mencari pesanan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-neutral-900 mb-4">Pesanan Tersedia</h2>
      {orders.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4M8 16l-4-4 4-4" />
            </svg>
          </div>
          <p className="text-neutral-600 font-bold">Belum ada pesanan tersedia saat ini.</p>
          <p className="text-xs text-neutral-400 mt-1">Kami akan memberi tahu jika ada pesanan baru.</p>
        </div>
      ) : (
        orders.map(order => {
          const namaProduk = order.produk?.nama_makanan || "Produk Makanan";
          const namaPenjual = order.produk?.penjual?.nama || "Penjual";
          const pickupAlamat = order.produk?.penjual?.lokasi || order.produk?.penjual?.alamat || "Lokasi penjual belum diatur";
          const pembeliNama = order.pembeli?.nama || "Pembeli";
          const antarAlamat = order.alamat_pengiriman || order.pembeli?.alamat || "Alamat pembeli belum diatur";
          
          return (
            <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 flex flex-col gap-3 group hover:border-orange-500 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex flex-col items-start gap-1">
                  {order.status === 'preparing' && (
                    <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase tracking-wide">Sedang Dimasak</span>
                  )}
                  {order.status === 'ready' && (
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-wide">Siap Diambil</span>
                  )}
                  <span className="font-extrabold text-lg text-neutral-900 line-clamp-1">{namaProduk}</span>
                </div>
                <span className="text-orange-600 font-black whitespace-nowrap bg-orange-50 px-3 py-1 rounded-lg">Rp 10.000</span>
              </div>
              <div className="text-sm text-neutral-600 space-y-3 mt-2">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center font-black text-neutral-400 shrink-0">1</div>
                  <div>
                    <p className="font-bold text-neutral-900 text-xs uppercase tracking-wider mb-0.5">Titik Jemput ({namaPenjual})</p>
                    <p className="text-neutral-600 line-clamp-2">{pickupAlamat}</p>
                  </div>
                </div>
                <div className="h-4 border-l-2 border-dashed border-neutral-200 ml-4"></div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center font-black text-orange-600 shrink-0">2</div>
                  <div>
                    <p className="font-bold text-neutral-900 text-xs uppercase tracking-wider mb-0.5">Tujuan Antar</p>
                    <p className="text-neutral-600 line-clamp-2">{antarAlamat}</p>
                    <p className="text-xs text-neutral-500 mt-1">Penerima: <span className="font-bold">{pembeliNama}</span></p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleTakeOrder(order.id)}
                disabled={processingId === order.id}
                className="w-full mt-4 bg-neutral-900 hover:bg-black text-white font-black py-3.5 rounded-xl transition-colors shadow-lg shadow-neutral-900/20 disabled:opacity-50"
              >
                {processingId === order.id ? 'Memproses...' : 'Ambil Pesanan'}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
