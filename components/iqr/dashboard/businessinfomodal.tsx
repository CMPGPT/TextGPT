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

  // Update form data when business info changes
  useEffect(() => {
    if (businessInfo) {
      setFormData(businessInfo);
    }
  }, [businessInfo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (formData) {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
      onOpenChange(false);
    }
  };

  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-0 sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Business Information</DialogTitle>
          <DialogDescription>
            Update your business details for IQR service.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
          
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
