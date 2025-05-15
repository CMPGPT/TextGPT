import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

type BusinessAdditionalDetails = {
  id: string;
  business_id: string;
  product_type: string | null;
  business_size: string | null;
  toll_free_use_case: string | null;
  message_volume: string | null;
  custom_message_volume: string | null;
  created_at: string | null;
  updated_at: string | null;
};

interface BusinessInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessInfo: BusinessInfo | null;
  onSave: (data: BusinessInfo) => void;
}

export const BusinessInfoModal = ({
  open,
  onOpenChange,
  businessInfo,
  onSave
}: BusinessInfoModalProps) => {
  const [formData, setFormData] = useState<BusinessInfo | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState<BusinessAdditionalDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState<'main' | 'additional'>('main');
  const supabase = createClientComponentClient();

  // Update form data when business info changes
  useEffect(() => {
    if (businessInfo) {
      setFormData(businessInfo);
      fetchAdditionalDetails(businessInfo.id);
    }
  }, [businessInfo]);

  const fetchAdditionalDetails = async (businessId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_additional_details')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error) {
        // Handle PGRST116 (not found) differently than other errors
        if (error.code === 'PGRST116') {
          console.log('No existing details found for this business, creating new record');
        } else {
          console.error('Error fetching additional details:', error);
        }
      }

      if (data) {
        console.log('Retrieved business details:', data);
        setAdditionalDetails(data);
      } else {
        // Initialize with default values if no record exists
        setAdditionalDetails({
          id: '',
          business_id: businessId,
          product_type: null,
          business_size: null,
          toll_free_use_case: null,
          message_volume: null,
          custom_message_volume: null,
          created_at: null,
          updated_at: null
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (formData) {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleAdditionalDetailChange = (name: string, value: string) => {
    if (additionalDetails) {
      setAdditionalDetails({
        ...additionalDetails,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
      
      // Also save additional details if we're on that page
      if (page === 'additional' && additionalDetails) {
        try {
          const { id, ...detailsToSave } = additionalDetails;
          
          if (id) {
            // Update existing record
            const { error } = await supabase
              .from('business_additional_details')
              .update(detailsToSave)
              .eq('id', id);
              
            if (error) throw error;
            console.log('Updated business additional details successfully');
          } else {
            // Insert new record
            const { error } = await supabase
              .from('business_additional_details')
              .insert(detailsToSave);
              
            if (error) throw error;
            console.log('Created new business additional details successfully');
          }
        } catch (error) {
          console.error('Error saving additional details:', error);
        }
      }
      
      setPage('main');
      onOpenChange(false);
    }
  };

  const handleNextPage = () => {
    setPage('additional');
  };

  const handlePrevPage = () => {
    setPage('main');
  };

  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-0 sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col w-[95vw] sm:w-auto">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <DialogTitle>
            {page === 'main' ? 'Business Information' : 'Additional Business Details'}
          </DialogTitle>
          <DialogDescription>
            {page === 'main' 
              ? 'Update your business details for IQR service.' 
              : 'Provide additional information about your business and service usage.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-4 sm:px-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {page === 'main' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Legal Business Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleInputChange}
                      placeholder="Acme Corporation"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ein">EIN/Tax ID</Label>
                    <Input
                      id="ein"
                      name="ein"
                      value={formData.ein || ''}
                      onChange={handleInputChange}
                      placeholder="12-3456789"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleInputChange}
                    placeholder="123 Main Street, Suite 405, Anytown, CA 12345"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website</Label>
                    <Input
                      id="website_url"
                      name="website_url"
                      type="url"
                      value={formData.website_url || ''}
                      onChange={handleInputChange}
                      placeholder="https://www.example.com"
                    />
                  </div>
      
                  <div className="space-y-2">
                    <Label htmlFor="iqr_number">Toll-Free Number</Label>
                    <Input
                      id="iqr_number"
                      name="iqr_number"
                      value={formData.iqr_number || ''}
                      onChange={handleInputChange}
                      disabled
                      placeholder="+1 (888) 123-4567"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="support_email">Support Email</Label>
                    <Input
                      id="support_email"
                      name="support_email"
                      type="email"
                      value={formData.support_email || ''}
                      onChange={handleInputChange}
                      placeholder="support@example.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="support_phone">Support Phone</Label>
                    <Input
                      id="support_phone"
                      name="support_phone"
                      value={formData.support_phone || ''}
                      onChange={handleInputChange}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="privacy_policy_url">Privacy Policy URL</Label>
                  <Input
                    id="privacy_policy_url"
                    name="privacy_policy_url"
                    type="url"
                    value={formData.privacy_policy_url || ''}
                    onChange={handleInputChange}
                    placeholder="https://www.example.com/privacy"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="terms_of_service_url">Terms of Service URL</Label>
                  <Input
                    id="terms_of_service_url"
                    name="terms_of_service_url"
                    type="url"
                    value={formData.terms_of_service_url || ''}
                    onChange={handleInputChange}
                    placeholder="https://www.example.com/terms"
                  />
                </div>
              </>
            ) : (
              <>
                {isLoading ? (
                  <div className="py-4 text-center">Loading additional details...</div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="product_type">Product Type</Label>
                      <Select 
                        value={(additionalDetails?.product_type || 'none') as string}
                        onValueChange={(value) => handleAdditionalDetailChange('product_type', value === 'none' ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Not set yet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not set yet</SelectItem>
                          <SelectItem value="physical">Physical Products</SelectItem>
                          <SelectItem value="digital">Digital Products</SelectItem>
                          <SelectItem value="service">Services</SelectItem>
                          <SelectItem value="software">Software</SelectItem>
                          <SelectItem value="hybrid">Hybrid (Products & Services)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="business_size">Business Size</Label>
                      <Select 
                        value={(additionalDetails?.business_size || 'none') as string}
                        onValueChange={(value) => handleAdditionalDetailChange('business_size', value === 'none' ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Not set yet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not set yet</SelectItem>
                          <SelectItem value="1-10">Small (1-10 employees)</SelectItem>
                          <SelectItem value="11-50">Small (11-50 employees)</SelectItem>
                          <SelectItem value="51-200">Medium (51-200 employees)</SelectItem>
                          <SelectItem value="201-500">Medium (201-500 employees)</SelectItem>
                          <SelectItem value="501+">Large (501+ employees)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="toll_free_use_case">Toll-Free Number Use Case</Label>
                      <Select 
                        value={(additionalDetails?.toll_free_use_case || 'none') as string}
                        onValueChange={(value) => handleAdditionalDetailChange('toll_free_use_case', value === 'none' ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Not set yet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not set yet</SelectItem>
                          <SelectItem value="customer_support">Customer Support</SelectItem>
                          <SelectItem value="technical_help">Technical Help</SelectItem>
                          <SelectItem value="sales">Sales Inquiries</SelectItem>
                          <SelectItem value="product_info">Product Information</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="multiple">Multiple Purposes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message_volume">Expected Monthly Message Volume</Label>
                      <Select 
                        value={(additionalDetails?.message_volume || 'none') as string}
                        onValueChange={(value) => handleAdditionalDetailChange('message_volume', value === 'none' ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Not set yet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not set yet</SelectItem>
                          <SelectItem value="100">Up to 100 messages</SelectItem>
                          <SelectItem value="1000">Up to 1,000 messages</SelectItem>
                          <SelectItem value="5000">Up to 5,000 messages</SelectItem>
                          <SelectItem value="10000">Up to 10,000 messages</SelectItem>
                          <SelectItem value="custom">Custom (specify below)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {additionalDetails?.message_volume === 'custom' && (
                      <div className="space-y-2">
                        <Label htmlFor="custom_message_volume">Custom Message Volume</Label>
                        <Input
                          id="custom_message_volume"
                          value={additionalDetails?.custom_message_volume || ''}
                          onChange={(e) => handleAdditionalDetailChange('custom_message_volume', e.target.value)}
                          placeholder="Enter custom message volume"
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </form>
        </div>
        
        <DialogFooter className="px-4 sm:px-6 py-4 border-t mt-auto">
          {page === 'main' ? (
            <>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="sm:mr-auto">Cancel</Button>
              </DialogClose>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                <Button type="button" onClick={handleNextPage}>Next Page</Button>
                <Button onClick={handleSubmit}>Save Changes</Button>
              </div>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handlePrevPage} className="sm:mr-auto">
                Previous Page
              </Button>
              <Button onClick={handleSubmit}>Save All Changes</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
