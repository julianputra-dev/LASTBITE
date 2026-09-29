import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from '../components/Navbar';
import AuthGuard from '../components/AuthGuard';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LASTBITE",
  description: "Marketplace Last-Hour Food Deals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthGuard>
          <Navbar />
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}