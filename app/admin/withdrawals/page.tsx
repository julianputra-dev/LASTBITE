"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { CreditCard, CheckCircle2, XCircle, Clock, Search, AlertCircle, ArrowUpRight, Loader2, Building2 } from "lucide-react";

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Approval / Rejection Modal State
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("withdrawals")
        .select(`
          id,
          penjual_id,
          nominal,
          bank_tujuan,
          nomor_rekening,
          nama_pemilik_rekening,
          status,
          catatan_admin,
          created_at,
          profiles (
            nama,
            email,
            nomor_hp,
            saldo_penjual
          )
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setWithdrawals(data);
      }
    } catch (err) {
      console.error("Gagal mengambil data penarikan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleActionConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !actionType) return;

    setIsProcessing(true);
    try {
      if (actionType === "approve") {
        // Update status menjadi approved
        const { error } = await supabase
          .from("withdrawals")
          .update({
            status: "approved",
            catatan_admin: adminNote.trim() || "Transfer telah diselesaikan oleh admin.",
            updated_at: new Date().toISOString()
          })
          .eq("id", selectedItem.id);

        if (error) throw error;
        alert("Pencairan dana berhasil disetujui!");
      } else if (actionType === "reject") {
        if (!adminNote.trim()) {
          alert("Alasan penolakan wajib diisi agar penjual mengetahui alasannya.");
          setIsProcessing(false);
          return;
        }

        // 1. Kembalikan saldo ke penjual
        const currentSaldo = Number(selectedItem.profiles?.saldo_penjual) || 0;
        const refundedSaldo = currentSaldo + Number(selectedItem.nominal);

        const { error: profileError } = await supabase
          .from("profiles")
          .update({ saldo_penjual: refundedSaldo })
          .eq("id", selectedItem.penjual_id);

        if (profileError) throw profileError;

        // 2. Update status withdrawal menjadi rejected
        const { error: withdrawError } = await supabase
          .from("withdrawals")
          .update({
            status: "rejected",
            catatan_admin: adminNote.trim(),
            updated_at: new Date().toISOString()
          })
          .eq("id", selectedItem.id);

        if (withdrawError) throw withdrawError;
        alert("Pencairan ditolak dan dana telah dikembalikan ke saldo penjual.");
      }

      setSelectedItem(null);
      setActionType(null);
      setAdminNote("");
      fetchWithdrawals();
    } catch (err: any) {
      console.error("Gagal memproses aksi:", err);
      alert("Terjadi kesalahan: " + (err.message || "Gagal memproses."));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
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

  // Kalkulasi statistik
  const pendingItems = withdrawals.filter(w => w.status === 'pending');
  const totalPendingNominal = pendingItems.reduce((acc, curr) => acc + Number(curr.nominal || 0), 0);
  const approvedItems = withdrawals.filter(w => w.status === 'approved');
  const totalApprovedNominal = approvedItems.reduce((acc, curr) => acc + Number(curr.nominal || 0), 0);

  const filteredList = withdrawals.filter(item => {
    const matchFilter = filter === "all" || item.status === filter;
    const tokoName = item.profiles?.nama?.toLowerCase() || "";
    const bankName = item.bank_tujuan?.toLowerCase() || "";
    const rek = item.nomor_rekening || "";
    const matchSearch = tokoName.includes(search.toLowerCase()) || 
                        bankName.includes(search.toLowerCase()) ||
                        rek.includes(search);
    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-neutral-900">Pencairan Dana (Withdrawals)</h1>
        <p className="text-neutral-600 mt-1 font-medium">Kelola dan verifikasi transfer penarikan hasil penjualan mitra toko.</p>
      </div>

      {/* STATS KARTU */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Menunggu Transfer ({pendingItems.length})</p>
            <p className="text-3xl font-black text-orange-600">{formatCurrency(totalPendingNominal)}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Total Berhasil Dicairkan ({approvedItems.length})</p>
            <p className="text-3xl font-black text-emerald-600">{formatCurrency(totalApprovedNominal)}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* FILTER & PENCARIAN */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text"
            placeholder="Cari nama toko, bank, atau no rek..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-neutral-900"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {["all", "pending", "approved", "rejected"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                filter === tab 
                  ? "bg-neutral-900 text-white" 
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {tab === "all" ? "Semua" : tab === "pending" ? "Menunggu" : tab === "approved" ? "Selesai" : "Ditolak"}
            </button>
          ))}
        </div>
      </div>

      {/* TABEL DAFTAR WITHDRAWAL */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-orange-600" /> Memuat data...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 font-medium">
            Tidak ada data pengajuan penarikan dana.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 text-xs uppercase font-bold tracking-wider border-b border-neutral-100">
                  <th className="py-4 px-6">Tanggal</th>
                  <th className="py-4 px-6">Toko / Penjual</th>
                  <th className="py-4 px-6">Nominal</th>
                  <th className="py-4 px-6">Rekening Tujuan</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-6 text-neutral-500 font-medium">{formatDate(item.created_at)}</td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-neutral-900">{item.profiles?.nama || "Mitra"}</p>
                      <p className="text-xs text-neutral-500">{item.profiles?.nomor_hp || item.profiles?.email || "-"}</p>
                    </td>
                    <td className="py-4 px-6 font-extrabold text-neutral-900 text-base">
                      {formatCurrency(item.nominal)}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-neutral-800">{item.bank_tujuan} - {item.nomor_rekening}</p>
                      <p className="text-xs text-neutral-500">A.N. {item.nama_pemilik_rekening}</p>
                    </td>
                    <td className="py-4 px-6">
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                          <Clock size={12} /> Menunggu Transfer
                        </span>
                      )}
                      {item.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 size={12} /> Berhasil
                        </span>
                      )}
                      {item.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                          <XCircle size={12} /> Ditolak
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {item.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setActionType("approve");
                              setAdminNote("Transfer selesai melalui m-Banking.");
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setActionType("reject");
                              setAdminNote("");
                            }}
                            className="bg-neutral-200 hover:bg-red-100 hover:text-red-700 text-neutral-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400 font-medium">
                          {item.catatan_admin || "-"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL AKSI (SETUJUI / TOLAK) */}
      {selectedItem && actionType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-neutral-100">
            <h3 className="text-xl font-black text-neutral-900 mb-2">
              {actionType === "approve" ? "Konfirmasi Transfer Berhasil" : "Tolak Pengajuan Penarikan"}
            </h3>
            <p className="text-sm text-neutral-500 mb-4">
              {actionType === "approve"
                ? "Pastikan Anda telah mentransfer dana ke rekening penjual sebelum menyetujui."
                : "Saldo penarikan akan otomatis dikembalikan ke akun penjual."}
            </p>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 mb-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Toko:</span>
                <span className="font-bold text-neutral-900">{selectedItem.profiles?.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Nominal:</span>
                <span className="font-black text-orange-600 text-base">{formatCurrency(selectedItem.nominal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Tujuan:</span>
                <span className="font-semibold text-neutral-800">{selectedItem.bank_tujuan} - {selectedItem.nomor_rekening}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Atas Nama:</span>
                <span className="font-semibold text-neutral-800">{selectedItem.nama_pemilik_rekening}</span>
              </div>
            </div>

            <form onSubmit={handleActionConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  {actionType === "approve" ? "Catatan / Nomor Referensi Transfer" : "Alasan Penolakan (Wajib Diisi)"}
                </label>
                <textarea
                  required={actionType === "reject"}
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={actionType === "approve" ? "Contoh: Transfer via BCA No Reff 129304" : "Contoh: Nomor rekening tidak aktif atau nama tidak sesuai."}
                  className="w-full border border-neutral-300 rounded-xl p-3 text-sm text-neutral-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    setActionType(null);
                  }}
                  className="flex-1 px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white font-bold rounded-xl text-sm transition-colors shadow-md ${
                    actionType === "approve" 
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30" 
                      : "bg-red-600 hover:bg-red-700 shadow-red-600/30"
                  }`}
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : actionType === "approve" ? "Konfirmasi Selesai" : "Konfirmasi Tolak"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
