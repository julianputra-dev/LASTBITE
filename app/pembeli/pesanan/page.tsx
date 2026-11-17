"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabase";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import PickupOrders from "../../../components/pesanan/PickupOrders";
import DeliveryOrders from "../../../components/pesanan/DeliveryOrders";

export default function PesananPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pickup" | "delivery">("pickup");
  const [loading, setLoading] = useState(true);
  
  const [pickupOrders, setPickupOrders] = useState<any[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("pesanan")
      .select(`
        id,
        metode_pengambilan,
        created_at,
        status,
        pembeli_id,
        produk_id,
        kurir_id,
        alamat_pengiriman,
        link_gmaps,
        produk (
          id,
          nama_makanan,
          gambar_url,
          harga_diskon,
          penjual_id
        )
      `)
      .eq("pembeli_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      // Ambil data kurir jika ada pesanan yang sudah diambil kurir
      const kurirIds = Array.from(new Set(data.map(d => d.kurir_id).filter(Boolean)));
      const couriersMap: Record<string, any> = {};

      if (kurirIds.length > 0) {
        const [profilesRes, couriersRes] = await Promise.all([
          supabase.from("profiles").select("id, nama, nomor_hp, foto_profil, avatar_url").in("id", kurirIds),
          supabase.from("couriers").select("user_id, full_name, phone_number, face_photo_url").in("user_id", kurirIds)
        ]);

        kurirIds.forEach(kId => {
          const prof = profilesRes.data?.find(p => p.id === kId);
          const cour = couriersRes.data?.find(c => c.user_id === kId);
          couriersMap[kId] = {
            id: kId,
            nama: cour?.full_name || prof?.nama || "Kurir LastBite",
            nomor_hp: cour?.phone_number || prof?.nomor_hp || null,
            foto: cour?.face_photo_url || prof?.foto_profil || prof?.avatar_url || null
          };
        });
      }

      // Group logic to handle 'qty' per simultaneous checkout
      const groupedMap: Record<string, any> = {};
      
      data.forEach(item => {
        const timeKey = new Date(item.created_at).toISOString().slice(0, 16); 
        const key = `${item.produk_id}-${timeKey}`;
        const courierInfo = item.kurir_id ? couriersMap[item.kurir_id] : null;
        
        if (!groupedMap[key]) {
          groupedMap[key] = { 
            ...item, 
            qty: 1, 
            rawIds: [item.id],
            kurir: courierInfo
          };
        } else {
          groupedMap[key].qty += 1;
          groupedMap[key].rawIds.push(item.id);
          if (!groupedMap[key].kurir && courierInfo) {
            groupedMap[key].kurir = courierInfo;
          }
        }
      });

      const groupedArray = Object.values(groupedMap);
      
      setPickupOrders(groupedArray.filter(o => o.metode_pengambilan === 'pickup'));
      setDeliveryOrders(groupedArray.filter(o => o.metode_pengambilan === 'delivery'));
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-100 font-sans pb-24 text-neutral-800">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-black text-neutral-900 flex items-center gap-2 mb-6">
          <ShoppingCart className="text-orange-600 w-7 h-7" />
          Daftar Pesanan Saya
        </h1>

        {/* TABS */}
        <div className="flex bg-neutral-200 p-1 rounded-xl mb-6 shadow-inner">
          <button
            onClick={() => setActiveTab("pickup")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === "pickup" 
                ? "bg-white text-orange-600 shadow-sm" 
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Pickup Sendiri
          </button>
          <button
            onClick={() => setActiveTab("delivery")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === "delivery" 
                ? "bg-white text-orange-600 shadow-sm" 
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Kirim via Kurir
          </button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
          </div>
        ) : activeTab === "pickup" ? (
          <PickupOrders orders={pickupOrders} onRefresh={fetchOrders} />
        ) : (
          <DeliveryOrders orders={deliveryOrders} onRefresh={fetchOrders} />
        )}
      </div>
    </div>
  );
}