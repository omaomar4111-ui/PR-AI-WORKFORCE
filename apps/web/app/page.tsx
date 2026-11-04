"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0d0e12]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8b5cf6] border-t-transparent" />
        <p className="text-sm text-gray-400">جاري تحميل منصة PR AI WORKFORCE...</p>
      </div>
    </div>
  );
}
