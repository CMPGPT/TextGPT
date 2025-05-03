"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export default function TermsPage() {
  const effectiveDate = "April 26, 2025"; // Example date as mentioned in the terms

  return (
    <div className="min-h-screen bg-white">
      <nav className="py-6 px-6 md:px-10 bg-textgpt-200">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center">
            <MessageSquare size={30} className="text-textgpt-300 mr-2" />
            <span className="text-2xl font-bold text-white">TextG.pt</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/privacy">
              <Button variant="ghost" className="text-white hover:text-textgpt-300">
                Privacy Policy
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
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-textgpt-300">Terms of Service</h1>
        
        <div className="bg-gray-50 rounded-xl p-8 text-gray-700 shadow-sm">
          <p className="mb-6 font-bold">
            TextGPT & IQRCodes Terms and Conditions<br />
            Effective Date: {effectiveDate}
          </p>
          
          <p className="mb-6 font-semibold">
            PLEASE READ THESE TERMS AND CONDITIONS CAREFULLY BEFORE USING THE TEXTGPT & IQRCodes SERVICES.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">1. Acceptance of Terms</h2>
          <p className="mb-6">
            Welcome to TextGPT & IQRCodes (referred to collectively as the &quot;Service,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of our website, web application, virtual eSIM provisioning, AI-powered text messaging features, QR code generation (for IQRCodes), and related services.
          </p>
          <p className="mb-6">
            By registering for, subscribing to, accessing, or using the Service, you agree to be bound by these Terms and our Privacy Policy, which is incorporated herein by reference. If you do not agree to all of these Terms, do not access or use the Service.
          </p>
          <p className="mb-6">
            These Terms constitute a legally binding agreement between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and our company.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">2. Description of Service</h2>
          <p className="mb-6">
            TextGPT & IQRCodes provides a platform that allows subscribed users to:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Obtain and manage virtual eSIMs (&quot;eSIMs&quot;) provided through our third-party telecommunication partners.</li>
            <li>Utilize Artificial Intelligence (&quot;AI&quot;) to automatically process incoming text messages received on the provisioned eSIM and generate/send AI-powered replies based on user settings or configurations.</li>
            <li>TextGPT: Primarily focused on individual user applications of AI-powered texting via an eSIM.</li>
            <li>IQRCodes: Primarily focused on business applications, allowing businesses to generate QR codes which, when scanned by a consumer, can initiate an AI-powered text message interaction between the consumer and the business&apos;s provisioned eSIM number.</li>
          </ul>
          <p className="mb-2 font-semibold">Important Disclaimers:</p>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li>The Service relies on AI technology, which is probabilistic and may generate responses that are inaccurate, incomplete, nonsensical, or inappropriate. You are ultimately responsible for the configuration, oversight, and consequences of AI-generated communications sent from your account.</li>
            <li>eSIM functionality and message delivery depend on underlying telecommunication networks and partners, which are outside our direct control. We do not guarantee uninterrupted service or message delivery.</li>
            <li>The Service is a communication tool. It does not provide legal, financial, medical, or other professional advice.</li>
          </ul>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">3. Eligibility and Account Registration</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li><strong>Age Requirement:</strong> You must be at least eighteen (18) years of age to use the Service.</li>
            <li><strong>Legal Compliance:</strong> You represent and warrant that your use of the Service, including sending and receiving text messages (especially AI-generated ones), complies with all applicable federal, state, local, and international laws and regulations (including, but not limited to, the Telephone Consumer Protection Act (TCPA), GDPR, CASL, and rules regarding telemarketing, spam, and consent).</li>
            <li><strong>Account Information:</strong> You agree to provide accurate, current, and complete information during registration for either TextGPT or IQRCodes, including name, email, phone number, and any required business details (address, purpose, etc. for IQRCodes). You agree to update this information promptly if it changes.</li>
            <li><strong>Account Verification:</strong> All new account registrations are subject to a verification process that may take up to forty-eight (48) hours. We reserve the right to request additional information during this period to verify your identity or business legitimacy. Failure to provide requested information or failure to pass verification, at our sole discretion, may result in account denial or suspension.</li>
            <li><strong>Account Security:</strong> You are responsible for safeguarding your account password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account. Implementing any available security features (like 2FA, if offered) is strongly recommended.</li>
          </ul>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">4. Subscription Terms</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li><strong>Subscription Required:</strong> Access to eSIM provisioning and AI texting features requires an active, paid subscription plan. Different plans may offer varying features or usage limits.</li>
            <li><strong>Fees:</strong> You agree to pay the subscription fees specified for your chosen plan at the time of purchase. Fees are billed in advance on a recurring basis (e.g., monthly, annually) as selected during signup. Applicable taxes may be added.</li>
            <li><strong>Payment:</strong> We use a third-party payment processor to handle subscription payments securely. You agree to provide valid and current payment information and authorize us (through our processor) to charge your payment method for the recurring subscription fees. You are subject to the terms and conditions of the third-party payment processor.</li>
            <li><strong>Automatic Renewal:</strong> Your subscription will automatically renew at the end of each billing cycle unless you cancel it through your account settings or by contacting us according to the specified cancellation procedure before the end of the current billing period.</li>
            <li><strong>Cancellation:</strong> You may cancel your subscription at any time. Cancellation will take effect at the end of the current paid billing cycle. You will retain access to the paid features until the end of that cycle. eSIM functionality associated with the cancelled subscription will cease upon termination.</li>
            <li><strong>No Refunds:</strong> Subscription fees are non-refundable, except as required by applicable law or at our sole discretion. No refunds or credits will be provided for partial subscription periods or unused services.</li>
            <li><strong>Fee Changes:</strong> We reserve the right to change subscription fees or introduce new charges. We will provide you with reasonable prior notice (e.g., 30 days) of any fee changes, giving you the opportunity to cancel your subscription before the changes take effect.</li>
          </ul>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">5. Use of the Service</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li><strong>eSIM Provisioning:</strong> Your use of the eSIM is subject to the terms and conditions of our underlying telecommunication partners, in addition to these Terms. The eSIM number provided remains the property of the issuing carrier.</li>
            <li><strong>AI Configuration and Oversight:</strong> You are responsible for configuring any settings related to the AI&apos;s behavior and responses. You acknowledge that the AI learns from general data (not your specific private messages, as per our Privacy Policy) and its responses are generated algorithmically. It is your responsibility to monitor the AI&apos;s interactions and ensure the responses sent from your account are appropriate, accurate, and comply with legal requirements and your intended purpose.</li>
            <li><strong>Message Content:</strong> You are solely responsible for the content of all messages sent from your provisioned eSIM number, whether manually composed or generated by the AI under your account&apos;s configuration.</li>
            <li><strong>Compliance with Messaging Laws:</strong> You bear sole responsibility for ensuring that all messages sent using the Service comply with all applicable laws, including obtaining necessary consent (e.g., express written consent under TCPA for marketing messages) before sending messages, especially those initiated via IQRCodes scans or sent for commercial purposes.</li>
          </ul>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">6. Acceptable Use Policy</h2>
          <p className="mb-2">You agree not to use the Service for any unlawful or prohibited purpose, including but not limited to:</p>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li>Violating any applicable laws or regulations (TCPA, CAN-SPAM, GDPR, etc.).</li>
            <li>Sending unsolicited messages (spam), bulk messages without proper consent, or engaging in fraudulent, harassing, defamatory, obscene, or illegal activities.</li>
            <li>Impersonating any person or entity, or falsely stating or misrepresenting your affiliation.</li>
            <li>Transmitting viruses, malware, or any other malicious code.</li>
            <li>Attempting to gain unauthorized access to the Service, other accounts, or related systems.</li>
            <li>Interfering with or disrupting the Service or networks connected to it.</li>
            <li>Using the Service for emergency communications (e.g., dialing 911 or equivalent emergency services). The Service is not a substitute for traditional phone services for emergencies.</li>
            <li>Reverse-engineering, decompiling, or attempting to extract the source code of the Service or its AI models.</li>
            <li>Using the Service in any way that could damage, disable, overburden, or impair our servers or networks, or interfere with any other party&apos;s use and enjoyment of the Service.</li>
            </ul>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">7. IQRCodes Specific Terms (for Business Users)</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li><strong>Consumer Consent:</strong> If you use IQRCodes, you are solely responsible for ensuring that consumers who scan your QR codes understand that doing so will initiate a text message conversation and that they explicitly consent to receive messages (including potentially AI-generated messages) from your business number before or immediately upon scanning. Your QR code implementation must comply with all applicable laws regarding consent for electronic communications.</li>
            <li><strong>Clarity and Transparency:</strong> You must clearly and conspicuously disclose to consumers the nature of the interaction initiated by scanning the QR code.</li>
            <li><strong>Business Responsibility:</strong> You are responsible for all interactions and compliance related to the use of IQRCodes linked to your account.</li>
            </ul>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">8. Intellectual Property</h2>
          <p className="mb-6">
            The Service, including its software, AI models (as utilized within the service), website, logos, design, text, graphics, and other content (excluding user-provided data like specific message content or configurations) are the exclusive property of our company and its licensors, protected by copyright, trademark, and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Service solely in accordance with these Terms and your active subscription.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">9. Third-Party Services and Dependencies</h2>
          <p className="mb-6">
            You acknowledge that the Service relies on third-party services, including:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li>Telecommunication Partners: For eSIM provisioning and network connectivity.</li>
            <li>AI Technology Providers: For the underlying AI processing capabilities.</li>
            <li>Payment Processors: For handling subscription payments.</li>
          </ul>
          <p className="mb-6">
            We are not responsible for the performance, availability, security, or policies of these third-party services. Your use of these underlying services may be subject to their respective terms and conditions. We disclaim all liability arising from the failure or actions of these third parties.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">10. Disclaimers</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li><strong>&quot;AS IS&quot; Basis:</strong> THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.</li>
            <li><strong>AI Accuracy:</strong> WE MAKE NO WARRANTIES REGARDING THE ACCURACY, RELIABILITY, COMPLETENESS, OR APPROPRIATENESS OF AI-GENERATED CONTENT OR RESPONSES. USE AI FEATURES AT YOUR OWN RISK AND WITH APPROPRIATE OVERSIGHT.</li>
            <li><strong>Service Reliability:</strong> WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, ERROR-FREE, OR THAT MESSAGES WILL BE DELIVERED. NETWORK AND CARRIER ISSUES MAY OCCUR.</li>
            <li><strong>Compliance:</strong> WE PROVIDE A TOOL; WE DO NOT GUARANTEE YOUR COMPLIANCE WITH LAWS (E.G., TCPA). YOU ARE SOLELY RESPONSIBLE FOR ENSURING YOUR USE OF THE SERVICE IS LAWFUL.</li>
          </ul>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">11. Limitation of Liability</h2>
          <p className="mb-6">
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL OUR COMPANY, ITS AFFILIATES, DIRECTORS, EMPLOYEES, AGENTS, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, BUSINESS INTERRUPTION, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (I) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE; (II) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY (INCLUDING TELECOMMUNICATION PARTNERS OR AI PROVIDERS) ON OR RELATED TO THE SERVICE; (III) ANY CONTENT OBTAINED FROM THE SERVICE, INCLUDING AI-GENERATED RESPONSES; (IV) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT; (V) FAILURE OF MESSAGE DELIVERY OR ESIM FUNCTIONALITY; OR (VI) ANY OTHER MATTER RELATING TO THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STATUTE, OR ANY OTHER LEGAL THEORY, WHETHER OR NOT WE HAVE BEEN INFORMED OF THE POSSIBILITY OF SUCH DAMAGE.
          </p>
          <p className="mb-6">
            IN NO EVENT SHALL OUR AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE EXCEED THE GREATER OF ONE HUNDRED U.S. DOLLARS ($100) OR THE TOTAL AMOUNT OF SUBSCRIPTION FEES PAID BY YOU TO US FOR THE SERVICE DURING THE SIX (6) MONTH PERIOD IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">12. Indemnification</h2>
          <p className="mb-6">
            You agree to defend, indemnify, and hold harmless our company and its affiliates, officers, directors, employees, agents, licensors, and suppliers from and against any claims, actions, demands, damages, losses, liabilities, costs, or expenses (including reasonable attorneys&apos; fees) arising out of or relating to: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any applicable law or regulation (especially regarding telecommunications, messaging consent (TCPA), or data privacy); (d) your interaction with any third party through the Service, including messages sent or received; (e) the content generated by the AI under your account&apos;s direction or configuration; (f) your use of IQRCodes and any resulting consumer interactions or complaints; or (g) your infringement of any third-party rights.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">13. Termination</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li><strong>By You:</strong> You may terminate your account and these Terms by cancelling your subscription and ceasing use of the Service. Cancellation is effective at the end of the current paid billing cycle.</li>
            <li><strong>By Us:</strong> We may suspend or terminate your account and access to the Service immediately, without prior notice or liability, for any reason, including but not limited to, if you breach these Terms, fail verification, fail to pay subscription fees, or engage in conduct we deem harmful to the Service or other users.</li>
            <li><strong>Effect of Termination:</strong> Upon termination, your right to use the Service will immediately cease, your eSIM will be deactivated, and we may delete your account data in accordance with our Privacy Policy and data retention practices. Provisions of these Terms that by their nature should survive termination (including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability) shall survive.</li>
          </ul>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">14. Governing Law and Dispute Resolution</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li><strong>Governing Law:</strong> These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.</li>
            <li><strong>Dispute Resolution:</strong> You agree to first attempt to resolve any dispute informally by contacting us. If the dispute is not resolved within thirty (30) days of submission, you agree that any legal suit, action, or proceeding arising out of or related to these Terms or the Service shall be instituted exclusively in the federal courts of the United States. You waive any and all objections to the exercise of jurisdiction over you by such courts and to venue in such courts.</li>
          </ul>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">15. Changes to Terms</h2>
          <p className="mb-6">
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least thirty (30) days&apos; notice prior to any new terms taking effect (e.g., via email to the address associated with your account or a prominent notice on the Service). What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
          </p>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">16. Miscellaneous</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li><strong>Entire Agreement:</strong> These Terms and our Privacy Policy constitute the entire agreement between you and our company regarding the Service and supersede all prior agreements.</li>
            <li><strong>Severability:</strong> If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions will remain in full force and effect.</li>
            <li><strong>Waiver:</strong> Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.</li>
            <li><strong>Assignment:</strong> You may not assign or transfer these Terms without our prior written consent. We may assign these Terms without restriction.</li>
            <li><strong>Notices:</strong> We may provide notices to you via email, regular mail, or postings on the Service.</li>
          </ul>

          <h2 className="text-xl font-bold mb-4 text-textgpt-300">17. Contact Information</h2>
          <p className="mb-6">
            If you have any questions about these Terms, please contact us at: help@textg.pt
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