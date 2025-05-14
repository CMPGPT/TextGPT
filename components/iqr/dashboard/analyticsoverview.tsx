import { useState } from 'react';
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
}

const StatCard = ({ title, value, icon, change }: StatCardProps) => (
  <Card className="bg-card text-card-foreground card-shadow border-0">
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-iqr-300/70 mb-1">{title}</p>
          <p className="text-2xl font-bold text-iqr-400">{value}</p>
          
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

interface AnalyticsProps {
  businessId: string;
}

export const Analytics = ({ businessId }: AnalyticsProps) => {
  const [timeRange, setTimeRange] = useState('all');
  
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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Products Deployed" 
          value="12" 
          icon={<QrCode className="h-6 w-6" />}
          change={{ value: 8.2, positive: true }}
        />
        <StatCard 
          title="Total SMS Messages" 
          value="2,847" 
          icon={<BarChartBig className="h-6 w-6" />}
          change={{ value: 12.5, positive: true }}
        />
        <StatCard 
          title="Unique Users" 
          value="342" 
          icon={<Users className="h-6 w-6" />}
          change={{ value: 3.8, positive: false }}
        />
      </div>
      
      <Card className="bg-card text-card-foreground card-shadow border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Usage Trends</CardTitle>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sampleData}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
