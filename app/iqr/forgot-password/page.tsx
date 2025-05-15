"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QrCode, ArrowRight, Mail, ArrowLeft } from "lucide-react";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Form validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof forgotPasswordSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      // Here you would call an action to trigger password reset
      // const result = await resetPassword(data.email);
      
      // For now, we'll just simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsSubmitted(true);
    } catch (err) {
      console.error("Password reset error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-iqr-100 to-black py-10 px-4">
      <Card className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-xl border-iqr-200/20 text-iqr-400 shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-2 mb-2">
            <QrCode size={30} className="text-iqr-200" />
            <CardTitle className="text-2xl font-bold">IQR.codes</CardTitle>
          </div>
          <CardDescription className="text-iqr-300">
            {isSubmitted 
              ? "Check your email for reset instructions" 
              : "Enter your email to reset your password"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
              {error}
            </div>
          )}
          
          {isSubmitted ? (
            <div className="text-center space-y-4">
              <div className="mx-auto bg-iqr-200/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-iqr-200" />
              </div>
              <p className="text-iqr-300">
                We've sent password reset instructions to your email address. Please check your inbox and follow the instructions to reset your password.
              </p>
              <Button 
                className="mt-4 w-full bg-iqr-200 hover:bg-iqr-200/90 text-iqr-50"
                onClick={() => router.push("/iqr/login")}
              >
                Return to Login
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
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
                
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="sm:flex-1 border-iqr-200/30 text-iqr-300 hover:bg-iqr-100/20 hover:text-iqr-400"
                    onClick={() => router.push("/iqr/login")}
                  >
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Login
                  </Button>
                  <Button 
                    type="submit" 
                    className="sm:flex-1 bg-iqr-200 hover:bg-iqr-200/90 text-iqr-50 flex items-center justify-center gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight size={16} />
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
            Don't have an account yet?{" "}
            <Button variant="link" asChild className="text-iqr-200 p-0">
              <a href="/iqr/signup">Sign up</a>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 