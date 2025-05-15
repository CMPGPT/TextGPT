"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Search, Store, AlertCircle, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Business {
  id: string;
  name: string;
  support_email?: string;
  website_url?: string;
  iqr_number?: string;
}

export default function IQRChatPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  
  const errorParam = searchParams?.get('error');
  const invalidBusinessId = searchParams?.get('id');
  
  useEffect(() => {
    async function fetchBusinesses() {
      setLoading(true);
      const supabase = createClient();
      
      console.log('Fetching businesses from Supabase...');
      
      // Set specific error message for business not found
      if (errorParam === 'business_not_found' && invalidBusinessId) {
        setError(`The business with ID "${invalidBusinessId}" was not found.`);
      }
      
      try {
        // Check if the supabase client was created correctly
        if (!supabase) {
          console.error('Supabase client is null or undefined');
          setError('Failed to initialize database connection');
          setLoading(false);
          return;
        }
        
        // Fetch available businesses with explicit error handling
        console.log('Executing Supabase query');
        const { data, error: fetchError } = await supabase
          .from('businesses')
          .select('id, name, support_email, website_url, iqr_number')
          .order('name', { ascending: true });
        
        console.log('Supabase response data:', data);
        console.log('Supabase response error:', fetchError);
        
        if (fetchError) {
          console.error('Error fetching businesses:', fetchError);
          console.error('Error details:', JSON.stringify(fetchError, null, 2));
          // Only set generic error if we don't already have a specific one
          if (!errorParam) {
            setError(`Error loading businesses: ${fetchError.message}`);
          }
        } else if (!data || data.length === 0) {
          console.log('No businesses found in the database');
          setBusinesses([]);
          // Don't set an error for empty data - this is a valid state
        } else {
          console.log('Setting businesses state with:', JSON.stringify(data, null, 2));
          setBusinesses(data);
        }
      } catch (err) {
        console.error('Exception in business fetch:', err);
        console.error('Error details:', err instanceof Error ? err.message : String(err));
        // Only set generic error if we don't already have a specific one
        if (!errorParam) {
          setError(`Error loading businesses: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchBusinesses();
  }, [errorParam, invalidBusinessId]);
  
  // Log businesses state after update
  useEffect(() => {
    console.log('Current businesses state:', businesses);
  }, [businesses]);
  
  // Filter businesses based on search query
  const filteredBusinesses = businesses.filter(business => 
    business.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Select a Business to Chat With</h1>
      
      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{error}</p>
            {invalidBusinessId && (
              <p className="text-sm mt-1">
                Please select an available business from the list below.
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search businesses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 w-full max-w-md"
        />
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-pulse flex space-x-2 justify-center">
            <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
            <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
            <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
          </div>
          <p className="text-gray-600 mt-2">Loading businesses...</p>
        </div>
      ) : filteredBusinesses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBusinesses.map((business) => (
            <Link 
              key={business.id} 
              href={`/iqr/chat/${business.id}`}
              className="group block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-md">
                    <Store className="h-5 w-5 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">{business.name}</h2>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
              </div>
              
              {business.website_url && (
                <p className="mt-3 text-gray-600 text-sm pl-10">
                  <span className="font-medium">Website:</span> {business.website_url}
                </p>
              )}
              
              {business.support_email && (
                <p className="mt-1 text-gray-600 text-sm pl-10">
                  <span className="font-medium">Contact:</span> {business.support_email}
                </p>
              )}
              
              <p className="mt-3 text-blue-600 text-sm font-medium pl-10">
                Start conversation
              </p>
            </Link>
          ))}
        </div>
      ) : searchQuery ? (
        <div className="text-center py-8 max-w-md mx-auto">
          <p className="text-gray-600">
            No businesses found matching "<span className="font-medium">{searchQuery}</span>".
          </p>
          <button 
            onClick={() => setSearchQuery('')}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">No businesses available for chat at this time.</p>
        </div>
      )}
    </div>
  );
} 