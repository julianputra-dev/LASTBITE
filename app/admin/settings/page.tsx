"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export default function SettingsPage() {
  const [adminFee, setAdminFee] = useState("0");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [bankName, setBankName] = useState("BCA");
  const [bankNumber, setBankNumber] = useState("8720-1928-31");
  const [bankHolder, setBankHolder] = useState("LASTBITE ESCROW PLATFORM");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase.from("system_settings").select("*");
      if (!error && data) {
        data.forEach((setting) => {
          if (setting.key === "admin_fee") setAdminFee(setting.value.toString());
          if (setting.key === "delivery_fee") setDeliveryFee(setting.value.toString());
          if (setting.key === "platform_bank_name") setBankName(setting.value.toString());
          if (setting.key === "platform_bank_number") setBankNumber(setting.value.toString());
          if (setting.key === "platform_bank_holder") setBankHolder(setting.value.toString());
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const updates = [
      { key: "admin_fee", value: parseInt(adminFee) || 0 },
      { key: "delivery_fee", value: parseInt(deliveryFee) || 0 },
      { key: "platform_bank_name", value: bankName },
      { key: "platform_bank_number", value: bankNumber },
      { key: "platform_bank_holder", value: bankHolder }
    ];

    const { error } = await supabase.from("system_settings").upsert(updates);

    setSaving(false);
    if (error) {
      setMessage("Gagal menyimpan pengaturan: " + error.message);
    } else {
      setMessage("Pengaturan berhasil disimpan.");
    }
  };

  if (loading) return <div className="text-neutral-500 font-medium">Memuat data...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-black text-neutral-900">Pengaturan Biaya & Rekening Escrow</h1>
        <p className="text-neutral-600 mt-1 font-medium">Konfigurasi tarif platform dan nomor rekening penampung pembayaran.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 space-y-5">
        <div>
          <label className="block text-sm font-bold text-neutral-800 mb-2">Biaya Admin Platform (Rp)</label>
          <input type="number" required min="0" value={adminFee} onChange={(e) => setAdminFee(e.target.value)} className="w-full border border-neutral-300 p-3 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-neutral-900 bg-white" />
          <p className="text-xs text-neutral-500 mt-1">Biaya yang menjadi keuntungan bersih admin per transaksi.</p>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-neutral-800 mb-2">Biaya Antar Kurir Dasar (Rp)</label>
          <input type="number" required min="0" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="w-full border border-neutral-300 p-3 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-neutral-900 bg-white" />
        </div>

        <hr className="border-neutral-100" />
        
        <h3 className="font-bold text-base text-neutral-900">Rekening Penampung (Escrow Admin)</h3>

        <div>
          <label className="block text-sm font-bold text-neutral-800 mb-2">Nama Bank / E-Wallet</label>
          <input type="text" required value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Contoh: BCA / Mandiri / GoPay" className="w-full border border-neutral-300 p-3 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-neutral-900 bg-white" />
        </div>

        <div>
          <label className="block text-sm font-bold text-neutral-800 mb-2">Nomor Rekening / Nomor E-Wallet</label>
          <input type="text" required value={bankNumber} onChange={(e) => setBankNumber(e.target.value)} placeholder="Contoh: 8720192831" className="w-full border border-neutral-300 p-3 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-neutral-900 bg-white" />
        </div>

        <div>
          <label className="block text-sm font-bold text-neutral-800 mb-2">Atas Nama Pemilik Rekening</label>
          <input type="text" required value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} placeholder="Contoh: PT LASTBITE INDONESIA" className="w-full border border-neutral-300 p-3 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-neutral-900 bg-white" />
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-bold ${message.includes("Gagal") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
            {message}
          </div>
        )}

        <button type="submit" disabled={saving} className="w-full bg-orange-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50">
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </form>
    </div>
  );
}
