"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, CheckCircle, ShieldCheck, Menu, X } from "lucide-react";

export default function OptInPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const getDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-textgpt-200 via-textgpt-100 to-textgpt-200">
      <nav className={`py-6 px-6 md:px-10 flex justify-between items-center z-50 ${
        isScrolled
          ? "fixed top-0 left-0 right-0 backdrop-blur-md bg-textgpt-200/70"
          : "relative bg-transparent"
      }`}>
        <div className="flex items-center">
          <MessageSquare size={36} className="text-textgpt-300 mr-3" />
          <span className="text-3xl font-bold text-white">TextG.pt</span>
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden text-white focus:outline-none" onClick={toggleMenu}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop menu */}
        <div className="hidden md:flex space-x-5 items-center">
          <a href="/#services" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">Services</a>
          <a href="/#about" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">About</a>
          <a href="/#contact" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">Contact</a>
          <Link href="/terms" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">Terms</Link>
          <Link href="/privacy" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">Privacy</Link>
          <Link href="/coming-soon">
            <Button className="bg-textgpt-300 text-textgpt-200 hover:bg-textgpt-400 hover:scale-105 transition-all duration-300 ease-in-out text-lg">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {isMenuOpen && (
        <div className="md:hidden fixed top-[74px] left-0 right-0 bg-textgpt-200/95 backdrop-blur-md p-5 z-40 border-t border-white/10 animate-in slide-in-from-top duration-300">
          <div className="flex flex-col space-y-4">
            <a href="/#services" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>Services</a>
            <a href="/#about" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>About</a>
            <a href="/#contact" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>Contact</a>
            <Link href="/terms" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>Terms</Link>
            <Link href="/privacy" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>Privacy</Link>
            <Link href="/coming-soon" onClick={toggleMenu}>
              <Button className="bg-textgpt-300 text-textgpt-200 hover:bg-textgpt-400 w-full mt-2 py-6 transition-all duration-300 ease-in-out text-lg">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* This div serves as a spacer when the navbar becomes fixed */}
      {isScrolled && <div className="h-24 md:h-28" aria-hidden="true"></div>}

      <div className="container mx-auto px-6 pb-20 md:pb-28 max-w-6xl pt-8 md:pt-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
            Explicit <span className="text-textgpt-300">Opt-In</span> Process
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            This page explains how our SMS service works and confirms that all users initiate contact first. We are committed to respecting your privacy and providing a secure experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          <div>
            <Card className="bg-white/10 backdrop-blur-lg border border-white/20 overflow-hidden">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white mb-6">How Our SMS Service Works:</h2>
                
                <div className="space-y-6">
                  <div className="flex gap-4 items-start">
                    <div className="bg-textgpt-300 rounded-full p-2 flex-shrink-0">
                      <span className="text-textgpt-100 font-bold">1</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-medium text-white">You Initiate Contact</h3>
                      <p className="text-white/80 mt-1">
                        You text "hello" to our number or scan our QR code to send your first message.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 items-start">
                    <div className="bg-textgpt-300 rounded-full p-2 flex-shrink-0">
                      <span className="text-textgpt-100 font-bold">2</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-medium text-white">We Respond</h3>
                      <p className="text-white/80 mt-1">
                        Our AI assistant replies to your message with helpful information and assistance.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 items-start">
                    <div className="bg-textgpt-300 rounded-full p-2 flex-shrink-0">
                      <span className="text-textgpt-100 font-bold">3</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-medium text-white">Conversation Continues</h3>
                      <p className="text-white/80 mt-1">
                        You can continue the conversation as needed, with our AI providing relevant responses.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 items-start">
                    <div className="bg-textgpt-300 rounded-full p-2 flex-shrink-0">
                      <span className="text-textgpt-100 font-bold">4</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-medium text-white">Opt-Out Anytime</h3>
                      <p className="text-white/80 mt-1">
                        You can stop the conversation at any time by texting "STOP".
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <div className="flex items-center mb-6">
                <ShieldCheck className="text-textgpt-300 h-8 w-8 mr-3" />
                <h2 className="text-2xl font-bold text-white">Our Compliance Commitment</h2>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-textgpt-300 h-5 w-5 mt-1 flex-shrink-0" />
                  <p className="text-white/80">We never send unsolicited messages - you always text us first.</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-textgpt-300 h-5 w-5 mt-1 flex-shrink-0" />
                  <p className="text-white/80">We handle your data according to our <Link href="/privacy" className="text-textgpt-300 hover:underline">Privacy Policy</Link>.</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-textgpt-300 h-5 w-5 mt-1 flex-shrink-0" />
                  <p className="text-white/80">Standard message and data rates from your carrier may apply.</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-textgpt-300 h-5 w-5 mt-1 flex-shrink-0" />
                  <p className="text-white/80">We comply with all regulations regarding SMS communications.</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg mb-6">
                <Image 
                  src="/TextGPT-QR-code.png" 
                  alt="TextGPT QR Code" 
                  width={200} 
                  height={200}
                  className="mx-auto"
                />
              </div>
              
              <div className="text-center">
                <p className="text-white font-medium mb-4">Text "hello" to get started</p>
                <p className="text-2xl font-bold text-textgpt-300 mb-6">833-541-1836</p>
                <a href="sms:+18335411836?body=hello">
                  <Button className="bg-textgpt-300 text-textgpt-200 hover:bg-textgpt-400 w-full py-6">
                    Start Texting Now
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-16 max-w-3xl mx-auto bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Visual Demonstration of Opt-In</h2>
            <p className="text-white/80 mb-8">Here's how the opt-in process works when you text us:</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-textgpt-200/60 p-4 rounded-lg">
              <div className="mb-2 text-center">
                <span className="inline-block bg-textgpt-300 text-textgpt-100 rounded-full px-3 py-1 text-sm font-bold">Step 1</span>
              </div>
              <div className="bg-textgpt-300/20 p-3 rounded-lg text-white text-sm">
                <strong>You:</strong> Hello
              </div>
            </div>
            
            <div className="bg-textgpt-200/60 p-4 rounded-lg">
              <div className="mb-2 text-center">
                <span className="inline-block bg-textgpt-300 text-textgpt-100 rounded-full px-3 py-1 text-sm font-bold">Step 2</span>
              </div>
              <div className="bg-textgpt-200/80 p-3 rounded-lg text-white text-sm">
                <strong>TextGPT:</strong> Hi there! 👋 I'm TextGPT, your AI assistant. How can I help you today?
              </div>
            </div>
            
            <div className="bg-textgpt-200/60 p-4 rounded-lg">
              <div className="mb-2 text-center">
                <span className="inline-block bg-textgpt-300 text-textgpt-100 rounded-full px-3 py-1 text-sm font-bold">Step 3</span>
              </div>
              <div className="bg-textgpt-300/20 p-3 rounded-lg text-white text-sm">
                <strong>You:</strong> Can you help me find a recipe?
              </div>
              <div className="mt-2 bg-textgpt-200/80 p-3 rounded-lg text-white text-sm">
                <strong>TextGPT:</strong> Absolutely! What type of recipe are you looking for?
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-textgpt-200/80 backdrop-blur-md py-8 border-t border-white/10">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <MessageSquare size={24} className="text-textgpt-300 mr-2" />
              <span className="text-xl font-bold text-white">TextG.pt</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              <Link href="/terms" className="text-white/70 hover:text-white">Terms of Service</Link>
              <Link href="/privacy" className="text-white/70 hover:text-white">Privacy Policy</Link>
              <Link href="/start" className="text-white/70 hover:text-white">Start Chatting</Link>
            </div>
          </div>
          
          <div className="mt-6 text-center text-white/50 text-sm">
            <p>© {new Date().getFullYear()} TextGPT. All rights reserved.</p>
            <p className="mt-1">Last updated: {getDate()}</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 