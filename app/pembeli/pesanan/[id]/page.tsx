"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../utils/supabase";
import { ArrowLeft, MapPin, Store, Receipt, Clock, PackageCheck, CheckCircle, Truck, Phone } from "lucide-react";

export default function OrderInfoPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [courier, setCourier] = useState<any>(null);
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
          id, created_at, status, metode_pengambilan, produk_id, pembeli_id, alamat_pengiriman, link_gmaps, kurir_id,
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
        const productInfo = Array.isArray(orderData.produk) ? (orderData.produk[0] as any) : (orderData.produk as any);
        setOrder({ ...orderData, produk: productInfo });
        
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
        const sellerId = productInfo?.penjual_id;
        if (sellerId) {
          const { data: sellerData, error: sellerError } = await supabase
            .from("profiles")
            .select("nama, lokasi_gmaps, lokasi")
            .eq("id", sellerId)
            .single();
            
          if (sellerData) {
            setSeller(sellerData);
          } else if (sellerError) {
            console.error("Gagal menarik data penjual:", sellerError);
          }
        }

        // 4. Fetch Courier info jika kurir_id sudah ada (sudah diambil kurir)
        if (orderData.kurir_id) {
          const [profileRes, courierRes] = await Promise.all([
            supabase.from("profiles").select("id, nama, nomor_hp, foto_profil, avatar_url").eq("id", orderData.kurir_id).single(),
            supabase.from("couriers").select("user_id, full_name, phone_number, face_photo_url").eq("user_id", orderData.kurir_id).single()
          ]);
          
          const cProfile = profileRes.data;
          const cDoc = courierRes.data;
          
          if (cProfile || cDoc) {
            setCourier({
              nama: cDoc?.full_name || cProfile?.nama || "Kurir LastBite",
              nomor_hp: cDoc?.phone_number || cProfile?.nomor_hp || null,
              foto: cDoc?.face_photo_url || cProfile?.foto_profil || cProfile?.avatar_url || null
            });
          }
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
  
  const steps = [
    { title: "Pesanan Dibuat", desc: "Menunggu konfirmasi penjual" },
    { title: "Sedang Dimasak", desc: "Penjual menyiapkan makanan" },
    { title: "Makanan Siap", desc: isDelivery ? "Menunggu kurir mengambil" : "Silakan ambil di toko" },
    ...(isDelivery ? [{ title: "Sedang Diantar", desc: "Kurir mengantar pesanan Anda" }] : []),
    { title: "Selesai", desc: "Makanan telah diterima" }
  ];

  let currentStepIndex = 0;
  if (status === 'preparing') currentStepIndex = 1;
  else if (status === 'ready') currentStepIndex = 2;
  else if (status === 'delivering') currentStepIndex = 3;
  else if (status === 'completed') currentStepIndex = isDelivery ? 4 : 3;

  return (
    <div className="min-h-screen bg-neutral-50 pb-12 font-sans text-neutral-800">
      {/* Header Sticky */}
      <header className="sticky top-0 bg-white border-b border-neutral-200 z-10 px-4 py-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-neutral-100 rounded-full transition">
          <ArrowLeft size={20} className="text-neutral-700" />
        </button>
        <h1 className="text-lg font-bold text-neutral-900">Detail Pesanan</h1>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {/* Detail Produk & Info Singkat */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <img 
              src={order.produk?.gambar_url} 
              alt={order.produk?.nama_makanan} 
              className="w-20 h-20 rounded-xl object-cover border border-neutral-100 shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide ${isDelivery ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                {isDelivery ? 'PENGIRIMAN KURIR' : 'AMBIL SENDIRI (PICKUP)'}
              </span>
              <h2 className="text-base font-bold text-neutral-900 mt-1 truncate">{order.produk?.nama_makanan}</h2>
              <p className="text-xs text-neutral-500 mt-0.5">{qty} Porsi x Rp {(order.produk?.harga_diskon || 0).toLocaleString("id-ID")}</p>
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

        {/* INFORMASI KURIR PENGANTAR (Tampil jika metode delivery dan kurir sudah mengambil) */}
        {isDelivery && courier && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex flex-col gap-3">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              <Truck size={18} className="text-orange-600" /> Kurir Pengantar Pesanan
            </h3>
            <div className="bg-orange-50/70 p-4 rounded-xl border border-orange-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {courier.foto ? (
                  <img 
                    src={courier.foto} 
                    alt={courier.nama} 
                    className="w-12 h-12 rounded-full object-cover border border-orange-200 bg-white shrink-0" 
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-orange-200 text-orange-800 font-bold flex items-center justify-center text-sm shrink-0 uppercase">
                    {courier.nama ? courier.nama.substring(0, 2) : "KR"}
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded uppercase tracking-wider inline-block">
                    Kurir Resmi LastBite
                  </span>
                  <p className="font-bold text-neutral-900 text-base mt-1">{courier.nama}</p>
                  {courier.nomor_hp && (
                    <p className="text-xs text-neutral-600">{courier.nomor_hp}</p>
                  )}
                </div>
              </div>

              {courier.nomor_hp && (
                <a 
                  href={`https://wa.me/${courier.nomor_hp.replace(/^0/, '62').replace(/[^0-9]/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-2xs shrink-0"
                >
                  <Phone size={14} /> Hubungi Kurir
                </a>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              *Kurir telah ditugaskan untuk mengambil dan mengantar pesanan Anda sampai ke tujuan.
            </p>
          </div>
        )}

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

        {/* Tujuan Pengantaran - Tampil untuk Delivery */}
        {isDelivery && order?.alamat_pengiriman && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex flex-col gap-3">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              <Truck size={18} className="text-orange-600" /> Tujuan Pengantaran Kurir
            </h3>
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
              <p className="text-sm text-neutral-800 whitespace-pre-line leading-relaxed">{order.alamat_pengiriman}</p>
            </div>
            {order.link_gmaps && (
              <a href={order.link_gmaps} target="_blank" rel="noreferrer" className="mt-1 flex items-center justify-center gap-2 bg-neutral-900 text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition">
                Buka Titik Maps Pembeli
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}