"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { 
  MessageSquare, 
  AlertCircle, 
  CreditCard, 
  ShieldAlert, 
  Eye, 
  X, 
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  User,
  Filter
} from "lucide-react";

export default function HelpdeskPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("ALL");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch tickets
    const { data: ticketsData, error: ticketError } = await supabase
      .from("help_tickets")
      .select("*")
      .order("created_at", { ascending: false });
      
    // Fetch profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, nama");
      
    if (ticketsData) setTickets(ticketsData);
    if (ticketError) console.error("Error loading tickets:", ticketError);
    
    if (profilesData) {
      const profileMap: Record<string, string> = {};
      profilesData.forEach(p => {
        profileMap[p.id] = p.nama;
      });
      setProfiles(profileMap);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    
    const { error } = await supabase
      .from("help_tickets")
      .update({ 
        reply: replyText.trim(), 
        status: "closed",
        updated_at: new Date().toISOString()
      })
      .eq("id", id);
      
    if (!error) {
      setReplyingId(null);
      setReplyText("");
      fetchData();
    } else {
      alert("Gagal mengirim balasan: " + error.message);
    }
  };

  const getTagBadge = (tag?: string) => {
    switch (tag) {
      case "Saran":
        return {
          icon: MessageSquare,
          text: "Saran",
          badgeClass: "bg-blue-50 text-blue-700 border-blue-200"
        };
      case "Masalah Transaksi":
        return {
          icon: CreditCard,
          text: "Masalah Transaksi",
          badgeClass: "bg-orange-50 text-orange-700 border-orange-200"
        };
      case "Laporan":
        return {
          icon: ShieldAlert,
          text: "Laporan Akun",
          badgeClass: "bg-red-50 text-red-700 border-red-200 font-black"
        };
      case "Keluhan":
      default:
        return {
          icon: AlertCircle,
          text: tag || "Keluhan",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200"
        };
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesTab = t.status === activeTab;
    const matchesTag = selectedTagFilter === "ALL" || (t.tag || "Keluhan") === selectedTagFilter;
    return matchesTab && matchesTag;
  });

  const countByStatus = {
    open: tickets.filter(t => t.status === "open").length,
    closed: tickets.filter(t => t.status === "closed").length,
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Helpdesk & Bantuan</h1>
          <p className="text-neutral-600 mt-1 font-medium text-sm">
            Tinjau pesan keluhan, sengketa transaksi, laporan akun bermasalah, dan tanggapi pengguna.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="text-xs font-bold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 border border-neutral-200 rounded-xl bg-white shadow-sm"
        >
          Muat Ulang
        </button>
      </div>

      {/* FILTER TABS & TAGS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Status Tabs */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab("open")} 
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "open" 
                ? "bg-neutral-900 text-white shadow-sm" 
                : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Tiket Terbuka ({countByStatus.open})
          </button>
          <button 
            onClick={() => setActiveTab("closed")} 
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "closed" 
                ? "bg-neutral-900 text-white shadow-sm" 
                : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Riwayat Balasan ({countByStatus.closed})
          </button>
        </div>

        {/* Tag Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-neutral-400 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: "ALL", label: "Semua" },
            { id: "Laporan", label: "Laporan Akun" },
            { id: "Masalah Transaksi", label: "Transaksi" },
            { id: "Keluhan", label: "Keluhan" },
            { id: "Saran", label: "Saran" },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedTagFilter(f.id)}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${
                selectedTagFilter === f.id
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT LIST */}
      {loading ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-100 text-neutral-500 font-medium text-center text-sm">
          Memuat tiket bantuan...
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-neutral-100 text-neutral-500 font-medium text-center">
          Tidak ada tiket bantuan {activeTab === "open" ? "yang terbuka" : "yang sudah dibalas"} untuk filter ini.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => {
            const userName = ticket.is_anonymous ? "Anonim (Nama Disembunyikan)" : (profiles[ticket.user_id] || "Pengguna Tidak Dikenal");
            const tagInfo = getTagBadge(ticket.tag);
            const TagIcon = tagInfo.icon;
            const evidence = Array.isArray(ticket.evidence_photos) ? ticket.evidence_photos : [];

            return (
              <div 
                key={ticket.id} 
                className={`bg-white p-6 rounded-2xl shadow-sm border transition-all space-y-4 ${
                  ticket.tag === "Laporan" ? "border-red-200 bg-red-50/20" : "border-neutral-100"
                }`}
              >
                {/* Header card */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Tag Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border ${tagInfo.badgeClass}`}>
                        <TagIcon className="w-3.5 h-3.5" />
                        {tagInfo.text}
                      </span>

                      {/* Role Badge */}
                      <span className="inline-block px-2.5 py-1 bg-neutral-100 text-neutral-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                        {ticket.role}
                      </span>

                      {/* User Name */}
                      <span className="text-xs font-bold text-neutral-700 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-neutral-400" />
                        {userName}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-neutral-900 pt-1">{ticket.subject}</h3>
                  </div>

                  <span className="text-xs font-bold text-neutral-400 bg-neutral-50 px-2.5 py-1 rounded-md border border-neutral-100 flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {new Date(ticket.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>

                {/* KHUSUS LAPORAN AKUN: HIGHLIGHT AKUN TERLAPOR */}
                {ticket.tag === "Laporan" && ticket.reported_account && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                    <div className="text-xs">
                      <span className="text-red-700 font-medium">Akun / Toko yang Dilaporkan: </span>
                      <span className="text-red-950 font-black text-sm">{ticket.reported_account}</span>
                    </div>
                  </div>
                )}

                {/* Deskripsi Keluhan / Tiket */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <p className="text-neutral-800 text-sm whitespace-pre-line leading-relaxed font-normal">
                    {ticket.message}
                  </p>
                </div>

                {/* FOTO BUKTI (JIKA ADA) */}
                {evidence.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600">
                      <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Lampiran Foto Bukti ({evidence.length} Foto) - Klik untuk memperbesar:</span>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {evidence.map((photoUrl: string, idx: number) => (
                        <div 
                          key={idx}
                          onClick={() => setPreviewImage(photoUrl)}
                          className="relative group w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 cursor-pointer hover:border-orange-500 shadow-xs"
                        >
                          <img 
                            src={photoUrl} 
                            alt={`Bukti ${idx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                          <span className="absolute bottom-1 right-1 bg-black/60 text-[9px] text-white px-1 rounded font-bold">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FORM BALASAN / RIWAYAT BALASAN */}
                {activeTab === "open" ? (
                  replyingId === ticket.id ? (
                    <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-neutral-100">
                      <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                        Tuliskan Tanggapan / Solusi Admin:
                      </label>
                      <textarea 
                        rows={3} 
                        placeholder="Berikan jawaban atau konfirmasi tindakan yang diambil kepada pelapor..." 
                        value={replyText} 
                        onChange={(e) => setReplyText(e.target.value)} 
                        className="border border-neutral-300 p-3 rounded-xl text-sm w-full focus:ring-orange-500 focus:border-orange-500 text-neutral-900 bg-white" 
                      />
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => { setReplyingId(null); setReplyText(""); }} 
                          className="bg-neutral-100 text-neutral-800 px-4 py-2 rounded-xl text-xs font-bold hover:bg-neutral-200 transition-colors"
                        >
                          Batal
                        </button>
                        <button 
                          onClick={() => handleReply(ticket.id)} 
                          className="bg-orange-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Kirim Tanggapan & Selesaikan Tiket
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-end">
                      <button 
                        onClick={() => {
                          setReplyingId(ticket.id);
                          setReplyText("");
                        }} 
                        className="bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 px-4 py-2 rounded-xl text-xs font-black transition-all"
                      >
                        Beri Tanggapan / Solusi
                      </button>
                    </div>
                  )
                ) : (
                  <div className="mt-4 pt-4 border-t border-neutral-100">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Tanggapan Admin (Tiket Selesai):
                    </h4>
                    <p className="text-sm font-medium text-neutral-900 bg-neutral-50 p-4 rounded-xl border border-neutral-200 whitespace-pre-line">
                      {ticket.reply || "(Tidak ada catatan balasan)"}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PREVIEW FOTO BUKTI */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-3xl max-h-[90vh] bg-neutral-900 rounded-2xl overflow-hidden p-2 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewImage} 
              alt="Lampiran Bukti Penuh" 
              className="max-h-[82vh] w-auto max-w-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}