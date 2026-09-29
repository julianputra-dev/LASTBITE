"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../../utils/supabase";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Tag, ShieldCheck, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import Link from "next/link";
import CountdownTimer from "../../../../components/CountdownTimer";

export default function DetailProdukPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [produk, setProduk] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBeli, setLoadingBeli] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSpecial, setIsSpecial] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      if (id) {
        // Ambil data produk
        const { data: produkData } = await supabase
          .from("produk")
          .select("*")
          .eq("id", id)
          .single();

        if (produkData) {
          setProduk(produkData);
          
          // Ambil data merchant
          const { data: merchantData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", produkData.penjual_id)
            .single();
            
          if (merchantData) {
            setMerchant(merchantData);
          }

          // Cek apakah produk masuk kategori Spesial Diskon (Top 5 Diskon)
          const { data: allProduk } = await supabase
            .from("produk")
            .select("id, harga_normal, harga_diskon, batas_waktu")
            .gt("stok", 0);
            
          if (allProduk) {
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
            
            const validItems = allProduk.filter((item: any) => !isExpired(item.batas_waktu));
            const topProducts = validItems.map(item => ({
              id: item.id,
              discountPercent: Math.round(((item.harga_normal - item.harga_diskon) / item.harga_normal) * 100)
            })).sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 5);
            
            setIsSpecial(topProducts.some(item => item.id === produkData.id));
          }
        }
      }
      setLoading(false);
    };

    initData();
  }, [id]);

  const handleQuantityChange = (type: 'increase' | 'decrease') => {
    if (type === 'increase') {
      if (quantity < produk.stok) setQuantity(quantity + 1);
    } else {
      if (quantity > 1) setQuantity(quantity - 1);
    }
  };

  const handleBeli = (metode: string) => {
    if (!userId) {
      alert("Silakan login terlebih dahulu untuk memesan.");
      router.push("/login");
      return;
    }
    
    if (!produk || produk.stok < quantity) {
      alert("Maaf, stok produk tidak mencukupi.");
      return;
    }
    
    // Redirect to the new checkout page with parameters
    router.push(`/pembeli/checkout/${produk.id}?method=${metode}&qty=${quantity}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-neutral-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!produk) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-neutral-100 p-6 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Produk Tidak Ditemukan</h1>
        <p className="text-neutral-500 mb-6">Makanan ini mungkin sudah ditarik atau stoknya habis.</p>
        <Link href="/pembeli" className="bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-orange-700 transition-colors">
          Kembali ke Eksplorasi
        </Link>
      </div>
    );
  }

  const discountPercent = Math.round(((produk.harga_normal - produk.harga_diskon) / produk.harga_normal) * 100);
  const imageUrl = produk.gambar_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop";

  return (
    <div className="min-h-screen bg-neutral-100 pb-24 font-sans text-neutral-800">
      <div className="max-w-6xl mx-auto md:px-4 pb-6 pt-6">
        <div className="bg-white md:rounded-xl shadow-md flex flex-col md:flex-row p-4 md:p-8 gap-8 border border-neutral-200">
          
          {/* Sisi Kiri: Gambar Produk */}
          <div className="md:w-[40%] shrink-0">
            <div className="relative w-full aspect-square bg-neutral-100 rounded-xl overflow-hidden">
              <img src={imageUrl} alt={produk.nama_makanan} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
          </div>

          {/* Sisi Kanan: Detail Produk */}
          <div className="md:w-[60%] flex flex-col">
            
            {/* Nama Produk */}
            <h1 className="text-xl md:text-[22px] font-medium text-neutral-900 leading-snug mb-5">
              {isSpecial && (
                <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 text-[10px] md:text-xs font-black px-2 py-0.5 rounded-xl mr-2 align-middle mb-1 uppercase">
                  <Tag size={12} /> SPESIAL DISKON
                </span>
              )}
              {produk.nama_makanan}
            </h1>

            {/* Box Harga */}
            <div className="bg-neutral-50/80 px-5 py-4 rounded-xl flex flex-col gap-1 mb-6 border border-neutral-100">
              <div className="flex items-center flex-wrap gap-3">
                <span className="text-neutral-400 line-through text-sm md:text-base">
                  {formatCurrency(produk.harga_normal)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-medium text-orange-600">
                    {formatCurrency(produk.harga_diskon)}
                  </span>
                  <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-xl">
                    {discountPercent}% OFF
                  </span>
                </div>
              </div>
            </div>

            {/* Keterangan & Pengiriman */}
            <div className="flex flex-col gap-5 text-sm text-neutral-600 mb-8">
              
              <div className="flex items-center">
                <div className="w-28 shrink-0 text-neutral-500 font-medium">Batas Waktu</div>
                <div className="flex items-center text-neutral-800">
                  <CountdownTimer batasWaktu={produk.batas_waktu} />
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-28 shrink-0 text-neutral-500 font-medium">Lokasi Penjual</div>
                <div className="flex items-center gap-2 text-neutral-800">
                  <MapPin size={16} className="text-green-600" />
                  {merchant?.nama || "Merchant Tersedia"}
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-28 shrink-0 text-neutral-500 font-medium">Deskripsi Produk</div>
                <div className="text-neutral-800 leading-relaxed max-w-lg whitespace-pre-wrap">
                  {produk.deskripsi ? produk.deskripsi : `Makanan berlebih dengan kondisi 100% sangat layak konsumsi. Diselamatkan langsung dari dapur ${merchant?.nama || "penjual"} sebelum jam operasional berakhir. Mari bantu kurangi food waste sekaligus berhemat!`}
                  <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 p-2.5 rounded-xl border border-green-100 text-xs font-medium w-max">
                    <ShieldCheck size={16} />
                    Kualitas terjamin aman untuk dikonsumsi hari ini.
                  </div>
                </div>
              </div>

            </div>

            {/* Kuantitas Selector */}
            <div className="flex items-center mb-8">
              <div className="w-28 shrink-0 text-neutral-500 font-medium text-sm">Kuantitas</div>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-neutral-300 rounded-xl bg-white">
                  <button 
                    onClick={() => handleQuantityChange('decrease')}
                    className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 transition-colors border-r border-neutral-300 disabled:opacity-30 disabled:hover:bg-white"
                    disabled={quantity <= 1}
                  >
                    <Minus size={14} />
                  </button>
                  <div className="w-12 h-8 flex items-center justify-center text-neutral-800 font-medium text-sm">
                    {quantity}
                  </div>
                  <button 
                    onClick={() => handleQuantityChange('increase')}
                    className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 transition-colors border-l border-neutral-300 disabled:opacity-30 disabled:hover:bg-white"
                    disabled={quantity >= produk.stok}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="text-sm text-neutral-500">
                  Tersedia {produk.stok} porsi
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-auto">
              {produk.stok > 0 ? (
                <>
                  <button 
                    onClick={() => handleBeli('pickup')}
                    disabled={loadingBeli !== null}
                    className="flex-1 md:max-w-[180px] border border-orange-600 bg-orange-50 hover:bg-orange-100 text-orange-600 font-medium py-3 px-2 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2 text-sm"
                  >
                    <ShoppingCart size={18} />
                    {loadingBeli === 'pickup' ? "Memproses..." : "Pickup Sendiri"}
                  </button>
                  <button 
                    onClick={() => handleBeli('delivery')}
                    disabled={loadingBeli !== null}
                    className="flex-1 md:max-w-[180px] bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-2 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center text-sm shadow-sm"
                  >
                    {loadingBeli === 'delivery' ? "Memproses..." : "Kirim via Kurir"}
                  </button>
                </>
              ) : (
                <button disabled className="w-full max-w-[370px] bg-neutral-300 text-neutral-500 font-medium py-3 rounded-xl cursor-not-allowed">
                  Stok Habis
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
