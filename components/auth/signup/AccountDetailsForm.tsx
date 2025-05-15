"use client";

import React, { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRegistrationData } from "@/types/auth";
import { ArrowRight, Lock, Mail, User, AlertCircle } from "lucide-react";
import { useFormCache } from "@/hooks/useFormCache";
import { createClient } from '@/lib/supabase/client';

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
import { Alert, AlertDescription } from "@/components/ui/alert";

// Form validation schema
const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(2, "Full name is required"),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface AccountDetailsFormProps {
  onSubmit: (data: UserRegistrationData) => void;
}

export const AccountDetailsForm = ({ onSubmit }: AccountDetailsFormProps) => {
  const [formError, setFormError] = useState<string | null>(null);
  
  // Initialize with default empty values
  const defaultValues = {
    username: "",
    email: "",
    password: "",
    full_name: "",
  };
  
  // Use our form cache hook
  const [cachedValues, updateCache] = useFormCache<UserFormValues>("accountDetails", defaultValues);
  
  // Form hook
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: cachedValues || defaultValues,
  });
  
  // Watch for field changes and update cache
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value) {
        updateCache(value as UserFormValues);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, updateCache]);

  // Handle form submission
  const handleSubmit = (data: UserFormValues) => {
    // Extract user registration data
    const userRegData: UserRegistrationData = {
      username: data.username,
      email: data.email,
      password: data.password,
      full_name: data.full_name,
    };
    
    // Proceed to next step
    onSubmit(userRegData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {formError && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        
        <FormField
          control={form.control}
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
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-iqr-300">Full Name</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    placeholder="Enter your full name" 
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
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-iqr-300">Password</FormLabel>
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
          className="w-full mt-2 bg-iqr-200 hover:bg-iqr-200/90 text-iqr-50 flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </Form>
  );
}; 