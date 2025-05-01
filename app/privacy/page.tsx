"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, Lock } from "lucide-react";

export default function PrivacyPage() {
  const effectiveDate = "April 26, 2025"; // Example date as mentioned in the policy

  return (
    <div className="min-h-screen bg-white">
      <nav className="py-6 px-6 md:px-10 bg-textgpt-200">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center">
            <MessageSquare size={30} className="text-textgpt-300 mr-2" />
            <span className="text-2xl font-bold text-white">TextG.pt</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/terms">
              <Button variant="ghost" className="text-white hover:text-textgpt-300">
                Terms of Service
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="text-white border-white hover:bg-white/10 sm:order-last">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="flex items-center mb-8">
          <Lock className="text-textgpt-300 mr-3" size={36} />
          <h1 className="text-3xl md:text-4xl font-bold text-textgpt-300">Privacy Policy</h1>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-8 text-gray-700 shadow-sm">
          <p className="mb-6">
            <strong>TextGPT & IQRCodes Privacy Policy</strong><br />
            Effective Date: {effectiveDate}
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">1. Introduction</h2>
          <p className="mb-6">
            Welcome to TextGPT & IQRCodes (referred to collectively as &quot;Service,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). We provide services enabling users to obtain virtual eSIMs (&quot;eSIMs&quot;) and utilize Artificial Intelligence (&quot;AI&quot;) to manage and respond to text messages associated with those eSIMs. This includes the TextGPT service primarily for individual use and the IQRCodes service focused on business applications, allowing businesses to generate QR codes that trigger AI-powered text interactions with consumers.
          </p>
          <p className="mb-6">
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you register for, subscribe to, or use our Service. Protecting your privacy is paramount to us.
          </p>
          <p className="mb-6">
            Please read this Privacy Policy carefully. By accessing or using our Service, you signify that you have read, understood, and agree to our collection, storage, use, and disclosure of your personal information as described in this Privacy Policy and our Terms of Service.
          </p>
          <p className="mb-6">
            This policy applies to all registered users of TextGPT and IQRCodes.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">2. Information We Collect</h2>
          <p className="mb-6">
            We collect information necessary to provide and improve our Service, process your subscriptions, verify accounts, and comply with legal obligations. The types of Personal Information we may collect include:
          </p>
          <p className="font-semibold mb-2">Account Registration Information (TextGPT & IQRCodes - Individuals/Base):</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Full Name or Username</li>
            <li>Email Address</li>
            <li>Phone Number (used for account verification, potentially for eSIM association, and communication)</li>
            <li>Password (stored securely using hashing)</li>
            <li>Chosen Subscription Plan details</li>
          </ul>
          
          <p className="font-semibold mb-2">Account Registration Information (IQRCodes - Businesses):</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>All information listed above for Individuals/Base, plus:</li>
            <li>Business Name</li>
            <li>Business Email Address</li>
            <li>Business Phone Number</li>
            <li>Business Physical Address (Street, City, State, Zip Code, Country)</li>
            <li>Stated Purpose of Use (e.g., description of how IQRCodes will be implemented)</li>
          </ul>
          
          <p className="font-semibold mb-2">Verification Information:</p>
          <p className="mb-4">
            Information provided during the mandatory verification period (which may take up to 48 hours). This may include confirming details provided during registration or potentially requesting additional information as needed to verify identity or business legitimacy, in compliance with applicable regulations.
          </p>
          
          <p className="font-semibold mb-2">Payment Information:</p>
          <p className="mb-4">
            When you purchase a subscription, we use a third-party payment processor (e.g., Stripe, PayPal) to handle the transaction securely. We collect information necessary to process your payment, such as your billing address and payment method details (e.g., credit card number, expiration date – processed directly by the payment processor). We receive confirmation of payment, subscription status, and potentially masked payment details (e.g., last four digits of a card) from the processor. We do not directly store your full sensitive payment card information on our servers.
          </p>
          
          <p className="font-semibold mb-2">Usage and Interaction Data:</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>eSIM Information: Details related to the virtual eSIM assigned to your account.</li>
            <li>Text Message Metadata: Sender phone number, recipient eSIM phone number, timestamps, delivery status.</li>
            <li>Text Message Content: The content of text messages sent to and received from your provisioned eSIM is processed by our AI system solely to generate appropriate responses as part of the Service functionality. We treat this data with high sensitivity (see Section 5: AI Processing).</li>
            <li>AI Interaction Logs: Records of prompts (incoming messages) and AI-generated responses associated with your account, used for service delivery, troubleshooting, and potential (anonymized/aggregated) service improvement.</li>
            <li>QR Code Data (IQRCodes): Information related to the QR codes you generate (e.g., associated campaign, generation date), and potentially aggregated scan metrics (scan count, time of scan - without linking to individual consumer phone numbers unless required for specific service function and disclosed).</li>
            <li>Technical Information: IP Address, browser type/version, operating system, device identifiers, pages visited on our website, time spent on pages, links clicked, referral URLs.</li>
          </ul>
          
          <p className="font-semibold mb-2">Cookies and Tracking Technologies:</p>
          <p className="mb-6">
            We use cookies, web beacons, and similar technologies to operate and secure the Service, manage sessions, remember preferences, understand user activity, and improve user experience. You can manage cookie preferences through your browser settings.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">3. How We Use Your Information</h2>
          <p className="mb-4">We use the information we collect for purposes including:</p>
          
          <p className="font-semibold mb-2">To Provide and Operate the Service:</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Create, manage, and verify your account (including the 48-hour verification period).</li>
            <li>Provision and manage your virtual eSIM via our telecommunication partners.</li>
            <li>Process your subscription payments via our third-party payment processor.</li>
            <li>Facilitate the core AI texting functionality (receiving messages, processing content via AI, sending AI-generated replies).</li>
            <li>Enable QR code generation and management for IQRCodes users.</li>
            <li>Deliver customer support and respond to inquiries.</li>
            </ul>

          <p className="font-semibold mb-2">For AI Functionality:</p>
          <p className="mb-4">
            To process the content of incoming text messages using AI algorithms to generate relevant and contextual responses. This processing is automated and necessary for the core function of the Service.
          </p>
          
          <p className="font-semibold mb-2">For Verification and Security:</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Verify user identity and/or business legitimacy during the initial verification phase.</li>
            <li>Protect the security and integrity of our Service, data, and users.</li>
            <li>Detect and prevent fraud, abuse, unauthorized access, and violations of our Terms.</li>
            <li>Monitor service performance and stability.</li>
            </ul>

          <p className="font-semibold mb-2">To Improve and Personalize the Service:</p>
          <p className="mb-4">
            Analyze usage trends (often using aggregated or anonymized data) to understand how users interact with the Service, identify areas for improvement, and develop new features.
          </p>
          
          <p className="font-semibold mb-2">For Compliance and Legal Obligations:</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Comply with applicable laws, regulations (including telecommunications regulations), legal processes, and lawful government requests.</li>
            <li>Enforce our Terms of Service and other policies.</li>
          </ul>
          
          <p className="font-semibold mb-2">To Communicate with You:</p>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li>Send essential service-related communications (e.g., account verification, billing confirmations, service updates, security alerts).</li>
            <li>Send marketing communications (where permitted by law and with opt-out options).</li>
          </ul>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">4. How We Share Your Information</h2>
          <p className="mb-4">
            We do not sell your Personal Information. We may share your information only in the following circumstances:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Telecommunication Partners:</strong> We share necessary information (such as account identifiers and potentially associated phone numbers) with our underlying telecommunication partners solely for the purpose of provisioning, managing, and enabling texting functionality for your virtual eSIM.</li>
            <li><strong>AI Service Providers:</strong> To provide the AI-powered response feature, the content of text messages sent to your eSIM is shared temporarily with our third-party AI technology providers (e.g., OpenAI, Anthropic, or similar). We have contractual agreements with these providers requiring them to:
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Use the message content only for the purpose of generating the AI response back to our Service for delivery.</li>
                <li>Maintain the confidentiality and security of the data.</li>
                <li>Not use your message content for training their general AI models or for any other purpose, unless explicitly required for service provision under strict confidentiality or if data is fully anonymized according to industry standards.</li>
              </ul>
            </li>
            <li><strong>Payment Processors:</strong> We share necessary transaction information with our third-party payment processors to securely handle your subscription payments.</li>
            <li><strong>Other Service Providers:</strong> We may share information with third-party vendors performing services on our behalf (e.g., hosting, data storage, analytics, customer support platforms, email delivery). These providers are contractually bound to protect your information and use it only for the services they provide to us.</li>
            <li><strong>Legal Requirements and Law Enforcement:</strong> We may disclose your information if required by law, subpoena, court order, or other legal process, or if we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, respond to a government request, or comply with regulatory requirements (especially in telecommunications).</li>
            <li><strong>Business Transfers:</strong> If we are involved in a merger, acquisition, financing, reorganization, bankruptcy, or sale of all or a portion of our assets, your information may be transferred as part of that transaction, subject to standard confidentiality agreements.</li>
            <li><strong>With Your Consent:</strong> We may share your information for other purposes if we have obtained your explicit consent to do so.</li>
            <li><strong>IQRCodes Business Reporting (Aggregated Data):</strong> For IQRCodes business users, we may provide aggregated and anonymized reports regarding QR code usage (e.g., number of scans), but we will not share individual consumer phone numbers or specific message content with the business user through these standard reports.</li>
          </ul>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">5. AI Processing and Message Content</h2>
          <p className="mb-4">
            The core functionality of TextGPT & IQRCodes relies on processing text message content using AI. We understand the sensitivity of this data:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Purpose Limitation:</strong> Message content is processed solely to understand the context and generate an appropriate AI reply as configured by you (or the business user in IQRCodes).</li>
            <li><strong>Transience:</strong> While message content must be processed by the AI, we strive to minimize its retention. It is processed transiently for response generation. Associated metadata and interaction logs (without full message content where feasible) may be retained longer for service operation, billing, and troubleshooting as described in Section 7.</li>
            <li><strong>Confidentiality:</strong> We implement technical and organizational measures to protect the confidentiality of message content during processing. Access is strictly limited.</li>
            <li><strong>No Training (Default):</strong> By default, your specific message content is not used to train general AI models by us or our third-party AI providers.</li>
          </ul>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">6. Data Security</h2>
          <p className="mb-6">
            We implement reasonable administrative, technical, and physical security measures designed to protect your Personal Information from unauthorized access, use, alteration, or disclosure. These include:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li>Encryption of data in transit (TLS/SSL) and at rest.</li>
            <li>Access controls and authentication mechanisms.</li>
            <li>Regular security assessments and updates.</li>
            <li>Secure handling of payment information via PCI-compliant processors.</li>
          </ul>
          <p className="mb-6">
            However, no internet transmission or electronic storage method is 100% secure. While we strive to use commercially acceptable means to protect your Personal Information, we cannot guarantee its absolute security. You are also responsible for maintaining the security of your account credentials.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">7. Data Retention</h2>
          <p className="mb-4">
            We retain your Personal Information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. This includes:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Account Information:</strong> Retained while your account is active and for a reasonable period afterward for administrative purposes, dispute resolution, or as required by law.</li>
            <li><strong>Payment and Subscription Data:</strong> Retained as necessary for billing, accounting, and compliance requirements.</li>
            <li><strong>Usage Data & Metadata:</strong> Retained as needed for service operation, troubleshooting, security, billing disputes, and analytics (often aggregated/anonymized over time).</li>
            <li><strong>AI Processed Message Content:</strong> Retained only transiently as needed for immediate AI response generation. Logs of interactions (potentially excluding full sensitive content) may be kept longer.</li>
            <li><strong>Verification Information:</strong> Retained as long as necessary for compliance and account validation purposes.</li>
          </ul>
          <p className="mb-6">
            When information is no longer needed, we will securely delete or anonymize it.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">8. Your Privacy Rights</h2>
          <p className="mb-4">
            Depending on your location (e.g., California under CCPA/CPRA, Europe under GDPR), you may have rights regarding your Personal Information, including:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li>Access: Request access to the Personal Information we hold about you.</li>
            <li>Correction: Request correction of inaccurate information.</li>
            <li>Deletion: Request deletion of your Personal Information, subject to legal exceptions (e.g., data needed for billing, compliance, or ongoing service provision).</li>
            <li>Opt-Out: Opt-out of marketing communications via unsubscribe links or account settings. You cannot opt-out of essential service communications.</li>
            <li>Data Portability: Request a copy of your data in a portable format (where applicable by law).</li>
            <li>Restrict Processing: Request restriction of processing under certain conditions (where applicable by law).</li>
          </ul>
          <p className="mb-6">
            To exercise these rights, please contact us using the details below. We will respond in accordance with applicable law and may need to verify your identity.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">9. Children&apos;s Privacy</h2>
          <p className="mb-6">
            Our Service is not directed to individuals under the age of 18. We do not knowingly collect Personal Information from children under 18. If we become aware that we have inadvertently collected such information, we will take steps to delete it promptly.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">10. International Data Transfers</h2>
          <p className="mb-6">
            Our Service is operated primarily in the United States. Your information may be transferred to, stored, and processed in the United States and other countries where our service providers operate. By using the Service, you consent to the transfer of your information to countries outside your country of residence, which may have different data protection rules. We take steps to ensure that international transfers comply with applicable data protection laws (e.g., using Standard Contractual Clauses where required).
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">11. Changes to This Privacy Policy</h2>
          <p className="mb-6">
            We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. If we make material changes, we will notify you via email (to the address associated with your account), by posting a prominent notice on the Service, or as otherwise required by law, prior to the change becoming effective. We encourage you to review this policy periodically.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">12. Contact Us</h2>
          <p className="mb-6">
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at: support@textg.pt<br />
        
            </p>
            
          </div>
    
        <div className="mt-8 text-center">
          <Link href="/">
            <Button className="bg-textgpt-300 hover:bg-textgpt-400 text-black">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>

      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <Link href="/" className="flex items-center">
            <MessageSquare size={24} className="text-textgpt-300 mr-2" />
                <span className="text-xl font-bold">TextG.pt</span>
              </Link>
              <p className="mt-4 text-gray-400">
                AI-powered text response automation
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <h3 className="text-lg font-semibold mb-4">Product</h3>
                <ul className="space-y-2">
                  <li><Link href="/" className="text-gray-400 hover:text-white">Features</Link></li>
                  <li><Link href="/pricing" className="text-gray-400 hover:text-white">Pricing</Link></li>
                  <li><Link href="/faqs" className="text-gray-400 hover:text-white">FAQs</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Company</h3>
                <ul className="space-y-2">
                  <li><Link href="/about" className="text-gray-400 hover:text-white">About Us</Link></li>
                  <li><Link href="/contact" className="text-gray-400 hover:text-white">Contact</Link></li>
                  <li><Link href="/blog" className="text-gray-400 hover:text-white">Blog</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><Link href="/terms" className="text-gray-400 hover:text-white">Terms</Link></li>
                  <li><Link href="/privacy" className="text-gray-400 hover:text-white">Privacy</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} TextGPT. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 