"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { Wallet as WalletIcon, ArrowUpRight, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Loader2, Building2 } from "lucide-react";

export default function Wallet({ merchantId, onGoToSettings }: { merchantId: string, onGoToSettings?: () => void }) {
  const [saldo, setSaldo] = useState<number>(0);
  const [merchantProfile, setMerchantProfile] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const hasBankInfo = Boolean(merchantProfile?.no_rekening && merchantProfile.no_rekening.trim().length > 3);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Ambil Profil dan Saldo Penjual
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, nama, no_rekening, saldo_penjual')
        .eq('id', merchantId)
        .single();

      if (profileData) {
        setMerchantProfile(profileData);
        setSaldo(Number(profileData.saldo_penjual) || 0);
        setAccountNumber(profileData.no_rekening || "");
        setAccountHolder(profileData.nama || "");
      }

      // 2. Ambil Riwayat Penarikan Dana
      const { data: withdrawData } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('penjual_id', merchantId)
        .order('created_at', { ascending: false });

      if (withdrawData) {
        setWithdrawals(withdrawData);
      }
    } catch (error) {
      console.error("Gagal menarik data keuangan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (merchantId) fetchData();
  }, [merchantId]);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!hasBankInfo) {
      setErrorMsg("Anda wajib mengatur nomor rekening bank di menu Pengaturan terlebih dahulu.");
      return;
    }

    const withdrawAmount = parseInt(amount);
    if (!withdrawAmount || withdrawAmount < 10000) {
      setErrorMsg("Minimal penarikan adalah Rp 10.000");
      return;
    }
    if (withdrawAmount > saldo) {
      setErrorMsg("Saldo tidak mencukupi untuk melakukan penarikan ini.");
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setErrorMsg("Semua informasi rekening tujuan penarikan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Potong saldo di tabel profiles
      const saldoSisa = saldo - withdrawAmount;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ saldo_penjual: saldoSisa })
        .eq('id', merchantId);

      if (profileError) throw profileError;

      // Catat ke tabel withdrawals
      const { error: withdrawError } = await supabase
        .from('withdrawals')
        .insert([{
          penjual_id: merchantId,
          nominal: withdrawAmount,
          bank_tujuan: bankName,
          nomor_rekening: accountNumber,
          nama_pemilik_rekening: accountHolder,
          status: 'pending'
        }]);

      if (withdrawError) throw withdrawError;

      alert("Pengajuan penarikan dana berhasil dikirim! Admin akan segera memproses transfer.");
      setIsModalOpen(false);
      setAmount("");
      fetchData();
    } catch (err: any) {
      console.error("Gagal mengajukan penarikan:", err);
      setErrorMsg("Terjadi kesalahan: " + (err.message || "Gagal memproses."));
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="space-y-6">
      {/* Peringatan Rekening Belum Diatur */}
      {!hasBankInfo && (
        <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0 mt-0.5">
              <AlertCircle size={22} />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-base">Rekening Bank Pencairan Belum Diatur</h4>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Fitur penarikan dana terkunci. Anda <strong>wajib melengkapi data nomor rekening bank</strong> di menu Pengaturan terlebih dahulu sebelum dapat mencairkan saldo.
              </p>
            </div>
          </div>
          {onGoToSettings && (
            <button 
              onClick={onGoToSettings}
              className="whitespace-nowrap px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
            >
              Atur Rekening Sekarang
            </button>
          )}
        </div>
      )}

      {/* Kartu Saldo */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-neutral-700">
        <div>
          <div className="flex items-center gap-2 text-neutral-400 mb-2">
            <WalletIcon size={20} className="text-orange-500" />
            <span className="text-sm font-semibold uppercase tracking-wider">Saldo Hasil Penjualan (Escrow)</span>
          </div>
          <p className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
            {formatCurrency(saldo)}
          </p>
          <p className="text-xs text-neutral-400">
            *Pendapatan dari pesanan bertambah otomatis setelah status pesanan diselesaikan (Completed).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => {
              if (!hasBankInfo) {
                alert("Anda wajib mengatur nomor rekening bank di menu Pengaturan terlebih dahulu.");
                if (onGoToSettings) onGoToSettings();
                return;
              }
              setIsModalOpen(true);
            }}
            disabled={saldo < 10000 || !hasBankInfo}
            className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white font-bold px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-orange-600/30 disabled:shadow-none"
          >
            <ArrowUpRight size={20} /> {!hasBankInfo ? "Rekening Belum Diatur" : "Tarik Saldo"}
          </button>
          <button 
            onClick={fetchData}
            className="p-3.5 bg-neutral-700/60 hover:bg-neutral-700 rounded-2xl text-neutral-300 transition-colors flex items-center justify-center"
            title="Muat ulang saldo"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tabel Riwayat Penarikan */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-neutral-900">Riwayat Penarikan Dana</h3>
            <p className="text-sm text-neutral-500">Status pencairan dana ke rekening bank Anda.</p>
          </div>
        </div>

        {withdrawals.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 font-medium">
            Belum ada riwayat penarikan dana.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 text-xs uppercase font-bold tracking-wider border-b border-neutral-100">
                  <th className="py-4 px-6">Tanggal</th>
                  <th className="py-4 px-6">Nominal</th>
                  <th className="py-4 px-6">Rekening Tujuan</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Catatan Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-6 text-neutral-500 font-medium">{formatDate(w.created_at)}</td>
                    <td className="py-4 px-6 font-bold text-neutral-900">{formatCurrency(w.nominal)}</td>
                    <td className="py-4 px-6">
                      <p className="font-semibold text-neutral-800">{w.bank_tujuan} - {w.nomor_rekening}</p>
                      <p className="text-xs text-neutral-500">A.N. {w.nama_pemilik_rekening}</p>
                    </td>
                    <td className="py-4 px-6">
                      {w.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                          <Clock size={12} /> Menunggu Transfer
                        </span>
                      )}
                      {w.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 size={12} /> Berhasil Ditransfer
                        </span>
                      )}
                      {w.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                          <XCircle size={12} /> Ditolak
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs text-neutral-500">
                      {w.catatan_admin || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL TARIK DANA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-neutral-900 mb-1">Tarik Saldo Pendapatan</h3>
            <p className="text-sm text-neutral-500 mb-6">Dana akan dikirim oleh admin LASTBITE ke rekening tujuan Anda.</p>

            {errorMsg && (
              <div className="p-3.5 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Jumlah Penarikan (Rp)</label>
                <input 
                  type="number"
                  min="10000"
                  max={saldo}
                  required
                  placeholder="Min. 10.000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-neutral-300 rounded-xl p-3 text-lg font-bold text-neutral-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                <p className="text-xs text-neutral-500 mt-1">Saldo tersedia: <span className="font-bold text-neutral-800">{formatCurrency(saldo)}</span></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Bank / E-Wallet Tujuan</label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: BCA / Mandiri / GoPay"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full border border-neutral-300 rounded-xl p-3 text-sm text-neutral-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Nomor Rekening / No. HP E-Wallet</label>
                <input 
                  type="text"
                  required
                  placeholder="Nomor rekening Anda"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full border border-neutral-300 rounded-xl p-3 text-sm text-neutral-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Nama Pemilik Rekening</label>
                <input 
                  type="text"
                  required
                  placeholder="Sesuai buku tabungan"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full border border-neutral-300 rounded-xl p-3 text-sm text-neutral-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-orange-600/30"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Konfirmasi Tarik"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
