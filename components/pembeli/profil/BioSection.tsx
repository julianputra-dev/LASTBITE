"use client";

import React, { useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { MapPin, Navigation, ExternalLink, Home, CheckCircle2 } from 'lucide-react';

interface BioFieldProps {
  label: string;
  value?: string | null;
  actionText: string;
  isEditing: boolean;
  editValue: string;
  onEditChange: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  type?: string;
  options?: string[];
  placeholder?: string;
}

const BioField = ({ 
  label, 
  value, 
  actionText, 
  isEditing, 
  editValue, 
  onEditChange, 
  onSave, 
  onCancel, 
  onStartEdit, 
  type = "text", 
  options,
  placeholder
}: BioFieldProps) => (
  <div className="flex flex-col sm:flex-row sm:items-start py-3.5 border-b border-slate-50 last:border-b-0">
    <div className="w-full sm:w-[35%] lg:w-[30%] text-slate-600 text-sm mb-1.5 sm:mb-0 pt-1 font-medium">
      {label}
    </div>
    <div className="w-full sm:w-[65%] lg:w-[70%] flex flex-col sm:flex-row sm:items-start gap-3">
      {isEditing ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
          {options ? (
            <select 
              value={editValue} 
              onChange={(e) => onEditChange(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-orange-500 text-slate-900 bg-white shadow-xs"
            >
              <option value="">Pilih {label}</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : type === "textarea" ? (
            <textarea
              rows={3}
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-orange-500 text-slate-900 bg-white shadow-xs"
              placeholder={placeholder || `Masukkan ${label.toLowerCase()}`}
            />
          ) : (
            <input 
              type={type}
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-orange-500 text-slate-900 bg-white shadow-xs"
              placeholder={placeholder || `Masukkan ${label.toLowerCase()}`}
            />
          )}
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={onSave} 
              className="text-xs font-bold text-white bg-orange-600 px-3.5 py-2 rounded-lg hover:bg-orange-700 transition-colors shadow-xs"
            >
              Simpan
            </button>
            <button 
              onClick={onCancel} 
              className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-lg transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between w-full gap-3">
          <div className="flex-grow">
            {value ? (
              type === "url" || label.toLowerCase().includes("maps") ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-sm text-slate-900 break-all">{value}</span>
                  <a 
                    href={value} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 text-xs text-orange-600 hover:underline font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-200 whitespace-nowrap self-start"
                  >
                    <ExternalLink className="w-3 h-3" /> Buka Titik Peta
                  </a>
                </div>
              ) : (
                <span className="text-sm text-slate-900 whitespace-pre-line leading-relaxed">{value}</span>
              )
            ) : (
              <span className="text-sm text-slate-400 italic">Belum diatur</span>
            )}
          </div>
          <button 
            onClick={onStartEdit} 
            className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors whitespace-nowrap px-3 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-100 shrink-0"
          >
            {value ? "Ubah" : actionText}
          </button>
        </div>
      )}
    </div>
  </div>
);

export default function BioSection({ profile, onUpdate }: { profile: any, onUpdate: () => void }) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStartEdit = (field: string, currentValue: string | null | undefined) => {
    setEditingField(field);
    setEditValue(currentValue || "");
  };

  const handleSave = async (field: string) => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      if (field === 'alamat' || field === 'lokasi') {
        // Coba simpan ke alamat dan lokasi
        const { error } = await supabase
          .from('profiles')
          .update({ alamat: editValue, lokasi: editValue })
          .eq('id', profile.id);

        if (error) {
          // Jika kolom alamat belum dibuat di tabel profiles, simpan ke lokasi
          const fallback = await supabase
            .from('profiles')
            .update({ lokasi: editValue })
            .eq('id', profile.id);

          if (fallback.error) throw fallback.error;
        }
      } else {
        const { error } = await supabase
          .from('profiles')
          .update({ [field]: editValue })
          .eq('id', profile.id);

        if (error) throw error;
      }

      onUpdate();
      setEditingField(null);
    } catch (err: any) {
      alert("Gagal memperbarui data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-slate-100 p-6 md:p-8 relative">
      {loading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-2xl">
          <div className="text-sm font-bold text-slate-700 bg-white px-4 py-2 rounded-xl shadow border border-slate-100">
            Menyimpan perubahan...
          </div>
        </div>
      )}
      
      {/* SECTION 1: BIODATA DIRI */}
      <div className="mb-8">
        <h2 className="text-lg font-black text-slate-900 mb-4 tracking-tight">Biodata Diri</h2>
        <div className="flex flex-col gap-1">
          <BioField 
            label="Nama Lengkap" 
            value={profile?.nama} 
            actionText="Tambah Nama" 
            isEditing={editingField === 'nama'}
            editValue={editValue}
            onEditChange={setEditValue}
            onSave={() => handleSave('nama')}
            onCancel={() => setEditingField(null)}
            onStartEdit={() => handleStartEdit('nama', profile?.nama)}
          />
          <BioField 
            label="Tanggal Lahir" 
            value={profile?.tanggal_lahir}
            actionText="Tambah Tanggal Lahir" 
            type="date"
            isEditing={editingField === 'tanggal_lahir'}
            editValue={editValue}
            onEditChange={setEditValue}
            onSave={() => handleSave('tanggal_lahir')}
            onCancel={() => setEditingField(null)}
            onStartEdit={() => handleStartEdit('tanggal_lahir', profile?.tanggal_lahir)}
          />
          <BioField 
            label="Jenis Kelamin" 
            value={profile?.jenis_kelamin}
            actionText="Tambah Jenis Kelamin" 
            options={["Laki-laki", "Perempuan"]}
            isEditing={editingField === 'jenis_kelamin'}
            editValue={editValue}
            onEditChange={setEditValue}
            onSave={() => handleSave('jenis_kelamin')}
            onCancel={() => setEditingField(null)}
            onStartEdit={() => handleStartEdit('jenis_kelamin', profile?.jenis_kelamin)}
          />
        </div>
      </div>

      {/* SECTION 2: KONTAK */}
      <div className="mb-8 pt-6 border-t border-slate-100">
        <h2 className="text-lg font-black text-slate-900 mb-4 tracking-tight">Kontak</h2>
        <div className="flex flex-col gap-1">
          <BioField 
            label="Email" 
            value={profile?.email || profile?.authEmail} 
            actionText="Tambah Email" 
            type="email"
            isEditing={editingField === 'email'}
            editValue={editValue}
            onEditChange={setEditValue}
            onSave={() => handleSave('email')}
            onCancel={() => setEditingField(null)}
            onStartEdit={() => handleStartEdit('email', profile?.email || profile?.authEmail)}
          />
          <BioField 
            label="Nomor HP / WhatsApp" 
            value={profile?.nomor_hp}
            actionText="Tambah Nomor HP" 
            type="tel"
            placeholder="Contoh: 081234567890"
            isEditing={editingField === 'nomor_hp'}
            editValue={editValue}
            onEditChange={setEditValue}
            onSave={() => handleSave('nomor_hp')}
            onCancel={() => setEditingField(null)}
            onStartEdit={() => handleStartEdit('nomor_hp', profile?.nomor_hp)}
          />
        </div>
      </div>

      {/* SECTION 3: ALAMAT PENGIRIMAN & GOOGLE MAPS */}
      <div className="pt-6 border-t border-slate-100">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Alamat Pengiriman (Kurir)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data alamat ini akan otomatis terisi saat Anda memesan makanan dengan metode <strong>Kirim via Kurir</strong>.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <BioField 
            label="Alamat Lengkap (Manual)" 
            value={profile?.alamat || profile?.lokasi} 
            actionText="Tambah Alamat" 
            type="textarea"
            placeholder="Contoh: Jl. Sudirman No. 12, RT 01/RW 02, Kel. Sukajadi (Rumah pagar hitam samping masjid)"
            isEditing={editingField === 'alamat'}
            editValue={editValue}
            onEditChange={setEditValue}
            onSave={() => handleSave('alamat')}
            onCancel={() => setEditingField(null)}
            onStartEdit={() => handleStartEdit('alamat', profile?.alamat || profile?.lokasi)}
          />
          <BioField 
            label="Titik Google Maps (Opsional)" 
            value={profile?.lokasi_gmaps} 
            actionText="Tambah Link Maps" 
            type="url"
            placeholder="Tempel tautan Google Maps (contoh: https://maps.app.goo.gl/...)"
            isEditing={editingField === 'lokasi_gmaps'}
            editValue={editValue}
            onEditChange={setEditValue}
            onSave={() => handleSave('lokasi_gmaps')}
            onCancel={() => setEditingField(null)}
            onStartEdit={() => handleStartEdit('lokasi_gmaps', profile?.lokasi_gmaps)}
          />
        </div>
      </div>
    </div>
  );
}