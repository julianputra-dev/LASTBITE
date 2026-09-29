"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { Loader2, Save, Trash2, Edit2, Search, XCircle, Image as ImageIcon } from "lucide-react";

interface Product {
  id: string;
  nama_makanan: string;
  harga_normal: number;
  harga_diskon: number;
  stok: number;
  batas_waktu: string;
  gambar_url?: string;
}

export default function ManageStock({ merchantId }: { merchantId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ stok: number | ""; harga_diskon: number | ""; batas_waktu: string }>({ stok: "", harga_diskon: "", batas_waktu: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (merchantId) fetchProducts();
  }, [merchantId]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('produk')
        .select('*')
        .eq('penjual_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Gagal menarik daftar produk:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus produk diskon ini?")) return;
    
    try {
      const { error } = await supabase
        .from('produk')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const { data: verifyData } = await supabase.from('produk').select('id').eq('id', id).single();
      
      if (verifyData) {
        alert("GAGAL MENGHAPUS: Database Supabase Anda menolak penghapusan secara diam-diam karena aturan keamanan (RLS) belum diatur untuk mengizinkan DELETE.\n\nCARA MEMPERBAIKI:\n1. Buka Dasbor Supabase Anda.\n2. Masuk ke menu SQL Editor.\n3. Jalankan kode ini:\nALTER TABLE produk DISABLE ROW LEVEL SECURITY;\n\nSetelah itu, Anda bebas menghapus produk yang sudah kadaluarsa!");
        return; 
      }

      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error("Gagal menghapus produk:", error);
      alert("Gagal menghapus produk karena masih terikat dengan data pesanan.");
    }
  };

  const isExpired = (batasWaktu: string) => {
    if (!batasWaktu) return false;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const [batasHour, batasMinute] = batasWaktu.split(':').map(Number);
    
    if (currentHour > batasHour) return true;
    if (currentHour === batasHour && currentMinute >= batasMinute) return true;
    
    return false;
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm({ stok: product.stok, harga_diskon: product.harga_diskon, batas_waktu: product.batas_waktu.substring(0, 5) });
  };

  const saveEdit = async (id: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('produk')
        .update({ 
          stok: editForm.stok === "" ? 0 : editForm.stok, 
          harga_diskon: editForm.harga_diskon === "" ? 0 : editForm.harga_diskon,
          batas_waktu: editForm.batas_waktu
        })
        .eq('id', id);

      if (error) throw error;
      
      setProducts(products.map(p => 
        p.id === id 
          ? { 
              ...p, 
              stok: editForm.stok === "" ? 0 : Number(editForm.stok), 
              harga_diskon: editForm.harga_diskon === "" ? 0 : Number(editForm.harga_diskon),
              batas_waktu: editForm.batas_waktu || p.batas_waktu
            } 
          : p
      ));
      
      setEditingId(null);
    } catch (error) {
      console.error("Gagal menyimpan perubahan:", error);
      alert("Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const filteredProducts = products.filter(p => 
    (p.nama_makanan || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Kelola Stok & Harga</h1>
          <p className="text-sm text-neutral-500 mt-1">Perbarui jumlah porsi sisa dan sesuaikan harga penawaran secara instan.</p>
        </div>
        
        <div className="relative group w-full sm:w-72">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={18} className="text-neutral-400 group-focus-within:text-orange-600 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Cari nama produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-neutral-400">
            <Loader2 size={40} className="animate-spin text-orange-500 mb-4" />
            <p className="font-semibold text-neutral-600">Memuat inventaris produk...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-neutral-400 text-center">
            <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
              <Search size={32} className="text-neutral-300" />
            </div>
            <h3 className="text-lg font-bold text-neutral-700 mb-1">Tidak ada produk ditemukan</h3>
            <p className="text-sm text-neutral-500 max-w-sm">
              {searchQuery ? "Coba gunakan kata kunci pencarian yang berbeda." : "Anda belum memiliki produk apa pun di etalase Anda."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-neutral-50/50 text-xs uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
                  <th className="px-6 py-4 font-bold">Produk</th>
                  <th className="px-6 py-4 font-bold">Harga Asli</th>
                  <th className="px-6 py-4 font-bold">Harga Diskon</th>
                  <th className="px-6 py-4 font-bold">Stok Porsi</th>
                  <th className="px-6 py-4 font-bold">Batas Waktu</th>
                  <th className="px-6 py-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredProducts.map((product) => {
                  const isEditing = editingId === product.id;
                  
                  return (
                    <tr key={product.id} className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-neutral-100 border border-neutral-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {product.gambar_url ? (
                              <img src={product.gambar_url} alt={product.nama_makanan} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={20} className="text-neutral-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900 line-clamp-1">{product.nama_makanan}</p>
                            <p className="text-xs text-neutral-500 mt-0.5">ID: {product.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-neutral-600 line-through">
                          {formatCurrency(product.harga_normal)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500 text-sm pointer-events-none">Rp</span>
                            <input
                              type="number"
                              min="0"
                              value={editForm.harga_diskon}
                              onChange={(e) => setEditForm({ ...editForm, harga_diskon: e.target.value === "" ? "" : parseInt(e.target.value) })}
                              className="w-32 pl-9 pr-3 py-1.5 text-sm border-2 border-orange-500 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-500/20"
                            />
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                            {formatCurrency(product.harga_diskon)}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editForm.stok}
                            onChange={(e) => setEditForm({ ...editForm, stok: e.target.value === "" ? "" : parseInt(e.target.value) })}
                            className="w-20 px-3 py-1.5 text-sm border-2 border-orange-500 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-500/20 text-center font-bold"
                          />
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`text-sm font-bold px-2.5 py-1 rounded-md ${product.stok > 0 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-600'}`}>
                              {product.stok} Porsi
                            </span>
                            {isExpired(product.batas_waktu) && product.stok > 0 && (
                              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                                Tidak Terjual
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="time"
                            value={editForm.batas_waktu}
                            onChange={(e) => setEditForm({ ...editForm, batas_waktu: e.target.value })}
                            className="w-24 px-2 py-1.5 text-sm border-2 border-orange-500 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-500/20 text-center font-bold"
                          />
                        ) : (
                          <span className="text-sm font-medium text-neutral-600">
                            {product.batas_waktu.substring(0,5)}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setEditingId(null)}
                              className="p-1.5 text-neutral-500 hover:bg-neutral-200 rounded-lg transition-colors"
                            >
                              <XCircle size={18} />
                            </button>
                            <button 
                              onClick={() => saveEdit(product.id)}
                              disabled={isSaving}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                              Simpan
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => startEdit(product)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Harga & Stok"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDelete(product.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus Produk"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
