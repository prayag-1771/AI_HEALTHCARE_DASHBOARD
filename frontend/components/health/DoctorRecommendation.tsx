"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { Stethoscope, MapPin, Star, Clock, CreditCard, Check } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Doctor } from "@/lib/types";
import { getMockDoctors } from "@/lib/api";

export default function DoctorRecommendation() {
  const { colors } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [doctors] = useState<Doctor[]>(getMockDoctors());
  const [booked, setBooked] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current.querySelectorAll("[data-doc]"),
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: "power2.out", clearProps: "all" }
    );
  }, []);

  const handleBook = (name: string) => {
    setShowPayment(true);
    setTimeout(() => {
      setShowPayment(false);
      setBooked(name);
    }, 1500);
  };

  return (
    <div className={cn("rounded-2xl border p-5", colors.cardBorder, colors.cardBg)}>
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className={cn("h-4 w-4", colors.accent)} />
        <span className={cn("text-sm font-medium", colors.textPrimary)}>Recommended Doctors</span>
      </div>

      {showPayment && (
        <div className={cn("mb-4 flex items-center gap-3 rounded-xl border p-4 animate-pulse", colors.cardBorder, "bg-blue-500/5")}>
          <CreditCard className="h-5 w-5 text-blue-400" />
          <div>
            <p className="text-xs font-medium text-blue-400">Processing Payment...</p>
            <p className={cn("text-[10px]", colors.textMuted)}>Mock payment gateway</p>
          </div>
        </div>
      )}

      <div ref={ref} className="space-y-2">
        {doctors.map((doc) => (
          <div key={doc.name} data-doc className={cn("flex items-center gap-3 rounded-xl border p-3 transition-all", colors.cardBorder, colors.surface, colors.surfaceHover)}>
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 bg-gradient-to-br", colors.gradientFrom, colors.gradientTo)}>
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", colors.textPrimary)}>{doc.name}</p>
              <p className={cn("text-[10px]", colors.textMuted)}>{doc.specialty}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className={cn("flex items-center gap-1 text-[10px]", colors.textMuted)}>
                  <MapPin className="h-2.5 w-2.5" /> {doc.distance}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-amber-400">
                  <Star className="h-2.5 w-2.5 fill-amber-400" /> {doc.rating}
                </span>
                <span className={cn("flex items-center gap-1 text-[10px]", doc.available ? "text-emerald-400" : colors.textFaint)}>
                  <Clock className="h-2.5 w-2.5" /> {doc.available ? "Available" : "Busy"}
                </span>
              </div>
            </div>
            {booked === doc.name ? (
              <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[10px] font-medium text-emerald-400">
                <Check className="h-3 w-3" /> Booked
              </span>
            ) : (
              <button
                onClick={() => doc.available && handleBook(doc.name)}
                disabled={!doc.available}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[10px] font-medium transition-all",
                  doc.available
                    ? cn("bg-gradient-to-r text-white", colors.gradientFrom, colors.gradientTo, "hover:opacity-90")
                    : cn("cursor-not-allowed", colors.surface, colors.textFaint)
                )}
              >
                Book Now
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
