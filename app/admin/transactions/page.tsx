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
      // 1. Ambil saldo terkini penjual
      const { data: sellerData, error: sErr } = await supabase
        .from("profiles")
        .select("saldo_penjual, saldo_tertahan")
        .eq("id", sellerId)
        .single();

      if (sErr || !sellerData) throw new Error("Gagal mengambil profil penjual.");

      const currentAvailable = Number(sellerData.saldo_penjual || 0);
      const currentPending = Number(sellerData.saldo_tertahan || 0);

      if (type === "approve" || type === "reapprove") {
        // SETUJUI TRANSAKSI
        let newPending = currentPending;
        let newAvailable = currentAvailable + nominal;

        // Jika sebelumnya berstatus 'pending', kurangi saldo tertahan
        if (order.escrow_status === "pending") {
          newPending = Math.max(0, currentPending - nominal);
        }

        // Update profil penjual
        const { error: profErr } = await supabase
          .from("profiles")
          .update({
            saldo_penjual: newAvailable,
            saldo_tertahan: newPending
          })
          .eq("id", sellerId);

        if (profErr) throw profErr;

        // Update pesanan
        const { error: ordErr } = await supabase
          .from("pesanan")
          .update({
            escrow_status: "approved",
            catatan_verifikasi: type === "reapprove" 
              ? `Disetujui kembali via masa sanggah: ${actionReason || "Bukti valid"}` 
              : (actionReason || "Pembayaran diverifikasi sah"),
            verified_at: new Date().toISOString()
          })
          .eq("id", order.id);

        if (ordErr) throw ordErr;
        alert(type === "reapprove" ? "Masa sanggah diterima! Dana berhasil dipindahkan ke saldo utama penjual." : "Transaksi disetujui! Dana berhasil masuk ke saldo utama penjual.");

      } else if (type === "reject") {
        // TOLAK TRANSAKSI
        if (!actionReason.trim()) {
          alert("Alasan penolakan wajib diisi agar penjual mengetahui detailnya.");
          setIsProcessing(false);
          return;
        }

        // Kurangi saldo tertahan jika sebelumnya berstatus pending
        let newPending = currentPending;
        if (order.escrow_status === "pending") {
          newPending = Math.max(0, currentPending - nominal);
        }

        const { error: profErr } = await supabase
          .from("profiles")
          .update({ saldo_tertahan: newPending })
          .eq("id", sellerId);

        if (profErr) throw profErr;

        // Catat rejected_at dan masa sanggah
        const { error: ordErr } = await supabase
          .from("pesanan")
          .update({
            escrow_status: "rejected",
            rejected_at: new Date().toISOString(),
            catatan_verifikasi: actionReason.trim()
          })
          .eq("id", order.id);

        if (ordErr) throw ordErr;
        alert("Transaksi ditolak. Penjual memiliki waktu 7 hari untuk mengajukan bukti sanggahan.");
      }

      setActiveAction(null);
      setActionReason("");
      fetchOrders();
    } catch (err: any) {
      console.error("Gagal memperbarui status escrow:", err);
      alert("Terjadi kesalahan: " + (err.message || "Gagal memproses."));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const filteredOrders = orders.filter((o) => {
    const escrow = o.escrow_status || "pending";
    const matchesFilter = filter === "all" || escrow === filter;

    const buyerName = o.pembeli?.nama?.toLowerCase() || "";
    const sellerName = o.produk?.penjual?.nama?.toLowerCase() || "";
    const foodName = o.produk?.nama_makanan?.toLowerCase() || "";
    const query = search.toLowerCase();

    const matchesSearch = buyerName.includes(query) || sellerName.includes(query) || foodName.includes(query);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = orders.filter(o => (o.escrow_status || "pending") === "pending").length;
  const approvedCount = orders.filter(o => o.escrow_status === "approved").length;
  const rejectedCount = orders.filter(o => o.escrow_status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-neutral-900">Verifikasi Transaksi & Escrow</h1>
          <p className="text-neutral-600 mt-1 font-medium">
            Verifikasi mutasi rekening masuk sebelum dana diteruskan ke saldo utama toko penjual.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-sm transition-colors w-fit"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Muat Ulang
        </button>
      </div>

      {/* STATS KARTU */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Perlu Verifikasi</p>
            <p className="text-3xl font-black text-amber-600">{pendingCount}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Dana Disetujui</p>
            <p className="text-3xl font-black text-emerald-600">{approvedCount}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Ditolak / Sanggah (7 Hari)</p>
            <p className="text-3xl font-black text-red-600">{rejectedCount}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* FILTER & PENCARIAN */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text"
            placeholder="Cari penjual, pembeli, atau makanan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-neutral-900"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: "all", label: "Semua" },
            { id: "pending", label: `Perlu Dicek (${pendingCount})` },
            { id: "approved", label: "Disetujui" },
            { id: "rejected", label: `Ditolak (${rejectedCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                filter === tab.id 
                  ? "bg-neutral-900 text-white" 
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABEL TRANSAKSI */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-orange-600" /> Memuat data transaksi...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 font-medium">
            Tidak ada transaksi pada kategori ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 text-xs uppercase font-bold tracking-wider border-b border-neutral-100">
                  <th className="py-4 px-6">Waktu & Pesanan</th>
                  <th className="py-4 px-6">Identitas Penjual</th>
                  <th className="py-4 px-6">Identitas Pembeli</th>
                  <th className="py-4 px-6">Nominal & Makanan</th>
                  <th className="py-4 px-6">Bukti Transfer</th>
                  <th className="py-4 px-6">Status Escrow</th>
                  <th className="py-4 px-6 text-right">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {filteredOrders.map((order) => {
                  const escrow = order.escrow_status || "pending";
                  const remainingDays = getRemainingDisputeDays(order.rejected_at);
                  const isDisputeActive = escrow === "rejected" && remainingDays > 0;

                  return (
                    <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors">
                      {/* Waktu & ID */}
                      <td className="py-4 px-6">
                        <p className="font-bold text-neutral-900">#{order.id.substring(0, 8)}</p>
                        <p className="text-xs text-neutral-500">{formatDate(order.created_at)}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                          {order.metode_pengambilan}
                        </span>
                      </td>

                      {/* Penjual */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Store size={15} className="text-orange-600 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-neutral-900">{order.produk?.penjual?.nama || "Toko Penjual"}</p>
                            <p className="text-xs text-neutral-500">{order.produk?.penjual?.nomor_hp || order.produk?.penjual?.email || "-"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Pembeli */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <User size={15} className="text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-neutral-900">{order.pembeli?.nama || "Pembeli"}</p>
                            <p className="text-xs text-neutral-500">{order.pembeli?.nomor_hp || order.pembeli?.email || "-"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Makanan & Nominal */}
                      <td className="py-4 px-6">
                        <p className="font-bold text-neutral-900">{order.produk?.nama_makanan}</p>
                        <p className="font-extrabold text-orange-600 text-sm">{formatCurrency(order.produk?.harga_diskon || 0)}</p>
                      </td>

                      {/* Bukti Bayar */}
                      <td className="py-4 px-6">
                        {order.bukti_bayar_url ? (
                          <button
                            onClick={() => setSelectedProof(order.bukti_bayar_url)}
                            className="group relative w-12 h-12 rounded-xl overflow-hidden border border-neutral-200 hover:border-orange-500 transition-all flex items-center justify-center bg-neutral-100"
                            title="Klik untuk melihat bukti penuh"
                          >
                            <img src={order.bukti_bayar_url} alt="Bukti Transfer" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye size={16} />
                            </div>
                          </button>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">Tidak ada bukti</span>
                        )}
                      </td>

                      {/* Status Escrow */}
                      <td className="py-4 px-6">
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
                      <td className="py-4 px-6 text-right">
                        {escrow === "pending" && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setActiveAction({ order, type: "approve" })}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => setActiveAction({ order, type: "reject" })}
                              className="px-3 py-1.5 bg-neutral-100 hover:bg-red-50 hover:text-red-700 text-neutral-700 font-bold rounded-xl text-xs transition-colors"
                            >
                              Tolak
                            </button>
                          </div>
                        )}

                        {escrow === "rejected" && isDisputeActive && (
                          <button
                            onClick={() => setActiveAction({ order, type: "reapprove" })}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors"
                            title="Tinjau ulang bukti dan teruskan dana jika penjual sah"
                          >
                            Tinjau Ulang & Setujui
                          </button>
                        )}

                        {escrow === "approved" && (
                          <span className="text-xs text-neutral-400 font-medium">Selesai</span>
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

      {/* MODAL KONFIRMASI AKSI (SETUJUI / TOLAK / TINJAU ULANG) */}
      {activeAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-neutral-100">
            <h3 className="text-xl font-black text-neutral-900 mb-2">
              {activeAction.type === "approve"
                ? "Setujui Pembayaran Transaksi"
                : activeAction.type === "reapprove"
                ? "Tinjau Ulang & Lepas Dana (Masa Sanggah)"
                : "Tolak Transaksi Pembayaran"}
            </h3>

            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              {activeAction.type === "approve"
                ? "Pastikan uang riil dari pembeli telah masuk ke rekening mutasi bank Anda. Dana akan langsung dipindahkan ke saldo utama penjual."
                : activeAction.type === "reapprove"
                ? "Penjual berhasil membuktikan keabsahan transaksi. Dana akan dicairkan ke saldo utama penjual."
                : "Transaksi ini dianggap fiktif / uang tidak masuk. Dana tidak akan diberikan ke penjual, namun penjual diberi waktu sanggah 7 hari."}
            </p>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 mb-4 space-y-1.5 text-sm">
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
                <span className="font-black text-orange-600 text-base">{formatCurrency(activeAction.order.produk?.harga_diskon || 0)}</span>
              </div>
            </div>

            <form onSubmit={handleActionConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  {activeAction.type === "reject" ? "Alasan Penolakan (Wajib Diisi)" : "Catatan Verifikasi (Opsional)"}
                </label>
                <textarea
                  required={activeAction.type === "reject"}
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={
                    activeAction.type === "reject" 
                      ? "Contoh: Mutasi rekening tidak ditemukan atau bukti transfer terindikasi rekayasa." 
                      : "Contoh: Uang sudah masuk ke mutasi BCA."
                  }
                  className="w-full border border-neutral-300 rounded-xl p-3 text-sm text-neutral-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveAction(null)}
                  className="flex-1 px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white font-bold rounded-xl text-sm transition-colors shadow-md ${
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedProof(null)}>
          <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedProof(null)}
              className="absolute -top-12 right-0 text-white hover:text-red-400 bg-neutral-800 hover:bg-neutral-900 rounded-full p-2 transition-all"
            >
              <X size={24} />
            </button>
            <img 
              src={selectedProof} 
              alt="Bukti Transfer Pembeli" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border-2 border-neutral-700" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
