"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import Helpdesk from "@/components/Helpdesk";

export default function BantuanPembeliPage() {
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 w-full">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        {userId ? <Helpdesk role="pembeli" userId={userId} /> : <div className="text-center p-8">Memuat...</div>}
      </div>
    </div>
  );
}
