"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { Upload, MapPin, Receipt, CheckCircle, Ticket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PickupCheckout({ produk, merchant, qty, userId, vouchers }: { produk: any, merchant: any, qty: number, userId: string, vouchers: any[] }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voucher, setVoucher] = useState("");
  const [isVoucherApplied, setIsVoucherApplied] = useState(false);
  const [buktiBayarBase64, setBuktiBayarBase64] = useState<string | null>(null);
  const [adminFee, setAdminFee] = useState(2000);

  useEffect(() => {
    const fetchFees = async () => {
      const { data, error } = await supabase.from("system_settings").select("*");
      if (!error && data) {
        data.forEach((setting) => {
          if (setting.key === "admin_fee") setAdminFee(setting.value);
        });
      }
    };
    fetchFees();
  }, []);

  const selectedVoucher = vouchers.find(v => v.code === voucher);
  const voucherDiscount = isVoucherApplied && selectedVoucher ? selectedVoucher.amount : 0;
  const totalHargaProduk = (produk?.harga_diskon || 0) * qty;
  const totalPembayaran = totalHargaProduk + adminFee - voucherDiscount;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran gambar terlalu besar. Maksimal 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          setBuktiBayarBase64(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKonfirmasi = async () => {
    if (!buktiBayarBase64) {
      alert("Harap unggah bukti pembayaran terlebih dahulu.");
      return;
    }
    
    setIsSubmitting(true);
    
    const orderItems = Array(qty).fill({
      pembeli_id: userId,
      produk_id: produk.id,
      metode_pengambilan: "pickup",
      status: "pending",
      bukti_bayar_url: buktiBayarBase64
    });

    const { error: pesananError } = await supabase.from("pesanan").insert(orderItems);

    if (pesananError) {
      alert("Gagal memproses pesanan.");
      setIsSubmitting(false);
      return;
    }

    const stokBaru = produk.stok - qty;
    await supabase.from("produk").update({ stok: stokBaru }).eq("id", produk.id);

    alert("Pesanan Pickup berhasil dikonfirmasi! Bukti pembayaran telah diterima.");
    router.push("/pembeli");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8">
      {/* Rincian Produk */}
      <div className="flex gap-4 items-center bg-neutral-50 p-4 rounded-xl border border-neutral-100">
        <img src={produk.gambar_url} alt={produk.nama_makanan} className="w-20 h-20 object-cover rounded-lg" />
        <div className="flex-1">
          <h3 className="font-bold text-lg text-neutral-900">{produk.nama_makanan}</h3>
          <p className="text-sm text-neutral-500">{qty} porsi x {formatCurrency(produk.harga_diskon)}</p>
        </div>
        <div className="font-bold text-lg text-orange-600">
          {formatCurrency(totalHargaProduk)}
        </div>
      </div>

      {/* Lokasi */}
      <div>
        <h4 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
          <MapPin size={18} className="text-orange-600" /> Lokasi Pengambilan (Toko Penjual)
        </h4>
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-sm text-neutral-700 leading-relaxed">
          <strong>{merchant?.nama}</strong><br />
          {merchant?.lokasi || "Lokasi belum diatur oleh penjual."}
          {merchant?.lokasi_gmaps && (
            <a href={merchant.lokasi_gmaps} target="_blank" rel="noreferrer" className="block mt-2 text-blue-600 hover:underline">Buka di Google Maps</a>
          )}
        </div>
      </div>

      {/* Voucher */}
      <div>
        <h4 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
          <Ticket size={18} className="text-orange-600" /> Voucher Diskon
        </h4>
        <div className="flex gap-2">
          {vouchers.length === 0 ? (
            <div className="flex-1 p-3 border border-neutral-200 rounded-xl bg-neutral-50 text-neutral-500 text-sm italic flex items-center">
              Anda tidak memiliki voucher saat ini.
            </div>
          ) : (
            <select 
              className="flex-1 p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 bg-white"
              value={voucher}
              onChange={(e) => setVoucher(e.target.value)}
              disabled={isVoucherApplied}
            >
              <option value="">Pilih voucher yang tersedia...</option>
              {vouchers.map(v => (
                <option key={v.id} value={v.code}>{v.name}</option>
              ))}
            </select>
          )}
          
          <button 
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-colors ${isVoucherApplied ? 'bg-green-100 text-green-700' : 'bg-neutral-800 text-white hover:bg-neutral-900'} disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={vouchers.length === 0}
            onClick={() => {
              if (isVoucherApplied) {
                setIsVoucherApplied(false);
                setVoucher("");
              } else if (voucher) {
                setIsVoucherApplied(true);
              } else {
                alert("Silakan pilih voucher terlebih dahulu.");
              }
            }}
          >
            {isVoucherApplied ? 'Batal' : 'Gunakan'}
          </button>
        </div>
      </div>

      {/* Pembayaran */}
      <div>
        <h4 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
          <Receipt size={18} className="text-orange-600" /> Pembayaran
        </h4>
        
        <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-200 mb-4">
          <p className="text-sm text-neutral-600 mb-1">Transfer ke Rekening Penjual:</p>
          <p className="text-xl font-bold tracking-wider text-neutral-900">{merchant?.no_rekening || "Belum diatur penjual"}</p>
          <p className="text-sm font-medium text-neutral-500 mt-1">A.N. {merchant?.nama}</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-neutral-700">Unggah Bukti Transfer</label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-neutral-300 border-dashed rounded-xl cursor-pointer bg-neutral-50 hover:bg-neutral-100 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {buktiBayarBase64 ? (
                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
              ) : (
                <Upload className="w-8 h-8 text-neutral-400 mb-2" />
              )}
              <p className="mb-2 text-sm text-neutral-500">
                {buktiBayarBase64 ? <span className="font-semibold text-green-600">Bukti berhasil dipilih</span> : <span><span className="font-semibold">Klik untuk unggah</span> atau seret gambar</span>}
              </p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      <hr className="border-neutral-200" />

      {/* Rincian Pembayaran */}
      <div className="bg-orange-50/50 p-5 rounded-xl border border-orange-100 space-y-3">
        <div className="flex justify-between text-sm text-neutral-600">
          <span>Subtotal ({qty} porsi)</span>
          <span>{formatCurrency(totalHargaProduk)}</span>
        </div>
        <div className="flex justify-between text-sm text-neutral-600">
          <span>Biaya Admin</span>
          <span>{formatCurrency(adminFee)}</span>
        </div>
        {isVoucherApplied && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Voucher Diskon</span>
            <span>-{formatCurrency(voucherDiscount)}</span>
          </div>
        )}
        <div className="pt-3 border-t border-orange-200 flex justify-between items-center">
          <span className="font-bold text-neutral-900">Total Pembayaran</span>
          <span className="text-2xl font-black text-orange-600">{formatCurrency(totalPembayaran)}</span>
        </div>
      </div>

      {/* Tombol Aksi */}
      <button 
        onClick={handleKonfirmasi}
        disabled={isSubmitting || !buktiBayarBase64}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-lg mt-2"
      >
        {isSubmitting ? 'Memproses...' : 'Konfirmasi & Bayar Pesanan'}
      </button>

    </div>
  );
}
