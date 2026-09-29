"use client";

import React, { useEffect, useState } from "react";
import ImpactCounter from "../../components/ImpactCounter";
import DealCard from "../../components/DealCard";
import { ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";

export default function DashboardPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopDeals = async () => {
      setLoading(true);
      try {
        const { data: produkData, error: produkError } = await supabase
          .from("produk")
          .select("*")
          .gt("stok", 0);

        if (produkError) throw produkError;

        if (produkData) {
          const isExpired = (batasWaktu: string) => {
            if (!batasWaktu) return false;
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            const [batasHour, batasMinute] = batasWaktu.split(':').map(Number);
            
            if (currentHour > batasHour) return true;
            if (currentHour === batasHour && currentMinute >= batasMinute) return true;
            
            return false;
          };

          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, nama, foto_profil");
            
          const profilesMap = new Map();
          if (profilesData) {
            profilesData.forEach((profile: any) => {
              profilesMap.set(profile.id, profile);
            });
          }

          const validData = produkData.filter((item: any) => !isExpired(item.batas_waktu));

          const sortedDeals = validData
            .map((item) => {
              const discountPercent = Math.round(
                ((item.harga_normal - item.harga_diskon) / item.harga_normal) * 100
              );
              const merchant = profilesMap.get(item.penjual_id);
              
              return { 
                ...item, 
                discountPercent,
                merchantName: merchant?.nama || "Penjual Lokal",
                productImage: item.gambar_url || "https://images.unsplash.com/photo-1547496502-affa22d38842?q=80&w=600&auto=format&fit=crop"
              };
            })
            .sort((a, b) => b.discountPercent - a.discountPercent)
            .slice(0, 4);

          setDeals(sortedDeals);
        }
      } catch (error) {
        console.error("Gagal mengambil data diskon:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopDeals();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      
      <section className="bg-white border-b border-neutral-200 pt-16 pb-12 lg:pt-20 lg:pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 max-w-3xl mx-auto flex flex-col items-center">
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-neutral-900">
              Selamatkan Makanan, <br />
              <span className="text-orange-600">Nikmati Harga Terbaik.</span>
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed font-medium">
              LASTBITE menghubungkan Anda dengan penjual lokal untuk menyelamatkan makanan segar di akhir hari kerja dengan diskon lebih dari 40%.
            </p>
          </div>

          <ImpactCounter />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Penyelamatan Menit Terakhir</h2>
            </div>
            <p className="text-neutral-500 font-medium">
              Hidangan lezat berkualitas yang harus segera diambil sebelum waktu operasional toko berakhir.
            </p>
          </div>
          
          <Link 
            href="/login" 
            className="flex items-center gap-2 text-neutral-600 hover:text-orange-600 font-bold transition-colors group"
          >
            Lihat Semua
            <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20 bg-white border border-neutral-200 rounded-xl">
            <p className="text-neutral-500 font-medium">Belum ada makanan diskon di sekitar Anda saat ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                id={deal.id}
                name={deal.nama_makanan}
                merchantName={deal.merchantName}
                normalPrice={deal.harga_normal}
                discountPrice={deal.harga_diskon}
                stockAvailable={deal.stok}
                closingTime={deal.batas_waktu || "20:00"}
                distance="Dekat"
                imageUrl={deal.productImage}
              />
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
