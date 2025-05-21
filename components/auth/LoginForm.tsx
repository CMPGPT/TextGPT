"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QrCode, Lock, Mail, ArrowRight } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

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
const loginFormSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const LoginForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof loginFormSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use client-side auth for simplicity and better cookie handling
      const { data: authData, error: clientError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (clientError) {
        console.error("Auth error:", clientError);
        setError(clientError.message || "Login failed. Please check your credentials.");
        setIsLoading(false);
        return;
      }

      if (authData && authData.session) {
        console.log("Login successful");
        
        // Check URL parameters for redirect
        const urlParams = new URLSearchParams(window.location.search);
        const redirectPath = urlParams.get('redirect');
        
        // Redirect to the specified path or dashboard
        const redirectUrl = redirectPath || "/iqr/dashboard";
        console.log("Redirecting to:", redirectUrl);
        
        // Force a complete navigation to ensure cookies are properly set
        window.location.href = redirectUrl;
      } else {
        setError("Login succeeded but no session was created. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
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
            Sign in to your IQR account
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
              {error}
            </div>
          )}
          
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
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-iqr-300">Password</FormLabel>
                      <Button 
                        variant="link" 
                        className="text-xs text-iqr-200 p-0 h-auto font-normal"
                        onClick={(e) => {
                          e.preventDefault();
                          router.push("/iqr/forgot-password");
                        }}
                      >
                        Forgot password?
                      </Button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="Enter your password" 
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
              
              <Button 
                type="submit" 
                className="w-full bg-iqr-200 hover:bg-iqr-200/90 text-iqr-50 flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </form>
          </Form>
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
}; 