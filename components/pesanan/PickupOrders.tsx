"use client";

import React, { useState } from "react";
import { MapPin, Clock, XCircle, Loader2, Info } from "lucide-react";
import { supabase } from "../../utils/supabase";
import Link from "next/link";

export default function PickupOrders({ orders, onRefresh }: { orders: any[], onRefresh?: () => void }) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-neutral-500 bg-white rounded-xl shadow-sm border border-neutral-200">
        <MapPin className="w-12 h-12 mb-3 text-neutral-300" />
        <p className="text-sm font-medium">Belum ada pesanan untuk diambil sendiri.</p>
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
        const total = (order.produk?.harga_diskon || 0) * order.qty;
        const orderCode = order.rawIds && order.rawIds.length > 0 ? generateNumericCode(order.rawIds[0]) : "000000";
        return (
          <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 flex flex-col gap-3">
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
              <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                Pickup
              </span>
            </div>
            
            <div className="flex gap-3 items-center">
              {order.produk?.gambar_url ? (
                <img src={order.produk.gambar_url} alt="Produk" className="w-16 h-16 object-cover rounded-lg bg-neutral-100" />
              ) : (
                <div className="w-16 h-16 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400">IMG</div>
              )}
              
              <div className="flex-1">
                <h3 className="text-sm font-bold text-neutral-900 line-clamp-1">
                  {order.produk?.nama_makanan || "Produk Tidak Diketahui"}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {order.qty} porsi x {formatCurrency(order.produk?.harga_diskon || 0)}
                </p>
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
              <span className="text-xs font-medium text-neutral-500">Total Belanja</span>
              <span className="text-sm font-black text-orange-600">{formatCurrency(total)}</span>
            </div>
            
            {/* ACTION BUTTONS (Only if pending) */}
            {(!order.status || order.status === 'pending') && (
              <div className="flex justify-end pt-2">
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
            
            {/* ACTION BUTTONS (Confirmed/Preparing/Ready) */}
            {(order.status === 'preparing' || order.status === 'ready' || order.status === 'paid') && (
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-neutral-100">
                <div className="text-xs font-bold text-emerald-600">
                  {order.status === 'ready' ? 'Pesanan Siap Diambil!' : 'Sedang Disiapkan'}
                </div>
                <Link
                  href={`/pembeli/pesanan/${order.rawIds[0]}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Info size={14} />
                  Informasi
                </Link>
              </div>
            )}
            
            {order.status === 'completed' && (
              <div className="mt-2 bg-neutral-50 text-neutral-600 text-xs font-bold px-3 py-2 rounded-lg text-center border border-neutral-200">
                Pesanan Selesai
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
