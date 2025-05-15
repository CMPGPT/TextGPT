"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MessageSquare, QrCode, Phone, Edit } from "lucide-react";
import FAQSection from "@/components/common/FAQSection";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from "next/navigation";

const messageIcon = "/icons/message-icon.png";

export default function IQRLanding() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  // Check if user is already authenticated, redirect to dashboard if yes
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.replace('/iqr/dashboard');
      } else {
        setIsLoading(false);
      }
    }
    
    checkUser();
  }, [router, supabase.auth]);
  
  // If loading, don't render anything yet
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-iqr-100 to-black flex items-center justify-center">
        <div className="animate-pulse text-iqr-200 text-xl">Loading...</div>
      </div>
    );
  }
  
  // FAQ data for IQR page
  const iqrFaqs = [
    {
      question: "How do IQR.codes differ from traditional QR codes?",
      answer: "Unlike traditional QR codes that typically direct users to websites, IQR.codes (Interactive QR Codes) initiate SMS conversations with AI-powered business representatives. When a customer scans an IQR code, they can immediately text questions and receive instant, personalized responses without needing internet connection or downloading any apps."
    },
    {
      question: "How can IQR.codes benefit my business?",
      answer: "IQR.codes provide 24/7 customer support without requiring additional staff. They enhance customer experience by delivering immediate responses, increase engagement through personalized interactions, improve conversion rates with timely information, and collect valuable customer insights. Plus, they work through native SMS, eliminating barriers like app downloads or internet connectivity."
    },
    {
      question: "Can I customize the AI responses for my business?",
      answer: "Absolutely! Your IQR.code AI representative is fully customizable. You can train it on your specific business information, FAQs, brand voice, and product details. Our platform includes a simple 'Test Drive' feature that allows you to interact with your AI rep and refine its responses before deploying it to customers."
    },
    {
      question: "Where should I use IQR.codes in my business?",
      answer: "IQR.codes are versatile and can be placed on business cards, product packaging, invoices, store displays, advertisements, event materials, service follow-ups, and more. Any touchpoint where customers might have questions or need assistance is an excellent opportunity to place an IQR.code."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-iqr-100 to-black text-iqr-400 flex flex-col">
      {/* Navigation */}
      <nav className="py-6 px-4 md:px-10 flex justify-between items-center z-10">
        <div className="flex items-center">
          <QrCode size={24} className="text-iqr-200 mr-2" />
          <span className="text-xl md:text-2xl font-bold text-white">IQR.codes</span>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <Link href="/" className="hidden md:block">
            <Button variant="ghost" className="text-iqr-300 hover:text-white">Home</Button>
          </Link>
          <Link href="/iqr/chat">
            <Button className="bg-iqr-200 text-iqr-50 hover:bg-iqr-200/90 px-2 md:px-4 py-1 md:py-2 h-auto">
              <MessageSquare size={18} className="mr-0 md:mr-2" />
              <span className="hidden md:inline">Chat</span>
            </Button>
          </Link>
          <Link href="/iqr/login">
            <Button variant="outline" className="border-iqr-200 text-iqr-300 hover:text-iqr-200 px-2 md:px-4 py-1 md:py-2 h-auto">
              <span className="hidden md:inline">Sign In</span>
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16 md:py-24 max-w-7xl flex-1 flex items-center">
        <div className="flex flex-col md:flex-row items-center justify-between w-full">
          <div className="md:w-1/2">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Business that lives in your mobile
              <span className="text-iqr-200 block mt-2">without Internet.</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 text-iqr-300 max-w-lg">
              Engage customers instantly through AI-driven SMS conversations. 
              No app downloads required. Just scan, text, and connect.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/iqr/signup">
                <Button className="bg-iqr-200 text-iqr-50 hover:bg-iqr-200/90 px-8 py-6 w-full sm:w-auto">
                  Get Started
                </Button>
              </Link>
              <Link href="/iqr/login">
                <Button
                  variant="outline"
                  className="border-iqr-200 text-white hover:text-iqr-200 px-8 py-6 w-full sm:w-auto flex items-center justify-center"
                  style={{ backgroundColor: '#0E1629' }}
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 mt-10 md:mt-0 relative animate-[fade-in_1s_ease-in-out] w-full flex justify-center">
            <div className="bg-gradient-to-r from-iqr-100 to-iqr-200 p-1 rounded-2xl rotate-3 shadow-2xl w-full max-w-md mx-auto">
              <div className="bg-iqr-50 rounded-xl p-6">
                <div className="bg-white rounded-lg p-4 shadow-lg">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-iqr-200 rounded-full flex items-center justify-center">
                      <QrCode size={24} className="text-iqr-50" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-iqr-50 font-bold">QR Code Scan</h3>
                      <p className="text-sm text-gray-500">Instant Connection</p>
                    </div>
                  </div>
                  <div className="mb-4 bg-iqr-300 p-4 rounded-lg">
                    <QrCode size={180} className="text-iqr-100 mx-auto" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Image src={messageIcon} alt="Message" width={16} height={16} className="mr-1" />
                      <span className="ml-1 text-sm text-gray-600">Text now</span>
                    </div>
                    <div className="flex items-center">
                      <Phone size={18} className="text-iqr-200" />
                      <span className="ml-2 text-sm text-gray-600">+1 (800) IQR-CODE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-20 -right-5 bg-white p-4 rounded-lg shadow-lg transform rotate-6 animate-pulse flex items-center min-w-[185px]">
              <div className="w-8 h-8 bg-iqr-200 rounded-full flex items-center justify-center">
                <Image src={messageIcon} alt="Message" width={24} height={24} />
              </div>
              <p className="ml-2 text-sm text-iqr-50 font-medium">New message received!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gradient-to-b from-iqr-50 to-iqr-100 py-20">
        <div className="container mx-auto px-6 max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-white">
            How IQR.codes <span className="text-iqr-200">Transforms</span> Customer Engagement
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 transform transition-all hover:scale-105">
              <div className="w-16 h-16 bg-iqr-200 rounded-full flex items-center justify-center mb-6">
                <QrCode size={32} className="text-iqr-50" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-white">Simple Scan & Text</h3>
              <p className="text-iqr-300">
                Customers simply scan your custom QR code and send a text message to connect. No apps, no downloads, no friction.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 transform transition-all hover:scale-105">
              <div className="w-16 h-16 bg-iqr-200 rounded-full flex items-center justify-center mb-6">
                <MessageSquare size={32} className="text-iqr-50" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-white">AI-Powered Conversations</h3>
              <p className="text-iqr-300">
                Our TextG.pt AI engine delivers personalized, context-aware interactions that feel natural and helpful to your customers.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 transform transition-all hover:scale-105">
              <div className="w-16 h-16 bg-iqr-200 rounded-full flex items-center justify-center mb-6">
                <Edit size={32} className="text-iqr-50" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-white">Customizable Responses</h3>
              <p className="text-iqr-300">
                Tailor your AI responses to match your brand voice and deliver exactly the information your customers need.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section with torch light animation */}
      <div className="py-20 bg-gradient-to-r from-iqr-50 via-iqr-100 to-iqr-50 relative overflow-hidden">
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 pointer-events-none z-0">
          <div className="w-96 h-96 bg-iqr-200/20 rounded-full filter blur-3xl opacity-70 animate-pulse"></div>
        </div>
        <div className="container mx-auto px-6 max-w-4xl text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            Ready to revolutionize your customer engagement?
          </h2>
          <p className="text-xl text-iqr-300 mb-10 mx-auto max-w-2xl">
            Join hundreds of businesses already using IQR.codes to connect with customers in a seamless, app-free experience.
          </p>
          <Link href="/iqr/signup">
            <Button className="bg-iqr-200 text-iqr-50 hover:bg-iqr-200/90 px-8 py-6 text-lg">
              Start Creating Your IQR Codes
            </Button>
          </Link>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQSection faqs={iqrFaqs} variant="iqr" />

      {/* Footer */}
      <footer className="bg-iqr-50 py-10 text-iqr-300">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <QrCode size={24} className="text-iqr-200 mr-2" />
              <span className="text-xl font-bold text-white">IQR.codes</span>
            </div>
            <div className="flex gap-8">
              <Link href="/" className="hover:text-iqr-200 transition-colors">Home</Link>
              <Link href="/privacy" className="hover:text-iqr-200 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-iqr-200 transition-colors">Terms</Link>
              <Link href="/start" className="hover:text-iqr-200 transition-colors">Start SMS</Link>
              <Link href="/opt-in" className="hover:text-iqr-200 transition-colors">Opt-In Process</Link>
            </div>
          </div>
          <div className="border-t border-iqr-100/30 mt-8 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} IQR.codes. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 