"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../../utils/supabase";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import PickupCheckout from "../../../../components/checkout/PickupCheckout";
import DeliveryCheckout from "../../../../components/checkout/DeliveryCheckout";

export default function CheckoutPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const method = searchParams.get('method') || 'pickup';
  const qty = parseInt(searchParams.get('qty') || '1');
  
  const [produk, setProduk] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Fetch user vouchers
        const { data: voucherData } = await supabase
          .from("user_vouchers")
          .select("*")
          .eq("pembeli_id", user.id)
          .eq("is_used", false);
        if (voucherData) setVouchers(voucherData);
      } else {
        router.push("/login");
        return;
      }

      if (id) {
        const { data: produkData } = await supabase
          .from("produk")
          .select("*")
          .eq("id", id)
          .single();

        if (produkData) {
          setProduk(produkData);
          const { data: merchantData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", produkData.penjual_id)
            .single();
            
          if (merchantData) setMerchant(merchantData);
        }
      }
      setLoading(false);
    };

    initData();
  }, [id, router]);

  if (loading || !produk || !userId) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-neutral-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 pb-24 font-sans text-neutral-800">
      <div className="max-w-3xl mx-auto md:px-4 pb-6 pt-10">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          
          <div className="bg-slate-800 p-6 text-white">
            <h1 className="text-2xl font-bold">Checkout Pesanan</h1>
            <p className="text-slate-300 text-sm mt-1">Metode: {method === 'pickup' ? 'Pickup Sendiri' : 'Kirim via Kurir'}</p>
          </div>

          {method === 'pickup' ? (
            <PickupCheckout produk={produk} merchant={merchant} qty={qty} userId={userId} vouchers={vouchers} />
          ) : (
            <DeliveryCheckout produk={produk} merchant={merchant} qty={qty} userId={userId} vouchers={vouchers} />
          )}

        </div>
      </div>
    </div>
  );
}
