"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  AlertTriangle, 
  Eye, 
  RefreshCw, 
  Loader2, 
  Store, 
  User, 
  Receipt, 
  X 
} from "lucide-react";

export default function AdminTransactionsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Modal State
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<{ order: any; type: "approve" | "reject" | "reapprove" } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pesanan")
        .select(`
          id,
          created_at,
          status,
          metode_pengambilan,
          bukti_bayar_url,
          escrow_status,
          catatan_verifikasi,
          verified_at,
          rejected_at,
          pembeli:profiles!pembeli_id (
            id,
            nama,
            email,
            nomor_hp
          ),
          produk:produk!produk_id (
            id,
            nama_makanan,
            harga_diskon,
            penjual_id,
            penjual:profiles!penjual_id (
              id,
              nama,
              email,
              nomor_hp,
              saldo_penjual,
              saldo_tertahan
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Gagal mengambil data transaksi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getRemainingDisputeDays = (rejectedAt: string) => {
    if (!rejectedAt) return 0;
    const expiryTime = new Date(rejectedAt).getTime() + 7 * 24 * 60 * 60 * 1000;
    const diffMs = expiryTime - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const handleActionConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction) return;

    const { order, type } = activeAction;
    const nominal = Number(order.produk?.harga_diskon || 0);
    const sellerId = order.produk?.penjual?.id;

    if (!sellerId) {
      alert("Data penjual tidak valid.");
      return;
    }

    setIsProcessing(true);

    try {
      if (type === "approve") {
        // ADMIN MENYETUJUI:
        // 1. Pindahkan nominal dari saldo_tertahan ke saldo_penjual
        const currentPenjual = Number(order.produk?.penjual?.saldo_penjual || 0);
        const currentTertahan = Number(order.produk?.penjual?.saldo_tertahan || 0);

        const newPenjual = currentPenjual + nominal;
        const newTertahan = Math.max(0, currentTertahan - nominal);

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            saldo_penjual: newPenjual,
            saldo_tertahan: newTertahan,
            updated_at: new Date().toISOString()
          })
          .eq("id", sellerId);

        if (profileError) throw profileError;

        // 2. Tandai escrow_status pesanan menjadi 'approved'
        const { error: orderError } = await supabase
          .from("pesanan")
          .update({
            escrow_status: "approved",
            catatan_verifikasi: actionReason.trim() || "Pembayaran diverifikasi sah oleh admin.",
            verified_at: new Date().toISOString()
          })
          .eq("id", order.id);

        if (orderError) throw orderError;

        alert("Transaksi berhasil disetujui! Saldo siap tarik telah masuk ke akun penjual.");

      } else if (type === "reject") {
        // ADMIN MENOLAK (Terindikasi Fiktif / Bukti Palsu):
        // 1. Kurangi saldo_tertahan penjual (karena transaksi dibatalkan)
        const currentTertahan = Number(order.produk?.penjual?.saldo_tertahan || 0);
        const newTertahan = Math.max(0, currentTertahan - nominal);

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            saldo_tertahan: newTertahan,
            updated_at: new Date().toISOString()
          })
          .eq("id", sellerId);

        if (profileError) throw profileError;

        // 2. Set escrow_status menjadi 'rejected' dengan timestamp penolakan (batas 7 hari)
        const { error: orderError } = await supabase
          .from("pesanan")
          .update({
            escrow_status: "rejected",
            catatan_verifikasi: actionReason.trim() || "Bukti transfer tidak valid atau mutasi tidak ditemukan.",
            rejected_at: new Date().toISOString()
          })
          .eq("id", order.id);

        if (orderError) throw orderError;

        alert("Transaksi ditolak. Penjual memiliki masa sanggah selama 7 hari.");

      } else if (type === "reapprove") {
        // ADMIN MENGUBAH KEPUTUSAN DALAM MASA SANGGAH (7 HARI):
        // 1. Tambahkan nominal ke saldo_penjual
        const currentPenjual = Number(order.produk?.penjual?.saldo_penjual || 0);
        const newPenjual = currentPenjual + nominal;

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            saldo_penjual: newPenjual,
            updated_at: new Date().toISOString()
          })
          .eq("id", sellerId);

        if (profileError) throw profileError;

        // 2. Ubah status pesanan menjadi 'approved'
        const { error: orderError } = await supabase
          .from("pesanan")
          .update({
            escrow_status: "approved",
            catatan_verifikasi: actionReason.trim() || "Sanggahan diterima. Transaksi diverifikasi sah oleh admin.",
            verified_at: new Date().toISOString()
          })
          .eq("id", order.id);

        if (orderError) throw orderError;

        alert("Keputusan berhasil diperbarui! Dana telah dicairkan ke saldo penjual.");
      }

      setActiveAction(null);
      setActionReason("");
      fetchOrders();
    } catch (err: any) {
      console.error("Gagal memproses verifikasi:", err);
      alert("Terjadi kesalahan: " + (err.message || "Gagal menghubungi server."));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const filteredOrders = orders.filter((order) => {
    const escrow = order.escrow_status || "pending";
    if (filter === "pending" && escrow !== "pending") return false;
    if (filter === "approved" && escrow !== "approved") return false;
    if (filter === "rejected" && escrow !== "rejected") return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const sellerName = order.produk?.penjual?.nama?.toLowerCase() || "";
      const buyerName = order.pembeli?.nama?.toLowerCase() || "";
      const foodName = order.produk?.nama_makanan?.toLowerCase() || "";
      const orderId = order.id.toLowerCase();
      return sellerName.includes(q) || buyerName.includes(q) || foodName.includes(q) || orderId.includes(q);
    }

    return true;
  });

  const countPending = orders.filter(o => (o.escrow_status || "pending") === "pending").length;
  const countApproved = orders.filter(o => o.escrow_status === "approved").length;
  const countRejected = orders.filter(o => o.escrow_status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Verifikasi Transaksi & Escrow</h1>
          <p className="text-neutral-600 mt-1 font-medium text-sm">
            Verifikasi mutasi rekening masuk sebelum dana diteruskan ke saldo utama toko penjual.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-neutral-700 font-bold hover:bg-neutral-50 shadow-xs text-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* STATISTIK RINGKAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Perlu Verifikasi</p>
            <p className="text-3xl font-black text-amber-600 mt-1">{countPending}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Dana Disetujui</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{countApproved}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Ditolak / Sanggah (7 Hari)</p>
            <p className="text-3xl font-black text-red-600 mt-1">{countRejected}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* FILTER & PENCARIAN */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari penjual, pembeli, atau makanan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex gap-2">
          {[
            { id: "all", label: "Semua" },
            { id: "pending", label: `Perlu Dicek (${countPending})` },
            { id: "approved", label: "Disetujui" },
            { id: "rejected", label: `Ditolak (${countRejected})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                filter === tab.id
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABEL TRANSAKSI */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-400 flex flex-col items-center justify-center gap-2">
            <Loader2 size={32} className="animate-spin text-orange-500" />
            <p className="text-sm font-semibold">Memuat transaksi escrow...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 font-medium">
            Tidak ada transaksi untuk filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[950px]">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="py-3.5 px-4">Waktu & Pesanan</th>
                  <th className="py-3.5 px-4">Identitas Penjual</th>
                  <th className="py-3.5 px-4">Identitas Pembeli</th>
                  <th className="py-3.5 px-4">Nominal & Makanan</th>
                  <th className="py-3.5 px-4">Bukti Transfer</th>
                  <th className="py-3.5 px-4">Status Escrow</th>
                  <th className="py-3.5 px-4 text-right">Tindakan Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredOrders.map((order) => {
                  const escrow = order.escrow_status || "pending";
                  const remainingDays = getRemainingDisputeDays(order.rejected_at);
                  const isDisputeActive = escrow === "rejected" && remainingDays > 0;

                  return (
                    <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors">
                      {/* ID Pesanan */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-bold text-neutral-900">#{order.id.substring(0, 8)}</p>
                        <p className="text-xs text-neutral-500">{formatDate(order.created_at)}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                          {order.metode_pengambilan}
                        </span>
                      </td>

                      {/* Penjual */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Store size={15} className="text-orange-600 shrink-0" />
                          <div>
                            <p className="font-bold text-neutral-900">{order.produk?.penjual?.nama || "Toko Penjual"}</p>
                            <p className="text-xs text-neutral-500">{order.produk?.penjual?.nomor_hp || order.produk?.penjual?.email || "-"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Pembeli */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <User size={15} className="text-blue-600 shrink-0" />
                          <div>
                            <p className="font-bold text-neutral-900">{order.pembeli?.nama || "Pembeli"}</p>
                            <p className="text-xs text-neutral-500">{order.pembeli?.nomor_hp || order.pembeli?.email || "-"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Makanan & Nominal */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-neutral-900">{order.produk?.nama_makanan}</p>
                        <p className="font-extrabold text-orange-600 text-sm">{formatCurrency(order.produk?.harga_diskon || 0)}</p>
                      </td>

                      {/* Bukti Bayar (Thumbnail + Tombol Buka Bukti) */}
                      <td className="py-3.5 px-4">
                        {order.bukti_bayar_url ? (
                          <div className="flex flex-col gap-1.5 items-start">
                            <div
                              onClick={() => setSelectedProof(order.bukti_bayar_url)}
                              className="group relative w-16 h-16 rounded-xl overflow-hidden border border-neutral-200 hover:border-orange-500 transition-all flex items-center justify-center bg-neutral-100 cursor-pointer shadow-2xs"
                              title="Klik untuk memperbesar bukti transfer"
                            >
                              <img 
                                src={order.bukti_bayar_url} 
                                alt="Bukti Transfer" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye size={18} />
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedProof(order.bukti_bayar_url)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <Eye size={11} /> Lihat Bukti
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">Tidak ada bukti</span>
                        )}
                      </td>

                      {/* Status Escrow */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {escrow === "pending" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={12} /> Perlu Cek Bank
                          </span>
                        )}
                        {escrow === "approved" && (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} /> Dana Sah
                            </span>
                            <p className="text-[10px] text-neutral-400 mt-0.5">Sudah masuk saldo toko</p>
                          </div>
                        )}
                        {escrow === "rejected" && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                              <XCircle size={12} /> Ditolak
                            </span>
                            {isDisputeActive ? (
                              <p className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Sisa Sanggah: {remainingDays} Hari
                              </p>
                            ) : (
                              <p className="text-[10px] text-neutral-400">Masa sanggah habis</p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {escrow === "pending" && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setActiveAction({ order, type: "approve" })}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => setActiveAction({ order, type: "reject" })}
                              className="px-3 py-1.5 bg-neutral-100 hover:bg-red-50 hover:text-red-700 text-neutral-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-neutral-200"
                            >
                              Tolak
                            </button>
                          </div>
                        )}

                        {escrow === "rejected" && isDisputeActive && (
                          <button
                            onClick={() => setActiveAction({ order, type: "reapprove" })}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
                            title="Tinjau ulang dan setujui dalam masa 7 hari sanggah"
                          >
                            Tinjau Ulang & Setujui
                          </button>
                        )}

                        {escrow === "approved" && (
                          <span className="text-xs text-neutral-400 font-semibold italic">Terverifikasi</span>
                        )}
                        {escrow === "rejected" && !isDisputeActive && (
                          <span className="text-xs text-neutral-400 font-semibold italic">Permanen Ditolak</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL KONFIRMASI AKSI (SETUJUI / TOLAK / TINJAU ULANG) DENGAN FOTO BUKTI */}
      {activeAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-7 shadow-2xl border border-neutral-100 max-h-[92vh] overflow-y-auto">
            <h3 className="text-xl font-black text-neutral-900 mb-1">
              {activeAction.type === "approve"
                ? "Setujui Pembayaran Transaksi"
                : activeAction.type === "reapprove"
                ? "Tinjau Ulang & Lepas Dana (Masa Sanggah)"
                : "Tolak Transaksi Pembayaran"}
            </h3>

            <p className="text-xs text-neutral-600 mb-4 leading-relaxed">
              {activeAction.type === "approve"
                ? "Pastikan uang riil dari pembeli telah masuk ke rekening mutasi bank Anda. Dana akan langsung dipindahkan ke saldo utama penjual."
                : activeAction.type === "reapprove"
                ? "Penjual berhasil membuktikan keabsahan transaksi. Dana akan dicairkan ke saldo utama penjual."
                : "Transaksi ini dianggap fiktif / uang tidak masuk. Dana tidak akan diberikan ke penjual, namun penjual diberi waktu sanggah 7 hari."}
            </p>

            {/* RINGKASAN DATA TRANSAKSI */}
            <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Toko Penjual:</span>
                <span className="font-bold text-neutral-900">{activeAction.order.produk?.penjual?.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Nama Pembeli:</span>
                <span className="font-semibold text-neutral-800">{activeAction.order.pembeli?.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Nominal Hak Toko:</span>
                <span className="font-black text-orange-600 text-sm">{formatCurrency(activeAction.order.produk?.harga_diskon || 0)}</span>
              </div>
            </div>

            {/* FOTO BUKTI PEMBAYARAN DI DALAM MODAL KONFIRMASI */}
            {activeAction.order.bukti_bayar_url ? (
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Foto Bukti Transfer Pembeli:
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedProof(activeAction.order.bukti_bayar_url)}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={12} /> Perbesar Foto
                  </button>
                </div>
                <div 
                  onClick={() => setSelectedProof(activeAction.order.bukti_bayar_url)}
                  className="relative cursor-pointer rounded-xl overflow-hidden border border-neutral-300 bg-neutral-100 hover:border-orange-500 group max-h-52 flex items-center justify-center p-1"
                >
                  <img 
                    src={activeAction.order.bukti_bayar_url} 
                    alt="Bukti Transfer Pembeli" 
                    className="max-h-48 w-auto max-w-full object-contain rounded-lg" 
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs gap-1.5 transition-opacity rounded-xl">
                    <Eye size={16} /> Klik untuk melihat ukuran penuh
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 mb-4 font-medium">
                Perhatian: Pesanan ini tidak memiliki unggahan foto bukti bayar.
              </div>
            )}

            <form onSubmit={handleActionConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  {activeAction.type === "reject" ? "Alasan Penolakan (Wajib Diisi)" : "Catatan Verifikasi (Opsional)"}
                </label>
                <textarea
                  required={activeAction.type === "reject"}
                  rows={2}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={
                    activeAction.type === "reject" 
                      ? "Contoh: Mutasi rekening tidak ditemukan atau bukti transfer terindikasi palsu." 
                      : "Contoh: Uang sudah masuk mutasi BCA."
                  }
                  className="w-full border border-neutral-300 rounded-xl p-3 text-xs text-neutral-900 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveAction(null)}
                  className="flex-1 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer ${
                    activeAction.type === "reject"
                      ? "bg-red-600 hover:bg-red-700 shadow-red-600/30"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                  }`}
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : "Konfirmasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIHAT GAMBAR BUKTI TRANSFER LENGKAP */}
      {selectedProof && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-2xs p-4" 
          onClick={() => setSelectedProof(null)}
        >
          <div 
            className="relative bg-neutral-900 rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-700" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal Bukti */}
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-800 border-b border-neutral-700">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt size={16} className="text-orange-400" /> Bukti Transfer Pembayaran Pembeli
              </span>
              <button 
                onClick={() => setSelectedProof(null)}
                className="text-neutral-400 hover:text-white bg-neutral-700/60 hover:bg-neutral-700 rounded-lg p-1.5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Gambar Bukti Penuh */}
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[75vh] bg-neutral-950">
              <img 
                src={selectedProof} 
                alt="Bukti Transfer Pembeli" 
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-md" 
              />
            </div>

            {/* Footer Modal Bukti */}
            <div className="px-4 py-2.5 bg-neutral-800 border-t border-neutral-700 flex justify-end">
              <button
                onClick={() => setSelectedProof(null)}
                className="px-4 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}