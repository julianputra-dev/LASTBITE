"use client";

import React, { useState, useEffect } from "react";
import { Clock, MapPin, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface DealCardProps {
  id: string;
  name: string;
  merchantName: string;
  normalPrice: number;
  discountPrice: number;
  stockAvailable: number;
  closingTime: string; // Absolute time string e.g., "23:58" or "23:58:00"
  distance: string; 
  imageUrl: string;
}

export default function DealCard({
  name,
  merchantName,
  normalPrice,
  discountPrice,
  stockAvailable,
  closingTime,
  distance,
  imageUrl,
}: DealCardProps) {
  const discountPercent = Math.round(((normalPrice - discountPrice) / normalPrice) * 100);
  
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!closingTime) {
      setTimeLeft("Waktu habis");
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();
      
      const [batasHour, batasMinute] = closingTime.split(':').map(Number);
      
      let hourDiff = batasHour - currentHour;
      let minuteDiff = batasMinute - currentMinute;
      let secondDiff = 0 - currentSecond;
      
      if (secondDiff < 0) {
        minuteDiff -= 1;
        secondDiff += 60;
      }
      if (minuteDiff < 0) {
        hourDiff -= 1;
        minuteDiff += 60;
      }
      
      if (hourDiff < 0) {
        return "Waktu habis";
      }

      if (hourDiff === 0 && minuteDiff === 0) {
        return `Sisa ${secondDiff}d`;
      }
      if (hourDiff === 0) {
        return `Sisa ${minuteDiff}m`;
      }
      return `Sisa ${hourDiff}j ${minuteDiff}m`;
    };

    setTimeLeft(calculateTimeLeft());
    
    // Update every minute (or second if we want it real-time, but 10s is good enough for both)
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 10000);

    return () => clearInterval(interval);
  }, [closingTime]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-neutral-200 flex flex-col h-full hover:shadow-md transition-shadow">
      
      {/* Image Container */}
      <div className="relative h-48 w-full overflow-hidden bg-neutral-200">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
        />
        
        {/* Discount Badge */}
        <div className="absolute top-3 left-3 bg-red-600 text-white font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 shadow-sm">
          <Tag size={12} />
          {discountPercent}% OFF
        </div>
        
        {/* Timer Badge */}
        <div className="absolute bottom-3 right-3 bg-white/95 text-red-600 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 shadow-sm border border-neutral-100">
          <Clock size={14} className="animate-pulse" />
          {timeLeft}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="font-bold text-neutral-900 line-clamp-2 leading-snug">
            {name}
          </h3>
          <span className="bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold px-2 py-1 rounded shrink-0">
            Sisa {stockAvailable}
          </span>
        </div>
        
        <p className="text-neutral-500 text-xs mb-4 flex items-center gap-1 font-medium">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{merchantName}</span> 
          <span>&bull;</span> 
          <span>{distance}</span>
        </p>

        <div className="mt-auto">
          <div className="flex items-end gap-2 mb-3">
            <span className="text-lg font-black text-neutral-900 leading-none">
              {formatCurrency(discountPrice)}
            </span>
            <span className="text-xs text-neutral-400 line-through font-medium leading-none pb-0.5">
              {formatCurrency(normalPrice)}
            </span>
          </div>
          
          <Link href="/login" className="block text-center w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-sm">
            Ambil Diskon
          </Link>
        </div>
      </div>
    </div>
  );
}
