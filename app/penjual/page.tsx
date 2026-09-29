"use client";

import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Store, 
  LayoutDashboard, 
  Utensils, 
  Receipt, 
  Settings, 
  PlusCircle, 
  Ban,
  CheckCircle,
  XCircle,
  Menu,
  X,
  Loader2,
  Image as ImageIcon,
  Newspaper,
  HelpCircle
} from "lucide-react";
import { supabase } from "../../utils/supabase";
import ManageStock from "../../components/penjual/ManageStock";
import ManageOrders from "../../components/penjual/ManageOrders";
import SettingsComponent from "../../components/penjual/Settings"; 
import News from "../../components/News";
import Helpdesk from "../../components/Helpdesk";

const generateNumericCode = (uuid: string) => {
  if (!uuid) return "000000";
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash).toString().padStart(6, '0').substring(0, 6);
};

export default function SellerDashboard() {
  const [activeTab, setActiveTab] = useState('dasbor');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Dynamic states
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [storeName, setStoreName] = useState("Memuat...");
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("Memuat...");
  const [hasLocation, setHasLocation] = useState(false);
  const [userId, setUserId] = useState<string>("");
  
  // Stats
  const [revenueToday, setRevenueToday] = useState(0);
  const [processingOrdersCount, setProcessingOrdersCount] = useState(0);
  const [totalLeftoverPortions, setTotalLeftoverPortions] = useState(0);
  
  // Orders
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  // Modal State untuk Buat Diskon
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<any>({
    name: "",
    description: "",
    normalPrice: "",
    discountPrice: "",
    stock: "",
    expirationTime: "", // Akan berupa format HH:MM karena tipe input="time"
    imageBase64: "" // Menyimpan gambar yang diunggah
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kalkulasi persentase diskon
  const nPrice = Number(newProduct.normalPrice) || 0;
  const dPrice = Number(newProduct.discountPrice) || 0;
  const discountPercentage = nPrice > 0 
    ? Math.round(((nPrice - dPrice) / nPrice) * 100) 
    : 0;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Dapatkan user yang sedang login
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("Tidak ada user yang login");
        setStoreName("Merchant (Guest)");
        setUserName("BELUM LOGIN");
        setIsLoading(false);
        return;
      }
      setUserId(user.id);

      // 2. Cari profil berdasarkan ID user
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError || !userData) {
        console.error("Profil tidak ditemukan", userError);
        setStoreName("Merchant (Guest)");
        setUserName("USER TIDAK DITEMUKAN");
        setIsLoading(false);
        return;
      }

      setUserName(userData.nama || "Penjual");
      setMerchantId(userData.id);
      setIsStoreOpen(userData.status_toko || false);
      setStoreName(userData.nama || "Toko Penjual"); 
      setHasLocation(!!userData.lokasi_gmaps);

      // Ambil produk dan pesanan
      await fetchProductsAndOrders(userData.id);
      setIsLoading(false);

    } catch (error) {
      console.error("Gagal menarik data awal:", error);
      setIsLoading(false);
    }
  };

  const fetchProductsAndOrders = async (mId: string) => {
    try {
      // Ambil Porsi Sisa dari Produk (tabel: produk)
      const { data: productsData } = await supabase
        .from('produk')
        .select('stok')
        .eq('penjual_id', mId)
        .gt('stok', 0);
        
      if (productsData) {
        const totalPortions = productsData.reduce((acc, curr) => acc + (curr.stok || 0), 0);
        setTotalLeftoverPortions(totalPortions);
      }

      // Ambil Pesanan Aktif (tabel: pesanan di-join dengan produk)
      const { data: ordersData, error: ordersError } = await supabase
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
        .eq('produk.penjual_id', mId)
        .or('status.in.(pending,preparing,paid,ready,completed),status.is.null');

      if (ordersData) {
        const groupedMap: Record<string, any> = {};
        ordersData.forEach(order => {
          const productInfo = order.produk as any;
          const orderDate = new Date(order.created_at);
          const timeKey = orderDate.toISOString().slice(0, 16);
          const key = `${productInfo?.nama_makanan}-${timeKey}-${order.metode_pengambilan}`;
          
          if (!groupedMap[key]) {
            groupedMap[key] = {
              id: generateNumericCode(order.id), 
              rawIds: [order.id],
              qty: 1,
              items: productInfo ? productInfo.nama_makanan : 'Produk',
              type: order.metode_pengambilan === 'pickup' ? 'Pickup' : 'Delivery',
              time: orderDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              dateObj: orderDate,
              status: order.status,
              price: productInfo ? productInfo.harga_diskon : 0,
              proofOfPayment: order.bukti_bayar_url || null
            };
          } else {
            groupedMap[key].qty += 1;
            groupedMap[key].rawIds.push(order.id);
          }
        });

        const allFormatted = Object.values(groupedMap);
        
        // Active orders: pending, preparing, ready, paid
        const activeQueue = allFormatted.filter(o => o.status === 'preparing' || o.status === 'pending' || o.status === 'paid' || o.status === 'ready' || !o.status);
        setActiveOrders(activeQueue);

        const processingCount = activeQueue.length;
        setProcessingOrdersCount(processingCount);
        
        // Revenue Today: only from approved orders created TODAY
        const today = new Date();
        const approvedOrdersToday = allFormatted.filter(o => {
          const isApproved = ['preparing', 'ready', 'paid', 'completed'].includes(o.status);
          const isToday = o.dateObj.getDate() === today.getDate() && 
                          o.dateObj.getMonth() === today.getMonth() && 
                          o.dateObj.getFullYear() === today.getFullYear();
          return isApproved && isToday;
        });
        const revenue = approvedOrdersToday.reduce((acc, curr) => acc + (curr.price * curr.qty || 0), 0);
        setRevenueToday(revenue);
      } else if (ordersError) {
        console.error("Gagal menarik pesanan", ordersError);
      }
    } catch (error) {
      console.error("Gagal mengambil produk dan pesanan:", error);
    }
  }

  // Handler: Toggle Buka/Tutup Toko
  const toggleStoreStatus = async () => {
    if (!merchantId) return alert("Merchant ID tidak ditemukan.");

    const newStatus = !isStoreOpen;
    setIsStoreOpen(newStatus); // Update UI optimistic

    const { error } = await supabase
      .from('profiles')
      .update({ status_toko: newStatus })
      .eq('id', merchantId);

    if (error) {
      console.error("Gagal memperbarui status toko", error);
      setIsStoreOpen(!newStatus); // Revert jika gagal
      alert("Terjadi kesalahan saat memperbarui status toko.");
    }
  };

  // Handler: Perbarui Status Pesanan
  const updateOrderStatus = async (rawIds: string[], newStatus: string) => {
    setActiveOrders(prev => prev.map(order => 
      order.rawIds === rawIds ? { ...order, status: newStatus } : order
    ));

    const { error } = await supabase
      .from('pesanan')
      .update({ status: newStatus })
      .in('id', rawIds);

    if (error) {
      console.error("Gagal memperbarui status pesanan", error);
      if (merchantId) fetchProductsAndOrders(merchantId); // Refresh ulang jika gagal
      alert("Gagal memperbarui status pesanan.");
    }
  };

  // Handle Upload Gambar
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, imageBase64: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler: Simpan Diskon Baru
  const submitNewDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantId) return alert("Merchant ID tidak ditemukan.");

    // Validasi diskon > 40% dihapus atas permintaan

    setIsSubmitting(true);
    try {
      // Data yang di-insert disesuaikan dengan struktur tabel "produk" terbaru
      const payload: any = {
        penjual_id: merchantId,
        nama_makanan: newProduct.name,
        harga_normal: newProduct.normalPrice,
        harga_diskon: newProduct.discountPrice,
        stok: newProduct.stock,
        batas_waktu: newProduct.expirationTime, // "HH:MM"
      };

      // Jika ada kolom tambahan yang ditambahkan oleh user (opsional)
      if (newProduct.description) payload.deskripsi = newProduct.description;
      if (newProduct.imageBase64) payload.gambar_url = newProduct.imageBase64;

      const { error } = await supabase
        .from('produk')
        .insert(payload);

      if (error) {
         console.error("Supabase Error:", error);
         throw error;
      }
      
      alert("Penawaran diskon berhasil ditambahkan!");
      setIsDiscountModalOpen(false);
      setNewProduct({ name: "", description: "", normalPrice: 0, discountPrice: 0, stock: 0, expirationTime: "", imageBase64: "" });
      
      // Refresh produk untuk update "Total Porsi Sisa"
      fetchProductsAndOrders(merchantId);

    } catch (error: any) {
      console.error("Gagal menambah diskon:", error);
      alert("Terjadi kesalahan: " + (error.message || "Gagal menyimpan."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row font-sans text-neutral-800">
      
      {/* Mobile Header Overlay */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-neutral-200 p-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Store className="text-orange-600" />
          <span className="font-bold text-lg tracking-tight">LASTBITE Seller</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-neutral-100 rounded-lg">
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 transition-transform duration-300 ease-in-out
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-neutral-200 flex flex-col
      `}>
        <div className="hidden md:flex items-center gap-2 p-6 border-b border-neutral-100">
          <Store className="text-orange-600" size={28} />
          <span className="font-black text-xl tracking-tighter">LASTBITE</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('dasbor'); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'dasbor' ? 'bg-orange-50 text-orange-700' : 'text-neutral-600 hover:bg-neutral-50'}`}>
            <LayoutDashboard size={20} /> Dasbor Utama
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('kelola'); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'kelola' ? 'bg-orange-50 text-orange-700' : 'text-neutral-600 hover:bg-neutral-50'}`}>
            <Utensils size={20} /> Kelola Stok & Harga
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('pesanan'); }} className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'pesanan' ? 'bg-orange-50 text-orange-700' : 'text-neutral-600 hover:bg-neutral-50'}`}>
            <div className="flex items-center gap-3">
              <Receipt size={20} /> Pesanan Masuk
            </div>
            {activeOrders.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{activeOrders.length}</span>
            )}
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('pengaturan'); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'pengaturan' ? 'bg-orange-50 text-orange-700' : 'text-neutral-600 hover:bg-neutral-50'}`}>
            <Settings size={20} /> Pengaturan
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('berita'); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'berita' ? 'bg-orange-50 text-orange-700' : 'text-neutral-600 hover:bg-neutral-50'}`}>
            <Newspaper size={20} /> Berita Terkini
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('bantuan'); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'bantuan' ? 'bg-orange-50 text-orange-700' : 'text-neutral-600 hover:bg-neutral-50'}`}>
            <HelpCircle size={20} /> Bantuan
          </a>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-30 flex items-center justify-center">
            <div className="flex flex-col items-center text-orange-600">
              <Loader2 size={40} className="animate-spin mb-2" />
              <p className="font-semibold text-neutral-600">Mensinkronisasi Data...</p>
            </div>
          </div>
        )}

        {/* HEADER TINGKAT HALAMAN */}
        <header className="hidden md:flex items-center justify-between bg-white border-b border-neutral-200 px-8 py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-neutral-500">Status Toko:</span>
            <button 
              onClick={toggleStoreStatus}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isStoreOpen ? 'bg-emerald-500' : 'bg-neutral-300'}`}
              disabled={isLoading || !merchantId}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isStoreOpen ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-bold ${isStoreOpen ? 'text-emerald-600' : 'text-neutral-500'}`}>
              {isStoreOpen ? 'BUKA' : 'TUTUP'}
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-neutral-500 hover:text-neutral-800 transition-colors">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-neutral-200">
              <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold uppercase">
                {userName.substring(0,3)}
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-bold leading-tight uppercase">{userName}</p>
                <p className="text-xs text-neutral-500">{storeName}</p>
              </div>
            </div>
          </div>
        </header>

        {/* KONTEN UTAMA */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {activeTab === 'dasbor' ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-neutral-900">Ringkasan Operasional</h1>
              <p className="text-sm text-neutral-500 mt-1">Pantau performa penjualan dan antrean pesanan Anda secara real-time.</p>
            </div>
            
            {/* AKSI CEPAT */}
            <div className="flex gap-2">
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50">
                <Ban size={16} /> Hentikan Obral
              </button>
              <button 
                onClick={() => {
                  if (!hasLocation) {
                    alert("Mohon lengkapi Tautan Lokasi Google Maps restoran Anda di menu Pengaturan terlebih dahulu sebelum mengunggah produk.");
                    setActiveTab('pengaturan');
                  } else {
                    setIsDiscountModalOpen(true);
                  }
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                <PlusCircle size={16} /> Buat Diskon
              </button>
            </div>
          </div>

          {/* GRID STATISTIK */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
              <p className="text-sm font-medium text-neutral-500 mb-1">Pendapatan Hari Ini</p>
              <p className="text-3xl font-black text-emerald-600">{formatCurrency(revenueToday)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
              <p className="text-sm font-medium text-neutral-500 mb-1">Pesanan Diproses</p>
              <p className="text-3xl font-black text-blue-600">{processingOrdersCount}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
              <p className="text-sm font-medium text-neutral-500 mb-1">Total Porsi Sisa</p>
              <p className="text-3xl font-black text-orange-600">{totalLeftoverPortions}</p>
            </div>
          </div>

          {/* TABEL PESANAN AKTIF */}
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
              <h2 className="font-bold text-lg text-neutral-800">Antrean Pesanan Masuk</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-white text-sm text-neutral-500 border-b border-neutral-100">
                    <th className="px-6 py-4 font-medium">ID Pesanan</th>
                    <th className="px-6 py-4 font-medium">Menu</th>
                    <th className="px-6 py-4 font-medium">Tipe</th>
                    <th className="px-6 py-4 font-medium">Waktu / Status</th>
                    <th className="px-6 py-4 font-medium text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-sm">
                  {!isLoading && activeOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                        Belum ada pesanan masuk saat ini.
                      </td>
                    </tr>
                  ) : (
                    activeOrders.map((order, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-neutral-900">#{order.id}</td>
                        <td className="px-6 py-4 font-medium">
                          <div className="flex flex-col gap-1">
                            <div>{order.items} <span className="text-xs font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded ml-1">x{order.qty}</span></div>
                            {order.proofOfPayment && (
                              <button onClick={() => setSelectedProof(order.proofOfPayment)} className="self-start inline-flex items-center text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold hover:bg-blue-100 transition-colors border border-blue-100">
                                Lihat Bukti
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${order.type === 'Pickup' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                            {order.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-neutral-600">{order.time}</td>
                        <td className="px-6 py-4 text-right">
                          {order.status === 'pending' || order.status === 'paid' ? (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => updateOrderStatus(order.rawIds, 'cancelled')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                              >
                                <XCircle size={20} />
                              </button>
                              <button 
                                onClick={() => updateOrderStatus(order.rawIds, 'preparing')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors"
                              >
                                <CheckCircle size={16} /> Terima
                              </button>
                            </div>
                          ) : order.status === 'preparing' ? (
                            <button 
                              onClick={() => updateOrderStatus(order.rawIds, 'ready')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-semibold transition-colors ml-auto"
                            >
                              Siap Diambil
                            </button>
                          ) : order.status === 'ready' ? (
                            <button 
                              onClick={() => updateOrderStatus(order.rawIds, order.type === 'Delivery' ? 'delivering' : 'completed')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors ml-auto"
                            >
                              Serahkan
                            </button>
                          ) : (
                            <span className="text-neutral-500 italic">{order.status === 'delivering' ? 'Diserahkan Kurir' : 'Diselesaikan'}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
            </>
          ) : activeTab === 'kelola' && merchantId ? (
            <ManageStock merchantId={merchantId} />
          ) : activeTab === 'pesanan' && merchantId ? (
            <ManageOrders merchantId={merchantId} />
          ) : activeTab === 'pengaturan' && merchantId ? (
            <SettingsComponent merchantId={merchantId} onLocationUpdate={(has) => setHasLocation(has)} />
          ) : activeTab === 'berita' ? (
            <News role="penjual" />
          ) : activeTab === 'bantuan' && userId ? (
            <Helpdesk role="penjual" userId={userId} />
          ) : null}
        </div>
      </main>

      {/* MODAL BUAT DISKON */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
              <h2 className="text-xl font-bold text-neutral-800">Buat Penawaran Diskon</h2>
              <button onClick={() => setIsDiscountModalOpen(false)} className="text-neutral-500 hover:text-neutral-800">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={submitNewDiscount} className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* Fitur Baru: Unggah Gambar */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Unggah Gambar Produk</label>
                <div className="relative group border-2 border-dashed border-neutral-300 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-orange-50 hover:border-orange-400 transition-colors cursor-pointer overflow-hidden">
                  <input 
                    type="file" accept="image/*" 
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  {newProduct.imageBase64 ? (
                    <img src={newProduct.imageBase64} alt="Preview" className="h-32 object-contain rounded-md" />
                  ) : (
                    <div className="flex flex-col items-center text-neutral-400 group-hover:text-orange-500">
                      <ImageIcon size={32} className="mb-2" />
                      <span className="text-sm font-medium">Klik atau Tarik gambar ke sini</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Nama Produk</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Deskripsi Produk</label>
                <textarea 
                  required rows={2}
                  className="w-full px-4 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Harga Asli (Rp)</label>
                  <input 
                    type="number" required min="0"
                    className="w-full px-4 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    value={newProduct.normalPrice}
                    onChange={(e) => setNewProduct({...newProduct, normalPrice: e.target.value === "" ? "" : parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Harga Diskon (Rp)</label>
                  <input 
                    type="number" required min="0"
                    className="w-full px-4 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    value={newProduct.discountPrice}
                    onChange={(e) => setNewProduct({...newProduct, discountPrice: e.target.value === "" ? "" : parseInt(e.target.value)})}
                  />
                </div>
              </div>

              {/* INDIKATOR PERSENTASE DISKON */}
              <div className={`p-4 rounded-xl flex items-center justify-between ${discountPercentage >= 41 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <span className={`text-sm font-semibold ${discountPercentage >= 41 ? 'text-emerald-700' : 'text-red-700'}`}>
                  Besaran Diskon:
                </span>
                <span className={`text-2xl font-black ${discountPercentage >= 41 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {discountPercentage}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Jumlah Porsi Sisa</label>
                  <input 
                    type="number" required min="1"
                    className="w-full px-4 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({...newProduct, stock: e.target.value === "" ? "" : parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Batas Waktu (Jam:Menit)</label>
                  <input 
                    type="time" required
                    className="w-full px-4 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newProduct.expirationTime}
                    onChange={(e) => setNewProduct({...newProduct, expirationTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsDiscountModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                  Simpan Diskon
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

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