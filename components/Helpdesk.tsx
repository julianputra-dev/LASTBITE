"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { 
  MessageSquare, 
  AlertCircle, 
  CreditCard, 
  ShieldAlert, 
  Upload, 
  X, 
  Eye, 
  Image as ImageIcon, 
  CheckCircle2, 
  User, 
  Clock 
} from "lucide-react";

type HelpdeskTag = "Saran" | "Keluhan" | "Masalah Transaksi" | "Laporan";

export default function Helpdesk({ role, userId }: { role: string, userId: string }) {
  const [selectedTag, setSelectedTag] = useState<HelpdeskTag>("Keluhan");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reportedAccount, setReportedAccount] = useState("");
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const tagsConfig = [
    { 
      id: "Saran" as HelpdeskTag, 
      label: "Saran", 
      icon: MessageSquare, 
      color: "bg-blue-50 text-blue-700 border-blue-200", 
      desc: "Ide atau masukan pengembangan fitur" 
    },
    { 
      id: "Keluhan" as HelpdeskTag, 
      label: "Keluhan", 
      icon: AlertCircle, 
      color: "bg-yellow-50 text-yellow-700 border-yellow-200", 
      desc: "Kendala sistem atau keluhan umum" 
    },
    { 
      id: "Masalah Transaksi" as HelpdeskTag, 
      label: "Masalah Transaksi", 
      icon: CreditCard, 
      color: "bg-orange-50 text-orange-700 border-orange-200", 
      desc: "Sengketa pesanan atau dana tertahan" 
    },
    { 
      id: "Laporan" as HelpdeskTag, 
      label: "Laporan Akun", 
      icon: ShieldAlert, 
      color: "bg-red-50 text-red-700 border-red-200", 
      desc: "Laporkan akun mencurigakan atau fiktif" 
    },
  ];

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from("help_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setFetchError(error.message);
    } else if (data) {
      setTickets(data);
    }
  };

  useEffect(() => {
    if (userId) fetchTickets();
  }, [userId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (evidencePhotos.length + files.length > 7) {
      alert("Maksimal 7 foto bukti yang dapat diunggah.");
      return;
    }

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} melebihi batas 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.6);
          setEvidencePhotos((prev) => (prev.length < 7 ? [...prev, compressed] : prev));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setEvidencePhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTag === "Laporan" && !reportedAccount.trim()) {
      alert("Harap sebutkan nama akun yang Anda laporkan.");
      return;
    }

    setLoading(true);
    const finalSubject = subject.trim() || `${selectedTag}: ${message.substring(0, 30)}...`;

    const payload: any = {
      user_id: userId,
      role,
      subject: finalSubject,
      message,
      is_anonymous: isAnonymous,
      tag: selectedTag,
      reported_account: selectedTag === "Laporan" ? reportedAccount.trim() : null,
      evidence_photos: selectedTag !== "Saran" ? evidencePhotos : []
    };

    const { error } = await supabase
      .from("help_tickets")
      .insert([payload]);

    setLoading(false);
    if (error) {
      alert("Gagal mengirim tiket bantuan. Error: " + error.message);
    } else {
      setSubject("");
      setMessage("");
      setReportedAccount("");
      setEvidencePhotos([]);
      setIsAnonymous(false);
      fetchTickets();
      alert("Tiket pengaduan / bantuan Anda berhasil dikirim!");
    }
  };

  const allowsEvidence = selectedTag !== "Saran";

  return (
    <div className="space-y-6">
      {/* FORM PENGADUAN */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-neutral-100 space-y-6">
        <div>
          <h2 className="text-2xl font-black text-neutral-900">Pusat Bantuan & Layanan</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Kirimkan saran, kendala pesanan, keluhan transaksi, atau laporkan akun yang bermasalah.
          </p>
        </div>

        {fetchError && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs font-bold">
            Gagal memuat tiket: {fetchError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PILIHAN TAG / KATEGORI */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2.5">
              Kategori Permasalahan (Pilih Tag)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tagsConfig.map((t) => {
                const Icon = t.icon;
                const isSelected = selectedTag === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTag(t.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20 shadow-sm"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div className={`p-2 rounded-xl flex-shrink-0 ${isSelected ? "bg-orange-600 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isSelected ? "text-orange-950" : "text-neutral-900"}`}>{t.label}</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">{t.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* INPUT KHUSUS LAPORAN AKUN */}
          {selectedTag === "Laporan" && (
            <div className="p-4 bg-red-50/60 rounded-2xl border border-red-200 space-y-2 animate-in fade-in duration-200">
              <label className="flex items-center gap-2 text-xs font-bold text-red-900 uppercase tracking-wider">
                <ShieldAlert size={16} className="text-red-600" /> Nama Akun / Toko yang Dilaporkan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={reportedAccount}
                onChange={(e) => setReportedAccount(e.target.value)}
                placeholder="Contoh: Toko Berkah / Pembeli Budi123"
                className="w-full border border-red-300 bg-white p-3 rounded-xl focus:ring-2 focus:ring-red-500 text-sm text-neutral-900 font-semibold outline-none"
              />
              <p className="text-[11px] text-red-700">
                Cantumkan nama akun atau nama toko yang terindikasi melakukan penipuan, pesanan fiktif, atau pelanggaran.
              </p>
            </div>
          )}

          {/* SUBJEK & DESKRIPSI */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Subjek Laporan / Topik
              </label>
              <input 
                required 
                type="text" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                className="w-full border border-neutral-300 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 text-sm text-neutral-900 bg-white outline-none" 
                placeholder={
                  selectedTag === "Saran"
                    ? "Contoh: Usulan fitur diskon jam tertentu"
                    : selectedTag === "Masalah Transaksi"
                    ? "Contoh: Sanggahan pesanan #12345678"
                    : selectedTag === "Laporan"
                    ? "Contoh: Laporan akun pembeli fiktif"
                    : "Contoh: Kendala aplikasi tidak bisa membuka peta"
                } 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Deskripsi Terperinci Kejadian <span className="text-orange-600">*</span>
              </label>
              <textarea 
                required 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                rows={4} 
                className="w-full border border-neutral-300 p-3.5 rounded-xl focus:ring-2 focus:ring-orange-500 text-sm text-neutral-900 bg-white outline-none leading-relaxed" 
                placeholder={
                  selectedTag === "Masalah Transaksi"
                    ? "Jelaskan kronologi transaksi, nomor pesanan, dan mengapa transaksi ini valid..."
                    : selectedTag === "Laporan"
                    ? "Jelaskan kronologi kecurangan atau bukti masalah yang dilakukan oleh akun terlapor..."
                    : "Tuliskan rincian keluhan atau saran yang Anda miliki..."
                } 
              />
            </div>
          </div>

          {/* UPLOAD FOTO BUKTI (UNTUK KELUHAN, TRANSAKSI, DAN LAPORAN) */}
          {allowsEvidence && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  <ImageIcon size={16} className="text-orange-600" /> Foto Bukti Pendukung ({evidencePhotos.length}/7)
                </label>
                <span className="text-[11px] text-neutral-500">Maks. 7 foto (JPG, PNG)</span>
              </div>

              {/* Grid Preview Foto */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {evidencePhotos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-neutral-200 group">
                    <img src={photo} alt={`Bukti ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors"
                      title="Hapus foto"
                    >
                      <X size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(photo)}
                      className="absolute bottom-1 right-1 p-1 bg-black/60 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Lihat besar"
                    >
                      <Eye size={12} />
                    </button>
                  </div>
                ))}

                {evidencePhotos.length < 7 && (
                  <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-neutral-300 hover:border-orange-500 rounded-2xl cursor-pointer bg-neutral-50 hover:bg-orange-50/30 transition-all text-neutral-500 hover:text-orange-600">
                    <Upload size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">Unggah</span>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                *Lampirkan foto bukti transaksi, foto serah terima makanan, atau tangkapan layar percakapan jika relevan.
              </p>
            </div>
          )}

          {/* PILIHAN ANONIM & TOMBOL SUBMIT */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-neutral-100">
            <div className="flex items-center gap-2.5">
              <input 
                type="checkbox" 
                id="anonymous" 
                checked={isAnonymous} 
                onChange={(e) => setIsAnonymous(e.target.checked)} 
                className="w-4 h-4 text-orange-600 rounded border-neutral-300 focus:ring-orange-500"
              />
              <label htmlFor="anonymous" className="text-xs font-bold text-neutral-700 cursor-pointer">
                Kirim secara anonim (Sembunyikan profil saya)
              </label>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="bg-orange-600 text-white font-bold px-8 py-3.5 rounded-xl text-sm hover:bg-orange-700 disabled:opacity-50 transition-all shadow-md shadow-orange-600/30"
            >
              {loading ? "Mengirim Laporan..." : "Kirim Tiket Laporan"}
            </button>
          </div>
        </form>
      </div>

      {/* RIWAYAT TIKET */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-neutral-100 space-y-4">
        <h2 className="text-xl font-black text-neutral-900">Riwayat Pengaduan & Bantuan</h2>

        {tickets.length === 0 ? (
          <p className="text-neutral-500 font-medium text-sm py-4">Belum ada riwayat pengaduan bantuan.</p>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const tagItem = tagsConfig.find((t) => t.id === ticket.tag) || tagsConfig[1];
              const photos: string[] = Array.isArray(ticket.evidence_photos) ? ticket.evidence_photos : [];

              return (
                <div key={ticket.id} className="border border-neutral-200 rounded-2xl p-5 bg-neutral-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg uppercase border ${tagItem.color}`}>
                        {ticket.tag || "Keluhan"}
                      </span>
                      {ticket.reported_account && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                          Akun Terlapor: {ticket.reported_account}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase ${
                        ticket.status === 'open' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {ticket.status === 'open' ? 'Sedang Ditinjau' : 'Selesai'}
                      </span>
                      <span className="text-xs text-neutral-400 font-medium">
                        {new Date(ticket.created_at).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-neutral-900 text-base">{ticket.subject}</h3>
                    <p className="text-sm text-neutral-600 mt-1 leading-relaxed">{ticket.message}</p>
                  </div>

                  {/* Foto Bukti Terlampir */}
                  {photos.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                        Bukti Lampiran ({photos.length} foto):
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {photos.map((url, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setPreviewImage(url)}
                            className="w-14 h-14 rounded-xl overflow-hidden border border-neutral-200 flex-shrink-0 hover:border-orange-500 transition-colors"
                          >
                            <img src={url} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Balasan Admin */}
                  {ticket.reply && (
                    <div className="mt-3 bg-white p-4 rounded-xl border border-neutral-200 space-y-1">
                      <p className="text-[11px] font-black text-orange-600 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> Tanggapan Admin
                      </p>
                      <p className="text-sm text-neutral-800 leading-relaxed font-medium">{ticket.reply}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL PREVIEW FOTO BESAR */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-red-400 bg-neutral-800 hover:bg-neutral-900 rounded-full p-2 transition-all"
            >
              <X size={24} />
            </button>
            <img 
              src={previewImage} 
              alt="Bukti Lampiran Penuh" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border-2 border-neutral-700" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
