import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface BalanceCardProps {
  creditValue?: string;
  lastSubscriptionDate?: string;
  totalMessages?: number;
  onAddCredit?: () => void;
}

export const BalanceCard = ({
  creditValue = '$10.00',
  lastSubscriptionDate = '2024-05-01',
  totalMessages = 1234,
  onAddCredit = () => alert('Add credit clicked!'),
}: BalanceCardProps) => {
  // Utility to check if the value is negative
  const isNegative = creditValue.trim().startsWith('-');

  return (
    <Card className="bg-card text-card-foreground card-shadow border-0 max-w-3xl w-full mx-auto">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="space-y-4 w-full">
            <div className="flex flex-col items-center gap-3">
              <h3 className="text-xl font-semibold text-iqr-400">Balance</h3>
              <div
                className={cn(
                  'text-4xl font-bold',
                  isNegative ? 'text-red-400' : 'text-iqr-200'
                )}
                style={{ fontSize: 40 }}
              >
                {creditValue}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-iqr-300/70 mb-1">Last Subscription</p>
                <p className="text-iqr-300 font-medium">{lastSubscriptionDate}</p>
              </div>
              <div>
                <p className="text-sm text-iqr-300/70 mb-1">Total Messages</p>
                <p className="text-iqr-300 font-medium">{totalMessages}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            {isNegative ? (
              <Link href="/subscription/plans" passHref legacyBehavior>
                <Button
                  asChild
                  className="bg-red-100 text-red-600 hover:bg-red-200 shrink-0"
                >
                  <span>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Credit
                  </span>
                </Button>
              </Link>
            ) : (
              <Button
                onClick={onAddCredit}
                className="bg-iqr-200 text-black hover:bg-iqr-200/80 shrink-0"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Credit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 