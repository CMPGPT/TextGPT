"use client";

import React, { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BusinessRegistrationData } from "@/types/auth";
import { ArrowRight, Building, Globe, Mail, Phone, Shield } from "lucide-react";
import { useFormCache } from "@/hooks/useFormCache";

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
import { Textarea } from "@/components/ui/textarea";

// Helper function to ensure URLs have protocol
const ensureProtocol = (url: string): string => {
  if (!url) return url;
  return url.match(/^https?:\/\//) ? url : `https://${url}`;
};

// Custom URL validator
const urlValidator = (value: string) => {
  if (!value) return true; // Allow empty strings
  
  // Add protocol if missing
  const urlWithProtocol = ensureProtocol(value);
  
  try {
    // Check if it's a valid URL with the protocol
    new URL(urlWithProtocol);
    return true;
  } catch (_error) {
    return false;
  }
};

// Form validation schema
const businessFormSchema = z.object({
  name: z.string().min(2, "Business name is required"),
  ein: z.string().min(9, "EIN/Tax ID is required"),
  address: z.string().min(5, "Business address is required"),
  website_url: z.string()
    .refine(urlValidator, "Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  support_email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  support_phone: z.string().optional(),
  privacy_policy_url: z.string()
    .refine(urlValidator, "Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  terms_of_service_url: z.string()
    .refine(urlValidator, "Please enter a valid URL")
    .optional()
    .or(z.literal("")),
});

type BusinessFormValues = z.infer<typeof businessFormSchema>;

interface BusinessInformationFormProps {
  onSubmit: (data: BusinessRegistrationData) => void;
  onBack: () => void;
}

export const BusinessInformationForm = ({ onSubmit, onBack }: BusinessInformationFormProps) => {
  // Default values
  const defaultValues = {
    name: "",
    ein: "",
    address: "",
    website_url: "",
    support_email: "",
    support_phone: "",
    privacy_policy_url: "",
    terms_of_service_url: "",
  };
  
  // Use form cache
  const [cachedValues, updateCache] = useFormCache<BusinessFormValues>("businessInfo", defaultValues);
  
  // Form hook
  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: cachedValues || defaultValues,
  });
  
  // Watch for field changes and update cache
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value) {
        updateCache(value as BusinessFormValues);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, updateCache]);

  // Handle form submission
  const handleSubmit = (data: BusinessFormValues) => {
    // Process URLs to ensure they have a protocol
    const processedData = {
      ...data,
      website_url: data.website_url ? ensureProtocol(data.website_url) : "",
      privacy_policy_url: data.privacy_policy_url ? ensureProtocol(data.privacy_policy_url) : "",
      terms_of_service_url: data.terms_of_service_url ? ensureProtocol(data.terms_of_service_url) : "",
    };
    
    onSubmit(processedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-iqr-300">Legal Business Name</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    placeholder="Enter your legal business name"
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
          control={form.control}
          name="ein"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-iqr-300">EIN/Tax ID</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    placeholder="Enter your business tax ID"
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
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-iqr-300">Business Address</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter your complete business address"
                  className="resize-none bg-iqr-50/10 border-iqr-200/20 text-iqr-400 min-h-[60px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="website_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-iqr-300">Website URL</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    placeholder="yourbusiness.com"
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
          control={form.control}
          name="support_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-iqr-300">Support Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    placeholder="support@yourbusiness.com"
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
          name="support_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-iqr-300">Support Phone</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    placeholder="+1 (123) 456-7890"
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
            control={form.control}
            name="privacy_policy_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-iqr-300">Privacy Policy URL</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="yourbusiness.com/privacy"
                    className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="terms_of_service_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-iqr-300">Terms of Service URL</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="yourbusiness.com/terms"
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
            onClick={onBack}
          >
            Back
          </Button>
          <Button 
            type="submit" 
            className="sm:flex-1 bg-iqr-200 hover:bg-iqr-200/90 text-iqr-50 flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}; 