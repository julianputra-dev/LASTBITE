"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";

export default function Helpdesk({ role, userId }: { role: string, userId: string }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState("");

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
    fetchTickets();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from("help_tickets")
      .insert([
        { user_id: userId, role, subject, message, is_anonymous: isAnonymous }
      ]);
    
    setLoading(false);
    if (error) {
      alert("Gagal mengirim tiket bantuan. Error: " + error.message);
    } else {
      setSubject("");
      setMessage("");
      setIsAnonymous(false);
      fetchTickets();
      alert("Tiket bantuan berhasil dikirim!");
    }
  };

  const subjectPlaceholder = "Masalah yang Anda hadapi...";

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
        <h2 className="text-xl font-black text-neutral-900 mb-4">Pusat Bantuan</h2>
        
        {fetchError && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
            Gagal memuat tiket: {fetchError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-neutral-800 mb-2">Subjek</label>
            <input required type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-neutral-300 p-3 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-sm text-neutral-900 bg-white" placeholder={subjectPlaceholder} />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-800 mb-2">Pesan / Keluhan</label>
            <textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="w-full border border-neutral-300 p-3 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-sm text-neutral-900 bg-white" placeholder="Tuliskan keluhan atau bantuan yang Anda butuhkan..." />
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="anonymous" 
              checked={isAnonymous} 
              onChange={(e) => setIsAnonymous(e.target.checked)} 
              className="w-4 h-4 text-orange-600 rounded border-neutral-300 focus:ring-orange-500"
            />
            <label htmlFor="anonymous" className="text-sm font-bold text-neutral-700 cursor-pointer">
              Kirim secara anonim (Sembunyikan nama saya)
            </label>
          </div>

          <button type="submit" disabled={loading} className="bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-sm">
            {loading ? "Mengirim..." : "Kirim Tiket"}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
        <h2 className="text-xl font-black text-neutral-900 mb-4">Riwayat Tiket Bantuan</h2>
        {tickets.length === 0 ? (
          <p className="text-neutral-500 font-medium">Belum ada riwayat tiket bantuan.</p>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-neutral-900">{ticket.subject}</h3>
                  <span className={`text-xs font-black px-2 py-1 rounded-lg uppercase ${ticket.status === 'open' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {ticket.status === 'open' ? 'Menunggu Balasan' : 'Selesai'}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 font-medium">{ticket.message}</p>
                {ticket.reply && (
                  <div className="mt-3 bg-white p-3 rounded-xl border border-neutral-200">
                    <p className="text-xs font-bold text-orange-600 uppercase mb-1">Balasan Admin</p>
                    <p className="text-sm text-neutral-800 font-medium">{ticket.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
