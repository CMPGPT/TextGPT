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

// Initial data structure for chart data
const initialChartData = [
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
  onDataUpdate?: (data: any) => void;
  cachedData?: any;
}

export const Analytics = ({ businessId, onDataUpdate, cachedData }: AnalyticsProps) => {
  const [timeRange, setTimeRange] = useState('all');
  const [productsDeployed, setProductsDeployed] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [chartData, setChartData] = useState<any[]>(initialChartData);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const supabase = createClientComponentClient();

  // Use cached data if available
  useEffect(() => {
    if (cachedData && !loading && initialLoad) {
      if (cachedData.analytics) {
        setProductsDeployed(cachedData.analytics.productsDeployed || 0);
        setTotalMessages(cachedData.analytics.totalMessages || 0);
        setUniqueUsers(cachedData.analytics.uniqueUsers || 0);
      }
      
      if (cachedData.chartData) {
        setChartData(cachedData.chartData);
      }
      
      setInitialLoad(false);
    }
  }, [cachedData, loading, initialLoad]);
  
  // Update parent with new data for caching
  useEffect(() => {
    if (!loading && onDataUpdate) {
      onDataUpdate({
        analytics: {
          productsDeployed,
          totalMessages,
          uniqueUsers
        },
        chartData
      });
    }
  }, [productsDeployed, totalMessages, uniqueUsers, chartData, loading, onDataUpdate]);

  // Optimized function to fetch all analytics data in parallel
  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Use Promise.all to fetch analytics data and chart data in parallel
      const [analyticsData, chartDataResult] = await Promise.all([
        fetchAnalyticsData(),
        fetchChartData()
      ]);
      
      // Update state with fetched data
      setProductsDeployed(analyticsData.productsDeployed);
      setTotalMessages(analyticsData.totalMessages);
      setUniqueUsers(analyticsData.uniqueUsers);
      setChartData(chartDataResult);
      
      // Set initialLoad to false after first successful load
      if (initialLoad) {
        setInitialLoad(false);
      }
    } catch (err) {
      console.error('Error loading analytics data:', err);
      // Silent error handling - no red notifications
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch analytics data from the business_analytics view
  const fetchAnalyticsData = async () => {
    try {
      const { data, error } = await supabase
        .from('business_analytics')
        .select('*')
        .eq('business_id', businessId)
        .single();
      
      if (error) {
        throw error;
      }
      
      return {
        productsDeployed: data?.products_deployed || 0,
        totalMessages: data?.total_messages || 0,
        uniqueUsers: data?.unique_users || 0
      };
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      // Return zeros but don't fail completely
      return { productsDeployed: 0, totalMessages: 0, uniqueUsers: 0 };
    }
  };
  
  // Fetch chart data based on the selected time range
  const fetchChartData = async () => {
    try {
      // For simplicity, we'll use a fixed 7-day period
      const chartData = [];
      const today = new Date();
      
      // Calculate the start date based on time range
      let startDate = new Date(today);
      if (timeRange === 'week') {
        startDate.setDate(today.getDate() - 6);
      } else if (timeRange === 'month') {
        startDate.setDate(today.getDate() - 29);
      } else if (timeRange === 'day') {
        // For 24 hours, set start date to beginning of today
        startDate.setHours(0, 0, 0, 0);
      } else {
        // Default to all time, but limit to 30 days for performance
        startDate.setDate(today.getDate() - 29);
      }
      
      startDate.setHours(0, 0, 0, 0);
      
      // Single query to get messages within the date range
      const { data: messageData, error: messageError } = await supabase
        .from('iqr_chat_messages')
        .select('created_at, user_phone')
        .eq('business_id', businessId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', today.toISOString());
      
      if (messageError) {
        throw messageError;
      }
      
      // Determine the grouping based on time range
      let groupBy = 'day';
      let daysToProcess = 7;
      
      if (timeRange === 'month') {
        daysToProcess = 30;
      } else if (timeRange === 'day') {
        // For 24 hours, group by hour
        groupBy = 'hour';
        daysToProcess = 1;
      }
      
      // Process the data into buckets
      if (groupBy === 'day') {
        // Process data by day
        for (let i = daysToProcess - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(today.getDate() - i);
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);
          
          // Filter messages for this day
          const dayMessages = messageData ? messageData.filter(msg => {
            const msgDate = new Date(msg.created_at);
            return msgDate >= dayStart && msgDate <= dayEnd;
          }) : [];
          
          // Count unique users for this day
          const uniqueDayUsers = new Set(dayMessages.map(m => m.user_phone).filter(phone => phone)).size;
          
          // Format date
          const dateFormatted = date.toLocaleDateString('en-US', { 
            weekday: 'short'
          });
          
          chartData.push({
            name: dateFormatted,
            messages: dayMessages.length || 0,
            users: uniqueDayUsers || 0
          });
        }
      } else {
        // Process data by hour for 24-hour view
        for (let i = 0; i < 24; i++) {
          const hour = new Date(today);
          hour.setHours(i, 0, 0, 0);
          const hourEnd = new Date(today);
          hourEnd.setHours(i, 59, 59, 999);
          
          // Filter messages for this hour
          const hourMessages = messageData ? messageData.filter(msg => {
            const msgDate = new Date(msg.created_at);
            return msgDate >= hour && msgDate <= hourEnd;
          }) : [];
          
          // Count unique users for this hour
          const uniqueHourUsers = new Set(hourMessages.map(m => m.user_phone).filter(phone => phone)).size;
          
          // Format hour
          const hourFormatted = i % 12 === 0 ? '12' : (i % 12).toString();
          const ampm = i < 12 ? 'AM' : 'PM';
          
          chartData.push({
            name: `${hourFormatted}${ampm}`,
            messages: hourMessages.length || 0,
            users: uniqueHourUsers || 0
          });
        }
      }
      
      return chartData;
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      return initialChartData;
    }
  };
  
  // Fetch data when component mounts or when time range changes
  useEffect(() => {
    fetchData();
  }, [businessId, timeRange]);
  
  // Handle time range changes
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    // Setting loading to true for immediate feedback to user
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
                  <BarChart data={initialChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
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
