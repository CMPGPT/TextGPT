import Link from "next/link";
import { MessageSquare, QrCode, Home as HomeIcon } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white/80 py-12">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8">
          <div className="md:w-1/2 mb-8 md:mb-0 md:mr-12">
            <div className="flex items-center mb-6">
              <MessageSquare size={36} className="text-textgpt-300 mr-3" />
              <span className="text-3xl font-bold text-white">TextG.pt</span>
            </div>
            <p className="text-white/70 text-sm md:text-base mb-6">
              TextG.pt provides AI-powered SMS communication solutions that work on any mobile device without requiring internet access or app downloads. 
              Our platform helps businesses, government agencies, and emergency services deliver critical information efficiently and accessibly.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center md:text-left ml-auto">
            <div>
              <h4 className="font-bold mb-4 text-white">Product</h4>
              <ul className="space-y-2">
                <li><Link href="/iqr/landing" className="hover:text-textgpt-300 transition-colors">IQR.codes</Link></li>
                <li><Link href="/kiwi/landing" className="hover:text-textgpt-300 transition-colors">Kiwi</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Company</h4>
              <ul className="space-y-2">
                <li><a href="#about" className="hover:text-textgpt-300 transition-colors">About</a></li>
                <li><a href="#contact" className="hover:text-textgpt-300 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="hover:text-textgpt-300 transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-textgpt-300 transition-colors">Terms</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">SMS</h4>
              <ul className="space-y-2">
                <li><Link href="/start" className="hover:text-textgpt-300 transition-colors">Start SMS</Link></li>
                <li><Link href="/opt-in" className="hover:text-textgpt-300 transition-colors">Opt-In Process</Link></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-8">
          <div className="text-center text-sm">
            <p>&copy; {new Date().getFullYear()} ModoZilla LLC. All rights reserved.</p>
            <p className="mt-2">TextG.pt is an AI-powered SMS platform by ModoZilla LLC.</p>
          </div>
        </div>
      </div>
    </footer>
  );
} 