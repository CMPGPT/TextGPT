'use client'

import { useState } from 'react';
import { StatusCard } from '@/components/iqr/dashboard/statuscard';
import { Header } from '../layout/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BusinessInfoModal } from '@/components/iqr/dashboard/businessinfomodal';
import { QRCreationForm } from '@/components/iqr/dashboard/qrcreationform';
import { ProductList } from '@/components/iqr/dashboard/productlist';
import { Analytics } from '@/components/iqr/dashboard/analyticsoverview';
import { MessageLogs } from '@/components/iqr/dashboard/massagelogs';

export default function IQRDashboard() {
  const [businessInfoOpen, setBusinessInfoOpen] = useState(false);
  
  const [businessInfo, setBusinessInfo] = useState({
    legalName: 'Acme Corporation',
    ein: '12-3456789',
    address: '123 Main Street, Suite 405, Anytown, CA 12345',
    website: 'https://www.acmecorp.com',
    supportEmail: 'support@acmecorp.com',
    supportPhone: '(555) 123-4567',
    privacyPolicyUrl: 'https://www.acmecorp.com/privacy',
    termsOfServiceUrl: 'https://www.acmecorp.com/terms',
  });

  return (
    <div className="p-6 bg-[#14213D]">
      <Header />
      <div className="mt-6 space-y-8">
        <StatusCard onInfoClick={() => setBusinessInfoOpen(true)} />
        
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="create">Create QR</TabsTrigger>
            <TabsTrigger value="products">Products & QR Codes</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="messages">Message Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="mt-0">
            <div className="p-4 bg-card rounded-lg"><QRCreationForm /></div>
          </TabsContent>
          
          <TabsContent value="products" className="mt-0">
            <div className="p-4 bg-card rounded-lg"><ProductList /></div>
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-0">
            <div className="p-4 bg-card rounded-lg"><Analytics /></div>
          </TabsContent>
          
          <TabsContent value="messages" className="mt-0">
            <div className="p-4 bg-card rounded-lg"><MessageLogs /></div>
          </TabsContent>
        </Tabs>
      </div>
      
      <BusinessInfoModal 
        open={businessInfoOpen}
        onOpenChange={setBusinessInfoOpen}
        businessInfo={businessInfo}
        onSave={(data) => {
          setBusinessInfo(data);
          console.log('Saving business info:', data);
        }}
      />
    </div>
  );
}



