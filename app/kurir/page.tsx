'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import BiodataForm from '@/components/kurir/BiodataForm';
import CourierDashboard from '@/components/kurir/CourierDashboard';

export default function KurirPage() {
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isRejected, setIsRejected] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const checkCourierStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // If no user is logged in, you might want to redirect to login
          // For now we just stop loading
          setLoading(false);
          return;
        }
        
        setUserId(user.id);

        const { data: courier, error } = await supabase
          .from('couriers')
          .select('verification_status, rejection_reason')
          .eq('user_id', user.id)
          .single();

        if (courier) {
          setHasProfile(true);
          if (courier.verification_status === 'verified') {
            setIsVerified(true);
          } else if (courier.verification_status === 'rejected') {
            setIsRejected(true);
            setRejectionReason(courier.rejection_reason || "Biodata tidak memenuhi syarat.");
          }
        }
      } catch (err) {
        console.error('Error fetching courier status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkCourierStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mb-4"></div>
          <p className="text-neutral-600 font-medium">Memuat data...</p>
        </div>
      </div>
    );
  }

  // If they don't have a profile, or they have a profile but not verified, show BiodataForm
  // Alternatively, if they have a profile but it's 'pending', you might want to show a pending message instead of the form.
  if (!hasProfile) {
    return <BiodataForm />;
  }

  if (isRejected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4 text-center font-sans">
        <div className="max-w-md w-full p-8 bg-white shadow-sm border border-red-200 rounded-2xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-black text-neutral-900 mb-2">Verifikasi Ditolak</h2>
          <p className="text-neutral-600 mb-4">
            Mohon maaf, pengajuan Anda ditolak dengan alasan:
          </p>
          <div className="bg-red-50 p-4 rounded-lg text-red-700 font-medium mb-6">
            "{rejectionReason}"
          </div>
          <button 
            onClick={async () => {
              await supabase.from('couriers').delete().eq('user_id', userId);
              setHasProfile(false);
              setIsRejected(false);
            }}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Unggah Ulang Data
          </button>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4 text-center font-sans">
        <div className="max-w-md w-full p-8 bg-white shadow-sm border border-neutral-200 rounded-2xl">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-black text-neutral-900 mb-2">Verifikasi Sedang Diproses</h2>
          <p className="text-neutral-600">
            Biodata Anda sedang ditinjau oleh tim kami. Mohon menunggu hingga akun kurir Anda disetujui.
          </p>
        </div>
      </div>
    );
  }

  // If verified, show dashboard
  return <CourierDashboard />;
}
