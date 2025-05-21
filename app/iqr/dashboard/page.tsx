'use client'

import { useState, useEffect, Suspense, useRef } from 'react';
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
import { RefreshCw, Edit, Phone, Globe, Mail, Plus, Package, BarChart4, MessageSquare, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

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

// Define interfaces for tab-specific data we want to cache
interface TabCacheData {
  create: {
    lastUpdated: number;
    data?: any;
  };
  products: {
    lastUpdated: number;
    data?: any[];
  };
  analytics: {
    lastUpdated: number;
    data?: any;
  };
  messages: {
    lastUpdated: number;
    data?: any[];
    searchQuery?: string;
  };
}

function IQRDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const { toast } = useToast();
  const [businessInfoOpen, setBusinessInfoOpen] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true); // Loading state for user/business info
  const [tabContentLoading, setTabContentLoading] = useState(false); // Loading state for tab content
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('create');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0); // Used to force refresh components
  const [initialLoad, setInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // Track if refresh is in progress
  const [lastRefreshTime, setLastRefreshTime] = useState(0); // Track last refresh time
  
  // Use useRef to maintain tab cache throughout component lifecycle
  const tabCache = useRef<TabCacheData>({
    create: { lastUpdated: 0, data: undefined },
    products: { lastUpdated: 0, data: [] },
    analytics: { lastUpdated: 0, data: undefined },
    messages: { lastUpdated: 0, data: [], searchQuery: '' }
  });
  
  // Track which tabs have been visited
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['create']));
  
  const MIN_REFRESH_INTERVAL = 30000; // 30 seconds minimum between manual refreshes
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache time-to-live

  const isCacheValid = (tab: string): boolean => {
    const now = Date.now();
    const lastUpdated = tabCache.current[tab as keyof TabCacheData]?.lastUpdated || 0;
    return (now - lastUpdated) < CACHE_TTL;
  };

  const handleTabChange = (value: string) => {
    // If we're already on this tab, do nothing
    if (activeTab === value) return;
    
    // Update visited tabs set
    if (!visitedTabs.has(value)) {
      const newVisitedTabs = new Set(visitedTabs);
      newVisitedTabs.add(value);
      setVisitedTabs(newVisitedTabs);
    }
    
    // Show loading only if we haven't cached this tab or cache is invalid
    if (!isCacheValid(value)) {
      setTabContentLoading(true);
      
      // Update the cache timestamp for this tab
      tabCache.current[value as keyof TabCacheData].lastUpdated = Date.now();
      
      // Hide tab content loading after a short delay
      setTimeout(() => {
        setTabContentLoading(false);
      }, 500);
    }
    
    setActiveTab(value);
    
    // Update URL without causing a navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url);
  };

  const handleRefresh = () => {
    // Prevent rapid repeated refreshes
    const now = Date.now();
    if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
      console.log('Refresh throttled - too soon since last refresh');
      return;
    }

    // Check if already refreshing
    if (isRefreshing) {
      console.log('Refresh already in progress');
      return;
    }

    // Check if navigator.onLine is available and if we're offline
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      // If we're offline, show a toast
      toast({
        title: "You're offline",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Set refreshing state
    setIsRefreshing(true);
    setLastRefreshTime(now);
    setTabContentLoading(true); // Only set tab content to loading
    
    // Update cache timestamp for current active tab
    if (activeTab) {
      tabCache.current[activeTab as keyof TabCacheData].lastUpdated = now;
    }
    
    // Increment the refresh key to force components to reload
    setRefreshKey(prev => prev + 1);
    
    // Reset refreshing state after a timeout
    setTimeout(() => {
      setIsRefreshing(false);
      setTabContentLoading(false);
    }, 5000); // Reset after 5 seconds regardless of response
  };

  useEffect(() => {
    // Get tab from URL params
    const tabParam = searchParams.get('tab');
    if (tabParam && ['create', 'products', 'analytics', 'messages'].includes(tabParam)) {
      setActiveTab(tabParam);
      
      // Mark this tab as visited
      if (!visitedTabs.has(tabParam)) {
        const newVisitedTabs = new Set(visitedTabs);
        newVisitedTabs.add(tabParam);
        setVisitedTabs(newVisitedTabs);
      }
    }

    // Get search filter from URL params
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchFilter(searchParam);
      
      // If search param exists and we're on messages tab, update the cache
      if (activeTab === 'messages') {
        tabCache.current.messages.searchQuery = searchParam;
      }
    }

    // Only fetch user and business data on initial load
    if (initialLoad) {
      // Check for authentication using Supabase Auth
      const fetchUserAndBusinessData = async () => {
        try {
          setUserLoading(true);
          
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
            console.error('Error fetching user profile:', profileError);
            
            // Fallback method - try to get business info directly
            const { data: iqrUser, error: iqrUserError } = await supabase
              .from('iqr_users')
              .select('business_id, username, full_name')
              .eq('auth_uid', session.user.id)
              .single();

            if (iqrUserError) {
              throw new Error('Failed to load user data. Please try again later.');
            }
            
            if (iqrUser) {
              // Set username from IQR users table
              setUserName(iqrUser.username || iqrUser.full_name || session.user.email || 'User');
              
              // Fetch business data
              const { data: business, error: businessError } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', iqrUser.business_id)
                .single();
                
              if (businessError) {
                throw new Error('Failed to load business data. Please try again later.');
              }
              
              setBusinessInfo(business);
            } else {
              throw new Error('No user profile found. Please contact support.');
            }
          } else if (profile) {
            if (profile.user) {
              setUserName(profile.user.username || profile.user.full_name || session.user.email || 'User');
            }
            
            if (profile.business) {
              setBusinessInfo(profile.business);
            } else {
              throw new Error('No business profile found. Please contact support.');
            }
          }
        } catch (err) {
          console.error('Error fetching user/business data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load data. Please try again later.');
        } finally {
          setUserLoading(false);
          setInitialLoad(false);
          
          // Initialize cache timestamp for initial tab
          if (activeTab) {
            tabCache.current[activeTab as keyof TabCacheData].lastUpdated = Date.now();
          }
        }
      };

      fetchUserAndBusinessData();
    } else if (refreshKey > 0) {
      // On manual refresh, update tab cache timestamps
      const now = Date.now();
      
      // Update cache timestamp for active tab
      if (activeTab) {
        tabCache.current[activeTab as keyof TabCacheData].lastUpdated = now;
      }
      
      // Show loading state for tab content
      setTabContentLoading(true);
      setTimeout(() => {
        setTabContentLoading(false);
      }, 1000);
    }
  }, [router, supabase, searchParams, refreshKey, initialLoad, activeTab, visitedTabs]);

  // Cache update handler for child components
  const updateCache = (tab: keyof TabCacheData, data: any) => {
    if (tabCache.current[tab]) {
      tabCache.current[tab] = {
        ...tabCache.current[tab],
        data,
        lastUpdated: Date.now()
      };
    }
  };

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

  // User section loading state
  if (userLoading) {
    return (
      <div className="p-6 bg-[#14213D] min-h-screen">
        <Header />
        <div className="mt-6 space-y-8">
          {/* Skeleton for status card */}
          <div className="flex justify-center">
            <div className="p-6 bg-card rounded-lg animate-pulse w-full max-w-3xl">
              <div className="h-6 w-2/3 bg-muted rounded mb-4"></div>
              <div className="h-4 w-1/2 bg-muted rounded mb-2"></div>
              <div className="h-4 w-1/4 bg-muted rounded"></div>
            </div>
          </div>
          
          {/* Skeleton for tabs */}
          <div className="space-y-4">
            <div className="h-10 bg-secondary rounded-lg flex space-x-2 p-1">
              <div className="h-8 bg-muted rounded flex-1"></div>
              <div className="h-8 bg-muted rounded flex-1"></div>
              <div className="h-8 bg-muted rounded flex-1"></div>
              <div className="h-8 bg-muted rounded flex-1"></div>
            </div>
            <div className="p-4 bg-card rounded-lg">
              <div className="grid gap-4 h-64">
                <div className="h-8 bg-muted rounded w-1/3"></div>
                <div className="h-12 bg-muted rounded w-full"></div>
                <div className="h-12 bg-muted rounded w-full"></div>
                <div className="h-12 bg-muted rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !businessInfo) {
    return (
      <div className="p-6 bg-[#14213D] min-h-screen flex items-center justify-center">
        <div className="text-white text-center max-w-md p-6 bg-card rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Error</h2>
          <p className="mb-4">{error || 'No business information found. Please try again later.'}</p>
          <div className="flex space-x-4 justify-center">
            <Button 
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </>
              )}
            </Button>
            <Button 
              onClick={() => router.push('/iqr/login')}
              className="bg-iqr-200"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Determine if we need to refresh the component based on cache
  const shouldRefreshComponent = (tabName: string): boolean => {
    // For first visit or manual refresh, always render
    if (!visitedTabs.has(tabName) || refreshKey > 0) return true;
    
    // Otherwise, only render if cache is invalid
    return !isCacheValid(tabName);
  };

  // Component key generation that respects caching
  const getComponentKey = (tabName: string): string => {
    // If we should refresh, include refreshKey
    if (shouldRefreshComponent(tabName)) {
      return `${tabName}-${refreshKey}`;
    }
    // Otherwise return stable key
    return `${tabName}-cached`;
  };

  // Main content with separate tab content loading
  return (
    <div className="p-6 bg-[#14213D] min-h-screen">
      <Header />
      <div className="mt-6 space-y-8">
        {/* User section (never refreshed after initial load) */}
        <div className="flex justify-center">
          <StatusCard 
            onInfoClick={() => setBusinessInfoOpen(true)}
            tollFreeNumber={businessInfo.iqr_number || 'Not assigned'}
            numberStatus="verified"
            userName={userName}
            description={`IQR Dashboard for ${businessInfo.name}'s product information and customer support.`}
            businessName={businessInfo.name}
          />
        </div>
        
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="create" className="md:flex-1 text-xs sm:text-sm relative after:hidden sm:after:hidden">Create Product</TabsTrigger>
            <TabsTrigger value="products" className="md:flex-1 text-xs sm:text-sm relative after:content-[''] after:absolute after:left-0 after:top-1/4 after:h-1/2 after:w-px after:bg-gray-400/30 sm:after:hidden">Products & QR Codes</TabsTrigger>
            <TabsTrigger value="analytics" className="md:flex-1 text-xs sm:text-sm relative after:content-[''] after:absolute after:left-0 after:top-1/4 after:h-1/2 after:w-px after:bg-gray-400/30 sm:after:hidden">Analytics</TabsTrigger>
            <TabsTrigger value="messages" className="md:flex-1 text-xs sm:text-sm relative after:content-[''] after:absolute after:left-0 after:top-1/4 after:h-1/2 after:w-px after:bg-gray-400/30 sm:after:hidden">Message Logs</TabsTrigger>
          </TabsList>
          
          {/* Tab content with conditional skeleton loading */}
          <div className="mt-0">
            {tabContentLoading ? (
              // Skeleton for tab content only
              <div className="p-4 bg-card rounded-lg mt-0">
                <div className="grid gap-4 animate-pulse">
                  <div className="h-8 bg-muted rounded w-1/3"></div>
                  <div className="h-12 bg-muted rounded w-full"></div>
                  <div className="h-12 bg-muted rounded w-full"></div>
                  <div className="h-12 bg-muted rounded w-full"></div>
                  <div className="h-12 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            ) : (
              // Actual tab content
              <>
                <TabsContent value="create" forceMount className="p-4 bg-card rounded-lg mt-0" 
                            style={{display: activeTab === 'create' ? 'block' : 'none'}}>
                  <QRCreationForm 
                    businessId={businessInfo.id} 
                    key={getComponentKey('create')}
                    onDataUpdate={(data) => updateCache('create', data)} 
                    cachedData={tabCache.current.create.data}
                  />
                </TabsContent>
                
                <TabsContent value="products" forceMount className="p-4 bg-card rounded-lg mt-0"
                            style={{display: activeTab === 'products' ? 'block' : 'none'}}>
                  <ProductList 
                    businessId={businessInfo.id} 
                    key={getComponentKey('products')}
                    onDataUpdate={(data) => updateCache('products', data)}
                    cachedData={tabCache.current.products.data}
                  />
                </TabsContent>
                
                <TabsContent value="analytics" forceMount className="p-4 bg-card rounded-lg mt-0"
                            style={{display: activeTab === 'analytics' ? 'block' : 'none'}}>
                  <Analytics 
                    businessId={businessInfo.id} 
                    key={getComponentKey('analytics')}
                    onDataUpdate={(data) => updateCache('analytics', data)}
                    cachedData={tabCache.current.analytics.data}
                  />
                </TabsContent>
                
                <TabsContent value="messages" forceMount className="p-4 bg-card rounded-lg mt-0"
                            style={{display: activeTab === 'messages' ? 'block' : 'none'}}>
                  <MessageLogs 
                    businessId={businessInfo.id} 
                    initialSearchQuery={tabCache.current.messages.searchQuery || searchFilter}
                    key={getComponentKey('messages')}
                    onDataUpdate={(data) => updateCache('messages', data)}
                    cachedData={tabCache.current.messages.data}
                  />
                </TabsContent>
              </>
            )}
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
  );
}

export default function IQRDashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-iqr-50 text-iqr-400">
        <div className="text-center">
          <div className="animate-spin mb-4 mx-auto h-8 w-8 text-iqr-200">
            <RefreshCw />
          </div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    }>
      <IQRDashboardContent />
    </Suspense>
  );
}



