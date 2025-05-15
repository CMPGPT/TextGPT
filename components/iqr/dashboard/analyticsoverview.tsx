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
            <div className="h-7 w-20 bg-iqr-300/20 animate-pulse rounded"></div>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  
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
  
  // Main data loader
  useEffect(() => {
    const loadData = async () => {
      if (!businessId) {
        console.error('[Analytics] No business ID provided');
        setError('No business ID provided');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('[Analytics] Loading analytics for business ID:', businessId);
        
        // Load all data in parallel
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
      } catch (err: any) {
        console.error('[Analytics] Error loading analytics data:', err);
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [businessId]);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-iqr-400">Analytics Overview</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-secondary">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent className="bg-card border-iqr-300/20">
            <SelectItem value="day">Last 24 hours</SelectItem>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-md p-4 mb-6">
          <p className="text-red-500">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Products Deployed" 
          value={productsDeployed}
          icon={<QrCode className="h-6 w-6" />}
          isLoading={loading}
        />
        <StatCard 
          title="Total SMS Messages" 
          value={totalMessages.toLocaleString()}
          icon={<BarChartBig className="h-6 w-6" />}
          isLoading={loading}
        />
        <StatCard 
          title="Unique Users" 
          value={uniqueUsers.toLocaleString()}
          icon={<Users className="h-6 w-6" />}
          isLoading={loading}
        />
      </div>
      
      <Card className="bg-card text-card-foreground card-shadow border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Usage Trends</CardTitle>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="h-[300px]">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center">
                <p className="text-iqr-300/70">Loading chart data...</p>
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 5,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 229, 229, 0.1)" />
                  <XAxis dataKey="name" stroke="rgba(229, 229, 229, 0.5)" />
                  <YAxis stroke="rgba(229, 229, 229, 0.5)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="messages" fill="#fca311" radius={[4, 4, 0, 0]} name="SMS Messages" />
                  <Bar dataKey="users" fill="#456" radius={[4, 4, 0, 0]} name="Unique Users" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <p className="text-iqr-300/70">No data available for the selected time period</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="text-xs text-iqr-300/50 mt-4">
        Business ID: {businessId || 'Not provided'}
      </div>
    </div>
  );
};
