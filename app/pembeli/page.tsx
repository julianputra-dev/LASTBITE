"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { Search, ShoppingCart, MapPin, Clock, Tag, User, Percent, HelpCircle, Newspaper } from "lucide-react";
import Link from "next/link";
import CountdownTimer from "../../components/CountdownTimer";

export default function PembeliPage() {
  const [katalog, setKatalog] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const initData = async () => {
      // Ambil user aktif
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (userId) {
        // Hitung pesanan aktif
        const { count } = await supabase
          .from("pesanan")
          .select("*", { count: "exact", head: true })
          .eq("pembeli_id", userId)
          .in("status", ["pending", "paid", "preparing", "ready"]);
          
        if (count) setCartCount(count);
      }

      const { data } = await supabase
        .from("produk")
        .select("*")
        .gt("stok", 0)
        .order("created_at", { ascending: false });
        
      if (data) {
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
        
        // Filter out expired items
        const validItems = data.filter((item: any) => !isExpired(item.batas_waktu));
        
        // Calculate discount percentage for all items
        const processedItems = validItems.map(item => ({
          ...item,
          discountPercent: Math.round(((item.harga_normal - item.harga_diskon) / item.harga_normal) * 100),
          imageUrl: item.gambar_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop"
        }));

        setKatalog(processedItems);
      }
      setLoading(false);
    };
    initData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredKatalog = katalog.filter(item => 
    (item.nama_makanan || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topProducts = katalog.length > 0 
    ? [...katalog].sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 5) 
    : [];

  useEffect(() => {
    if (topProducts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % topProducts.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [topProducts.length]);

  const featuredProduct = topProducts[currentSlide];

  const quickMenus = [
    { icon: <User size={24} />, label: "Profil", href: "/pembeli/profil", color: "text-blue-500", bg: "bg-blue-50" },
    { icon: <ShoppingCart size={24} />, label: "Pesanan", href: "/pembeli/pesanan", color: "text-orange-500", bg: "bg-orange-50" },
    { icon: <Newspaper size={24} />, label: "Berita", href: "/pembeli/berita", color: "text-green-500", bg: "bg-green-50" },
    { icon: <Percent size={24} />, label: "Voucher", href: "#", color: "text-red-500", bg: "bg-red-50" },
    { icon: <HelpCircle size={24} />, label: "Bantuan", href: "/pembeli/bantuan", color: "text-purple-500", bg: "bg-purple-50" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 font-sans pb-20">
      {/* Search Bar Container */}
      <div className="pt-6 pb-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-grow max-w-3xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                placeholder="Cari makanan diskon hari ini..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-xl leading-5 bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all sm:text-sm"
              />
            </div>
            <Link href="/pembeli/pesanan" className="relative p-2 text-neutral-600 hover:text-orange-600 transition-colors">
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[10px] font-bold text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto md:px-6 lg:px-8">
        
        {/* ZONA 1: HERO BANNER (Promo Utama) */}
        {!searchQuery && featuredProduct && (
          <div className="mt-4 px-4 md:px-0">
            <Link href={`/pembeli/produk/${featuredProduct.id}`} className="block relative w-full min-h-[200px] md:min-h-[256px] rounded-2xl overflow-hidden shadow-sm group bg-orange-600 border border-neutral-200">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500"></div>
              
              <img 
                src={featuredProduct.imageUrl} 
                alt="Promo Terbesar" 
                className="absolute right-0 top-0 h-full w-full md:w-3/4 object-cover opacity-70 mix-blend-overlay group-hover:scale-105 transition-transform duration-700"
              />
              
              {/* Gradien untuk membaurkan gambar dengan background oranye */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-orange-600/80 to-transparent"></div>
              
              <div className="relative flex flex-col justify-center p-5 pb-8 md:p-10 md:pb-10 text-white w-11/12 md:w-1/2 min-h-[200px] md:min-h-[256px]">
                <div className="inline-block bg-yellow-400 text-yellow-900 text-[10px] md:text-xs font-black px-2 py-1 rounded-lg w-max mb-2 uppercase tracking-wide shadow-sm flex items-center gap-1">
                  <Tag size={12} /> SPESIAL DISKON {featuredProduct.discountPercent}%
                </div>
                <h2 className="text-xl md:text-3xl font-black mb-2 line-clamp-2 leading-tight drop-shadow-md">
                  {featuredProduct.nama_makanan}
                </h2>
                <div className="flex items-center gap-2 mt-1 md:mt-2">
                  <span className="text-xs md:text-sm line-through opacity-75">{formatCurrency(featuredProduct.harga_normal)}</span>
                  <span className="text-2xl md:text-4xl font-black text-yellow-300 drop-shadow-sm">{formatCurrency(featuredProduct.harga_diskon)}</span>
                </div>
                <div className="mt-3 md:mt-4">
                  <CountdownTimer batasWaktu={featuredProduct.batas_waktu} isBanner={true} className="!px-3 !py-1.5 backdrop-blur-sm" />
                </div>
              </div>

              {/* Indikator Carousel */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                {topProducts.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                  ></div>
                ))}
              </div>
            </Link>
          </div>
        )}

        {/* ZONA 2: QUICK MENUS */}
        {!searchQuery && (
          <div className="mt-4 px-4 md:px-0">
            <div className="bg-white rounded-2xl shadow-sm py-5 px-4 grid grid-cols-5 gap-2 md:gap-4 border border-neutral-200">
              {quickMenus.map((menu, idx) => (
                <Link key={idx} href={menu.href} className="flex flex-col items-center justify-center gap-2 group">
                  <div className={`w-12 h-12 rounded-2xl ${menu.bg} flex items-center justify-center group-hover:-translate-y-1 transition-transform border border-transparent group-hover:border-neutral-200`}>
                    <div className={menu.color}>{menu.icon}</div>
                  </div>
                  <span className="text-[10px] md:text-xs font-medium text-neutral-600 text-center leading-tight">
                    {menu.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ZONA 3: PRODUK GRID (Kategori/Rekomendasi) */}
        <div className="mt-6 px-4 md:px-0">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-black text-neutral-900 tracking-wide">
              {searchQuery ? "Hasil Pencarian" : "Rekomendasi Hari Ini"}
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
            </div>
          ) : filteredKatalog.length === 0 ? (
            <div className="bg-white p-10 text-center shadow-sm border border-neutral-200 rounded-2xl">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="text-neutral-900 font-bold mb-1">Tidak ada makanan ditemukan</h3>
              <p className="text-neutral-500 text-sm">Coba cari dengan kata kunci lain.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredKatalog.map((item) => {
                const distance = item.jarak_km ? `${item.jarak_km} km` : (Math.random() * 5).toFixed(1) + " km";

                return (
                  <Link key={item.id} href={`/pembeli/produk/${item.id}`} className="bg-white rounded-xl flex flex-col h-full hover:border-orange-500 border border-neutral-200 shadow-sm transition-all group overflow-hidden relative">
                    
                    {/* Diskon Tag */}
                    <div className="absolute top-0 right-0 bg-red-600 text-white flex flex-col items-center justify-center px-1.5 py-1 z-10 w-9 h-10 rounded-bl-lg">
                      <span className="text-[9px] font-bold leading-none">{item.discountPercent}%</span>
                      <span className="text-[8px] font-bold leading-none uppercase mt-0.5">Off</span>
                    </div>

                    {/* Gambar Produk */}
                    <div className="relative pt-[100%] w-full bg-neutral-100 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.nama_makanan}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* Sisa Stok Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-neutral-900/60 backdrop-blur-sm px-2 py-1 flex items-center justify-between">
                         <span className="text-white text-[9px] font-medium flex items-center gap-1">
                           <MapPin size={9} /> {distance}
                         </span>
                         <span className="text-white text-[9px] font-bold">
                           Sisa {item.stok}
                         </span>
                      </div>
                    </div>

                    {/* Konten Utama */}
                    <div className="p-3 flex flex-col flex-grow">
                      <h3 className="text-neutral-900 font-extrabold text-xs md:text-sm leading-tight line-clamp-2 mb-2 group-hover:text-orange-600">
                        {item.nama_makanan}
                      </h3>
                      
                      <div className="mt-auto">
                        <div className="flex items-center gap-1 mb-1.5">
                          <CountdownTimer batasWaktu={item.batas_waktu} className="!text-[9px] !px-1.5 !py-0.5" />
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-neutral-400 line-through">
                            {formatCurrency(item.harga_normal)}
                          </span>
                        </div>
                        <div className="text-neutral-900 font-black text-sm leading-none mt-0.5">
                          {formatCurrency(item.harga_diskon)}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}