"use client";

import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

export default function News({ role }: { role: string }) {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      const { data } = await supabase
        .from("news")
        .select("*")
        .in("target_role", ["all", role])
        .order("created_at", { ascending: false });
        
      if (data) setNews(data);
      setLoading(false);
    };
    fetchNews();
  }, [role]);

  if (loading) return <div className="p-4 text-center text-neutral-500">Memuat berita...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-neutral-900 mb-4">Berita Terkini</h2>
      {news.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 text-neutral-500 text-center">
          Belum ada berita terbaru saat ini.
        </div>
      ) : (
        news.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
            <h3 className="font-bold text-lg text-neutral-800 mb-2">{item.title}</h3>
            <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">{item.content}</p>
            <div className="mt-3 text-xs text-neutral-400">
              {new Date(item.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
