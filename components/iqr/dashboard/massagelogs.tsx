import { useState, useEffect } from 'react';
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
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Skeleton } from '@/components/ui/skeleton';

interface Message {
  id: string;
  phoneNumber: string;
  message: string;
  timestamp: string;
  status: 'sent' | 'received';
  productName: string;
}

interface SupabaseMessage {
  id: number;
  business_id: string;
  product_id: string;
  user_phone: string;
  role: string;
  content: string;
  created_at: string;
  metadata: any;
  product_name: string;
}

interface MessageLogsProps {
  businessId: string;
  initialSearchQuery?: string;
  onDataUpdate?: (data: any) => void;
  cachedData?: any;
}

export const MessageLogs = ({ businessId, initialSearchQuery = '', onDataUpdate, cachedData }: MessageLogsProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const messagesPerPage = 10;
  const supabase = createClientComponentClient();

  // Initialize from cache if available
  useEffect(() => {
    if (cachedData && !loading && initialLoad) {
      if (cachedData.messages && cachedData.messages.length > 0) {
        setMessages(cachedData.messages);
      }
      
      if (cachedData.uniqueProducts && cachedData.uniqueProducts.length > 0) {
        setUniqueProducts(cachedData.uniqueProducts);
      }
      
      if (cachedData.totalCount) {
        setTotalMessages(cachedData.totalCount);
      }
      
      if (cachedData.selectedProduct) {
        setSelectedProduct(cachedData.selectedProduct);
      }
      
      if (cachedData.searchQuery) {
        setSearchQuery(cachedData.searchQuery);
      }
      
      if (cachedData.date) {
        setDate(new Date(cachedData.date));
      }
      
      if (cachedData.currentPage) {
        setCurrentPage(cachedData.currentPage);
      }
      
      setInitialLoad(false);
    }
  }, [cachedData, loading, initialLoad]);
  
  // Update cache when data changes
  useEffect(() => {
    if (!loading && onDataUpdate) {
      onDataUpdate({
        messages,
        uniqueProducts,
        totalCount: totalMessages,
        selectedProduct,
        searchQuery,
        date: date?.toISOString(),
        currentPage
      });
    }
  }, [messages, uniqueProducts, totalMessages, selectedProduct, searchQuery, date, currentPage, loading, onDataUpdate]);

  // Optimized fetch messages function
  const fetchMessages = async () => {
    setLoading(true);
    
    try {
      // Prepare date parameters for the function
      const startDate = date ? new Date(date) : null;
      if (startDate) {
        startDate.setHours(0, 0, 0, 0);
      }
      
      const endDate = date ? new Date(date) : null;
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }
      
      // Use the optimized database function
      const { data, error: messagesError } = await supabase
        .rpc('get_messages_with_product_info', {
          business_id_param: businessId,
          page_size: messagesPerPage,
          page_number: currentPage,
          product_name_filter: selectedProduct === 'all' ? null : selectedProduct,
          search_query: searchQuery || null,
          start_date: startDate?.toISOString() || null,
          end_date: endDate?.toISOString() || null
        });
      
      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }

      if (data && data.length > 0) {
        // Map the data to our component's format
        const formattedMessages: Message[] = data.map((msg: any) => ({
          id: msg.id.toString(),
          phoneNumber: msg.user_phone || 'Unknown',
          message: msg.content,
          timestamp: msg.created_at,
          status: msg.role === 'user' ? 'received' : 'sent',
          productName: msg.product_name || 'Unknown Product'
        }));

        // Get total count from the first result
        const totalCount = data[0]?.total_count || 0;
        
        setMessages(formattedMessages);
        setTotalMessages(totalCount);
        
        // Set initialLoad to false after first successful load
        if (initialLoad) {
          setInitialLoad(false);
        }
      } else {
        // No messages found
        setMessages([]);
        setTotalMessages(0);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Silent error handling - no red notifications
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch unique products for the filter
  const fetchUniqueProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name')
        .eq('business_id', businessId)
        .order('name');
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setUniqueProducts(data.map(product => product.name));
      }
    } catch (error) {
      console.error('Error fetching unique products:', error);
    }
  };
  
  // Initial data load
  useEffect(() => {
    fetchMessages();
    fetchUniqueProducts();
  }, [businessId, searchQuery, selectedProduct, date, currentPage]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
  };
  
  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return format(date, 'MMM d, yyyy h:mm a');
  };
  
  const truncateMessage = (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };
  
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage * messagesPerPage < totalMessages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const resetFilters = () => {
    setSelectedProduct('all');
    setSearchQuery('');
    setDate(undefined);
    setCurrentPage(1);
  };
  
  const formatPhoneNumber = (phone: string): string => {
    if (!phone || phone === 'Unknown') return 'Unknown';
    
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      // Handle 1 + area code
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    // International format for anything else
    return `+${cleaned}`;
  };

  return (
    <Card className="bg-card text-card-foreground card-shadow border-0">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="text-iqr-400 text-xl">
            Message Logs
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <form onSubmit={handleSearch} className="flex items-center relative w-full sm:w-auto">
              <Input 
                type="text" 
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="h-9 w-full md:w-auto min-w-[200px] pl-9"
              />
              <div className="absolute left-3 text-muted-foreground">
                <Search className="h-4 w-4" />
              </div>
            </form>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "h-9 border border-input bg-card text-sm font-medium",
                    date && "text-primary"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {uniqueProducts.map((product) => (
                  <SelectItem key={product} value={product}>{product}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(searchQuery || selectedProduct !== 'all' || date) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9" 
                onClick={resetFilters}
              >
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center pb-2">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/4" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 py-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-4 w-1/6" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-iqr-300 opacity-20 mb-3" />
            <h3 className="text-xl font-medium text-iqr-400 mb-1">No Messages Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedProduct !== 'all' || date 
                ? "Try changing your filters to see more results." 
                : "There are no messages to display yet."}
            </p>
            {(searchQuery || selectedProduct !== 'all' || date) && (
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={resetFilters}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="font-medium">
                        {formatPhoneNumber(message.phoneNumber)}
                      </TableCell>
                      <TableCell className="max-w-[200px] md:max-w-xs">
                        {truncateMessage(message.message)}
                      </TableCell>
                      <TableCell>{message.productName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(message.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={cn(
                            message.status === 'received' 
                              ? "border-blue-500 text-blue-500 bg-blue-500/10"
                              : "border-green-500 text-green-500 bg-green-500/10"
                          )}
                        >
                          {message.status === 'received' ? 'Received' : 'Sent'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * messagesPerPage + 1, totalMessages)} to {Math.min(currentPage * messagesPerPage, totalMessages)} of {totalMessages} messages
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous Page</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage * messagesPerPage >= totalMessages}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next Page</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
