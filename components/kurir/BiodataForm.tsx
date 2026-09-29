'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function BiodataForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    nim: '',
    ktmPhoto: null as File | null,
    ktpPhoto: null as File | null,
    facePhoto: null as File | null,
    bankAccount: '',
    phoneNumber: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingCourier, setExistingCourier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  React.useEffect(() => {
    const checkExisting = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('couriers')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (data) {
        setExistingCourier(data);
        if (data.verification_status === 'rejected') {
          const updatedTime = new Date(data.updated_at || data.created_at).getTime();
          const now = new Date().getTime();
          const diffHours = (now - updatedTime) / (1000 * 60 * 60);
          
          if (diffHours < 12) {
            const remaining = 12 - diffHours;
            const hours = Math.floor(remaining);
            const minutes = Math.floor((remaining - hours) * 60);
            setTimeRemaining(`${hours} jam ${minutes} menit`);
          }
        } else if (data.verification_status === 'pending' || data.verification_status === 'verified') {
        }
      }
      setLoading(false);
    };
    checkExisting();
  }, []);

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, [field]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, [field]: e.target.files[0] });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Nama Lengkap wajib diisi.';
    if (!formData.nim) newErrors.nim = 'NIM wajib diisi (hanya angka).';
    if (!formData.ktmPhoto) newErrors.ktmPhoto = 'Foto KTM wajib diunggah.';
    if (!formData.ktpPhoto) newErrors.ktpPhoto = 'Foto KTP wajib diunggah.';
    if (!formData.facePhoto) newErrors.facePhoto = 'Foto Muka (Selfie) wajib diunggah.';
    if (!formData.bankAccount) newErrors.bankAccount = 'Nomor Rekening wajib diisi (hanya angka).';
    if (!formData.phoneNumber) newErrors.phoneNumber = 'Nomor Telepon wajib diisi.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Pengguna tidak terautentikasi.');

      const { data: existingNim, error: nimError } = await supabase
        .from('couriers')
        .select('id, user_id')
        .eq('student_id_number', formData.nim)
        .neq('user_id', user.id);
        
      if (existingNim && existingNim.length > 0) {
        setErrors(prev => ({ ...prev, nim: 'NIM ini sudah digunakan oleh akun lain.' }));
        setIsSubmitting(false);
        return;
      }

      const ktmExt = formData.ktmPhoto!.name.split('.').pop();
      const ktmFileName = `${user.id}-ktm.${ktmExt}`;
      const { error: ktmError } = await supabase.storage
        .from('courier_documents')
        .upload(ktmFileName, formData.ktmPhoto!);
      if (ktmError) throw ktmError;
      const { data: ktmUrlData } = supabase.storage.from('courier_documents').getPublicUrl(ktmFileName);

      const ktpExt = formData.ktpPhoto!.name.split('.').pop();
      const ktpFileName = `${user.id}-ktp.${ktpExt}`;
      const { error: ktpError } = await supabase.storage
        .from('courier_documents')
        .upload(ktpFileName, formData.ktpPhoto!);
      if (ktpError) throw ktpError;
      const { data: ktpUrlData } = supabase.storage.from('courier_documents').getPublicUrl(ktpFileName);

      const faceExt = formData.facePhoto!.name.split('.').pop();
      const faceFileName = `${user.id}-face.${faceExt}`;
      const { error: faceError } = await supabase.storage
        .from('courier_documents')
        .upload(faceFileName, formData.facePhoto!);
      if (faceError) throw faceError;
      const { data: faceUrlData } = supabase.storage.from('courier_documents').getPublicUrl(faceFileName);

      const { error: insertError } = await supabase
        .from('couriers')
        .upsert({
          user_id: user.id,
          full_name: formData.fullName,
          student_id_number: formData.nim,
          student_card_url: ktmUrlData.publicUrl,
          id_card_url: ktpUrlData.publicUrl,
          face_photo_url: faceUrlData.publicUrl,
          bank_account_number: formData.bankAccount,
          phone_number: formData.phoneNumber,
          verification_status: 'pending',
          rejection_reason: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (insertError) throw insertError;
      
      alert('Biodata berhasil dikirim. Menunggu verifikasi admin.');
      router.push('/kurir/menunggu-verifikasi');
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat mengirim biodata.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full mx-auto">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-neutral-900 tracking-wide">
            Kelengkapan Biodata Kurir
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-600">
            Silakan lengkapi data Anda untuk proses verifikasi.
          </p>
        </div>
        
        {loading ? (
          <div className="mt-8 text-center text-neutral-500 font-bold">Memuat...</div>
        ) : timeRemaining ? (
          <div className="mt-8 bg-red-50 p-6 rounded-2xl border border-red-100 text-center shadow-sm">
            <h3 className="text-red-700 font-black text-xl mb-2">Pengajuan Ditolak</h3>
            {existingCourier?.rejection_reason && (
              <div className="bg-white p-3 rounded-xl border border-red-200 text-red-900 text-sm font-medium my-4">
                <span className="font-bold block mb-1">Alasan Penolakan:</span>
                {existingCourier.rejection_reason}
              </div>
            )}
            <p className="text-red-600 text-sm font-medium">
              Anda tidak dapat mengirim pengajuan lagi saat ini. Silakan coba kembali dalam:
            </p>
            <p className="text-2xl font-black text-red-700 mt-2">{timeRemaining}</p>
          </div>
        ) : (
        <form className="mt-8 space-y-6 bg-white py-8 px-6 shadow-sm border border-neutral-200 rounded-2xl sm:px-10" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-neutral-700">
              Nama Lengkap
            </label>
            <div className="mt-1">
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="appearance-none block w-full px-4 py-2.5 border border-neutral-300 rounded-xl shadow-sm placeholder-neutral-400 text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-all"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
              {errors.fullName && <p className="mt-2 text-sm text-red-600">{errors.fullName}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="nim" className="block text-sm font-medium text-neutral-700">
              Nomor Induk Mahasiswa (NIM)
            </label>
            <div className="mt-1">
              <input
                id="nim"
                name="nim"
                type="text"
                inputMode="numeric"
                required
                className="appearance-none block w-full px-4 py-2.5 border border-neutral-300 rounded-xl shadow-sm placeholder-neutral-400 text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-all"
                value={formData.nim}
                onChange={(e) => handleNumberInput(e, 'nim')}
              />
              {errors.nim && <p className="mt-2 text-sm text-red-600">{errors.nim}</p>}
            </div>
          </div>
          
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-neutral-700">
              Nomor Telepon
            </label>
            <div className="mt-1">
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="text"
                inputMode="numeric"
                required
                className="appearance-none block w-full px-4 py-2.5 border border-neutral-300 rounded-xl shadow-sm placeholder-neutral-400 text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-all"
                value={formData.phoneNumber}
                onChange={(e) => handleNumberInput(e, 'phoneNumber')}
              />
              {errors.phoneNumber && <p className="mt-2 text-sm text-red-600">{errors.phoneNumber}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="bankAccount" className="block text-sm font-medium text-neutral-700">
              Nomor Rekening Bank
            </label>
            <div className="mt-1">
              <input
                id="bankAccount"
                name="bankAccount"
                type="text"
                inputMode="numeric"
                required
                className="appearance-none block w-full px-4 py-2.5 border border-neutral-300 rounded-xl shadow-sm placeholder-neutral-400 text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-all"
                value={formData.bankAccount}
                onChange={(e) => handleNumberInput(e, 'bankAccount')}
              />
              {errors.bankAccount && <p className="mt-2 text-sm text-red-600">{errors.bankAccount}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="ktmPhoto" className="block text-sm font-medium text-neutral-700">
              Unggah Foto KTM
            </label>
            <div className="mt-1">
              <input
                id="ktmPhoto"
                name="ktmPhoto"
                type="file"
                accept="image/*"
                required
                className="appearance-none block w-full px-4 py-2.5 border border-neutral-300 rounded-xl shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-all text-neutral-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                onChange={(e) => handleFileChange(e, 'ktmPhoto')}
              />
              {errors.ktmPhoto && <p className="mt-2 text-sm text-red-600">{errors.ktmPhoto}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="ktpPhoto" className="block text-sm font-medium text-neutral-700">
              Unggah Foto KTP
            </label>
            <div className="mt-1">
              <input
                id="ktpPhoto"
                name="ktpPhoto"
                type="file"
                accept="image/*"
                required
                className="appearance-none block w-full px-4 py-2.5 border border-neutral-300 rounded-xl shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-all text-neutral-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                onChange={(e) => handleFileChange(e, 'ktpPhoto')}
              />
              {errors.ktpPhoto && <p className="mt-2 text-sm text-red-600">{errors.ktpPhoto}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="facePhoto" className="block text-sm font-medium text-neutral-700">
              Unggah Foto Muka (Selfie)
            </label>
            <div className="mt-1">
              <input
                id="facePhoto"
                name="facePhoto"
                type="file"
                accept="image/*"
                required
                className="appearance-none block w-full px-4 py-2.5 border border-neutral-300 rounded-xl shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-all text-neutral-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                onChange={(e) => handleFileChange(e, 'facePhoto')}
              />
              {errors.facePhoto && <p className="mt-2 text-sm text-red-600">{errors.facePhoto}</p>}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Mengirim Data...' : 'Kirim Biodata'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
