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
import { useDashboardCache } from '@/hooks/useDashboardCache';

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
}

export const MessageLogs = ({ businessId, initialSearchQuery = '' }: MessageLogsProps) => {
  const { cache, setCache, isDataCached } = useDashboardCache();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const messagesPerPage = 10;
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Use cached data immediately if available to prevent loading screen on tab switch
    if (isDataCached('messages')) {
      const cachedMessages = cache.messages;
      if (cachedMessages && 
          (cachedMessages.filters.searchQuery === searchQuery || !searchQuery) &&
          cachedMessages.filters.selectedProduct === selectedProduct &&
          cachedMessages.filters.date === date &&
          cachedMessages.currentPage === currentPage) {
        
        console.log('Using cached messages data on mount');
        setMessages(cachedMessages.messagesList || []);
        setTotalMessages(cachedMessages.totalMessages || 0);
        
        // Fetch unique products without loading state
        fetchUniqueProducts();
        
        // Only if this is new tab visit, fetch new data in background
        if (isInitialLoad) {
          // Fetch fresh data in background without showing loading state
          fetchMessageCount();
          fetchMessages(false);
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
    fetchMessageCount();
    fetchMessages(isInitialLoad);
    fetchUniqueProducts();
    
    // Reset initial load flag
    setIsInitialLoad(false);
  }, [businessId, searchQuery, selectedProduct, date, currentPage]);

  const fetchMessageCount = async () => {
    try {
      let query = supabase
        .from('iqr_chat_messages')
        .select('id', { count: 'exact' })
        .eq('business_id', businessId);
      
      if (selectedProduct !== 'all') {
        const productId = await getProductIdByName(selectedProduct);
        if (productId) {
          query = query.eq('product_id', productId);
        }
      }
      
      if (searchQuery) {
        query = query.or(`user_phone.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }
      
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
      }
      
      const { count, error } = await query;
      
      if (error) {
        throw error;
      }
      
      setTotalMessages(count || 0);
    } catch (error) {
      console.error('Error fetching message count:', error);
    }
  };
  
  const fetchMessages = async (showLoading = true) => {
    // Don't show loading if explicitly told not to
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      // Calculate pagination range
      const from = (currentPage - 1) * messagesPerPage;
      const to = from + messagesPerPage - 1;
      
      // Build the query with filters
      let query = supabase
        .from('iqr_chat_messages')
        .select(`
          id, 
          business_id, 
          product_id, 
          user_phone, 
          role, 
          content, 
          created_at,
          products(name)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      // Apply filters
      if (selectedProduct !== 'all') {
        const productId = await getProductIdByName(selectedProduct);
        if (productId) {
          query = query.eq('product_id', productId);
        }
      }
      
      if (searchQuery) {
        query = query.or(`user_phone.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }
      
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
      }
      
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (data) {
        // Map Supabase data to our component's format
        const formattedMessages: Message[] = data.map((msg: any) => ({
          id: msg.id.toString(),
          phoneNumber: msg.user_phone || 'Unknown',
          message: msg.content,
          timestamp: msg.created_at,
          status: msg.role === 'user' ? 'received' : 'sent',
          productName: msg.products?.name || 'Unknown Product'
        }));

        setMessages(formattedMessages);
        
        // Cache the messages data
        setCache('messages', {
          messagesList: formattedMessages,
          totalMessages: totalMessages,
          currentPage: currentPage,
          filters: {
            searchQuery: searchQuery,
            selectedProduct: selectedProduct,
            date: date
          }
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };
  
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
  
  const getProductIdByName = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('name', name)
        .eq('business_id', businessId)
        .single();
      
      if (error) {
        return null;
      }
      
      return data?.id;
    } catch (error) {
      console.error('Error getting product ID by name:', error);
      return null;
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    // The fetchMessages will be triggered by the state changes
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
    if (currentPage < Math.ceil(totalMessages / messagesPerPage)) {
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
    if (!phone || phone === 'Unknown') return phone;
    
    // Remove all non-numeric characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Check if it's a valid US phone number (10 digits)
    if (digitsOnly.length === 10) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      // Handle US numbers with leading 1
      return `(${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
    }
    
    // Return original if not matching expected format
    return phone;
  };
  
  return (
    <Card className="bg-card text-card-foreground card-shadow border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-iqr-400 text-xl">
          Message Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-2 flex-grow sm:items-end">
            <div className="flex-1">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search messages or phone numbers..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
            </div>
            
            <div className="w-full sm:w-48">
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Product Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {uniqueProducts.map((product) => (
                    <SelectItem key={product} value={product}>
                      {product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={
                      cn("w-full justify-start text-left font-normal sm:w-[240px]",
                      !date && "text-muted-foreground")
                    }
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Filter by date"}
                    {date && (
                      <Button 
                        variant="ghost" 
                        className="h-4 w-4 p-0 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDate(undefined);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="flex items-end">
            <Button 
              variant="outline" 
              onClick={resetFilters}
              disabled={!searchQuery && selectedProduct === 'all' && !date}
            >
              Reset Filters
            </Button>
          </div>
        </div>
        
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    {/* Empty cell with no loading indicator */}
                  </TableCell>
                </TableRow>
              ) : messages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No messages found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                messages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {formatPhoneNumber(msg.phoneNumber)}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {truncateMessage(msg.message)}
                    </TableCell>
                    <TableCell>{msg.productName}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(msg.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        cn(
                          msg.status === 'sent' 
                            ? "bg-blue-500/20 text-blue-600" 
                            : "bg-green-500/20 text-green-600"
                        )
                      }>
                        {msg.status === 'sent' ? 'Sent' : 'Received'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {loading ? (
              <span></span>
            ) : (
              <>
                Showing {Math.min((currentPage - 1) * messagesPerPage + 1, totalMessages)} to {Math.min(currentPage * messagesPerPage, totalMessages)} of {totalMessages} messages
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNextPage}
              disabled={currentPage >= Math.ceil(totalMessages / messagesPerPage) || loading}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
