"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Home as HomeIcon, ArrowLeft, ArrowRight, Building, MapPin, Calendar, CheckCircle } from "lucide-react";
import FAQSection from "@/components/common/FAQSection";

export default function KiwiLanding() {
  // FAQ data for KIWI page
  const kiwiFaqs = [
    {
      question: "How does Kiwi help real estate agents improve client interactions?",
      answer: "Kiwi provides an AI-powered SMS assistant that instantly responds to property inquiries, answers common questions, schedules viewings, and delivers property details - all through text messaging. This helps agents save time, respond to leads 24/7, and provide exceptional service without being constantly available themselves."
    },
    {
      question: "What information can potential buyers access through Kiwi?",
      answer: "Through Kiwi, potential buyers can text to receive property specifications (square footage, bedrooms, bathrooms), pricing details, neighborhood information, photos, virtual tour links, available viewing times, and answers to specific questions about features or amenities - all instantly via SMS."
    },
    {
      question: "Can Kiwi schedule property viewings automatically?",
      answer: "Yes! Kiwi can manage your availability calendar and allow potential buyers to schedule viewings through simple text commands. When someone texts to schedule a viewing, Kiwi checks your available slots, offers options, confirms appointments, and sends reminders to both you and the potential buyer."
    },
    {
      question: "How do I add properties to the Kiwi platform?",
      answer: "Adding properties to Kiwi is simple. After creating your account, you can upload property details through our user-friendly dashboard. Input property specifications, upload photos, set viewing availability, and customize the information you want shared. Each property gets its own dedicated text number or QR code that prospects can use to inquire about that specific listing."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-kiwi-50 via-kiwi-100 to-kiwi-50">
      <nav className="py-6 px-6 md:px-10 flex justify-between items-center relative bg-transparent">
        <div className="flex items-center">
          <HomeIcon size={36} className="text-kiwi-200 mr-3" />
          <span className="text-3xl font-bold text-white">Kiwi</span>
        </div>
        <div className="flex space-x-3">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:text-kiwi-200 hover:bg-white/10">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to TextG.pt
            </Button>
          </Link>
          <Link href="/terms">
            <Button variant="ghost" className="text-white hover:text-kiwi-200 hover:bg-white/10">
              Terms
            </Button>
          </Link>
          <Link href="/privacy">
            <Button variant="ghost" className="text-white hover:text-kiwi-200 hover:bg-white/10">
              Privacy
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 pt-16 pb-24 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Your Real Estate
              <span className="text-kiwi-200 block mt-2">Intelligent Assistant</span>
            </h1>
            <p className="text-xl mb-8 text-white/80">
              Kiwi transforms property marketing with AI-powered SMS communication. Provide instant property information and answer questions via text messaging.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/auth/login">
                <Button className="bg-kiwi-200 text-kiwi-50 hover:bg-kiwi-200/90 px-8 py-6">
                  Get Started
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-6">
                  Learn More
                </Button>
              </a>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="absolute -top-10 -left-10 w-72 h-72 bg-kiwi-300/20 rounded-full filter blur-3xl opacity-70 animate-pulse"></div>
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
              <div className="bg-white p-4 rounded-lg shadow-lg rotate-3">
                <div className="flex items-center mb-3">
                  <Building size={24} className="text-kiwi-100 mr-2" />
                  <h3 className="text-kiwi-50 font-bold">Modern Lakeside Villa</h3>
                </div>
                <Image 
                  src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" 
                  alt="Property" 
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover rounded-md mb-3"
                />
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-kiwi-100/10 p-2 rounded text-center">
                    <p className="text-sm text-kiwi-100 font-medium">4 Bedrooms</p>
                  </div>
                  <div className="bg-kiwi-100/10 p-2 rounded text-center">
                    <p className="text-sm text-kiwi-100 font-medium">3 Bathrooms</p>
                  </div>
                  <div className="bg-kiwi-100/10 p-2 rounded text-center">
                    <p className="text-sm text-kiwi-100 font-medium">2,450 sq ft</p>
                  </div>
                  <div className="bg-kiwi-100/10 p-2 rounded text-center">
                    <p className="text-sm text-kiwi-100 font-medium">$750,000</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-xs text-gray-500">
                    <MapPin size={14} className="mr-1" />
                    <span>42 Oakwood Avenue</span>
                  </div>
                  <div className="bg-kiwi-200 text-kiwi-50 px-3 py-1 rounded text-xs font-medium">
                    Text for details
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-white p-3 rounded-lg shadow-lg -rotate-3">
                <div className="flex items-center mb-2">
                  <Calendar size={18} className="text-kiwi-100 mr-2" />
                  <span className="text-sm font-medium text-kiwi-50">Schedule Viewing</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-kiwi-100/10 p-2 rounded text-center">
                    <p className="text-xs text-kiwi-100">Saturday, 2pm</p>
                  </div>
                  <div className="bg-kiwi-100/10 p-2 rounded text-center">
                    <p className="text-xs text-kiwi-100">Sunday, 11am</p>
                  </div>
                </div>
                <div className="text-xs text-center text-gray-500">
                  Text &quot;SCHEDULE&quot; to book a viewing
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile property display */}
          <div className="lg:hidden relative mx-auto max-w-xs mt-8">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <div className="flex items-center mb-2">
                <Building size={18} className="text-kiwi-100 mr-2" />
                <h3 className="text-kiwi-50 font-bold text-sm">Modern Lakeside Villa</h3>
              </div>
              <Image 
                src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" 
                alt="Property" 
                width={300}
                height={128}
                className="w-full h-32 object-cover rounded-md mb-2"
              />
              <div className="flex justify-between text-xs">
                <span>4 bd | 3 ba | 2,450 sq ft</span>
                <span className="font-bold">$750,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="features" className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-kiwi-50">
            How <span className="text-kiwi-300">Kiwi</span> Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-gray-50 p-6 rounded-xl transition-all hover:shadow-lg">
              <div className="w-14 h-14 bg-kiwi-200 rounded-full flex items-center justify-center mb-6 text-kiwi-50 font-bold text-2xl">1</div>
              <h3 className="text-xl font-bold mb-3 text-kiwi-50">Property Setup</h3>
              <p className="text-gray-600 mb-4">
                Add your properties to the Kiwi platform with detailed information, photos, and viewing availability.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-kiwi-300 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Easy property upload</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-kiwi-300 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Customizable details</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl transition-all hover:shadow-lg">
              <div className="w-14 h-14 bg-kiwi-300 rounded-full flex items-center justify-center mb-6 text-kiwi-50 font-bold text-2xl">2</div>
              <h3 className="text-xl font-bold mb-3 text-kiwi-50">SMS Engagement</h3>
              <p className="text-gray-600 mb-4">
                Prospective buyers text your dedicated Kiwi number to get instant information about properties.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-kiwi-300 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Immediate response</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-kiwi-300 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">No app downloads needed</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl transition-all hover:shadow-lg">
              <div className="w-14 h-14 bg-kiwi-400 rounded-full flex items-center justify-center mb-6 text-kiwi-50 font-bold text-2xl">3</div>
              <h3 className="text-xl font-bold mb-3 text-kiwi-50">AI-Powered Assistance</h3>
              <p className="text-gray-600 mb-4">
                Our AI automatically handles inquiries, schedules viewings, and provides detailed property information.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-kiwi-300 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Intelligent conversation</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-kiwi-300 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Automated scheduling</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="py-20 bg-kiwi-200">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-kiwi-50">Ready to transform your real estate business?</h2>
          <p className="text-xl mb-10 text-kiwi-50/90 max-w-2xl mx-auto">
            Join agents and brokers who are using Kiwi to engage with prospective buyers and streamline property viewings.
          </p>
          <Link href="/auth/login">
            <Button className="bg-kiwi-50 text-kiwi-200 hover:bg-kiwi-50/90 px-10 py-7 text-xl">
              Start Your Free Trial
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQSection faqs={kiwiFaqs} variant="kiwi" />

      <footer className="bg-kiwi-50 py-10 text-white/80">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <HomeIcon size={24} className="text-kiwi-200 mr-2" />
              <span className="text-xl font-bold text-white">Kiwi</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              <Link href="/" className="hover:text-kiwi-200">Home</Link>
              <Link href="/terms" className="hover:text-kiwi-200">Terms</Link>
              <Link href="/privacy" className="hover:text-kiwi-200">Privacy</Link>
              <Link href="#features" className="hover:text-kiwi-200">Features</Link>
              <Link href="/start" className="hover:text-kiwi-200">Start SMS</Link>
              <Link href="/opt-in" className="hover:text-kiwi-200">Opt-In Process</Link>
            </div>
          </div>
          <div className="border-t border-white/10 mt-10 pt-8 text-center text-sm">
            <p>A service by <Link href="/" className="text-kiwi-200 hover:underline">TextG.pt</Link>. &copy; {new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 