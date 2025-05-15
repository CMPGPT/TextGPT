"use client";

import React, { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BusinessDetailsData } from "@/types/auth";
import { ArrowRight, Briefcase, MessageSquare, Users, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form validation schema
const businessDetailsSchema = z.object({
  product_type: z.string().optional(),
  business_size: z.string().optional(),
  toll_free_use_case: z.string().optional(),
  message_volume: z.string().optional(),
  custom_message_volume: z.string().optional(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  }),
});

type BusinessDetailsFormValues = z.infer<typeof businessDetailsSchema>;

interface AdditionalDetailsFormProps {
  onSubmit: (data: BusinessDetailsData) => void;
  onBack: () => void;
  isLoading: boolean;
}

export const AdditionalDetailsForm = ({ onSubmit, onBack, isLoading }: AdditionalDetailsFormProps) => {
  // Default values
  const defaultValues = {
    product_type: "",
    business_size: "",
    toll_free_use_case: "",
    message_volume: "",
    custom_message_volume: "",
    termsAccepted: false,
  };
  
  // Use form cache
  const [cachedValues, updateCache] = useFormCache<BusinessDetailsFormValues>("businessDetails", defaultValues);
  
  // Form hook
  const form = useForm<BusinessDetailsFormValues>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: cachedValues || defaultValues,
  });
  
  // Watch for field changes and update cache
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value) {
        updateCache(value as BusinessDetailsFormValues);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, updateCache]);

  // Handle form submission
  const handleSubmit = (data: BusinessDetailsFormValues) => {
    // Create business details data
    const businessDetails: BusinessDetailsData = {
      product_type: data.product_type,
      business_size: data.business_size,
      toll_free_use_case: data.toll_free_use_case,
      message_volume: data.message_volume,
      // We still need to pass custom_message_volume for the auth action to use
      custom_message_volume: data.message_volume === 'custom' ? data.custom_message_volume : undefined
    };
    
    onSubmit(businessDetails);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="product_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-iqr-300">What type of products/services does your business offer?</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    placeholder="E.g., Software, Consulting, Retail, etc."
                    className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400 pl-10" 
                    {...field} 
                  />
                  <Briefcase className="absolute left-3 top-2.5 h-5 w-5 text-iqr-200/60" />
                </div>
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="business_size"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-iqr-300">What is the size of your business?</FormLabel>
              <FormControl>
                <div className="relative">
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400 pl-10">
                      <SelectValue placeholder="Select business size" />
                    </SelectTrigger>
                    <SelectContent className="bg-iqr-50 border-iqr-200/20 text-iqr-400">
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="501+">501+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                  <Users className="absolute left-3 top-2.5 h-5 w-5 text-iqr-200/60 z-10" />
                </div>
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="toll_free_use_case"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-iqr-300">What is the use case for your toll-free number?</FormLabel>
              <FormControl>
                <div className="relative">
                  <Textarea 
                    className="resize-none bg-iqr-50/10 border-iqr-200/20 text-iqr-400 min-h-[80px]" 
                    {...field}
                    placeholder="Customer support, marketing campaigns, etc."
                  />
                </div>
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="message_volume"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-iqr-300">How many messages will your business need?</FormLabel>
              <FormControl>
                <div className="relative">
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400 pl-10">
                      <SelectValue placeholder="Select message volume" />
                    </SelectTrigger>
                    <SelectContent className="bg-iqr-50 border-iqr-200/20 text-iqr-400">
                      <SelectItem value="100">Up to 100/month</SelectItem>
                      <SelectItem value="1000">Up to 1,000/month</SelectItem>
                      <SelectItem value="5000">Up to 5,000/month</SelectItem>
                      <SelectItem value="10000">Up to 10,000/month</SelectItem>
                      <SelectItem value="custom">More (custom volume)</SelectItem>
                    </SelectContent>
                  </Select>
                  <MessageSquare className="absolute left-3 top-2.5 h-5 w-5 text-iqr-200/60 z-10" />
                </div>
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        
        {form.watch("message_volume") === "custom" && (
          <FormField
            control={form.control}
            name="custom_message_volume"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-iqr-300">Specify custom message volume</FormLabel>
                <Input 
                  className="bg-iqr-50/10 border-iqr-200/20 text-iqr-400" 
                  placeholder="Enter your estimated message volume"
                  {...field}
                />
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
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
                  <Link 
                    href="/terms" 
                    className="text-iqr-200 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link 
                    href="/privacy" 
                    className="text-iqr-200 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </Link>
                </FormLabel>
                <FormMessage className="text-red-400" />
              </div>
            </FormItem>
          )}
        />
        
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
  );
}; 