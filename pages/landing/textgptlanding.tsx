import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, QrCode, Home as HomeIcon, ArrowRight, Smartphone, Phone, Menu, X } from "lucide-react";
import Link from "next/link";

const messageIcon = "https://cdn0.iconfinder.com/data/icons/apple-apps/100/Apple_Messages-1024.png";

const TextGptLanding = () => {
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
          <a href="#services" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">Services</a>
          <a href="#about" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">About</a>
          <a href="#contact" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">Contact</a>
          <Link href="/terms" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">Terms</Link>
          <Link href="/privacy" className="text-white/80 hover:text-white transition-all duration-300 ease-in-out hover:scale-105 text-xl">Privacy</Link>
          <Button className="bg-textgpt-300 text-textgpt-200 hover:bg-textgpt-400 hover:scale-105 transition-all duration-300 ease-in-out text-lg">
            Get Started
          </Button>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {isMenuOpen && (
        <div className="md:hidden fixed top-[74px] left-0 right-0 bg-textgpt-200/95 backdrop-blur-md p-5 z-40 border-t border-white/10 animate-in slide-in-from-top duration-300">
          <div className="flex flex-col space-y-4">
            <a href="#services" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>Services</a>
            <a href="#about" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>About</a>
            <a href="#contact" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>Contact</a>
            <Link href="/terms" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>Terms</Link>
            <Link href="/privacy" className="text-white/80 hover:text-white py-2 transition-all duration-300 ease-in-out text-xl" onClick={toggleMenu}>Privacy</Link>
            <Button className="bg-textgpt-300 text-textgpt-200 hover:bg-textgpt-400 w-full mt-2 py-6 transition-all duration-300 ease-in-out text-lg">
              Get Started
            </Button>
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
              No apps, no downloads—just pure convenience. TextGPT powers your phone's messaging app, helping you stay organized, get answers, and complete tasks effortlessly. It's like having a personal assistant available 24/7, always ready to help with just a text.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#services">
                <Button className="bg-textgpt-300 text-textgpt-200 hover:bg-textgpt-400 px-8 py-6 w-full sm:w-auto">
                  Explore Services
                </Button>
              </a>
              <Button variant="outline" className="border-textgpt-300 text-black hover:bg-textgpt-300/10 px-8 py-6 w-full sm:w-auto">
                Learn More
              </Button>
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="absolute top-0 -left-20 w-72 h-72 bg-textgpt-300/30 rounded-full filter blur-3xl opacity-70 animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-textgpt-400/30 rounded-full filter blur-xl opacity-70 animate-pulse delay-700"></div>

            <div className="relative bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20">
              <div className="flex items-center mb-6">
                <img src={messageIcon} alt="Message" className="w-6 h-6 mr-3" />
                <span className="text-xl font-semibold text-white">TextG.pt Assistant</span>
              </div>

              <div className="space-y-4">
                <div className="bg-textgpt-300/20 p-3 rounded-lg rounded-tr-none ml-auto w-4/5">
                  <p className="text-white text-sm">Hi! I'm planning a dinner party this weekend and would love to make an authentic Italian pasta dish. Any suggestions?</p>
                </div>

                <div className="bg-textgpt-200/40 p-3 rounded-lg rounded-tl-none w-4/5">
                  <p className="text-white text-sm">Of course! For a crowd-pleasing dish, I'd recommend a classic Fettuccine Alfredo or Spaghetti alla Carbonara. Which one interests you more? I can share a detailed recipe and some pro tips to make it extra special! 😊</p>
                </div>

                <div className="bg-textgpt-300/20 p-3 rounded-lg rounded-tr-none ml-auto w-4/5">
                  <p className="text-white text-sm">The Carbonara sounds amazing! I've never made it before. Could you share the recipe?</p>
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
                <img src={messageIcon} alt="Message" className="w-5 h-5 mr-2" />
                <span className="text-lg font-semibold text-white">TextG.pt Assistant</span>
              </div>

              <div className="space-y-3">
                <div className="bg-textgpt-300/20 p-2 rounded-lg rounded-tr-none ml-auto w-4/5">
                  <p className="text-white text-xs">Hi! I'm planning a dinner party this weekend and would love to make an authentic Italian pasta dish. Any suggestions?</p>
                </div>

                <div className="bg-textgpt-200/40 p-2 rounded-lg rounded-tl-none w-4/5">
                  <p className="text-white text-xs">Of course! For a crowd-pleasing dish, I'd recommend a classic Fettuccine Alfredo or Spaghetti alla Carbonara. Which one interests you more? 😊</p>
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

      <div id="about" className="py-20 bg-gradient-to-br from-textgpt-100 to-textgpt-200">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              About <span className="text-textgpt-300">TextG.pt</span>
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              We're revolutionizing business-customer communication through intelligent SMS technology. Our AI platform offers seamless, app-free engagement solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/10 transform transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:shadow-xl">
              <div className="w-12 h-12 bg-textgpt-300 rounded-full flex items-center justify-center mb-4 mx-auto md:mx-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-textgpt-200">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <path d="M12 9v4"></path>
                  <path d="M12 17h.01"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-white text-center md:text-left">Our Mission</h3>
              <p className="text-white/70 text-center md:text-left">
                To make business-customer communication effortless through innovative text-based solutions that require no additional apps or downloads.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/10 transform transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:shadow-xl">
              <div className="w-12 h-12 bg-textgpt-300 rounded-full flex items-center justify-center mb-4 mx-auto md:mx-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-textgpt-200">
                  <path d="M12 2v4"></path>
                  <path d="m16 3.82-.8.8"></path>
                  <path d="m8.8 4.62-.8-.8"></path>
                  <path d="M3 10h4"></path>
                  <path d="m3.82 14-.8.8"></path>
                  <path d="M21 10h-4"></path>
                  <path d="m20.18 14 .8.8"></path>
                  <path d="M14 21v-4"></path>
                  <path d="m14.18 16.18.8.8"></path>
                  <path d="M10 21v-4"></path>
                  <path d="m9.8 16.98-.8.8"></path>
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-white text-center md:text-left">Our Technology</h3>
              <p className="text-white/70 text-center md:text-left">
                Built on advanced AI and natural language processing, our platform delivers personalized, context-aware interactions that feel natural.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/10 transform transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:shadow-xl">
              <div className="w-12 h-12 bg-textgpt-300 rounded-full flex items-center justify-center mb-4 mx-auto md:mx-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-textgpt-200">
                  <path d="M22 9a7.93 7.93 0 0 0-2.33-5.67A7.93 7.93 0 0 0 14 1h-4a7.93 7.93 0 0 0-5.67 2.33A7.93 7.93 0 0 0 2 9a9 9 0 0 0 12.24 8.5A21.93 21.93 0 0 1 20.5 21 2.42 2.42 0 0 0 22 20.3V9Z"></path>
                  <path d="M15.29 17.24a8.983 8.983 0 0 0 2.01-9.17"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-white text-center md:text-left">Our Promise</h3>
              <p className="text-white/70 text-center md:text-left">
                We're committed to creating frictionless communication solutions that work for businesses of all sizes and their customers.
              </p>
            </div>
          </div>
        </div>
      </div>

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-xl text-center">
              <div className="w-12 h-12 bg-textgpt-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                <MessageSquare size={24} className="text-white" />
              </div>
              <h3 className="font-bold mb-2">Chat With Us</h3>
              <p className="text-gray-600 mb-4">Have questions? Our team is here to help.</p>
              <Button className="bg-textgpt-100 hover:bg-textgpt-200 text-white w-full sm:w-auto">Start Chat</Button>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl text-center">
              <div className="w-12 h-12 bg-textgpt-300 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
              </div>
              <h3 className="font-bold mb-2">Email Support</h3>
              <p className="text-gray-600 mb-4">Send us an email and we'll respond within 24 hours.</p>
              <Button className="bg-textgpt-300 hover:bg-textgpt-400 text-white w-full sm:w-auto">Email Us</Button>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl text-center">
              <div className="w-12 h-12 bg-textgpt-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Phone size={24} className="text-white" />
              </div>
              <h3 className="font-bold mb-2">Call Us</h3>
              <p className="text-gray-600 mb-4">Speak directly with our support team.</p>
              <Button className="bg-textgpt-400 hover:bg-textgpt-300 text-white w-full sm:w-auto">Call Now</Button>
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
                  <li><a href="#" className="hover:text-textgpt-300">Pricing</a></li>
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
                  <li><a href="#" className="hover:text-textgpt-300">Security</a></li>
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
};

export default TextGptLanding; 