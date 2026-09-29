"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../utils/supabase";
import { ArrowLeft, MapPin, Store, Receipt, Clock, PackageCheck, CheckCircle, Truck } from "lucide-react";

export default function OrderInfoPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  // Generate code function
  const generateNumericCode = (uuid: string) => {
    if (!uuid) return "000000";
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash).toString().padStart(6, '0').substring(0, 6);
  };

  useEffect(() => {
    const fetchDetails = async () => {
      // 1. Fetch single order row
      const { data: orderData, error } = await supabase
        .from("pesanan")
        .select(`
          id, created_at, status, metode_pengambilan, produk_id, pembeli_id,
          produk (
            nama_makanan,
            harga_diskon,
            gambar_url,
            penjual_id
          )
        `)
        .eq("id", orderId)
        .single();
        
      if (orderData) {
        setOrder(orderData);
        
        // 2. Count qty
        const timeStart = new Date(new Date(orderData.created_at).getTime() - 60000).toISOString();
        const timeEnd = new Date(new Date(orderData.created_at).getTime() + 60000).toISOString();
        
        const { data: siblingOrders } = await supabase
          .from("pesanan")
          .select("id, created_at")
          .eq("produk_id", orderData.produk_id)
          .eq("pembeli_id", orderData.pembeli_id)
          .gte("created_at", timeStart)
          .lte("created_at", timeEnd);
          
        if (siblingOrders) {
          const targetTimeKey = new Date(orderData.created_at).toISOString().slice(0, 16);
          const matched = siblingOrders.filter(o => new Date(o.created_at).toISOString().slice(0, 16) === targetTimeKey);
          setQty(matched.length || 1);
        }

        // 3. Fetch Seller info
        const { data: sellerData, error: sellerError } = await supabase
          .from("profiles")
          .select("nama, lokasi_gmaps, lokasi")
          .eq("id", orderData.produk.penjual_id)
          .single();
          
        if (sellerData) {
          setSeller(sellerData);
        } else if (sellerError) {
          console.error("Gagal menarik data penjual:", sellerError);
        }
      }
      setLoading(false);
    };
    
    if (orderId) fetchDetails();
  }, [orderId]);

  if (loading) {
    return <div className="min-h-screen bg-neutral-50 flex justify-center items-center">Memuat informasi...</div>;
  }
  if (!order) {
    return <div className="min-h-screen bg-neutral-50 flex justify-center items-center">Pesanan tidak ditemukan.</div>;
  }

  const orderCode = generateNumericCode(order.id);
  const total = (order.produk?.harga_diskon || 0) * qty;
  const status = order.status || 'pending';

  // Alur Status Logic
  const isDelivery = order.metode_pengambilan === 'delivery';
  const steps = isDelivery ? [
    { key: 'pending', title: 'Menunggu Persetujuan' },
    { key: 'preparing', title: 'Dimasak' },
    { key: 'ready', title: 'Menunggu Kurir' },
    { key: 'delivering', title: 'Sedang Dikirim' },
    { key: 'completed', title: 'Selesai' }
  ] : [
    { key: 'pending', title: 'Menunggu Persetujuan' },
    { key: 'preparing', title: 'Dimasak' },
    { key: 'ready', title: 'Sudah Siap' },
    { key: 'completed', title: 'Selesai' }
  ];
  
  let currentStepIndex = steps.findIndex(s => s.key === status);
  if (isDelivery && currentStepIndex === 4) {
    currentStepIndex = 3; // Cap progress at 'Sedang Dikirim' for delivery until courier feature is ready
  }
  
  return (
    <div className="min-h-screen bg-neutral-50 pb-20 pt-6">
      <main className="max-w-xl mx-auto p-4 flex flex-col gap-4">
        {/* Card Makanan & Kode */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100">
          <div className="flex gap-4">
            <img src={order.produk?.gambar_url || ""} className="w-20 h-20 object-cover rounded-xl bg-neutral-100" />
            <div className="flex-1">
              <h2 className="font-bold text-lg text-neutral-900">{order.produk?.nama_makanan}</h2>
              <p className="text-sm text-neutral-500">{qty} porsi x Rp {(order.produk?.harga_diskon || 0).toLocaleString('id-ID')}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 font-bold rounded-lg text-sm border border-orange-100">
                <Receipt size={16} /> Kode: {orderCode}
              </div>
            </div>
          </div>
        </div>

        {/* Stepper Status */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
          <h3 className="font-bold text-neutral-900 mb-6">Status Pesanan</h3>
          {status === 'cancelled' ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center">Pesanan Dibatalkan</div>
          ) : (
            <div className="relative">
              <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-neutral-200" />
              <div className="flex flex-col gap-6">
                {steps.map((step, idx) => {
                  const isCompleted = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;
                  return (
                    <div key={idx} className="flex gap-4 relative z-10">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] transition-colors ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-neutral-300 text-neutral-300'}`}>
                        {idx === 0 && <Clock size={18} />}
                        {idx === 1 && <Store size={18} />}
                        {idx === 2 && <PackageCheck size={18} />}
                        {idx === 3 && (isDelivery ? <Truck size={18} /> : <CheckCircle size={18} />)}
                        {idx === 4 && <CheckCircle size={18} />}
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className={`font-bold text-sm ${isCompleted ? 'text-neutral-900' : 'text-neutral-400'}`}>
                          {step.title}
                        </span>
                        {isCurrent && <span className="text-xs text-orange-600 font-semibold mt-0.5">Sedang berlangsung...</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Lokasi Toko - Disembunyikan untuk Delivery */}
        {seller && !isDelivery && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex flex-col gap-3">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              <MapPin size={18} className="text-orange-500" /> Lokasi Pengambilan
            </h3>
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
              <p className="font-bold text-neutral-900">{seller.nama || "Toko Penjual"}</p>
              <p className="text-sm text-neutral-600 mt-1">{seller.lokasi || "Deskripsi manual lokasi belum ditambahkan oleh penjual."}</p>
            </div>
            {seller.lokasi_gmaps && (
              <a href={seller.lokasi_gmaps} target="_blank" rel="noreferrer" className="mt-1 flex items-center justify-center gap-2 bg-neutral-900 text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition">
                Buka di Google Maps
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
