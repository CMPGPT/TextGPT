
import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface BusinessInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessInfo: {
    legalName: string;
    ein: string;
    address: string;
    website: string;
    supportEmail: string;
    supportPhone: string;
    privacyPolicyUrl: string;
    termsOfServiceUrl: string;
  };
  onSave: (data: any) => void;
}

export const BusinessInfoModal = ({ 
  open, 
  onOpenChange, 
  businessInfo, 
  onSave 
}: BusinessInfoModalProps) => {
  const [formData, setFormData] = useState(businessInfo);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-iqr-400">Business Information</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Business Name</Label>
              <Input 
                id="legalName"
                name="legalName"
                value={formData.legalName} 
                onChange={handleChange}
                className="bg-secondary border-secondary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ein">Business EIN (or equivalent)</Label>
              <Input 
                id="ein"
                name="ein"
                value={formData.ein} 
                onChange={handleChange}
                className="bg-secondary border-secondary"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Business Address</Label>
            <Textarea 
              id="address"
              name="address"
              value={formData.address} 
              onChange={handleChange}
              rows={2}
              className="bg-secondary border-secondary resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input 
                id="website"
                name="website"
                value={formData.website} 
                onChange={handleChange}
                className="bg-secondary border-secondary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input 
                id="supportEmail"
                name="supportEmail"
                type="email"
                value={formData.supportEmail} 
                onChange={handleChange}
                className="bg-secondary border-secondary"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supportPhone">Support Phone</Label>
              <Input 
                id="supportPhone"
                name="supportPhone"
                value={formData.supportPhone} 
                onChange={handleChange}
                className="bg-secondary border-secondary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="privacyPolicyUrl">Privacy Policy URL</Label>
              <Input 
                id="privacyPolicyUrl"
                name="privacyPolicyUrl"
                value={formData.privacyPolicyUrl} 
                onChange={handleChange}
                className="bg-secondary border-secondary"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="termsOfServiceUrl">Terms of Service URL</Label>
            <Input 
              id="termsOfServiceUrl"
              name="termsOfServiceUrl"
              value={formData.termsOfServiceUrl} 
              onChange={handleChange}
              className="bg-secondary border-secondary"
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-iqr-300/20 text-iqr-300 hover:bg-iqr-100/50"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-iqr-200 text-iqr-50 hover:bg-iqr-200/80"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
