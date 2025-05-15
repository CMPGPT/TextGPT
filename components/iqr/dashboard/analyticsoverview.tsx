import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { BarChartBig, Users, QrCode, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { cn } from '@/lib/utils';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useDashboardCache } from '@/hooks/useDashboardCache';

const sampleData = [
  { name: 'Jan', messages: 240, users: 65 },
  { name: 'Feb', messages: 300, users: 85 },
  { name: 'Mar', messages: 280, users: 74 },
  { name: 'Apr', messages: 320, users: 92 },
  { name: 'May', messages: 450, users: 120 },
];

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  change?: {
    value: number;
    positive: boolean;
  };
  isLoading?: boolean;
}

const StatCard = ({ title, value, icon, change, isLoading }: StatCardProps) => (
  <Card className="bg-card text-card-foreground card-shadow border-0">
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-iqr-300/70 mb-1">{title}</p>
          {isLoading ? (
            <p className="text-2xl font-bold text-iqr-400">0</p>
          ) : (
            <p className="text-2xl font-bold text-iqr-400">{value}</p>
          )}
          
          {change && (
            <div className="flex items-center mt-2">
              {change.positive ? (
                <ArrowUpRight className="h-4 w-4 text-green-400 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-400 mr-1" />
              )}
              <span className={cn(
                "text-sm",
                change.positive ? "text-green-400" : "text-red-400"
              )}>
                {Math.abs(change.value)}%
              </span>
            </div>
          )}
        </div>
        
        <div className="p-3 bg-iqr-100/50 rounded-md text-iqr-200">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

interface CustomTooltipProps extends TooltipProps<number, string> {}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-iqr-100 border border-iqr-300/20 p-3 rounded-md shadow-md">
        <p className="text-iqr-400 font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p 
            key={`item-${index}`} 
            className="text-sm" 
            style={{ color: entry.color }}
          >
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Mock data for immediate visual feedback while loading
const mockChartData = [
  { name: 'Mon', messages: 0, users: 0 },
  { name: 'Tue', messages: 0, users: 0 },
  { name: 'Wed', messages: 0, users: 0 },
  { name: 'Thu', messages: 0, users: 0 },
  { name: 'Fri', messages: 0, users: 0 },
  { name: 'Sat', messages: 0, users: 0 },
  { name: 'Sun', messages: 0, users: 0 }
];

interface AnalyticsProps {
  businessId: string;
}

export const Analytics = ({ businessId }: AnalyticsProps) => {
  const [timeRange, setTimeRange] = useState('all');
  const [productsDeployed, setProductsDeployed] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [chartData, setChartData] = useState<any[]>(mockChartData);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const { cache, setCache, isDataCached } = useDashboardCache();
  
  // Fetch products count
  const fetchProductsCount = async () => {
    try {
      console.log('[Analytics] Fetching products count for business:', businessId);
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'ready');
      
      if (error) {
        console.error('[Analytics] Products error:', error.message);
        throw error;
      }
      
      console.log('[Analytics] Products count:', count);
      return count || 0;
    } catch (error) {
      console.error('[Analytics] Failed to fetch products count:', error);
      return 0;
    }
  };
  
  // Fetch message count
  const fetchMessageCount = async () => {
    try {
      console.log('[Analytics] Fetching message count for business:', businessId);
      const { count, error } = await supabase
        .from('iqr_chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);
      
      if (error) {
        console.error('[Analytics] Messages error:', error.message);
        throw error;
      }
      
      console.log('[Analytics] Messages count:', count);
      return count || 0;
    } catch (error) {
      console.error('[Analytics] Failed to fetch message count:', error);
      return 0;
    }
  };
  
  // Fetch unique users
  const fetchUniqueUsers = async () => {
    try {
      console.log('[Analytics] Fetching unique users for business:', businessId);
      const { data, error } = await supabase
        .from('iqr_chat_messages')
        .select('user_phone')
        .eq('business_id', businessId)
        .not('user_phone', 'is', null);
      
      if (error) {
        console.error('[Analytics] Unique users error:', error.message);
        throw error;
      }
      
      const uniquePhones = new Set(data.map(item => item.user_phone));
      console.log('[Analytics] Unique users count:', uniquePhones.size);
      return uniquePhones.size;
    } catch (error) {
      console.error('[Analytics] Failed to fetch unique users:', error);
      return 0;
    }
  };
  
  // Fetch chart data for time periods
  const fetchChartData = async () => {
    try {
      console.log('[Analytics] Fetching chart data for business:', businessId);
      // For simplicity, we'll use a fixed 7-day period
      const chartData = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Get messages for this day
        const { count: messageCount } = await supabase
          .from('iqr_chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());
        
        // Get unique users for this day
        const { data: dayUsers } = await supabase
          .from('iqr_chat_messages')
          .select('user_phone')
          .eq('business_id', businessId)
          .not('user_phone', 'is', null)
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());
        
        const uniqueDayUsers = new Set(dayUsers?.map(u => u.user_phone) || []).size;
        
        // Format date
        const dateFormatted = date.toLocaleDateString('en-US', { 
          weekday: 'short'
        });
        
        chartData.push({
          name: dateFormatted,
          messages: messageCount || 0,
          users: uniqueDayUsers || 0
        });
      }
      
      console.log('[Analytics] Chart data:', chartData);
      return chartData;
    } catch (error) {
      console.error('[Analytics] Failed to fetch chart data:', error);
      return mockChartData;
    }
  };
  
  useEffect(() => {
    // Use cached data immediately if available to prevent loading screen on tab switch
    if (isDataCached('analytics')) {
      const cachedAnalytics = cache.analytics;
      if (cachedAnalytics) {
        console.log('Using cached analytics data on mount');
        setProductsDeployed(cachedAnalytics.productsDeployed || 0);
        setTotalMessages(cachedAnalytics.totalMessages || 0);
        setUniqueUsers(cachedAnalytics.uniqueUsers || 0);
        setChartData(cachedAnalytics.chartData || mockChartData);
        
        // Only if this is new tab visit, fetch new data in background
        if (isInitialLoad) {
          // Fetch fresh data in background without showing loading state
          loadData(false);
          setIsInitialLoad(false);
        }
        return;
      }
    }
    
    // No cache available, this is a true initial load
    if (isInitialLoad) {
      setLoading(true);
    }
    
    // Load data
    loadData(isInitialLoad);
    
    // Reset initial load flag
    setIsInitialLoad(false);
  }, [businessId, timeRange]);
  
  const loadData = async (showLoading = true) => {
    // Don't show loading if explicitly told not to
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      // Fetch all the data in parallel
      const [productsCount, messagesCount, usersCount, chartDataResult] = await Promise.all([
        fetchProductsCount(),
        fetchMessageCount(),
        fetchUniqueUsers(),
        fetchChartData()
      ]);
      
      setProductsDeployed(productsCount);
      setTotalMessages(messagesCount);
      setUniqueUsers(usersCount);
      setChartData(chartDataResult);
      
      // Cache the results
      setCache('analytics', {
        productsDeployed: productsCount,
        totalMessages: messagesCount,
        uniqueUsers: usersCount,
        chartData: chartDataResult
      });
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle time range changes
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    // Show loading when explicitly changing time range
    setLoading(true);
  };
  
  // Render component UI
  return (
    <Card className="bg-card text-card-foreground card-shadow border-0">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-iqr-400 text-xl">
            Analytics Overview
          </CardTitle>
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="day">Last 24 Hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard 
            title="Products Deployed" 
            value={productsDeployed}
            icon={<QrCode className="h-6 w-6" />}
            isLoading={loading}
          />
          <StatCard 
            title="Total Messages" 
            value={totalMessages}
            icon={<BarChartBig className="h-6 w-6" />}
            isLoading={loading}
            change={{ value: 12, positive: true }}
          />
          <StatCard 
            title="Unique Users" 
            value={uniqueUsers}
            icon={<Users className="h-6 w-6" />}
            isLoading={loading}
            change={{ value: 8, positive: true }}
          />
        </div>
        
        <div className="py-2">
          <h4 className="text-md font-medium mb-4 text-iqr-400">Message Activity</h4>
          <div className="w-full h-[300px]">
            {loading ? (
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#9CA3AF' }} 
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis 
                      tick={{ fill: '#9CA3AF' }} 
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="messages" 
                      name="Messages" 
                      fill="#1E40AF" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="users" 
                      name="Unique Users" 
                      fill="#60A5FA" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : error ? (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-red-400">{error}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#9CA3AF' }} 
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    tick={{ fill: '#9CA3AF' }} 
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="messages" 
                    name="Messages" 
                    fill="#1E40AF" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="users" 
                    name="Unique Users" 
                    fill="#60A5FA" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
