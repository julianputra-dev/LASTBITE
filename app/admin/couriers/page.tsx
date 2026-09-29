"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export default function CourierVerificationPage() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const fetchCouriers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("couriers")
      .select("*")
      .eq("verification_status", "pending");
      
    if (!error && data) {
      setCouriers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCouriers();
  }, []);

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from("couriers")
      .update({ verification_status: "verified", rejection_reason: null })
      .eq("id", id);
      
    if (!error) {
      fetchCouriers();
    }
  };

  const handleReject = async (id: string) => {
    if (!reason.trim()) {
      alert("Alasan penolakan wajib diisi");
      return;
    }
    const { error } = await supabase
      .from("couriers")
      .update({ verification_status: "rejected", rejection_reason: reason })
      .eq("id", id);
      
    if (!error) {
      setRejectingId(null);
      setReason("");
      fetchCouriers();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-neutral-900">Verifikasi Kurir</h1>
        <p className="text-neutral-600 mt-1 font-medium">Tinjau dan kelola pengajuan pendaftaran kurir baru.</p>
      </div>

      {loading ? (
        <div className="text-neutral-500 font-medium">Memuat data...</div>
      ) : couriers.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-100 text-neutral-500 font-medium text-center">
          Tidak ada pengajuan kurir yang menunggu verifikasi.
        </div>
      ) : (
        <div className="grid gap-4">
          {couriers.map((courier) => (
            <div key={courier.id} className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="flex-1 space-y-4 w-full">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">{courier.full_name}</h3>
                  <p className="text-sm font-medium text-neutral-600 mt-1">NIM: <span className="text-neutral-900 font-bold">{courier.student_id_number}</span></p>
                  <p className="text-sm font-medium text-neutral-600">Telepon: <span className="text-neutral-900">{courier.phone_number}</span></p>
                  <p className="text-sm font-medium text-neutral-600">Rekening: <span className="text-neutral-900">{courier.bank_account_number}</span></p>
                </div>
                
                {/* Dokumen Foto */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-100">
                  <div>
                    <p className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">Foto KTM</p>
                    {courier.student_card_url ? (
                      <a href={courier.student_card_url} target="_blank" rel="noreferrer" className="block w-full aspect-[4/3] rounded-lg overflow-hidden border border-neutral-200 hover:border-orange-500 transition-colors">
                        <img src={courier.student_card_url} alt="KTM" className="w-full h-full object-cover" />
                      </a>
                    ) : (
                      <div className="w-full aspect-[4/3] rounded-lg bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">Tidak ada file</div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">Foto KTP</p>
                    {courier.id_card_url ? (
                      <a href={courier.id_card_url} target="_blank" rel="noreferrer" className="block w-full aspect-[4/3] rounded-lg overflow-hidden border border-neutral-200 hover:border-orange-500 transition-colors">
                        <img src={courier.id_card_url} alt="KTP" className="w-full h-full object-cover" />
                      </a>
                    ) : (
                      <div className="w-full aspect-[4/3] rounded-lg bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">Tidak ada file</div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">Foto Muka (Selfie)</p>
                    {courier.face_photo_url ? (
                      <a href={courier.face_photo_url} target="_blank" rel="noreferrer" className="block w-full aspect-[3/4] sm:aspect-[4/3] rounded-lg overflow-hidden border border-neutral-200 hover:border-orange-500 transition-colors">
                        <img src={courier.face_photo_url} alt="Selfie" className="w-full h-full object-cover" />
                      </a>
                    ) : (
                      <div className="w-full aspect-[4/3] rounded-lg bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">Tidak ada file</div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-auto md:min-w-[200px] border-t md:border-t-0 md:border-l border-neutral-100 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                {rejectingId === courier.id ? (
                  <div className="flex flex-col gap-3 w-full">
                    <input type="text" placeholder="Alasan penolakan..." value={reason} onChange={(e) => setReason(e.target.value)} className="border border-neutral-300 p-3 rounded-xl text-sm w-full focus:ring-orange-500 focus:border-orange-500 text-neutral-900 bg-white shadow-sm" />
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleReject(courier.id)} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm">Kirim Penolakan</button>
                      <button onClick={() => { setRejectingId(null); setReason(""); }} className="w-full bg-neutral-100 text-neutral-800 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-neutral-200 transition-colors">Batal</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 w-full">
                    <button onClick={() => handleApprove(courier.id)} className="w-full bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      Setujui Kurir
                    </button>
                    <button onClick={() => setRejectingId(courier.id)} className="w-full bg-red-50 hover:bg-red-100 text-red-600 px-5 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      Tolak
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
