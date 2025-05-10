import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusCardProps {
  tollFreeNumber?: string;
  numberStatus?: 'verified' | 'pending' | 'unverified';
  userName?: string;
  description?: string;
  businessName?: string;
  onInfoClick?: () => void;
}

export const StatusCard = ({
  tollFreeNumber = "+1 (888) 123-4567",
  numberStatus = "verified",
  userName = "John Doe",
  description = "IQR Dashboard for Acme Corporation's product information and customer support.",
  businessName = "Acme Corporation",
  onInfoClick = () => console.log('Business info clicked')
}: StatusCardProps) => {
  return (
    <Card className="bg-card text-card-foreground card-shadow border-0">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h3 className="text-xl font-semibold text-iqr-400">Toll Free Number: {tollFreeNumber}</h3>
              <Badge className={cn(
                "text-xs font-medium py-1 px-2 rounded-md w-fit",
                numberStatus === 'verified' ? "bg-green-600/20 text-green-400" :
                numberStatus === 'pending' ? "bg-amber-600/20 text-amber-400" :
                "bg-red-600/20 text-red-400"
              )}>
                {numberStatus === 'verified' 
                  ? 'Verified' 
                  : numberStatus === 'pending' 
                    ? 'Verification Pending' 
                    : 'Unverified'
                }
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-iqr-300/70 mb-1">User</p>
                <p className="text-iqr-300 font-medium">{userName}</p>
              </div>
              
              <div>
                <p className="text-sm text-iqr-300/70 mb-1">Business Name</p>
                <p className="text-iqr-300 font-medium">{businessName}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-iqr-300/70 mb-1">Description</p>
              <p className="text-iqr-300">{description}</p>
            </div>
          </div>
          
          <Button
            onClick={onInfoClick}
            className="bg-iqr-200 text-iqr-50 hover:bg-iqr-200/80 shrink-0"
          >
            <Info className="mr-2 h-4 w-4" />
            Business Info
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
