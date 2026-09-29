"use client";

import React, { useEffect, useState } from 'react';
import AvatarSection from '@/components/pembeli/profil/AvatarSection';
import BioSection from '@/components/pembeli/profil/BioSection';
import { supabase } from '@/utils/supabase';

export default function ProfilPembeliPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (data) {
        setProfile({ ...data, authEmail: session.user.email });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Profil Saya</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola informasi profil, kontak, dan keamanan akun Anda.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          {/* Kolom Kiri: Avatar & Kata Sandi */}
          <div className="md:col-span-5 lg:col-span-4 xl:col-span-3">
            <AvatarSection profile={profile} onUpdate={fetchProfile} />
          </div>

          {/* Kolom Kanan: Biodata & Kontak */}
          <div className="md:col-span-7 lg:col-span-8 xl:col-span-9">
            <BioSection profile={profile} onUpdate={fetchProfile} />
          </div>
        </div>
      </div>
    </div>
  );
}
