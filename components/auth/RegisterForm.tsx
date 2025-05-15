"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRegistrationData, BusinessRegistrationData, BusinessDetailsData, SignupPayload } from "@/types/auth";
import { registerUser } from "@/app/actions/auth";
import { QrCode, ArrowRight, Check, Info, Lock, Mail, User, Globe, Building, Phone, Shield, FileText, MapPin, Briefcase, MessageSquare, Users, Loader2 } from "lucide-react";
import { useFormCache } from "@/hooks/useFormCache";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { createClient } from '@/lib/supabase/client';

// Import separate form components
import { AccountDetailsForm } from "./signup/AccountDetailsForm";
import { BusinessInformationForm } from "./signup/BusinessInformationForm";
import { AdditionalDetailsForm } from "./signup/AdditionalDetailsForm";

export const RegisterForm = () => {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Use the useFormCache hook to persist form data during navigation
  const [userData, setUserData] = useFormCache<UserRegistrationData | null>("signup_user_data", null);
  const [businessData, setBusinessData] = useFormCache<BusinessRegistrationData | null>("signup_business_data", null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLoginRedirect, setShowLoginRedirect] = useState(false);
  const [generatedNumber, setGeneratedNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redirectSeconds, setRedirectSeconds] = useState(5);
  const supabase = createClient();

  // Handle the account details submission
  const handleAccountSubmit = (data: UserRegistrationData) => {
    setUserData(data);
    setStep(2);
  };

  // Handle the business information submission
  const handleBusinessSubmit = (data: BusinessRegistrationData) => {
    setBusinessData(data);
    setStep(3);
  };

  // Handle countdown for redirect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (showSuccess && redirectSeconds > 0) {
      timer = setTimeout(() => {
        setRedirectSeconds(prev => prev - 1);
      }, 1000);
    } else if (showSuccess && redirectSeconds === 0) {
      router.push("/iqr/dashboard");
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showSuccess, redirectSeconds, router]);

  // Handle countdown for login redirect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (showLoginRedirect && redirectSeconds > 0) {
      timer = setTimeout(() => {
        setRedirectSeconds(prev => prev - 1);
      }, 1000);
    } else if (showLoginRedirect && redirectSeconds === 0) {
      router.push("/iqr/login");
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showLoginRedirect, redirectSeconds, router]);

  // Handle the additional details submission
  const handleBusinessDetailsSubmit = async (detailsData: BusinessDetailsData) => {
    if (!userData || !businessData) {
      setError("Missing user or business data. Please complete all steps.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const payload: SignupPayload = {
        user: userData,
        business: businessData,
        businessDetails: detailsData
      };

      const result = await registerUser(payload);

      // Success case - normal flow
      if (result.success) {
        // Clear the form cache on successful registration
        sessionStorage.removeItem("form_cache_signup_user_data");
        sessionStorage.removeItem("form_cache_signup_business_data");
        
        setGeneratedNumber(result.data?.iqr_number || "+1 (800) 000-0000");
        setShowSuccess(true);
        setRedirectSeconds(5);
      } 
      // Handle case where auth and business were created but business details failed
      else if (result.message?.includes('Failed to create user profile') && result.data?.user && result.data?.business) {
        // This is a partial success - essential data was created
        // Clear the form cache on partial success too
        sessionStorage.removeItem("form_cache_signup_user_data");
        sessionStorage.removeItem("form_cache_signup_business_data");
        
        setGeneratedNumber(result.data?.iqr_number || "+1 (800) 000-0000");
        setShowSuccess(true);
        setRedirectSeconds(5);
      }
      // Account already exists case
      else if (result.message?.includes('already exists')) {
        setError("An account with this email already exists. Please login instead.");
        setShowLoginRedirect(true);
        setRedirectSeconds(5);
      }
      // Complete failure case
      else {
        setError(result.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Get progress percentage based on current step
  const getProgressPercentage = () => {
    switch (step) {
      case 1: return 33;
      case 2: return 66;
      case 3: return 100;
      default: return 33;
    }
  };

  // Handle back button
  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  return (
    <>
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-iqr-100 to-black py-10 px-4">
        <Card className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-xl border-iqr-200/20 text-iqr-400 shadow-xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center space-x-2 mb-2">
              <QrCode size={30} className="text-iqr-200" />
              <CardTitle className="text-2xl font-bold">IQR.codes</CardTitle>
            </div>
            <CardDescription className="text-iqr-300">
              {step === 1 
                ? "Create your account to get started" 
                : step === 2 
                  ? "Set up your business details" 
                  : "Tell us more about your business"}
            </CardDescription>
            
            {/* Progress indicator */}
            <div className="pt-2">
              <Progress 
                value={getProgressPercentage()} 
                className="h-2 bg-iqr-100/30"
                indicatorClassName="bg-iqr-200"
              />
              <div className="flex justify-between mt-1 text-xs text-iqr-300">
                <span className={step === 1 ? "text-iqr-200 font-medium" : "text-iqr-300"}>
                  Account Details
                </span>
                <span className={step === 2 ? "text-iqr-200 font-medium" : "text-iqr-300"}>
                  Business Information
                </span>
                <span className={step === 3 ? "text-iqr-200 font-medium" : "text-iqr-300"}>
                  Additional Details
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {error && !showLoginRedirect && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                {error}
              </div>
            )}
            
            {/* Render the appropriate form component based on current step */}
            {step === 1 && (
              <AccountDetailsForm onSubmit={handleAccountSubmit} />
            )}
            
            {step === 2 && (
              <BusinessInformationForm 
                onSubmit={handleBusinessSubmit} 
                onBack={handleBack}
              />
            )}
            
            {step === 3 && (
              <AdditionalDetailsForm 
                onSubmit={handleBusinessDetailsSubmit} 
                onBack={handleBack}
                isLoading={isLoading}
              />
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center border-t border-iqr-200/10 pt-4">
            <p className="text-sm text-iqr-300">
              Already have an account?{" "}
              <Button variant="link" asChild className="text-iqr-200 p-0">
                <Link href="/iqr/login">Sign in</Link>
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-iqr-50 text-iqr-400 border-iqr-200/20 max-w-md">
          <DialogHeader>
            <div className="mx-auto bg-green-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <DialogTitle className="text-xl font-bold text-center">Registration Successful!</DialogTitle>
            <DialogDescription className="text-center text-iqr-300">
              Your account has been created. Your IQR number is being verified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 bg-iqr-100/20 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-iqr-200" />
                <span className="font-medium">Your IQR Number:</span>
              </div>
              <span className="font-bold text-iqr-200">
                {generatedNumber}
              </span>
            </div>
            <div className="mt-2 flex items-start gap-2 text-sm">
              <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-iqr-300">
                Verification of your number will take a few days. We'll notify you when it's ready for use.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              className="w-full bg-iqr-200 hover:bg-iqr-200/90 text-iqr-50"
              onClick={() => router.push("/iqr/dashboard")}
            >
              Go to Dashboard ({redirectSeconds}s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Exists Dialog */}
      <Dialog open={showLoginRedirect} onOpenChange={() => {}}>
        <DialogContent className="bg-iqr-50 text-iqr-400 border-iqr-200/20 max-w-md">
          <DialogHeader>
            <div className="mx-auto bg-amber-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Info className="h-8 w-8 text-amber-500" />
            </div>
            <DialogTitle className="text-xl font-bold text-center">Account Already Exists</DialogTitle>
            <DialogDescription className="text-center text-iqr-300">
              An account with this email address already exists in our system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 bg-iqr-100/20 rounded-md text-sm">
            <p className="text-iqr-300">
              Please sign in to your existing account. If you've forgotten your password, you can use the "Forgot Password" feature on the login page.
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              className="w-full bg-iqr-200 hover:bg-iqr-200/90 text-iqr-50"
              onClick={() => router.push("/iqr/login")}
            >
              Go to Login ({redirectSeconds}s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 