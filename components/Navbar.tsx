"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase';
import { LogOut, ArrowLeft } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const isProtectedRoute = pathname?.startsWith('/penjual') || pathname?.startsWith('/pembeli') || pathname?.startsWith('/kurir') || pathname?.startsWith('/admin');
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isProfilePage = pathname === '/pembeli/profil';
  const isPesananPage = pathname === '/pembeli/pesanan';
  const isBantuanPage = pathname === '/pembeli/bantuan';
  const isBeritaPage = pathname === '/pembeli/berita';
  const isProductPage = pathname?.startsWith('/pembeli/produk/');
  const isCheckoutPage = pathname?.startsWith('/pembeli/checkout/');
  const isPesananInfoPage = pathname?.startsWith('/pembeli/pesanan/') && pathname !== '/pembeli/pesanan';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-neutral-200 sticky top-0 z-50 px-4 md:px-8 py-3.5 flex justify-between items-center shadow-sm">
      <Link href="/" className="font-black text-2xl tracking-tighter text-orange-600 hover:text-orange-700 transition-colors">
        LASTBITE
      </Link>
      <div className="flex gap-3 items-center">
        {isAuthPage ? (
          <Link href="/" className="flex items-center gap-2 text-sm font-bold hover:text-neutral-900 text-neutral-600 transition-colors bg-neutral-100 hover:bg-neutral-200 px-5 py-2 rounded-xl">
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </Link>
        ) : isProfilePage || isProductPage || isPesananPage || isBantuanPage || isBeritaPage ? (
          <Link href="/pembeli" className="flex items-center gap-2 text-sm font-bold hover:text-neutral-900 text-neutral-600 transition-colors bg-neutral-100 hover:bg-neutral-200 px-5 py-2 rounded-xl">
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </Link>
        ) : isPesananInfoPage ? (
          <Link href="/pembeli/pesanan" className="flex items-center gap-2 text-sm font-bold hover:text-neutral-900 text-neutral-600 transition-colors bg-neutral-100 hover:bg-neutral-200 px-5 py-2 rounded-xl">
            <ArrowLeft size={16} />
            <span>Kembali ke Pesanan</span>
          </Link>
        ) : isCheckoutPage ? (
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold hover:text-neutral-900 text-neutral-600 transition-colors bg-neutral-100 hover:bg-neutral-200 px-5 py-2 rounded-xl">
            <ArrowLeft size={16} />
            <span>Batal & Kembali</span>
          </button>
        ) : isProtectedRoute ? (
          <button onClick={handleLogout} className="flex items-center gap-2 bg-neutral-100 text-neutral-600 px-5 py-2 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 transition-colors group">
            <LogOut size={16} className="group-hover:text-red-600 transition-colors" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        ) : (
          <>
            <Link href="/login" className="text-sm font-bold text-neutral-600 hover:text-orange-600 transition-colors px-4 py-2">
              Masuk
            </Link>
            <Link href="/register" className="bg-orange-600 px-6 py-2.5 rounded-xl text-sm font-bold text-white hover:bg-orange-700 transition-colors shadow-md shadow-orange-600/20">
              Daftar
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}