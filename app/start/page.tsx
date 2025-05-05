"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Smartphone, Menu, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function StartPage() {
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-28 max-w-7xl pt-8 md:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div className="max-w-2xl lg:max-w-none">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Start Chatting with
              <span className="text-textgpt-300 block mt-2">TextGPT</span>
            </h1>
            <p className="text-xl mb-8 text-white/80">
              No apps, no downloads—just pure convenience. Text us first, and we&apos;ll respond instantly to help you stay organized, get answers, and complete tasks effortlessly.
            </p>
            
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">How to Begin:</h2>
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-textgpt-300 rounded-full p-3 flex-shrink-0">
                  <Smartphone className="h-6 w-6 text-textgpt-100" />
                </div>
                <div>
                  <p className="text-xl font-medium text-white mb-1">Text &quot;hello&quot; to</p>
                  <p className="text-2xl font-bold text-textgpt-300">833-541-1836</p>
                  <p className="text-white/70 text-sm mt-1">to get started.</p>
                </div>
              </div>
              
              <div className="mt-4 text-white/90 bg-textgpt-200 p-3 rounded-lg font-medium flex items-center">
                <span className="mr-1">👋</span> Initiate the chat by texting first; get real-time replies.
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="sms:+18335411836?body=hello">
                <Button className="bg-textgpt-300 text-textgpt-200 hover:bg-textgpt-400 px-8 py-6 w-full sm:w-auto">
                  Text Now
                </Button>
              </a>
              <Link href="/opt-in">
                <Button variant="outline" className="border-textgpt-300 text-white bg-transparent hover:bg-textgpt-300/10 px-8 py-6 w-full sm:w-auto">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="relative mx-auto lg:mx-0 lg:ml-auto">
            <div className="absolute top-0 -left-20 w-72 h-72 bg-textgpt-300/30 rounded-full filter blur-3xl opacity-70 animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-textgpt-400/30 rounded-full filter blur-xl opacity-70 animate-pulse delay-700"></div>

            <Card className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 mx-auto max-w-md relative">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold text-white mb-4">Scan to Chat</h3>
                <div className="bg-white p-4 rounded-lg mb-6">
                  <Image 
                    src="/TextGPT-QR-code.png" 
                    alt="TextGPT QR Code" 
                    width={300} 
                    height={300}
                    className="mx-auto"
                  />
                </div>
                <div className="bg-textgpt-200/60 p-4 rounded-lg">
                  <div className="space-y-4">
                    <div className="bg-textgpt-300/20 p-3 rounded-lg rounded-tr-none ml-auto w-4/5">
                      <p className="text-white text-sm">Hello</p>
                    </div>
                    
                    <div className="bg-textgpt-200/40 p-3 rounded-lg rounded-tl-none w-4/5">
                      <p className="text-white text-sm">Hi there! 👋 I&apos;m TextGPT, your AI assistant. How can I help you today?</p>
                    </div>
                    
                    <div className="bg-textgpt-300/20 p-3 rounded-lg rounded-tr-none ml-auto w-4/5">
                      <p className="text-white text-sm">I need help planning my day tomorrow</p>
                    </div>
                    
                    <div className="bg-textgpt-200/40 p-3 rounded-lg rounded-tl-none w-4/5">
                      <p className="text-white text-sm">I&apos;d be happy to help you plan your day! Would you like to start with organizing your tasks, scheduling appointments, or creating a morning routine?</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Why <span className="text-textgpt-300">SMS</span>?
          </h2>
          
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="bg-white/10 border border-white/20 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-6 text-white text-lg font-medium">
                No App Installation Required
              </AccordionTrigger>
              <AccordionContent className="px-6 text-white/80">
                Use your phone&apos;s native messaging app - no additional downloads, sign-ups, or account creation needed.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem
              value="item-2"
              className="bg-white/10 border border-white/20 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-6 text-white text-lg font-medium">
                Intelligent Replies
              </AccordionTrigger>
              <AccordionContent className="px-6 text-white/80">
                Our AI provides personalized, contextual responses to your questions and requests, helping you get information quickly.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem
              value="item-3"
              className="bg-white/10 border border-white/20 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-6 text-white text-lg font-medium">
                Privacy & Security
              </AccordionTrigger>
              <AccordionContent className="px-6 text-white/80">
                We take your privacy seriously. All conversations are secured with industry-standard encryption, and we don&apos;t store your data longer than necessary.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem
              value="item-4"
              className="bg-white/10 border border-white/20 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-6 text-white text-lg font-medium">
                Always Available
              </AccordionTrigger>
              <AccordionContent className="px-6 text-white/80">
                Get assistance 24/7 without waiting on hold or scheduling appointments. Simply text us whenever you need help.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      
      <footer className="bg-textgpt-200/80 backdrop-blur-md py-8 border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <MessageSquare size={24} className="text-textgpt-300 mr-2" />
              <span className="text-xl font-bold text-white">TextG.pt</span>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end gap-6">
              <Link href="/terms" className="text-white/70 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-white/70 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/opt-in" className="text-white/70 hover:text-white transition-colors">
                Opt-In Process
              </Link>
              <a href="mailto:support@textgpt.com" className="text-white/70 hover:text-white transition-colors">
                Contact Us
              </a>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/60 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} TextGPT. All rights reserved.
            </p>
            
            <p className="text-white/60 text-sm text-center md:text-right">
              A product by <span className="text-textgpt-300">AI Innovations</span> | Last updated: {new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 