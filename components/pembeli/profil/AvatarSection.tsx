"use client";

import React, { useRef, useState } from 'react';
import { supabase } from '../../../utils/supabase';

export default function AvatarSection({ profile, onUpdate }: { profile: any, onUpdate: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10000000) {
      alert("Besar file maksimum 10MB");
      return;
    }
    
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile?.id || 'avatar'}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      console.error(uploadError);
      alert("Gagal mengunggah foto. Pastikan bucket 'avatars' sudah ada di Supabase Anda.");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

    if (profile?.id) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ foto_profil: publicUrl })
        .eq('id', profile.id);

      if (updateError) {
        alert("Gagal menyimpan foto profil: " + updateError.message);
      } else {
        onUpdate();
      }
    }
    
    setUploading(false);
  };

  const handlePasswordReset = async () => {
    const email = profile?.email || profile?.authEmail;
    if (!email) {
      alert("Email tidak ditemukan");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/pembeli/profil',
    });
    if (error) {
      alert("Gagal mengirim tautan atur ulang kata sandi: " + error.message);
    } else {
      alert("Tautan untuk mereset kata sandi telah dikirim ke email Anda.");
    }
  };

  const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.nama || 'tumbal'}&backgroundColor=fef08a`;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-lg p-4 sm:p-5 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-slate-100 relative">
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg">
            <div className="text-sm font-bold text-slate-700">Mengunggah...</div>
          </div>
        )}
        <div className="flex flex-col">
          <div className="w-full aspect-square relative rounded-lg overflow-hidden mb-5 border border-slate-100 flex items-center justify-center bg-yellow-100">
            <img 
              src={profile?.foto_profil || defaultAvatar} 
              alt="Foto Profil" 
              className="w-full h-full object-cover"
            />
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".jpg,.jpeg,.png" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 px-4 mb-4 border border-slate-300 rounded-md text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Ubah Gambar
          </button>
          
          <p className="text-xs text-slate-500 leading-relaxed text-center sm:text-left">
            Besar file: maksimum 10.000.000 bytes (10 Megabytes). Ekstensi file yang diperbolehkan: .JPG .JPEG .PNG
          </p>
        </div>
      </div>
      
      <button onClick={handlePasswordReset} className="w-full py-2.5 px-4 border border-slate-300 rounded-md text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-[0_2px_8px_rgb(0,0,0,0.04)]">
        Ubah Kata Sandi
      </button>
    </div>
  );
}
