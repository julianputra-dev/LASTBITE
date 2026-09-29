import { redirect } from 'next/navigation';

export default function Home() {
  // Sesuai dengan spesifikasi Arsitektur Teknis LASTBITE,
  // saat pertama kali membuka web, pengguna langsung diarahkan ke Halaman Dashboard (Landing Page)
  redirect('/dashboard');
}