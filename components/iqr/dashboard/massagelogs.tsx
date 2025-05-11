import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  CalendarIcon 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { X } from '@mui/icons-material';

interface Message {
  id: string;
  phoneNumber: string;
  message: string;
  timestamp: string;
  status: 'sent' | 'received';
  productName: string;
}

export const MessageLogs = () => {
  const [messages] = useState<Message[]>([
    {
      id: '1',
      phoneNumber: '+1 555-123-4567',
      message: 'What are the features of the Smart Home Assistant?',
      timestamp: '2024-05-05T14:23:45',
      status: 'received',
      productName: 'Smart Home Assistant'
    },
    {
      id: '2',
      phoneNumber: '+1 555-123-4567',
      message: 'The Smart Home Assistant can control your lights, thermostat, and other smart devices. It also has voice recognition and can play music, set timers, and answer questions.',
      timestamp: '2024-05-05T14:24:30',
      status: 'sent',
      productName: 'Smart Home Assistant'
    },
    {
      id: '3',
      phoneNumber: '+1 555-987-6543',
      message: 'How do I set up the Fitness Tracker Pro?',
      timestamp: '2024-05-04T10:12:05',
      status: 'received',
      productName: 'Fitness Tracker Pro'
    },
    {
      id: '4',
      phoneNumber: '+1 555-987-6543',
      message: 'To set up your Fitness Tracker Pro, download the mobile app, create an account, and follow the pairing instructions. Make sure Bluetooth is enabled on your phone.',
      timestamp: '2024-05-04T10:13:22',
      status: 'sent',
      productName: 'Fitness Tracker Pro'
    },
    {
      id: '5',
      phoneNumber: '+1 555-555-5555',
      message: 'Is the Coffee Maker XL compatible with standard coffee pods?',
      timestamp: '2024-05-03T08:45:30',
      status: 'received',
      productName: 'Coffee Maker XL'
    }
  ]);
  
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  
  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return format(date, 'MMM d, yyyy - h:mm a');
  };

  const filteredMessages = messages.filter(message => {
    const matchesProduct = selectedProduct === 'all' || message.productName === selectedProduct;
    const matchesSearch = message.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         message.phoneNumber.includes(searchQuery);
    const matchesDate = !date || new Date(message.timestamp).toDateString() === date.toDateString();
    
    return matchesProduct && matchesSearch && matchesDate;
  });

  const truncateMessage = (message: string, maxLength: number = 100) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  const uniqueProducts = Array.from(new Set(messages.map(message => message.productName)));

  return (
    <Card className="bg-card text-card-foreground card-shadow border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-iqr-200" />
          Message Logs
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-iqr-300/50" />
            <Input 
              placeholder="Search messages or phone numbers..." 
              className="pl-10 bg-secondary border-secondary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-secondary">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent className="bg-card border-iqr-300/20">
              <SelectItem value="all">All Products</SelectItem>
              {uniqueProducts.map(product => (
                <SelectItem key={product} value={product}>{product}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-[180px] justify-start text-left font-normal bg-secondary border-secondary"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'MMM d, yyyy') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-iqr-300/20">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className="rounded-md border border-iqr-300/20"
              />
            </PopoverContent>
          </Popover>
          
          {date && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setDate(undefined)}
              className="hidden sm:flex h-10 w-10"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead className="w-[300px] md:w-[40%]">Message</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Product</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {filteredMessages.map(message => (
                <TableRow key={message.id}>
                  <TableCell className="font-medium">{message.phoneNumber}</TableCell>
                  <TableCell>
                    <div className="truncate max-w-[300px] md:max-w-full">
                      {truncateMessage(message.message)}
                    </div>
                  </TableCell>
                  <TableCell>{formatDateTime(message.timestamp)}</TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "text-xs",
                      message.status === 'received' 
                        ? "bg-blue-600/20 text-blue-400" 
                        : "bg-green-600/20 text-green-400"
                    )}>
                      {message.status === 'received' ? 'Received' : 'Sent'}
                    </Badge>
                  </TableCell>
                  <TableCell>{message.productName}</TableCell>
                </TableRow>
              ))}
              
              {filteredMessages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-iqr-300/70">
                    No messages found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-iqr-300/70">
            Showing <span className="font-medium">{filteredMessages.length}</span> of <span className="font-medium">{messages.length}</span> messages
          </p>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" className="h-8 w-8 bg-secondary border-secondary">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 bg-secondary border-secondary">
              <span className="text-xs">1</span>
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 bg-secondary border-secondary">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
