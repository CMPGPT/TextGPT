"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MessageSquare, QrCode, Home as HomeIcon, ArrowRight, Smartphone, Phone, Menu, X } from "lucide-react";
import FAQSection from "@/components/common/FAQSection";

const messageIcon = "/icons/message-icon.png";

export default function TextGptLanding() {
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

  // FAQ data for homepage
  const homeFaqs = [
    {
      question: "What is TextG.pt and how does it work?",
      answer: "TextG.pt is an AI-powered SMS communication platform that enables interactive text messaging without requiring any app downloads. It uses advanced AI to automatically respond to text messages, helping businesses provide instant support and information to customers through their phone's native messaging app."
    },
    {
      question: "Do I need to download an app to use TextG.pt services?",
      answer: "No, that's the beauty of TextG.pt! Our service works through your phone's native SMS messaging app. There's no need to download anything - simply text a dedicated number or scan an IQR code to start interacting with our AI-powered service."
    },
    {
      question: "What's the difference between IQR.codes and Kiwi services?",
      answer: "IQR.codes is our business solution that creates interactive QR codes linking to AI representatives trained on your specific brand information. When scanned, customers can text questions and receive instant, helpful responses. Kiwi is specifically designed for real estate professionals, providing property information and answering inquiries via SMS."
    },
    {
      question: "How secure is the information shared through TextG.pt?",
      answer: "We take security very seriously. All communications are encrypted and we implement robust security measures to protect your data. Our AI processing follows strict privacy protocols, and we don't store message content longer than necessary for service provision. For more details, please see our <a href='/privacy' class='underline text-textgpt-300 hover:text-textgpt-400'>Privacy Policy</a>."
    },
  ];

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
          <a href="#services" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">Services</a>
          <a href="#about" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">About</a>
          <a href="#contact" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">Contact</a>
          <Link href="/chat" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">Chat</Link>
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
            <a href="#services" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>Services</a>
            <a href="#about" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>About</a>
            <a href="#contact" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>Contact</a>
            <Link href="/chat" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>Chat</Link>
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

      <div className="container mx-auto px-6 pb-20 md:pb-28 max-w-7xl pt-10 md:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              AI-Powered SMS Communication Platform
              <span className="text-textgpt-300 block mt-2">No App Required.</span>
            </h1>
            <p className="text-xl mb-8 text-white/80">
              No apps, no downloads—just pure convenience. TextGPT powers your phone&apos;s messaging app, helping you stay organized, get answers, and complete tasks effortlessly. It&apos;s like having a personal assistant available 24/7, always ready to help with just a text.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#services">
                <Button className="bg-textgpt-300 text-textgpt-200 hover:bg-textgpt-400 px-8 py-6 w-full sm:w-auto">
                  Explore Services
                </Button>
              </a>
              <a href="#about">
                <Button variant="outline" className="border-textgpt-300 text-white bg-transparent hover:bg-textgpt-300/10 px-8 py-6 w-full sm:w-auto">
                  Learn More
                </Button>
              </a>
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="absolute top-0 -left-20 w-72 h-72 bg-textgpt-300/30 rounded-full filter blur-3xl opacity-70 animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-textgpt-400/30 rounded-full filter blur-xl opacity-70 animate-pulse delay-700"></div>

            <div className="relative bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20">
              <div className="flex items-center mb-6">
                <Image 
                  src={messageIcon} 
                  alt="Message" 
                  width={24}
                  height={24}
                  className="w-6 h-6 mr-3" 
                  unoptimized
                />
                <span className="text-xl font-semibold text-white">TextG.pt Assistant</span>
              </div>

              <div className="space-y-4">
                <div className="bg-textgpt-300/20 p-3 rounded-lg rounded-tr-none ml-auto w-4/5">
                  <p className="text-white text-sm">Hi! I&apos;m planning a dinner party this weekend and would love to make an authentic Italian pasta dish. Any suggestions?</p>
                </div>

                <div className="bg-textgpt-200/40 p-3 rounded-lg rounded-tl-none w-4/5">
                  <p className="text-white text-sm">Of course! For a crowd-pleasing dish, I&apos;d recommend a classic Fettuccine Alfredo or Spaghetti alla Carbonara. Which one interests you more? I can share a detailed recipe and some pro tips to make it extra special! 😊</p>
                </div>

                <div className="bg-textgpt-300/20 p-3 rounded-lg rounded-tr-none ml-auto w-4/5">
                  <p className="text-white text-sm">The Carbonara sounds amazing! I&apos;ve never made it before. Could you share the recipe?</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile chat interface */}
          <div className="lg:hidden mt-12 relative mx-auto max-w-md">
            <div className="absolute top-0 -left-10 w-36 h-36 bg-textgpt-300/30 rounded-full filter blur-3xl opacity-70 animate-pulse -z-10"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-textgpt-400/30 rounded-full filter blur-xl opacity-70 animate-pulse delay-700 -z-10"></div>

            <div className="relative bg-white/10 backdrop-blur-lg p-4 rounded-2xl border border-white/20">
              <div className="flex items-center mb-4">
                <Image 
                  src={messageIcon} 
                  alt="Message" 
                  width={20}
                  height={20}
                  className="w-5 h-5 mr-2" 
                  unoptimized
                />
                <span className="text-lg font-semibold text-white">TextG.pt Assistant</span>
              </div>

              <div className="space-y-3">
                <div className="bg-textgpt-300/20 p-2 rounded-lg rounded-tr-none ml-auto w-4/5">
                  <p className="text-white text-xs">Hi! I&apos;m planning a dinner party this weekend and would love to make an authentic Italian pasta dish. Any suggestions?</p>
                </div>

                <div className="bg-textgpt-200/40 p-2 rounded-lg rounded-tl-none w-4/5">
                  <p className="text-white text-xs">Of course! For a crowd-pleasing dish, I&apos;d recommend a classic Fettuccine Alfredo or Spaghetti alla Carbonara. Which one interests you more? 😊</p>
                </div>

                <div className="bg-textgpt-300/20 p-2 rounded-lg rounded-tr-none ml-auto w-4/5">
                  <p className="text-white text-xs">The Carbonara sounds amazing! Could you share the recipe?</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="services" className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-textgpt-200">
            Other <span className="text-textgpt-400">Services</span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-gradient-to-br from-iqr-50 to-iqr-100 rounded-2xl overflow-hidden shadow-xl transform transition-all hover:scale-105">
              <div className="p-8 md:p-10">
                <div className="flex items-center mb-6">
                  <QrCode size={32} className="text-iqr-200 mr-3" />
                  <h3 className="text-2xl font-bold text-white">IQR.codes</h3>
                </div>
                <p className="text-white/90 mb-6">
                  Business that lives in your mobile without Internet. Engage customers through intelligent QR code-initiated SMS conversations.
                </p>
                <ul className="mb-8 space-y-2">
                  <li className="flex items-center text-white/80">
                    <div className="w-1.5 h-1.5 bg-iqr-200 rounded-full mr-2"></div>
                    <span>Instant customer engagement</span>
                  </li>
                  <li className="flex items-center text-white/80">
                    <div className="w-1.5 h-1.5 bg-iqr-200 rounded-full mr-2"></div>
                    <span>No app downloads required</span>
                  </li>
                  <li className="flex items-center text-white/80">
                    <div className="w-1.5 h-1.5 bg-iqr-200 rounded-full mr-2"></div>
                    <span>Customizable AI responses</span>
                  </li>
                </ul>
                <Link href="/iqr/landing">
                  <Button className="bg-iqr-200 text-iqr-50 hover:bg-iqr-200/90 group w-full sm:w-auto">
                    Explore IQR.codes
                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
              <div className="h-48 bg-iqr-50 relative">
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="bg-white p-3 rounded-lg shadow-lg rotate-3">
                    <QrCode size={100} className="text-iqr-100" />
                    <div className="mt-2 text-center text-xs text-iqr-50 font-medium">Scan to Experience</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-lg -rotate-3 absolute bottom-3 right-10">
                    <Smartphone size={40} className="text-iqr-200" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-kiwi-50 to-kiwi-100 rounded-2xl overflow-hidden shadow-xl transform transition-all hover:scale-105">
              <div className="p-8 md:p-10">
                <div className="flex items-center mb-6">
                  <HomeIcon size={32} className="text-kiwi-200 mr-3" />
                  <h3 className="text-2xl font-bold text-white">Kiwi</h3>
                </div>
                <p className="text-white/90 mb-6">
                  Your Real Estate Intelligent Assistant. Provide instant property information and answer questions via SMS.
                </p>
                <ul className="mb-8 space-y-2">
                  <li className="flex items-center text-white/80">
                    <div className="w-1.5 h-1.5 bg-kiwi-200 rounded-full mr-2"></div>
                    <span>SMS property insights</span>
                  </li>
                  <li className="flex items-center text-white/80">
                    <div className="w-1.5 h-1.5 bg-kiwi-200 rounded-full mr-2"></div>
                    <span>Instant viewing scheduling</span>
                  </li>
                  <li className="flex items-center text-white/80">
                    <div className="w-1.5 h-1.5 bg-kiwi-200 rounded-full mr-2"></div>
                    <span>AI-powered neighborhood Q&A</span>
                  </li>
                </ul>
                <Link href="/kiwi/landing">
                  <Button className="bg-kiwi-200 text-kiwi-50 hover:bg-kiwi-300 group w-full sm:w-auto">
                    Explore Kiwi
                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
              <div className="h-48 bg-kiwi-50 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white p-3 rounded-lg shadow-lg -rotate-3 max-w-[80%]">
                    <div className="flex items-center mb-2">
                      <HomeIcon size={18} className="text-kiwi-100 mr-2" />
                      <span className="text-sm font-medium text-kiwi-50">Property Details</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <p>42 Oakwood Avenue, Lakeside</p>
                      <div className="flex justify-between mt-1">
                        <span className="font-bold">$750,000</span>
                        <span>4bd | 3ba | 2,450 sq ft</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div id="about" className="py-20 bg-gradient-to-br from-textgpt-100 to-textgpt-200">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              About <span className="text-textgpt-300">TextG.pt</span>
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Delivering critical communication solutions for government agencies and emergency services through our intelligent SMS platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/10 transform transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:shadow-xl">
              <div className="w-12 h-12 bg-textgpt-300 rounded-full flex items-center justify-center mb-4 mx-auto md:mx-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-textgpt-200">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-white text-center md:text-left">The Opportunity</h3>
              <p className="text-white/70 text-center md:text-left">
                Government agencies (like FEMA, local health departments, emergency management) need fast, scalable, and accessible communication tools during natural disasters—especially for underserved, offline, or panicked populations.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/10 transform transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:shadow-xl">
              <div className="w-12 h-12 bg-textgpt-300 rounded-full flex items-center justify-center mb-4 mx-auto md:mx-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-textgpt-200">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-white text-center md:text-left">Your Solution</h3>
              <div className="text-white/70 text-center md:text-left">
                <p className="mb-3">Our text-based AI assistant that:</p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-textgpt-300 rounded-full mr-2 mt-2"></div>
                    <span>Works via toll-free SMS (no app or internet required)</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-textgpt-300 rounded-full mr-2 mt-2"></div>
                    <span>Provides 24/7 answers and support during emergencies</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-textgpt-300 rounded-full mr-2 mt-2"></div>
                    <span>Can handle thousands of citizens at once, for pennies per interaction</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-textgpt-300 rounded-full mr-2 mt-2"></div>
                    <span>Delivers updates, resource directions, triage advice, shelter info, and emotional support</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/10 transform transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:shadow-xl">
              <div className="w-12 h-12 bg-textgpt-300 rounded-full flex items-center justify-center mb-4 mx-auto md:mx-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-textgpt-200">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-white text-center md:text-left">Why It&apos;s Attractive to the Government</h3>
              <div className="text-white/70 text-center md:text-left">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-textgpt-300 rounded-full mr-2 mt-2"></div>
                    <span>Low cost & instantly deployable</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-textgpt-300 rounded-full mr-2 mt-2"></div>
                    <span>SMS = universally accessible (even in low-bandwidth, crisis settings)</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-textgpt-300 rounded-full mr-2 mt-2"></div>
                    <span>Reduces burden on human hotlines</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-textgpt-300 rounded-full mr-2 mt-2"></div>
                    <span>Easy to brand as public infrastructure (&quot;Text RELIEF to 833-XXXX&quot;)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQSection faqs={homeFaqs} variant="light" />

      <div id="contact" className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-textgpt-200">
              Get In <span className="text-textgpt-400">Touch</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Interested in learning more about our services? Have questions about how TextG.pt can help your business? Reach out to our team today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50 p-6 rounded-xl text-center">
              <div className="w-12 h-12 bg-textgpt-300 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
              </div>
              <h3 className="font-bold mb-2">Email Support</h3>
              <p className="text-gray-600 mb-4">Send us an email and we&apos;ll respond within 24 hours.</p>
              <a href="mailto:textgpt.team@gmail.com">
                <Button className="bg-textgpt-300 hover:bg-textgpt-400 text-white w-full sm:w-auto">Email Us</Button>
              </a>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl text-center">
              <div className="w-12 h-12 bg-textgpt-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Phone size={24} className="text-white" />
              </div>
              <h3 className="font-bold mb-2">Call Us</h3>
              <p className="text-gray-600 mb-4">Speak directly with our support team.</p>
              <a href="tel:+13168821681">
                <Button className="bg-textgpt-400 hover:bg-textgpt-300 text-white w-full sm:w-auto">Call Now</Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-textgpt-200 py-10 text-white/80">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <MessageSquare size={24} className="text-textgpt-300 mr-2" />
              <span className="text-xl font-bold text-white">TextG.pt</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16 text-center md:text-left">
              <div>
                <h4 className="font-bold mb-4 text-white">Product</h4>
                <ul className="space-y-2">
                  <li><Link href="/iqr/landing" className="hover:text-textgpt-300">IQR.codes</Link></li>
                  <li><Link href="/kiwi/landing" className="hover:text-textgpt-300">Kiwi</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4 text-white">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#about" className="hover:text-textgpt-300">About</a></li>
                  <li><a href="#contact" className="hover:text-textgpt-300">Contact</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-4 text-white">Legal</h4>
                <ul className="space-y-2">
                  <li><Link href="/privacy" className="hover:text-textgpt-300">Privacy</Link></li>
                  <li><Link href="/terms" className="hover:text-textgpt-300">Terms</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-4 text-white">SMS</h4>
                <ul className="space-y-2">
                  <li><Link href="/start" className="hover:text-textgpt-300">Start SMS</Link></li>
                  <li><Link href="/opt-in" className="hover:text-textgpt-300">Opt-In Process</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 mt-10 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} TextG.pt. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 