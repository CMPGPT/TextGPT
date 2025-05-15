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
}

export const MessageLogs = ({ businessId, initialSearchQuery = '' }: MessageLogsProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const messagesPerPage = 10;
  const supabase = createClientComponentClient();

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
  
  const fetchMessages = async () => {
    setLoading(true);
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
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUniqueProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name')
        .eq('business_id', businessId);
        
      if (error) {
        throw error;
      }
      
      if (data) {
        const products = data.map(product => product.name);
        setUniqueProducts(products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
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
        throw error;
      }
      
      return data?.id;
    } catch (error) {
      console.error('Error getting product ID:', error);
      return null;
    }
  };

  useEffect(() => {
    // Apply initial search query if provided
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
    
    if (businessId) {
      fetchUniqueProducts();
    }
  }, [businessId, initialSearchQuery]);

  useEffect(() => {
    if (businessId) {
      fetchMessageCount();
      fetchMessages();
    }
  }, [businessId, currentPage, selectedProduct, searchQuery, date]);

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return format(date, 'MMM d, yyyy - h:mm a');
  };

  const truncateMessage = (message: string, maxLength: number = 100) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };
  
  const totalPages = Math.ceil(totalMessages / messagesPerPage);
  
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
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
    // Check if the phone is a UUID (which means it's not actually a phone number)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(phone)) {
      return 'Anonymous User';
    }
    
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // Check if it's a valid phone number
    if (cleaned.length < 10) {
      return phone; // Return original if it doesn't look like a phone number
    }
    
    // Format the phone number based on length
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 11)}`;
    } else {
      // For international numbers or other formats
      return `+${cleaned.substring(0, cleaned.length - 10)} (${cleaned.substring(cleaned.length - 10, cleaned.length - 7)}) ${cleaned.substring(cleaned.length - 7, cleaned.length - 4)}-${cleaned.substring(cleaned.length - 4)}`;
    }
  };

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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
            />
          </div>
          
          <Select 
            value={selectedProduct} 
            onValueChange={(value) => {
              setSelectedProduct(value);
              setCurrentPage(1); // Reset to first page on filter change
            }}
          >
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
                onSelect={(newDate) => {
                  setDate(newDate);
                  setCurrentPage(1); // Reset to first page on date change
                }}
                initialFocus
                className="rounded-md border border-iqr-300/20"
              />
            </PopoverContent>
          </Popover>
          
          {(date || searchQuery || selectedProduct !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={resetFilters}
              className="hidden sm:flex h-10"
            >
              Reset Filters
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
              {loading ? (
                <>
                  {Array(5).fill(0).map((_, index) => (
                    <TableRow key={`loading-${index}`}>
                      <TableCell><Skeleton className="h-6 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : messages.length > 0 ? (
                messages.map(message => (
                  <TableRow key={message.id}>
                    <TableCell className="font-medium">{formatPhoneNumber(message.phoneNumber)}</TableCell>
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-iqr-300/70">
                    No messages found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
          <p className="text-sm text-iqr-300/70">
            Showing <span className="font-medium">{messages.length}</span> of <span className="font-medium">{totalMessages}</span> messages
          </p>
          
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-secondary border-secondary"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show current page and adjacent pages
                  let pageToShow;
                  if (totalPages <= 5) {
                    pageToShow = i + 1;
                  } else if (currentPage <= 3) {
                    pageToShow = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageToShow = totalPages - 4 + i;
                  } else {
                    pageToShow = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageToShow}
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-8 w-8 bg-secondary border-secondary",
                        currentPage === pageToShow && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => setCurrentPage(pageToShow)}
                    >
                      <span className="text-xs">{pageToShow}</span>
                    </Button>
                  );
                })}
              </div>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-secondary border-secondary"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
