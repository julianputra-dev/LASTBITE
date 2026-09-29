"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export default function HelpdeskPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch tickets
    const { data: ticketsData } = await supabase
      .from("help_tickets")
      .select("*")
      .order("created_at", { ascending: false });
      
    // Fetch profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, nama");
      
    if (ticketsData) setTickets(ticketsData);
    
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
        reply: replyText, 
        status: "closed",
        updated_at: new Date().toISOString()
      })
      .eq("id", id);
      
    if (!error) {
      setReplyingId(null);
      setReplyText("");
      fetchData();
    }
  };

  const filteredTickets = tickets.filter(t => t.status === activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-neutral-900">Helpdesk & Bantuan</h1>
        <p className="text-neutral-600 mt-1 font-medium">Tanggapi pesan keluhan dan bantuan dari pengguna.</p>
      </div>

      <div className="flex border-b border-neutral-200 gap-6">
        <button 
          onClick={() => setActiveTab("open")} 
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "open" ? "border-orange-600 text-orange-600" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}
        >
          Tiket Terbuka
        </button>
        <button 
          onClick={() => setActiveTab("closed")} 
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "closed" ? "border-orange-600 text-orange-600" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}
        >
          Riwayat Balasan
        </button>
      </div>

      {loading ? (
        <div className="text-neutral-500 font-medium">Memuat tiket...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-100 text-neutral-500 font-medium text-center">
          Tidak ada tiket bantuan {activeTab === "open" ? "yang terbuka" : "yang sudah dibalas"}.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => {
            const userName = ticket.is_anonymous ? `Anonim` : (profiles[ticket.user_id] || "Pengguna Tidak Dikenal");
            
            return (
              <div key={ticket.id} className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-block px-3 py-1 bg-orange-50 text-orange-700 text-xs font-black rounded-lg uppercase">
                        {ticket.role}
                      </span>
                      <span className="text-sm font-bold text-neutral-800">{userName}</span>
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900">{ticket.subject}</h3>
                    <p className="text-neutral-600 mt-1.5 text-sm leading-relaxed">{ticket.message}</p>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 bg-neutral-50 px-2 py-1 rounded-md">{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
                
                {activeTab === "open" ? (
                  replyingId === ticket.id ? (
                    <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-neutral-100">
                      <textarea rows={3} placeholder="Tuliskan balasan..." value={replyText} onChange={(e) => setReplyText(e.target.value)} className="border border-neutral-300 p-3 rounded-xl text-sm w-full focus:ring-orange-500 focus:border-orange-500 text-neutral-900 bg-white" />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setReplyingId(null); setReplyText(""); }} className="bg-neutral-100 text-neutral-800 px-4 py-2 rounded-xl text-sm font-bold hover:bg-neutral-200 transition-colors">Batal</button>
                        <button onClick={() => handleReply(ticket.id)} className="bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors shadow-sm">Kirim Balasan & Tutup</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-neutral-100 text-right">
                      <button onClick={() => setReplyingId(ticket.id)} className="text-orange-600 text-sm font-bold hover:text-orange-700 transition-colors">Balas Tiket</button>
                    </div>
                  )
                ) : (
                  <div className="mt-4 pt-4 border-t border-neutral-100">
                    <h4 className="text-xs font-bold text-orange-600 uppercase mb-2">Balasan Admin</h4>
                    <p className="text-sm font-medium text-neutral-800 bg-neutral-50 p-4 rounded-xl border border-neutral-100">{ticket.reply}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
