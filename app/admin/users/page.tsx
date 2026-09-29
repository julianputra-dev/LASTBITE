"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { Search, Filter, ShieldAlert, Edit2 } from "lucide-react";

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [banningUser, setBanningUser] = useState<any | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("permanent");
  const [banLoading, setBanLoading] = useState(false);
  const [isEditingBan, setIsEditingBan] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profilesData } = await supabase.from("profiles").select("*").order("nama", { ascending: true });
    const { data: bansData } = await supabase.from("bans").select("*");
    const { data: couriersData } = await supabase.from("couriers").select("user_id, verification_status");
    
    if (profilesData && bansData) {
      const now = new Date();
      const mapped = profilesData.map(p => {
        // Find latest active ban
        const activeBans = bansData.filter(b => b.user_id === p.id && (!b.banned_until || new Date(b.banned_until) > now));
        const currentBan = activeBans.length > 0 ? activeBans[0] : null;
        
        // Find courier status if kurir
        let courierStatus = null;
        if (p.peran === 'kurir' && couriersData) {
          const courierDoc = couriersData.find(c => c.user_id === p.id);
          courierStatus = courierDoc ? courierDoc.verification_status : 'not_submitted';
        }
        
        return { ...p, currentBan, courierStatus };
      });
      setUsers(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banningUser) return;
    
    setBanLoading(true);
    
    if (banDuration === "unban") {
      // Remove all bans for this user
      await supabase.from("bans").delete().eq("user_id", banningUser.id);
    } else {
      let bannedUntil = null;
      if (banDuration !== "permanent") {
        const date = new Date();
        date.setDate(date.getDate() + parseInt(banDuration));
        bannedUntil = date.toISOString();
      }

      await supabase.from("bans").insert([{
        user_id: banningUser.id,
        role: banningUser.peran,
        reason: banReason,
        banned_until: bannedUntil
      }]);
    }

    setBanLoading(false);
    setBanningUser(null);
    setBanReason("");
    setIsEditingBan(false);
    fetchUsers();
    alert("Tindakan pengguna berhasil diperbarui.");
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.nama?.toLowerCase().includes(searchQuery.toLowerCase())) || 
                          (user.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === "all" || user.peran === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-neutral-900">Manajemen Pengguna</h1>
        <p className="text-neutral-600 mt-1 font-medium">Cari, filter, dan tindak pengguna yang melanggar aturan.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-neutral-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Cari nama atau email..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-300 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-neutral-900 font-medium"
          />
        </div>
        <div className="relative w-full md:w-64">
          <Filter className="absolute left-3 top-3 text-neutral-400 w-5 h-5" />
          <select 
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-300 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-neutral-900 font-medium appearance-none"
          >
            <option value="all">Semua Peran</option>
            <option value="pembeli">Pembeli</option>
            <option value="penjual">Penjual</option>
            <option value="kurir">Kurir</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {banningUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-neutral-100">
            <h3 className="text-xl font-black text-neutral-900 mb-1 flex items-center gap-2">
              <ShieldAlert className="text-red-600" />
              {isEditingBan ? "Edit Tindakan Pengguna" : "Tindak Pengguna"}
            </h3>
            <p className="text-sm font-medium text-neutral-600 mb-4">Target: <strong>{banningUser.nama}</strong> ({banningUser.email}).</p>
            
            <form onSubmit={handleBan} className="space-y-4">
              {banDuration !== "unban" && (
                <div>
                  <label className="block text-sm font-bold text-neutral-800 mb-2">Alasan Pemblokiran</label>
                  <textarea required value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={3} className="w-full border border-neutral-300 p-3 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-neutral-900 bg-neutral-50" placeholder="Jelaskan alasan pelanggaran" />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-neutral-800 mb-2">Tindakan</label>
                <select value={banDuration} onChange={(e) => setBanDuration(e.target.value)} className="w-full border border-neutral-300 p-3 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-neutral-900 bg-neutral-50">
                  {isEditingBan && <option value="unban">Lepas Blokir (Unban)</option>}
                  <option value="permanent">Blokir Permanen</option>
                  <option value="1">Blokir 1 Hari</option>
                  <option value="3">Blokir 3 Hari</option>
                  <option value="7">Blokir 7 Hari</option>
                  <option value="30">Blokir 30 Hari</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setBanningUser(null); setIsEditingBan(false); }} className="flex-1 bg-neutral-100 text-neutral-800 py-3 rounded-xl font-bold hover:bg-neutral-200 transition-colors">Batal</button>
                <button type="submit" disabled={banLoading} className={`flex-1 ${banDuration === 'unban' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50`}>
                  {banLoading ? "Memproses..." : (banDuration === 'unban' ? "Lepas Blokir" : "Simpan Tindakan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-neutral-500 uppercase">Nama</th>
                <th className="px-6 py-4 text-sm font-bold text-neutral-500 uppercase">Email</th>
                <th className="px-6 py-4 text-sm font-bold text-neutral-500 uppercase">Peran</th>
                <th className="px-6 py-4 text-sm font-bold text-neutral-500 uppercase">Status</th>
                <th className="px-6 py-4 text-sm font-bold text-neutral-500 uppercase text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500 font-medium">Memuat data pengguna...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500 font-medium">Tidak ada pengguna yang cocok.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-neutral-900">{user.nama || 'Tanpa Nama'}</td>
                    <td className="px-6 py-4 text-neutral-600 font-medium">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-700 text-xs font-black rounded-lg uppercase">
                        {user.peran}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.currentBan ? (
                        <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-black rounded-lg uppercase">
                          Terblokir
                        </span>
                      ) : user.peran === 'kurir' ? (
                        user.courierStatus === 'verified' ? (
                           <span className="inline-block px-3 py-1 bg-green-50 text-green-700 text-xs font-black rounded-lg uppercase">
                             Aktif
                           </span>
                        ) : user.courierStatus === 'pending' ? (
                           <span className="inline-block px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-black rounded-lg uppercase">
                             Menunggu Verifikasi
                           </span>
                        ) : user.courierStatus === 'rejected' ? (
                           <span className="inline-block px-3 py-1 bg-red-50 text-red-700 text-xs font-black rounded-lg uppercase">
                             Ditolak
                           </span>
                        ) : (
                           <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-600 text-xs font-black rounded-lg uppercase">
                             Belum Daftar
                           </span>
                        )
                      ) : (
                        <span className="inline-block px-3 py-1 bg-green-50 text-green-700 text-xs font-black rounded-lg uppercase">
                          Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.peran !== 'admin' && (
                        <button 
                          onClick={() => {
                            setBanningUser(user);
                            setIsEditingBan(!!user.currentBan);
                            setBanReason(user.currentBan?.reason || "");
                            setBanDuration(user.currentBan ? (user.currentBan.banned_until ? "7" : "permanent") : "permanent"); // default approx if editing
                          }}
                          className={`font-bold text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 justify-end ml-auto ${user.currentBan ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                        >
                          {user.currentBan ? <><Edit2 className="w-4 h-4" /> Edit Tindakan</> : 'Tindak'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
