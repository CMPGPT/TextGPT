"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-textgpt-200 via-textgpt-100 to-textgpt-200 flex flex-col justify-center items-center text-white px-4">
      <div className="text-center max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">Coming Soon</h1>
        
        {/* Animated construction image */}
        <div className="mb-8 relative">
          <div className="w-64 h-64 mx-auto relative">
            {/* Gear 1 - larger and slower */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-8 border-dashed border-textgpt-300 rounded-full animate-spin" style={{ animationDuration: '20s' }}></div>
            
            {/* Gear 2 - smaller and faster */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-4 border-dashed border-white rounded-full animate-spin" style={{ animationDuration: '10s', animationDirection: 'reverse' }}></div>
            
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-textgpt-300 rounded-full"></div>
            
            {/* Construction symbols - animated */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl animate-pulse">🔧</div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 text-4xl animate-pulse" style={{ animationDelay: '0.5s' }}>🛠️</div>
            <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl animate-pulse" style={{ animationDelay: '1s' }}>⚙️</div>
            <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 text-4xl animate-pulse" style={{ animationDelay: '1.5s' }}>🔩</div>
          </div>
        </div>
        
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">This Service is Under Construction</h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            We&apos;re working hard to bring you an amazing experience. Please check back soon for updates!
          </p>
        </div>
        
        <Link href="/">
          <Button className="bg-textgpt-300 text-textgpt-200 hover:bg-textgpt-400 px-8 py-6 text-lg group">
            <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
            Back to Home
          </Button>
        </Link>
      </div>
      
      {/* Background animation elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-textgpt-300/30 rounded-full filter blur-3xl opacity-70 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-textgpt-400/30 rounded-full filter blur-xl opacity-70 animate-pulse delay-700"></div>
      </div>
    </div>
  );
} 