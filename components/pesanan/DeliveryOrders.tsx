"use client";

import React, { useState } from "react";
import { Truck, Clock, XCircle, Loader2, Info, Phone, CheckCircle, User } from "lucide-react";
import { supabase } from "../../utils/supabase";
import Link from "next/link";

export default function DeliveryOrders({ orders, onRefresh }: { orders: any[], onRefresh?: () => void }) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-neutral-500 bg-white rounded-xl shadow-sm border border-neutral-200">
        <Truck className="w-12 h-12 mb-3 text-neutral-300" />
        <p className="text-sm font-medium">Belum ada pesanan via kurir.</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const generateNumericCode = (uuid: string) => {
    if (!uuid) return "000000";
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash).toString().padStart(6, '0').substring(0, 6);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleCancelOrder = async (rawIds: string[], productId: string, qty: number) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan pesanan ini?")) return;
    
    setProcessingId(rawIds[0]);
    try {
      const { error } = await supabase
        .from('pesanan')
        .delete()
        .in('id', rawIds);
        
      if (error) throw error;
      
      const { data: product } = await supabase.from('produk').select('stok').eq('id', productId).single();
      if (product) {
        await supabase.from('produk').update({ stok: (product.stok || 0) + qty }).eq('id', productId);
      }
      
      if (onRefresh) onRefresh();
    } catch {
      alert("Gagal membatalkan pesanan. Silakan coba lagi.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {orders.map((order, idx) => {
        const ongkir = 10000;
        const total = (order.produk?.harga_diskon || 0) * order.qty + ongkir;
        const orderCode = order.rawIds && order.rawIds.length > 0 ? generateNumericCode(order.rawIds[0]) : "000000";
        const hasCourier = !!order.kurir;

        return (
          <div key={idx} className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-neutral-200 flex flex-col gap-3.5">
            {/* Header Pesanan */}
            <div className="flex justify-between items-start border-b border-neutral-100 pb-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Clock size={14} />
                  <span>{formatDate(order.created_at)}</span>
                </div>
                <div className="text-sm font-bold text-neutral-800 tracking-widest mt-1">
                  Kode: <span className="bg-neutral-100 px-2 py-0.5 rounded text-neutral-900 border border-neutral-200">{orderCode}</span>
                </div>
              </div>
              <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-blue-100">
                Kurir
              </span>
            </div>
            
            {/* Rincian Produk Makanan */}
            <div className="flex gap-3 items-center">
              {order.produk?.gambar_url ? (
                <img src={order.produk.gambar_url} alt="Produk" className="w-16 h-16 object-cover rounded-xl bg-neutral-100 shrink-0" />
              ) : (
                <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400 shrink-0">IMG</div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-neutral-900 truncate">
                  {order.produk?.nama_makanan || "Produk Tidak Diketahui"}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {order.qty} porsi x {formatCurrency(order.produk?.harga_diskon || 0)}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">+ Ongkir {formatCurrency(ongkir)}</p>
              </div>
            </div>

            {/* INFORMASI KURIR (MUNCUL JIKA SUDAH DIAMBIL OLEH KURIR) */}
            {hasCourier && (
              <div className="bg-orange-50/70 border border-orange-200/80 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {order.kurir.foto ? (
                    <img 
                      src={order.kurir.foto} 
                      alt={order.kurir.nama} 
                      className="w-10 h-10 rounded-full object-cover border border-orange-200 bg-white shrink-0" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-orange-200 text-orange-800 font-bold flex items-center justify-center text-xs shrink-0 uppercase">
                      {order.kurir.nama ? order.kurir.nama.substring(0, 2) : "KR"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded uppercase tracking-wider inline-block">
                      Kurir Pengantar
                    </span>
                    <p className="text-xs font-bold text-neutral-900 truncate mt-0.5">
                      {order.kurir.nama}
                    </p>
                    {order.kurir.nomor_hp && (
                      <p className="text-[11px] text-neutral-600 truncate">
                        {order.kurir.nomor_hp}
                      </p>
                    )}
                  </div>
                </div>

                {order.kurir.nomor_hp && (
                  <a 
                    href={`https://wa.me/${order.kurir.nomor_hp.replace(/^0/, '62').replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                  >
                    <Phone size={12} />
                    <span>Hubungi</span>
                  </a>
                )}
              </div>
            )}
            
            {/* Total Belanja */}
            <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
              <span className="text-xs font-medium text-neutral-500">Total Belanja</span>
              <span className="text-sm font-black text-orange-600">{formatCurrency(total)}</span>
            </div>
            
            {/* ACTION BUTTONS (Jika masih pending & belum diambil) */}
            {(!order.status || order.status === 'pending') && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => handleCancelOrder(order.rawIds, order.produk_id, order.qty)}
                  disabled={processingId === order.rawIds[0]}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {processingId === order.rawIds[0] ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <XCircle size={14} />
                  )}
                  Batalkan Pesanan
                </button>
              </div>
            )}
            
            {/* STATUS & DETAIL BUTTON */}
            {(order.status === 'preparing' || order.status === 'ready' || order.status === 'delivering' || order.status === 'paid' || order.status === 'completed') && (
              <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                <div className="text-xs font-bold">
                  {order.status === 'completed' ? (
                    <span className="text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle size={14} /> Pesanan Selesai
                    </span>
                  ) : order.status === 'delivering' ? (
                    <span className="text-blue-600 flex items-center gap-1.5">
                      <Truck size={14} /> Sedang Diantar Kurir
                    </span>
                  ) : hasCourier ? (
                    <span className="text-amber-600 flex items-center gap-1.5">
                      <Clock size={14} /> Kurir Menuju Penjual
                    </span>
                  ) : order.status === 'ready' ? (
                    <span className="text-neutral-500 flex items-center gap-1.5">
                      <Clock size={14} /> Menunggu Kurir
                    </span>
                  ) : (
                    <span className="text-neutral-500 flex items-center gap-1.5">
                      <Clock size={14} /> Sedang Disiapkan
                    </span>
                  )}
                </div>
                <Link
                  href={`/pembeli/pesanan/${order.rawIds[0]}`}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  <Info size={14} />
                  Informasi
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}