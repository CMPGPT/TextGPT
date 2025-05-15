'use client'

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { StatusCard } from '@/components/iqr/dashboard/statuscard';
import { Header } from '../layout/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BusinessInfoModal } from '@/components/iqr/dashboard/businessinfomodal';
import { QRCreationForm } from '@/components/iqr/dashboard/qrcreationform';
import { ProductList } from '@/components/iqr/dashboard/productlist';
import { Analytics } from '@/components/iqr/dashboard/analyticsoverview';
import { MessageLogs } from '@/components/iqr/dashboard/massagelogs';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardCacheProvider } from '@/hooks/useDashboardCache';

type BusinessInfo = {
  id: string;
  name: string;
  ein: string;
  address: string;
  website_url: string;
  support_email: string;
  support_phone: string;
  privacy_policy_url: string;
  terms_of_service_url: string;
  iqr_number: string;
};

export default function IQRDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const [businessInfoOpen, setBusinessInfoOpen] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('create');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [initialLoad, setInitialLoad] = useState(true);

  const handleTabChange = (value: string) => {
    // Don't show loading state when changing tabs
    setActiveTab(value);
    
    // Update URL without causing a navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url);
  };

  useEffect(() => {
    // Get tab from URL params
    const tabParam = searchParams.get('tab');
    if (tabParam && ['create', 'products', 'analytics', 'messages'].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    // Get search filter from URL params
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchFilter(searchParam);
    }

    // Check for authentication using Supabase Auth
    const fetchUserAndBusinessData = async () => {
      try {
        setLoading(true);
        
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // No valid session, redirect to login
          router.push('/iqr/login');
          return;
        }
        
        // Fetch user information using RPC function for complete profile
        const { data: profile, error: profileError } = await supabase
          .rpc('get_user_complete_profile', { user_auth_id: session.user.id });

        if (profileError) {
          throw profileError;
        }
        
        if (profile && profile.user) {
          setUserName(profile.user.username || profile.user.full_name || session.user.email);
        }
        
        // Use the user's business association to fetch business data
        if (profile && profile.business) {
          setBusinessInfo(profile.business);
        } else {
          // Fallback: Try to get business directly if RPC failed
          const { data: iqrUser, error: iqrUserError } = await supabase
            .from('iqr_users')
            .select('business_id, username, full_name')
            .eq('auth_uid', session.user.id)
            .single();
            
          if (iqrUserError) throw iqrUserError;
          if (iqrUser) {
            // Set username from IQR users table
            setUserName(iqrUser.username || iqrUser.full_name || session.user.email);
            
            // Fetch business data
            const { data: business, error: businessError } = await supabase
              .from('businesses')
              .select('*')
              .eq('id', iqrUser.business_id)
              .single();
              
            if (businessError) throw businessError;
            setBusinessInfo(business);
          }
        }
      } catch (err) {
        console.error('Error fetching user/business data:', err);
        setError('Failed to load business data. Please try again later.');
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    fetchUserAndBusinessData();
  }, [router, supabase, searchParams]);

  const handleSaveBusinessInfo = async (data: BusinessInfo) => {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          name: data.name,
          ein: data.ein,
          address: data.address,
          website_url: data.website_url,
          support_email: data.support_email,
          support_phone: data.support_phone,
          privacy_policy_url: data.privacy_policy_url,
          terms_of_service_url: data.terms_of_service_url
        })
        .eq('id', data.id);
      
      if (error) throw error;
      
      // Update local state
      setBusinessInfo(data);
      console.log('Business info updated successfully');
    } catch (err) {
      console.error('Error updating business info:', err);
    }
  };

  if (loading) {
    // Instead of showing a spinner, render the UI structure with minimal placeholder content
    return (
      <div className="p-6 bg-[#14213D] min-h-screen">
        <Header />
        <div className="mt-6 space-y-8">
          {/* Placeholder for status card */}
          <div className="p-6 bg-card rounded-lg h-32"></div>
          
          {/* Placeholder for tabs */}
          <div className="p-4 bg-card rounded-lg">
            <div className="h-10 bg-secondary rounded-lg w-1/3 mb-4"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !businessInfo) {
    return (
      <div className="p-6 bg-[#14213D] min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error || 'No business information found'}</p>
          <button 
            onClick={() => router.push('/iqr/login')}
            className="mt-4 px-4 py-2 bg-iqr-200 rounded-md"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardCacheProvider>
      <div className="p-6 bg-[#14213D] min-h-screen">
        <Header />
        <div className="mt-6 space-y-8">
          <StatusCard 
            onInfoClick={() => setBusinessInfoOpen(true)}
            tollFreeNumber={businessInfo.iqr_number}
            numberStatus="verified"
            userName={userName}
            description={`IQR Dashboard for ${businessInfo.name}'s product information and customer support.`}
            businessName={businessInfo.name}
          />
          
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="bg-secondary">
              <TabsTrigger value="create" className="md:flex-1 text-xs sm:text-sm relative after:hidden sm:after:hidden">Create Product</TabsTrigger>
              <TabsTrigger value="products" className="md:flex-1 text-xs sm:text-sm relative after:content-[''] after:absolute after:left-0 after:top-1/4 after:h-1/2 after:w-px after:bg-gray-400/30 sm:after:hidden">Products & QR Codes</TabsTrigger>
              <TabsTrigger value="analytics" className="md:flex-1 text-xs sm:text-sm relative after:content-[''] after:absolute after:left-0 after:top-1/4 after:h-1/2 after:w-px after:bg-gray-400/30 sm:after:hidden">Analytics</TabsTrigger>
              <TabsTrigger value="messages" className="md:flex-1 text-xs sm:text-sm relative after:content-[''] after:absolute after:left-0 after:top-1/4 after:h-1/2 after:w-px after:bg-gray-400/30 sm:after:hidden">Message Logs</TabsTrigger>
            </TabsList>
            
            {/* Use TabsContent with forceMount to preserve component state between tab switches */}
            <div className="mt-0">
              <TabsContent value="create" forceMount className="p-4 bg-card rounded-lg mt-0" 
                           style={{display: activeTab === 'create' ? 'block' : 'none'}}>
                <QRCreationForm businessId={businessInfo.id} />
              </TabsContent>
              
              <TabsContent value="products" forceMount className="p-4 bg-card rounded-lg mt-0"
                           style={{display: activeTab === 'products' ? 'block' : 'none'}}>
                <ProductList businessId={businessInfo.id} />
              </TabsContent>
              
              <TabsContent value="analytics" forceMount className="p-4 bg-card rounded-lg mt-0"
                           style={{display: activeTab === 'analytics' ? 'block' : 'none'}}>
                <Analytics businessId={businessInfo.id} />
              </TabsContent>
              
              <TabsContent value="messages" forceMount className="p-4 bg-card rounded-lg mt-0"
                           style={{display: activeTab === 'messages' ? 'block' : 'none'}}>
                <MessageLogs businessId={businessInfo.id} initialSearchQuery={searchFilter} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        <BusinessInfoModal 
          open={businessInfoOpen}
          onOpenChange={setBusinessInfoOpen}
          businessInfo={businessInfo}
          onSave={handleSaveBusinessInfo}
        />
      </div>
    </DashboardCacheProvider>
  );
}



