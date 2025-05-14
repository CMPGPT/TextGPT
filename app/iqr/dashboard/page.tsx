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
import { useRouter } from 'next/navigation';

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
  const supabase = createClientComponentClient();
  const [businessInfoOpen, setBusinessInfoOpen] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    // Check for authentication
    const businessId = localStorage.getItem('iqr_business_id');
    const userName = localStorage.getItem('iqr_username');
    
    if (!businessId) {
      router.push('/auth/login');
      return;
    }
    
    if (userName) {
      setUserName(userName);
    }

    // Fetch business data
    const fetchBusinessData = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .single();
        
        if (error) throw error;
        if (data) {
          setBusinessInfo(data);
        }
      } catch (err) {
        console.error('Error fetching business data:', err);
        setError('Failed to load business data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [router, supabase]);

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
    return <div className="p-6 bg-[#14213D] min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error || !businessInfo) {
    return (
      <div className="p-6 bg-[#14213D] min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error || 'No business information found'}</p>
          <button 
            onClick={() => router.push('/auth/login')}
            className="mt-4 px-4 py-2 bg-iqr-200 rounded-md"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
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
        
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="create">Create Product</TabsTrigger>
            <TabsTrigger value="products">Products & QR Codes</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="messages">Message Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="mt-0">
            <div className="p-4 bg-card rounded-lg">
              <QRCreationForm businessId={businessInfo.id} />
            </div>
          </TabsContent>
          
          <TabsContent value="products" className="mt-0">
            <div className="p-4 bg-card rounded-lg">
              <ProductList businessId={businessInfo.id} />
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-0">
            <div className="p-4 bg-card rounded-lg">
              <Analytics businessId={businessInfo.id} />
            </div>
          </TabsContent>
          
          <TabsContent value="messages" className="mt-0">
            <div className="p-4 bg-card rounded-lg">
              <MessageLogs businessId={businessInfo.id} />
            </div>
          </TabsContent>
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



