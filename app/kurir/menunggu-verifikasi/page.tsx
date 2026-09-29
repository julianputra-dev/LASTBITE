'use client';

import React from 'react';
import Link from 'next/link';

export default function MenungguVerifikasiPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4 font-sans">
      <div className="max-w-md w-full p-8 bg-white shadow-sm border border-neutral-200 rounded-2xl text-center animate-fade-in-up">
        {/* Ikon Jam / Tunggu */}
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-orange-100">
          <svg 
            className="w-10 h-10 text-orange-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        
        {/* Teks Konten */}
        <h2 className="text-2xl md:text-3xl font-black text-neutral-900 mb-3 tracking-wide">
          Verifikasi Diproses
        </h2>
        
        <p className="text-neutral-600 mb-8 leading-relaxed text-sm md:text-base">
          Terima kasih telah melengkapi pendaftaran. Dokumen KTP, KTM, dan data diri Anda telah berhasil dikirim dan saat ini sedang ditinjau oleh tim kami. Mohon menunggu beberapa saat hingga akun Anda disetujui.
        </p>

        {/* Tombol Aksi */}
        <Link href="/kurir">
          <button className="w-full bg-orange-600 hover:bg-orange-700 text-white px-5 py-3.5 rounded-xl font-bold transition-all shadow-md active:scale-[0.98]">
            Periksa Status Saat Ini
          </button>
        </Link>
      </div>
    </div>
  );
}
