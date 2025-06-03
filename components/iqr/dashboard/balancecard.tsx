import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge as _Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

interface BalanceCardProps {
  creditValue?: string;
  lastSubscriptionDate?: string;
  totalMessages?: number;
  _onAddCredit?: () => void;
  businessId?: string;
  userId?: string;
  onRefresh?: () => void;
}

interface BalanceData {
  creditValue: string;
  lastSubscriptionDate: string;
  totalMessages: number;
  rawBalance?: number;
  messageCost?: number;
}

export const BalanceCard = ({
  creditValue = '$0.00',
  lastSubscriptionDate = 'No subscription',
  totalMessages = 0,
  _onAddCredit = () => {},
  businessId,
  userId,
  onRefresh,
}: BalanceCardProps) => {
  const { toast } = useToast();
  const [balance, setBalance] = useState<BalanceData>({
    creditValue,
    lastSubscriptionDate,
    totalMessages
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Utility to check if the value is negative
  const isNegative = balance.creditValue.trim().startsWith('-');

  // Wrap in useCallback to avoid recreating on every render
  const fetchBalanceData = useCallback(async () => {
    if (!businessId) {
      console.log('[BalanceCard] No businessId provided, skipping data fetch');
      setIsLoading(false);
      return;
    }

    try {
      setIsRefreshing(true);
      console.log(`[BalanceCard] Fetching balance data for businessId: ${businessId}, userId: ${userId || 'N/A'}`);
      
      // Construct the API URL with query parameters
      const url = `/api/iqr/business/balance?businessId=${businessId}${userId ? `&userId=${userId}` : ''}`;
      console.log(`[BalanceCard] Request URL: ${url}`);
      
      const startTime = Date.now();
      const response = await fetch(url);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`[BalanceCard] Response received in ${responseTime}ms, status: ${response.status}`);
      
      const data = await response.json();
      console.log('[BalanceCard] Response data:', data);
      
      // Store debug information
      setDebugInfo({
        requestUrl: url,
        responseStatus: response.status,
        responseTime,
        responseData: data,
        timestamp: new Date().toISOString()
      });
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch balance data: ${response.status}`);
      }
      
      if (data.success && data.balance) {
        console.log('[BalanceCard] Successfully fetched balance:', data.balance);
        setBalance({
          creditValue: data.balance.creditValue,
          lastSubscriptionDate: data.balance.lastSubscriptionDate,
          totalMessages: data.balance.totalMessages,
          rawBalance: data.balance.rawBalance,
          messageCost: data.balance.messageCost
        });
      } else {
        console.warn('[BalanceCard] API returned success but no balance data');
      }
    } catch (error) {
      console.error('[BalanceCard] Error fetching balance:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load balance data',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [businessId, userId, toast]);

  useEffect(() => {
    if (isLoading) {
      fetchBalanceData();
    }
  }, [isLoading, fetchBalanceData]);

  const handleRefresh = async () => {
    if (isRefreshing) {
      console.log('[BalanceCard] Refresh already in progress, skipping');
      return;
    }
    
    console.log('[BalanceCard] Manual refresh requested');
    
    if (onRefresh) {
      // Call parent's refresh function first if provided
      console.log('[BalanceCard] Calling parent onRefresh callback');
      await onRefresh();
    }
    
    // Then refresh our own data
    await fetchBalanceData();
  };

  // Display debug information in dev environment
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && debugInfo) {
      console.group('[BalanceCard] Debug Information');
      console.log('Request URL:', debugInfo.requestUrl);
      console.log('Response Status:', debugInfo.responseStatus);
      console.log('Response Time:', debugInfo.responseTime + 'ms');
      console.log('Response Data:', debugInfo.responseData);
      console.log('Timestamp:', debugInfo.timestamp);
      console.groupEnd();
    }
  }, [debugInfo]);

  return (
    <Card className="bg-card text-card-foreground card-shadow border-0 max-w-3xl w-full mx-auto">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="space-y-4 w-full">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-iqr-400">Balance</h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCcw className={cn(
                    "h-4 w-4 text-iqr-300",
                    isRefreshing ? "animate-spin" : ""
                  )} />
                  <span className="sr-only">Refresh balance</span>
                </Button>
              </div>
              <div
                className={cn(
                  'text-4xl font-bold',
                  isNegative ? 'text-red-400' : 'text-iqr-200'
                )}
                style={{ fontSize: 40 }}
              >
                {isLoading ? '$--' : balance.creditValue}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-iqr-300/70 mb-1">Last Subscription</p>
                <p className="text-iqr-300 font-medium">
                  {isLoading ? '---' : balance.lastSubscriptionDate}
                </p>
              </div>
              <div>
                <p className="text-sm text-iqr-300/70 mb-1">Total Messages</p>
                <p className="text-iqr-300 font-medium">
                  {isLoading ? '---' : balance.totalMessages.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Link href="/subscription/plans" passHref legacyBehavior>
              <Button
                asChild
                className={cn(
                  "shrink-0",
                  isNegative 
                    ? "bg-red-100 text-red-600 hover:bg-red-200" 
                    : "bg-iqr-200 text-black hover:bg-iqr-200/80"
                )}
              >
                <span>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Credit
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 