"use client";

import News from "@/components/News";

export default function BeritaPembeliPage() {
  return (
    <div className="min-h-screen bg-neutral-50 w-full">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <News role="pembeli" />
      </div>
    </div>
  );
}
