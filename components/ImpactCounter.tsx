"use client";

import React, { useEffect, useState } from "react";
import { Leaf, UtensilsCrossed } from "lucide-react";

export default function ImpactCounter() {
  const [carbonSaved, setCarbonSaved] = useState(0);
  const [foodSaved, setFoodSaved] = useState(0);

  useEffect(() => {
    let startTime: number;
    const duration = 1500;
    const targetCarbon = 1254.5;
    const targetFood = 850;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      
      const ease = 1 - Math.pow(1 - progress, 3);

      setCarbonSaved(targetCarbon * ease);
      setFoodSaved(targetFood * ease);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mx-auto mt-4">
      
      {/* Carbon Emission Card */}
      <div className="bg-white border border-neutral-200 p-6 rounded-xl shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-neutral-600">Emisi Karbon Dicegah</h3>
          <div className="text-emerald-600">
            <Leaf size={24} strokeWidth={2} />
          </div>
        </div>
        
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-neutral-900 tabular-nums">
              {carbonSaved.toFixed(1)}
            </span>
            <span className="font-semibold text-neutral-500">kg CO₂</span>
          </div>
          <p className="mt-2 text-sm text-neutral-500 font-medium">
            Setara penanaman <span className="font-bold text-emerald-600">54 pohon</span> baru.
          </p>
        </div>
      </div>

      {/* Food Saved Card */}
      <div className="bg-white border border-neutral-200 p-6 rounded-xl shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-neutral-600">Makanan Diselamatkan</h3>
          <div className="text-orange-600">
            <UtensilsCrossed size={24} strokeWidth={2} />
          </div>
        </div>
        
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-neutral-900 tabular-nums">
              {Math.floor(foodSaved)}
            </span>
            <span className="font-semibold text-neutral-500">kg</span>
          </div>
          <p className="mt-2 text-sm text-neutral-500 font-medium">
            Mengurangi limbah makanan secara <span className="font-bold text-orange-600">hiperlokal</span>.
          </p>
        </div>
      </div>

    </div>
  );
}
