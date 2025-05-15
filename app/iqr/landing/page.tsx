"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IQRLandingRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the main IQR page
    router.replace('/iqr');
  }, [router]);
  
  return null; // No UI needed as we're redirecting
} 