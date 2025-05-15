"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRegistrationData, BusinessRegistrationData, SignupPayload } from "@/types/auth";
import { registerUser } from "@/app/actions/auth";
import { QrCode, ArrowRight, Check, Info, Lock, Mail, User, Globe, Building, Phone, Shield, FileText } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Form validation schemas
const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  description: z.string().optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
});

const businessFormSchema = z.object({
  name: z.string().min(2, "Business name is required"),
  ein: z.string().min(9, "EIN/Tax ID is required"),
  address: z.string().min(5, "Business address is required"),
  website_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  support_email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  support_phone: z.string().optional(),
  privacy_policy_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  terms_of_service_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

export const RegisterForm = () => {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [userData, setUserData] = useState<UserRegistrationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedNumber, setGeneratedNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // First form - User details
  const userForm = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      description: "",
      termsAccepted: false,
    },
  });

  // Second form - Business details
  const businessForm = useForm<z.infer<typeof businessFormSchema>>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      name: "",
      ein: "",
      address: "",
      website_url: "",
      support_email: "",
      support_phone: "",
      privacy_policy_url: "",
      terms_of_service_url: "",
    },
  });

  // Handle the first form submission
  const onUserSubmit = (data: z.infer<typeof userFormSchema>) => {
    // Extract only the user registration data without the terms field
    const userRegData: UserRegistrationData = {
      username: data.username,
      email: data.email,
      password: data.password,
      description: data.description || '', // Ensure description is never undefined
    };
    setUserData(userRegData);
    setStep(2);
  };

  // Handle the second form submission
  const onBusinessSubmit = async (businessData: z.infer<typeof businessFormSchema>) => {
    if (!userData) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const payload: SignupPayload = {
        user: userData,
        business: businessData,
      };

      const result = await registerUser(payload);

      if (result.success) {
        setGeneratedNumber(result.data?.iqr_number || "+1 (800) 000-0000");
        setShowSuccess(true);
        
        // Redirect to dashboard after 5 seconds
        setTimeout(() => {
          router.push("/iqr/dashboard");
        }, 5000);
      } else {
        setError(result.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
              {step === 1 ? "Create your account to get started" : "Set up your business details"}
            </CardDescription>
            
            {/* Progress indicator */}
            <div className="pt-2">
              <Progress 
                value={step === 1 ? 50 : 100} 
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
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                {error}
              </div>
            )}
            
            {step === 1 ? (
              <Form {...userForm}>
                <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
                  <FormField
                    control={userForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-iqr-300">Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="Enter your username" 
                              className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400 pl-10" 
                              {...field} 
                            />
                            <User className="absolute left-3 top-2.5 h-5 w-5 text-iqr-200/60" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={userForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-iqr-300">Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="Enter your email" 
                              type="email" 
                              className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400 pl-10" 
                              {...field} 
                            />
                            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-iqr-200/60" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={userForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-iqr-300">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="Create a secure password" 
                              type="password" 
                              className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400 pl-10" 
                              {...field} 
                            />
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-iqr-200/60" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={userForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-iqr-300">Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us a bit about yourself" 
                            className="resize-none bg-iqr-50/10 border-iqr-200/20 text-iqr-400 min-h-[80px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={userForm.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 bg-iqr-100/20">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-iqr-200 data-[state=checked]:border-iqr-200"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-iqr-300 text-sm">
                            I agree to the{" "}
                            <a 
                              href="/terms" 
                              className="text-iqr-200 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Terms and Conditions
                            </a>{" "}
                            and{" "}
                            <a 
                              href="/privacy" 
                              className="text-iqr-200 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Privacy Policy
                            </a>
                          </FormLabel>
                          <FormMessage className="text-red-400" />
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-iqr-200 hover:bg-iqr-200/90 text-iqr-50 flex items-center justify-center gap-2"
                  >
                    Continue
                    <ArrowRight size={16} />
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...businessForm}>
                <form onSubmit={businessForm.handleSubmit(onBusinessSubmit)} className="space-y-4">
                  <FormField
                    control={businessForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-iqr-300">Legal Business Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="Enter legal business name" 
                              className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400 pl-10" 
                              {...field} 
                            />
                            <Building className="absolute left-3 top-2.5 h-5 w-5 text-iqr-200/60" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={businessForm.control}
                    name="ein"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-iqr-300">EIN/Tax ID</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="XX-XXXXXXX" 
                              className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400 pl-10" 
                              {...field} 
                            />
                            <Shield className="absolute left-3 top-2.5 h-5 w-5 text-iqr-200/60" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={businessForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-iqr-300">Business Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter business address" 
                            className="resize-none bg-iqr-50/10 border-iqr-200/20 text-iqr-400 min-h-[60px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={businessForm.control}
                      name="website_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-iqr-300">Website URL</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="https://your-site.com" 
                                className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400 pl-10" 
                                {...field} 
                              />
                              <Globe className="absolute left-3 top-2.5 h-5 w-5 text-iqr-200/60" />
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={businessForm.control}
                      name="support_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-iqr-300">Support Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="support@your-business.com" 
                                className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400 pl-10" 
                                {...field} 
                              />
                              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-iqr-200/60" />
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={businessForm.control}
                    name="support_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-iqr-300">Support Phone</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="(XXX) XXX-XXXX" 
                              className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400 pl-10" 
                              {...field} 
                            />
                            <Phone className="absolute left-3 top-2.5 h-5 w-5 text-iqr-200/60" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={businessForm.control}
                      name="privacy_policy_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-iqr-300">Privacy Policy URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://site.com/privacy" 
                              className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={businessForm.control}
                      name="terms_of_service_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-iqr-300">Terms of Service URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://site.com/terms" 
                              className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="sm:flex-1 border-iqr-200/30 text-iqr-300 hover:bg-iqr-100/20 hover:text-iqr-400"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="sm:flex-1 bg-iqr-200 hover:bg-iqr-200/90 text-iqr-50 flex items-center justify-center gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Complete Registration
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center border-t border-iqr-200/10 pt-4">
            <p className="text-sm text-iqr-300">
              Already have an account?{" "}
              <Button variant="link" asChild className="text-iqr-200 p-0">
                <a href="/iqr/login">Sign in</a>
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
              Go to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 