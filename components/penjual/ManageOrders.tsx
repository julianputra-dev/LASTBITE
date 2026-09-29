"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { Loader2, CheckCircle, XCircle, Clock, PackageCheck, PlayCircle, Truck } from "lucide-react";

interface Order {
  id: string;
  rawIds: string[];
  qty: number;
  items: string;
  buyerName: string;
  type: string;
  time: string;
  status: string;
  price: number;
  proofOfPayment: string | null;
}

const generateNumericCode = (uuid: string) => {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash).toString().padStart(6, '0').substring(0, 6);
};

export default function ManageOrders({ merchantId }: { merchantId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  useEffect(() => {
    if (merchantId) fetchOrders();
  }, [merchantId]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pesanan')
        .select(`
          id, 
          metode_pengambilan, 
          status, 
          created_at,
          bukti_bayar_url,
          produk!inner (
            nama_makanan,
            harga_diskon,
            penjual_id
          )
        `)
        .eq('produk.penjual_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const groupedMap: Record<string, any> = {};
        
        data.forEach(order => {
          const productInfo = order.produk as any;
          const timeKey = new Date(order.created_at).toISOString().slice(0, 16);
          const key = `${productInfo?.nama_makanan}-${timeKey}-${order.metode_pengambilan}`;
          
          if (!groupedMap[key]) {
            groupedMap[key] = {
              id: generateNumericCode(order.id), 
              rawIds: [order.id],
              qty: 1,
              buyerName: 'Pelanggan',
              items: productInfo ? productInfo.nama_makanan : 'Produk Tidak Dikenal',
              type: order.metode_pengambilan === 'pickup' ? 'PICKUP' : 'DELIVERY',
              time: new Date(order.created_at).toLocaleString('id-ID', { 
                hour: '2-digit', minute: '2-digit' 
              }),
              status: order.status || 'pending',
              price: productInfo ? productInfo.harga_diskon : 0,
              proofOfPayment: order.bukti_bayar_url || null
            };
          } else {
            groupedMap[key].qty += 1;
            groupedMap[key].rawIds.push(order.id);
          }
        });
        
        setOrders(Object.values(groupedMap));
      }
    } catch (error) {
      console.error("Gagal menarik daftar pesanan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (rawIds: string[], newStatus: string) => {
    setOrders(prev => prev.map(order => 
      order.rawIds === rawIds ? { ...order, status: newStatus } : order
    ));

    try {
      const { error } = await supabase
        .from('pesanan')
        .update({ status: newStatus })
        .in('id', rawIds);

      if (error) throw error;
    } catch (error) {
      console.error("Gagal memperbarui status pesanan", error);
      alert("Terjadi kesalahan saat menyimpan ke database.");
      fetchOrders();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const filteredOrders = orders.filter(o => {
    if (filter === "active") return ['pending', 'preparing', 'ready', 'paid', 'delivering'].includes(o.status);
    if (filter === "completed") return o.status === 'completed';
    if (filter === "cancelled") return o.status === 'cancelled';
    return true;
  });

  const getStatusBadge = (status: string, o?: Order) => {
    switch(status) {
      case 'pending':
      case 'paid':
        return <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-md text-xs font-bold border border-yellow-200"><Clock size={12} /> Menunggu</span>;
      case 'preparing':
        return <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold border border-blue-200"><PlayCircle size={12} /> Dimasak</span>;
      case 'ready':
        return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-200"><PackageCheck size={12} /> {o?.type === 'DELIVERY' ? 'Tunggu Kurir' : 'Siap Ambil'}</span>;
      case 'delivering':
        return <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold border border-blue-200"><Truck size={12} /> Dikirim</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-md text-xs font-bold border border-neutral-200"><CheckCircle size={12} /> Selesai</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-xs font-bold border border-red-200"><XCircle size={12} /> Batal</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-md text-xs font-bold border border-neutral-200">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Data Pesanan Masuk</h1>
          <p className="text-sm text-neutral-500 mt-1">Pantau, terima, dan selesaikan pesanan pelanggan Anda.</p>
        </div>
        
        {/* FILTER BUTTONS */}
        <div className="flex bg-neutral-100 p-1 rounded-xl">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${filter === 'all' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Semua
          </button>
          <button 
            onClick={() => setFilter('active')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${filter === 'active' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Aktif
          </button>
          <button 
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${filter === 'completed' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Selesai
          </button>
          <button 
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${filter === 'cancelled' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Batal
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-neutral-400">
            <Loader2 size={40} className="animate-spin text-orange-500 mb-4" />
            <p className="font-semibold text-neutral-600">Memuat data pesanan...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-neutral-50/50 text-xs uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
                  <th className="px-6 py-4 font-bold">Waktu Masuk</th>
                  <th className="px-6 py-4 font-bold">No. Ref</th>
                  <th className="px-6 py-4 font-bold">Item & Tipe</th>
                  <th className="px-6 py-4 font-bold text-right">Nilai (Rp)</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                      Tidak ada data pesanan pada filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-neutral-500 whitespace-nowrap">
                        {order.time}
                      </td>
                      <td className="px-6 py-4 font-bold text-neutral-900">
                        <div className="bg-neutral-100 text-neutral-800 text-center px-2 py-1 rounded-md text-sm border border-neutral-200 tracking-widest">
                          {order.id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-neutral-900 text-base">{order.items} <span className="text-sm font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded ml-1">x{order.qty}</span></div>
                        <div className="text-sm text-neutral-500 mb-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span>
                          Pembeli: <span className="font-semibold text-neutral-700">{order.buyerName}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase ${order.type === 'PICKUP' ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>
                            {order.type}
                          </span>
                          {order.proofOfPayment && (
                            <button onClick={() => setSelectedProof(order.proofOfPayment!)} className="inline-flex items-center text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold hover:bg-blue-100 transition-colors border border-blue-100">
                              Lihat Bukti Bayar
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-neutral-900">
                        {formatCurrency(order.price * order.qty)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(order.status, order)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                          {(order.status === 'pending' || order.status === 'paid') && (
                            <>
                              <button 
                                onClick={() => updateOrderStatus(order.rawIds, 'preparing')}
                                className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors shadow-sm"
                              >
                                Terima
                              </button>
                              <button 
                                onClick={() => updateOrderStatus(order.rawIds, 'cancelled')}
                                className="w-full sm:w-auto px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors"
                              >
                                Tolak
                              </button>
                            </>
                          )}
                          
                          {order.status === 'preparing' && (
                            <button 
                              onClick={() => updateOrderStatus(order.rawIds, 'ready')}
                              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              Tandai Siap
                            </button>
                          )}

                          {order.status === 'ready' && (
                            <button 
                              onClick={() => updateOrderStatus(order.rawIds, order.type === 'DELIVERY' ? 'delivering' : 'completed')}
                              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                              Serahkan
                            </button>
                          )}

                          {order.status === 'delivering' && (
                            <span className="text-sm font-bold text-neutral-500 italic">Diserahkan ke Kurir</span>
                          )}

                          {(order.status === 'completed' || order.status === 'cancelled') && (
                            <span className="text-sm text-neutral-400 italic">Selesai</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Image Modal for Proof of Payment */}
      {selectedProof && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedProof(null)}>
          <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedProof(null)}
              className="absolute -top-12 right-0 text-white hover:text-red-400 bg-neutral-800 hover:bg-neutral-900 rounded-full p-2 transition-all"
            >
              <XCircle size={24} />
            </button>
            <img 
              src={selectedProof} 
              alt="Bukti Pembayaran" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border-2 border-neutral-700" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
