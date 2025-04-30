"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      pathname
    );
  }, [pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 text-textgpt-200">404</h1>
        <p className="text-xl text-gray-600 mb-6">Oops! Page not found</p>
        <Link 
          href="/" 
          className="inline-block bg-textgpt-300 text-textgpt-200 px-6 py-3 rounded-lg hover:bg-textgpt-400 transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
} 