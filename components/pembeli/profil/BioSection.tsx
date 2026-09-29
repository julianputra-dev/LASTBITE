"use client";

import React, { useState } from 'react';
import { supabase } from '../../../utils/supabase';

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
}

const BioField = ({ label, value, actionText, isEditing, editValue, onEditChange, onSave, onCancel, onStartEdit, type = "text", options }: BioFieldProps) => (
  <div className="flex flex-col sm:flex-row sm:items-start py-3">
    <div className="w-full sm:w-[35%] lg:w-[30%] text-slate-600 text-sm mb-1 sm:mb-0 pt-1">
      {label}
    </div>
    <div className="w-full sm:w-[65%] lg:w-[70%] flex flex-col sm:flex-row sm:items-center gap-3">
      {isEditing ? (
        <div className="flex items-center gap-2 w-full">
          {options ? (
            <select 
              value={editValue} 
              onChange={(e) => onEditChange(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:border-orange-500 text-slate-900"
            >
              <option value="">Pilih {label}</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input 
              type={type}
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:border-orange-500 text-slate-900"
              placeholder={`Masukkan ${label.toLowerCase()}`}
            />
          )}
          <button onClick={onSave} className="text-sm font-medium text-white bg-orange-600 px-3 py-1.5 rounded hover:bg-orange-700 transition-colors">Simpan</button>
          <button onClick={onCancel} className="text-sm font-medium text-slate-600 bg-slate-200 px-3 py-1.5 rounded hover:bg-slate-300 transition-colors">Batal</button>
        </div>
      ) : (
        <>
          <span className="text-sm text-slate-900 flex-grow">{value || "-"}</span>
          <button onClick={onStartEdit} className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors whitespace-nowrap">
            {value ? "Ubah" : actionText}
          </button>
        </>
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
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: editValue })
      .eq('id', profile.id);

    if (!error) {
      onUpdate();
    } else {
      alert("Gagal memperbarui data: " + error.message);
    }
    
    setEditingField(null);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-slate-100 p-6 md:p-8 relative">
      {loading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
          <div className="text-sm font-bold text-slate-700">Menyimpan...</div>
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-700 mb-4">Ubah Biodata Diri</h2>
        <div className="flex flex-col gap-1">
          <BioField 
            label="Nama" 
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

      <div>
        <h2 className="text-lg font-bold text-slate-700 mb-4">Ubah Kontak</h2>
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
            label="Nomor HP" 
            value={profile?.nomor_hp}
            actionText="Tambah Nomor HP" 
            type="tel"
            isEditing={editingField === 'nomor_hp'}
            editValue={editValue}
            onEditChange={setEditValue}
            onSave={() => handleSave('nomor_hp')}
            onCancel={() => setEditingField(null)}
            onStartEdit={() => handleStartEdit('nomor_hp', profile?.nomor_hp)}
          />
        </div>
      </div>
    </div>
  );
}
