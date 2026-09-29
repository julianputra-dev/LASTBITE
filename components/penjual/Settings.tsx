"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { Loader2, Save, Image as ImageIcon, MapPin, Building2, User, CreditCard } from "lucide-react";

export default function Settings({ merchantId, onLocationUpdate }: { merchantId: string, onLocationUpdate: (hasLocation: boolean) => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState({
    nama: "",
    biodata: "",
    lokasi: "",
    lokasi_gmaps: "",
    no_rekening: "",
    foto_profil: ""
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', merchantId)
          .single();

        if (error) throw error;
        
        if (data) {
          setProfile({
            nama: data.nama || "",
            biodata: data.biodata || "",
            lokasi: data.lokasi || "",
            lokasi_gmaps: data.lokasi_gmaps || "",
            no_rekening: data.no_rekening || "",
            foto_profil: data.foto_profil || ""
          });
          
          onLocationUpdate(!!data.lokasi_gmaps);
        }
      } catch (error) {
        console.error("Gagal menarik profil penjual:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (merchantId) fetchProfile();
  }, [merchantId, onLocationUpdate]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setProfile({ ...profile, foto_profil: compressedBase64 });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nama: profile.nama,
          biodata: profile.biodata,
          lokasi: profile.lokasi,
          lokasi_gmaps: profile.lokasi_gmaps,
          no_rekening: profile.no_rekening,
          foto_profil: profile.foto_profil
        })
        .eq('id', merchantId);

      if (error) throw error;
      
      onLocationUpdate(!!profile.lokasi_gmaps);
      alert("Pengaturan profil berhasil disimpan!");
      
    } catch (error: any) {
      console.error("Gagal menyimpan profil:", error);
      alert(`Terjadi kesalahan saat menyimpan profil: ${error?.message || 'Data gambar terlalu besar atau terjadi masalah koneksi.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-neutral-400">
        <Loader2 size={40} className="animate-spin text-orange-500 mb-4" />
        <p className="font-semibold text-neutral-600">Memuat pengaturan...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 max-w-4xl mx-auto w-full">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Pengaturan Toko</h1>
          <p className="text-sm text-neutral-500 mt-1">Perbarui profil restoran, lokasi, dan preferensi akun Anda.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden flex-1">
        <form onSubmit={saveProfile} className="p-6 md:p-8 space-y-8">
          
          {/* FOTO PROFIL SECTION */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full md:w-40 flex flex-col gap-3 shrink-0">
              <label className="block text-sm font-semibold text-neutral-700">Foto Profil Toko</label>
              <div className="relative group w-32 h-32 md:w-full md:h-40 rounded-2xl border-2 border-dashed border-neutral-200 overflow-hidden hover:border-orange-500 transition-colors cursor-pointer bg-neutral-50 flex flex-col items-center justify-center">
                <input 
                  type="file" accept="image/*" 
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                {profile.foto_profil ? (
                  <img src={profile.foto_profil} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-neutral-400 group-hover:text-orange-500 flex flex-col items-center gap-2">
                    <ImageIcon size={32} />
                    <span className="text-xs font-medium px-4 text-center">Pilih Gambar</span>
                  </div>
                )}
                
                {/* Hover overlay */}
                {profile.foto_profil && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="text-white text-xs font-bold">Ubah Gambar</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 w-full space-y-6">
              
              {/* NAMA TOKO */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 mb-2">
                  <Building2 size={16} className="text-orange-500" /> Nama Warung / Restoran
                </label>
                <input 
                  type="text" required
                  placeholder="Misal: Nasi Goreng Gila Mas Don"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-neutral-900 font-medium"
                  value={profile.nama}
                  onChange={(e) => setProfile({...profile, nama: e.target.value})}
                />
              </div>

              {/* BIODATA / DESKRIPSI */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 mb-2">
                  <User size={16} className="text-orange-500" /> Biodata & Keterangan
                </label>
                <textarea 
                  rows={3}
                  placeholder="Deskripsikan bisnis Anda... (Misal: Melayani pesanan partai besar & buka 24 jam)"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none text-neutral-900"
                  value={profile.biodata}
                  onChange={(e) => setProfile({...profile, biodata: e.target.value})}
                />
              </div>

            </div>
          </div>

          <hr className="border-neutral-100" />

          {/* GOOGLE MAPS SECTION */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 mb-2">
                <MapPin size={16} className="text-orange-500" /> Tautan Lokasi Google Maps <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
                Fitur ini wajib diisi. Masukkan tautan (Share Link) dari Google Maps agar kurir atau pembeli bisa dengan mudah menavigasi perjalanan menuju restoran Anda. Tanpa ini, Anda tidak akan bisa mengunggah produk.
              </p>
              <input 
                type="url" required
                placeholder="https://maps.app.goo.gl/..."
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-blue-600 bg-blue-50/50"
                value={profile.lokasi_gmaps}
                onChange={(e) => setProfile({...profile, lokasi_gmaps: e.target.value})}
              />
            </div>
            
            {/* Visualisasi Peta Simulasi */}
            {profile.lokasi_gmaps && profile.lokasi_gmaps.includes("http") && (
               <div className="h-32 bg-neutral-100 rounded-xl flex items-center justify-center border border-neutral-200 overflow-hidden relative">
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#d4d4d4 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                 <div className="relative z-10 flex flex-col items-center text-emerald-600 font-medium">
                   <MapPin size={24} className="mb-1" />
                   <span className="text-sm">Tautan Lokasi Terdeteksi</span>
                 </div>
               </div>
            )}
            
            {/* Lokasi Patokan Manual */}
            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 mb-2">
                Deskripsi Lokasi Manual
              </label>
              <textarea 
                rows={2}
                placeholder="Misal: Masuk gang di sebelah Alfamart, rumah warna hijau pagar hitam."
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none text-neutral-900"
                value={profile.lokasi}
                onChange={(e) => setProfile({...profile, lokasi: e.target.value})}
              />
            </div>
          </div>

          <hr className="border-neutral-100" />

          {/* REKENING (PELENGKAP) */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 mb-2">
                <CreditCard size={16} className="text-orange-500" /> Nomor Rekening Bank
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Untuk keperluan penarikan dana. Data ini dienkripsi dengan aman (Visual Mockup).
              </p>
              <input 
                type="text" 
                placeholder="1234-5678-9012 a.n Julian"
                className="w-full md:w-2/3 px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-mono tracking-wider"
                value={profile.no_rekening}
                onChange={(e) => setProfile({...profile, no_rekening: e.target.value})}
              />
            </div>
          </div>

          {/* FORM ACTIONS */}
          <div className="pt-6 border-t border-neutral-100 flex justify-end gap-3">
            <button 
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Simpan Perubahan
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
