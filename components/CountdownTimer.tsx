"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  batasWaktu: string;
  className?: string;
  isBanner?: boolean;
}

export default function CountdownTimer({ batasWaktu, className = "", isBanner = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [urgency, setUrgency] = useState<"safe" | "warning" | "danger">("safe");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const [batasHour, batasMinute, batasSecond = 0] = batasWaktu.split(':').map(Number);
      
      const targetTime = new Date();
      targetTime.setHours(batasHour, batasMinute, batasSecond, 0);

      const diff = targetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("00:00:00");
        return;
      }

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );

      if (hours >= 2) {
        setUrgency("safe");
      } else if (hours >= 1) {
        setUrgency("warning");
      } else {
        setUrgency("danger");
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [batasWaktu]);

  if (isExpired) {
    return null;
  }
  let styleClass = "";
  if (isBanner) {
    if (urgency === "danger") styleClass = "bg-red-600 text-white animate-pulse border border-red-400";
    else if (urgency === "warning") styleClass = "bg-orange-500/40 text-white border border-orange-300";
    else styleClass = "bg-white/20 text-white border border-white/30";
  } else {
    if (urgency === "danger") styleClass = "bg-red-50 text-red-600 border border-red-200 animate-pulse font-bold";
    else if (urgency === "warning") styleClass = "bg-orange-50 text-orange-600 border border-orange-200";
    else styleClass = "bg-green-50 text-green-700 border border-green-200";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${styleClass} ${className}`}>
      <Clock size={14} />
      Sisa waktu {timeLeft}
    </span>
  );
}
