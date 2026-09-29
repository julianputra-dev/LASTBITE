"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { Pencil, Trash2 } from "lucide-react";

export default function NewsPage() {
  const [news, setNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchNews = async () => {
    setLoadingNews(true);
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    if (data) setNews(data);
    setLoadingNews(false);
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    let error;
    if (editingId) {
      const res = await supabase.from("news").update({ title, content, target_role: targetRole }).eq("id", editingId);
      error = res.error;
    } else {
      const res = await supabase.from("news").insert([{ title, content, target_role: targetRole }]);
      error = res.error;
    }

    setLoading(false);
    if (error) {
      setMessage(`Gagal ${editingId ? 'mengubah' : 'menerbitkan'} berita: ` + error.message);
    } else {
      setMessage(`Berita berhasil ${editingId ? 'diubah' : 'diterbitkan'}.`);
      resetForm();
      fetchNews();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus berita ini?")) return;
    await supabase.from("news").delete().eq("id", id);
    fetchNews();
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setTargetRole(item.target_role);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setTargetRole("all");
    setEditingId(null);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-black text-neutral-900">Berita</h1>
        <p className="text-neutral-600 mt-1 font-medium">Sampaikan informasi terbaru kepada pengguna aplikasi.</p>
      </div>

      <form onSubmit={handlePublish} className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 space-y-5">
        <h2 className="text-xl font-bold text-neutral-900 border-b border-neutral-100 pb-3">{editingId ? "Ubah Berita" : "Tulis Berita Baru"}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-neutral-800 mb-2">Judul Berita</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-neutral-300 p-3 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-neutral-900 bg-neutral-50" placeholder="Masukkan judul..." />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-800 mb-2">Target Pengguna</label>
            <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="w-full border border-neutral-300 p-3 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-neutral-900 bg-neutral-50">
              <option value="all">Semua Pengguna</option>
              <option value="pembeli">Pembeli</option>
              <option value="penjual">Penjual</option>
              <option value="kurir">Kurir</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-neutral-800 mb-2">Konten Berita</label>
          <textarea required value={content} onChange={(e) => setContent(e.target.value)} rows={5} className="w-full border border-neutral-300 p-3 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-neutral-900 bg-neutral-50" placeholder="Tuliskan detail berita..." />
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-bold ${message.includes("Gagal") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
            {message}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="flex-1 bg-orange-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50">
            {loading ? "Menyimpan..." : (editingId ? "Simpan Perubahan" : "Terbitkan Berita")}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="bg-neutral-100 text-neutral-800 px-6 py-3 rounded-xl font-bold hover:bg-neutral-200 transition-colors">
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-neutral-900">Riwayat Berita</h2>
        {loadingNews ? (
          <div className="text-neutral-500 font-medium">Memuat berita...</div>
        ) : news.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-100 text-neutral-500 font-medium text-center">
            Belum ada berita yang diterbitkan.
          </div>
        ) : (
          <div className="grid gap-4">
            {news.map(item => (
              <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2 py-1 bg-orange-50 text-orange-700 text-[10px] font-black rounded uppercase">
                      {item.target_role}
                    </span>
                    <span className="text-xs font-bold text-neutral-400">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900">{item.title}</h3>
                  <p className="text-sm font-medium text-neutral-600 mt-1 line-clamp-2">{item.content}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleEdit(item)} className="p-2 text-neutral-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
