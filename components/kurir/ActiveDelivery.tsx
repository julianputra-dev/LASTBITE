"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { MapPin, Navigation, Receipt, CheckCircle2 } from "lucide-react";

export default function ActiveDelivery({ userId, setActiveTab }: { userId: string, setActiveTab: (tab: 'earnings') => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const generateNumericCode = (uuid: string) => {
    if (!uuid) return "000000";
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash).toString().padStart(6, '0').substring(0, 6);
  };

  const fetchActiveOrders = async () => {
    setLoading(true);
    const { data: ordersData, error: ordersError } = await supabase
      .from("pesanan")
      .select(`
        id, created_at, status, 
        produk_id, 
        pembeli_id,
        alamat_pengiriman,
        link_gmaps,
        produk(nama_makanan, harga_diskon, penjual_id)
      `)
      .eq("kurir_id", userId)
      .in("status", ["preparing", "ready", "delivering"]);

    if (ordersError) {
      console.error("Supabase Error detail:", JSON.stringify(ordersError));
      alert(`Gagal mengambil pesanan aktif. Error: ${ordersError.message || 'Unknown'}`);
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
    fetchActiveOrders();
  }, []);

  const handleCompleteOrder = async (orderId: string) => {
    if (!confirm("Konfirmasi bahwa pesanan ini telah diterima oleh pembeli?")) return;

    try {
      setProcessingId(orderId);
      const { error } = await supabase
        .from("pesanan")
        .update({ status: "completed" })
        .eq("id", orderId)
        .eq("kurir_id", userId);

      if (error) throw error;
      
      alert("Pesanan selesai! Pendapatan telah ditambahkan ke saldo Anda.");
      setActiveTab('earnings');
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-neutral-900 mb-4">Tugas Pengantaran</h2>
      {orders.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 text-center">
          <p className="text-neutral-500 font-bold mb-2">Anda belum mengambil pesanan.</p>
          <p className="text-sm text-neutral-400">Silakan cek menu Tersedia untuk mulai mengantar.</p>
        </div>
      ) : (
        orders.map(order => {
          const namaProduk = order.produk?.nama_makanan || "Produk Makanan";
          const namaPenjual = order.produk?.penjual?.nama || "Penjual";
          const pickupAlamat = order.produk?.penjual?.lokasi || order.produk?.penjual?.alamat || "Lokasi penjual belum diatur";
          const sellerGmaps = order.produk?.penjual?.lokasi_gmaps;
          const pembeliNama = order.pembeli?.nama || "Pembeli";
          const antarAlamat = order.alamat_pengiriman || order.pembeli?.alamat || "Alamat pembeli belum diatur";
          const buyerGmaps = order.link_gmaps;
          const orderCode = generateNumericCode(order.id);

          return (
            <div key={order.id} className="bg-white p-0 rounded-2xl shadow-md border border-neutral-200 overflow-hidden flex flex-col group">
              <div className="bg-orange-600 p-4 text-white flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10 translate-x-4 -translate-y-4">
                  <Receipt size={100} />
                </div>
                <div className="relative z-10">
                  {order.status === 'delivering' && <span className="text-[10px] font-black bg-white/20 text-white px-2.5 py-1 rounded-md mb-2 inline-block uppercase tracking-wider shadow-sm">SEDANG DIANTAR</span>}
                  {order.status === 'ready' && <span className="text-[10px] font-black bg-emerald-400 text-white px-2.5 py-1 rounded-md mb-2 inline-block uppercase tracking-wider shadow-sm">MAKANAN SIAP JEMPUT</span>}
                  {order.status === 'preparing' && <span className="text-[10px] font-black bg-blue-500 text-white px-2.5 py-1 rounded-md mb-2 inline-block uppercase tracking-wider shadow-sm">MAKANAN SEDANG DIMASAK</span>}
                  <h3 className="font-extrabold text-2xl line-clamp-1 mt-1">{namaProduk}</h3>
                  <p className="text-orange-100 font-bold mt-1 opacity-90 text-sm flex items-center gap-1.5"><Receipt size={14} /> KODE: {orderCode}</p>
                </div>
                <div className="relative z-10 text-right">
                  <span className="text-white font-black bg-black/20 px-3 py-1.5 rounded-xl shadow-inner text-sm block">Rp 10.000</span>
                </div>
              </div>
              
              <div className="p-5 space-y-6 relative">
                <div className="absolute left-8 top-10 bottom-8 w-0.5 bg-neutral-200 border-l-2 border-dashed border-neutral-200 z-0"></div>
                
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-white border-4 border-neutral-300 shadow-sm shrink-0 flex items-center justify-center mt-1"></div>
                  <div className="flex-1">
                    <p className="font-bold text-neutral-900 text-sm uppercase tracking-wider mb-1">Titik Jemput</p>
                    <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 flex justify-between items-center gap-3">
                      <div>
                        <p className="font-bold text-neutral-900">{namaPenjual}</p>
                        <p className="text-xs text-neutral-600 leading-relaxed mt-1">{pickupAlamat}</p>
                      </div>
                      {sellerGmaps && (
                        <a href={sellerGmaps} target="_blank" rel="noopener noreferrer" className="shrink-0 w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center hover:bg-orange-200 transition-colors">
                          <MapPin size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-white border-4 border-orange-600 shadow-sm shrink-0 flex items-center justify-center mt-1"></div>
                  <div className="flex-1">
                    <p className="font-bold text-neutral-900 text-sm uppercase tracking-wider mb-1">Tujuan Antar</p>
                    <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3 flex justify-between items-center gap-3">
                      <div>
                        <p className="font-bold text-neutral-900">Pembeli: {pembeliNama}</p>
                        <p className="text-xs text-neutral-600 leading-relaxed mt-1">{antarAlamat}</p>
                      </div>
                      {buyerGmaps && (
                        <a href={buyerGmaps} target="_blank" rel="noopener noreferrer" className="shrink-0 w-10 h-10 bg-orange-600 text-white rounded-full flex items-center justify-center hover:bg-orange-700 transition-colors shadow-sm">
                          <Navigation size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-neutral-50 border-t border-neutral-100">
                {order.status === 'delivering' ? (
                  <button 
                    onClick={() => handleCompleteOrder(order.id)}
                    disabled={processingId === order.id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold transition-all shadow-sm active:scale-[0.98]"
                  >
                    {processingId === order.id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        SELESAIKAN PENGANTARAN
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-neutral-200 text-neutral-500 font-bold text-center py-4 rounded-xl shadow-inner text-sm px-4">
                    {order.status === 'preparing' 
                      ? "Menunggu penjual selesai memasak pesanan..." 
                      : "Menunggu penjual menyerahkan pesanan kepada Anda"}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
