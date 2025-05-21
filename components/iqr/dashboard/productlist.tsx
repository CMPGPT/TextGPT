import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSearchParams } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { QrCode, ArrowUpDown, Edit, BarChartBig, Save, Trash, X, Download, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { getQRCodesForProduct, updateQRCodeWithURL, updateEmptyQRCodeImagesAction } from '@/app/actions/iqr/qrcode';
import { createQRCodeURL, extractQueryFromURL, formatQueryForDisplay } from '@/utils/qrcode-helpers';
import QRCode from 'qrcode';

// Define request timeout
const REQUEST_TIMEOUT = 20000; // 20 seconds timeout
const MAX_RETRIES = 2; // Maximum number of retries for failed requests
const RETRY_DELAY = 3000; // 3 seconds delay between retries

// Define valid product statuses
const VALID_PRODUCT_STATUSES = [
  'processing', 
  'ready', 
  'failed', 
  'error', 
  'pending_processing',
  'queue_failed',
  'pending_upload',
  'uploading',
  'extracting',
  'embedding',
  'completed'
];

// Helper to get display label and color for status
const getStatusDisplay = (status: string | null) => {
  if (!status) return { label: 'Unknown', color: 'gray' };
  
  // Map status to display values
  const statusMap: Record<string, { label: string, color: string }> = {
    ready: { label: 'Ready', color: 'text-green-500 bg-green-500/10' },
    processing: { label: 'Processing', color: 'text-yellow-500 bg-yellow-500/10' },
    failed: { label: 'Failed', color: 'text-red-500 bg-red-500/10' },
    error: { label: 'Error', color: 'text-red-500 bg-red-500/10' },
    pending_processing: { label: 'Pending', color: 'text-blue-500 bg-blue-500/10' },
    queue_failed: { label: 'Queue Failed', color: 'text-red-500 bg-red-500/10' },
    pending_upload: { label: 'Pending Upload', color: 'text-orange-500 bg-orange-500/10' },
    uploading: { label: 'Uploading', color: 'text-blue-500 bg-blue-500/10' },
    extracting: { label: 'Extracting Text', color: 'text-purple-500 bg-purple-500/10' },
    embedding: { label: 'Creating Embeddings', color: 'text-indigo-500 bg-indigo-500/10' },
    completed: { label: 'Completed', color: 'text-green-500 bg-green-500/10' }
  };
  
  return statusMap[status] || { label: status, color: 'text-gray-500 bg-gray-500/10' };
};

interface Product {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  qr_text_tag: string | null;
  status: string | null;
  system_prompt: string | null;
  pdf_url: string | null;
  business_id: string;
  pdf_path?: string | null;
  pdf_processing_status?: string | null;
}

interface QRCode {
  id: string;
  product_id: string;
  image_url: string;
  data: string;
  created_at: string;
}

interface ProductListProps {
  businessId: string;
  onDataUpdate?: (data: any[]) => void;
  cachedData?: any[];
}

export const ProductList = ({ businessId, onDataUpdate, cachedData }: ProductListProps) => {
  const supabase = createClientComponentClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  // Add abort controller refs to handle request cancellation
  const productsControllerRef = useRef<AbortController | null>(null);
  const qrCodesControllerRef = useRef<AbortController | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [qrCodes, setQRCodes] = useState<QRCode[]>([]);
  // Cache QR codes by product ID to avoid unnecessary refetching
  const [qrCodeCache, setQRCodeCache] = useState<Record<string, QRCode[]>>({});
  const [loading, setLoading] = useState(true);
  const [qrCodesLoading, setQRCodesLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Track if we're showing stale data while refreshing in background
  const [isRefreshingInBackground, setIsRefreshingInBackground] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Selected product for drawers
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedQRCode, setSelectedQRCode] = useState<QRCode | null>(null);

  // Product edit form states
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedSystemPrompt, setEditedSystemPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // QR code edit states
  const [qrCodeData, setQRCodeData] = useState('');
  const [qrCodeLoading, setQRCodeLoading] = useState(false);
  const [qrCodeSuccess, setQRCodeSuccess] = useState<string | null>(null);
  const [qrCodeDrawerError, setQRCodeDrawerError] = useState<string | null>(null);

  // Drawers states
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [isQRCodeDrawerOpen, setIsQRCodeDrawerOpen] = useState(false);
  
  // Sort states
  const [sortField, setSortField] = useState<keyof Product>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Save QR code state
  const [savingQRCode, setSavingQRCode] = useState(false);

  // Add these state variables
  const [previewQuery, setPreviewQuery] = useState<string>('');
  const [previewURL, setPreviewURL] = useState<string>('');

  // Keep only this one instance of the qrUpdateStatus state
  const [qrUpdateStatus, setQrUpdateStatus] = useState<{
    loading: boolean;
    message: string | null;
    error: string | null;
  }>({
    loading: false,
    message: null,
    error: null
  });
  
  // Debug utilities - remove in production
  useEffect(() => {
    // This will help diagnose if there are any auth/key problems
    console.log('Business ID:', businessId);
    
    // Log supabase instance and check if auth is properly configured
    const debugAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Auth Session:', session ? 'Authenticated' : 'Not authenticated');
        
        // Test a simple query to verify connectivity and permissions
        const { count, error } = await supabase
          .from('qr_codes')
          .select('*', { count: 'exact', head: true });
        
        console.log('QR Codes count access test:', { count, error });
      } catch (err) {
        console.error('Auth debug error:', err);
      }
    };
    
    debugAuth();
  }, [supabase, businessId]);

  // Check for URL parameters to automatically open drawers
  useEffect(() => {
    const action = searchParams.get('action');
    const productId = searchParams.get('productId');
    
    // If we have both action and productId
    if (productId && (action === 'edit' || action === 'qrcode')) {
      console.log(`Opening ${action} drawer for product ID:`, productId);
      
      // First find the product in the cache or fetch it
      const findAndOpenProductDrawer = async () => {
        // Check if product is in cached data
        let product = products.find(p => p.id === productId);
        
        // If not found in cache and we're not already loading, fetch it
        if (!product && !loading) {
          try {
            const { data, error } = await supabase
              .from('products')
              .select('*')
              .eq('id', productId)
              .eq('business_id', businessId)
              .single();
            
            if (error) {
              console.error('Error fetching product:', error);
              return;
            }
            
            if (data) {
              product = data;
            }
          } catch (err) {
            console.error(`Error fetching product for ${action}:`, err);
            return;
          }
        }
        
        // If we found the product, open the appropriate drawer
        if (product) {
          if (action === 'edit') {
            openEditProductDrawer(product);
          } else if (action === 'qrcode') {
            openQRCodeDrawer(product);
          }
        }
      };
      
      // Execute after a short delay to ensure products are loaded
      setTimeout(findAndOpenProductDrawer, 100);
    }
  }, [searchParams, products, loading, businessId, supabase]);

  // Add useEffect to initialize from cache and update cache on data change
  useEffect(() => {
    // Initialize with cached data if available
    if (cachedData && cachedData.length > 0 && !initialLoad) {
      setProducts(cachedData);
      setLoading(false);
    }
  }, [cachedData]);
  
  // Update callback to push data to cache
  useEffect(() => {
    if (products.length > 0 && !loading && onDataUpdate) {
      onDataUpdate(products);
    }
  }, [products, loading, onDataUpdate]);

  // Optimized function to fetch products
  const fetchProducts = useCallback(async (retry = 0) => {
    // Cancel any existing fetch request
    if (productsControllerRef.current) {
      productsControllerRef.current.abort();
    }
    
    // Show loading only if no products are loaded yet
    if (products.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshingInBackground(true);
    }
    
    // Create an abort controller for timeout handling
    const controller = new AbortController();
    productsControllerRef.current = controller;
    
    try {
      // Use RPC function to securely get all products
      const { data, error } = await supabase
        .rpc('get_all_business_products', { business_id_param: businessId })
        .abortSignal(controller.signal);
      
      if (error) {
        throw error;
      }
      
      if (data) {
        // Update in-memory cache to avoid unnecessary re-fetching
        setProducts(data);
        
        // Update parent component cache if callback provided
        if (onDataUpdate) {
          onDataUpdate(data);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      
      // Only retry a limited number of times
      if (retry < MAX_RETRIES) {
        setTimeout(() => {
          fetchProducts(retry + 1);
        }, RETRY_DELAY);
      } else {
        toast({
          title: "Error loading products",
          description: "Could not load products. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setIsRefreshingInBackground(false);
      setInitialLoad(false);
    }
  }, [supabase, businessId, products.length, onDataUpdate, toast]);

  // Fetch QR codes for a product
  const fetchQRCodesForProduct = useCallback(async (productId: string) => {
    // Cancel any existing fetch request
    if (qrCodesControllerRef.current) {
      qrCodesControllerRef.current.abort();
    }
    
    // Reset drawer errors and loading state
    setQRCodeDrawerError(null);
    setQRCodes([]);
    setQRCodesLoading(true);
    
    console.log(`Fetching QR codes for product: ${productId}`);
    
    // First check if we have a cached version
    if (qrCodeCache[productId] && qrCodeCache[productId].length > 0) {
      console.log('Found cached QR codes, using those first while refreshing');
      // Use cached version immediately to improve perceived performance
      // but still fetch fresh data in the background
      setQRCodes(qrCodeCache[productId]);
      setQRCodesLoading(false); // Hide loading indicator since we have something to show
    }
    
    // Create an abort controller for timeout handling
    const controller = new AbortController();
    qrCodesControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
      // Start with fastest approach - the API endpoint
      // Skip other approaches if API succeeds
      try {
        console.log('Starting with API endpoint approach for faster QR code loading');
        const apiResponse = await fetch(`/api/iqr/qr-codes/${productId}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (apiResponse.ok) {
          const apiResult = await apiResponse.json();
          if (apiResult.success && apiResult.data && apiResult.data.length > 0) {
            console.log('Successfully fetched QR codes via API endpoint');
            clearTimeout(timeoutId);
            setQRCodes(apiResult.data);
            setQRCodeCache(prev => ({ ...prev, [productId]: apiResult.data }));
            setQRCodesLoading(false);
            return; // Exit early if API endpoint worked
          }
        }
      } catch (apiError) {
        console.log('API endpoint approach failed, falling back to other methods:', apiError);
      }
      
      // If API endpoint failed, try other approaches
      let data, error;
      let lastError = null;
      
      // Try multiple approaches to fetch QR codes
      const approaches = [
        {
          name: 'public_function',
          fn: async () => {
            console.log('Trying public QR codes function');
            return await supabase
              .rpc('get_public_qr_codes', { product_id_param: productId })
              .abortSignal(controller.signal);
          }
        },
        {
          name: 'simple_function',
          fn: async () => {
            console.log('Trying simplified RPC function');
            return await supabase
              .rpc('get_qr_codes_simple', { product_id_param: productId })
              .abortSignal(controller.signal);
          }
        },
        {
          name: 'original_function',
          fn: async () => {
            console.log('Trying original RPC function');
            return await supabase
              .rpc('get_product_qr_codes', { product_id_param: productId })
              .abortSignal(controller.signal);
          }
        },
        {
          name: 'public_view',
          fn: async () => {
            console.log('Trying public view query');
            return await supabase
              .from('qr_codes_public')
              .select('*')
              .eq('product_id', productId)
              .abortSignal(controller.signal);
          }
        },
        {
          name: 'direct_query',
          fn: async () => {
            console.log('Trying direct table query');
            return await supabase
              .from('qr_codes')
              .select('*')
              .eq('product_id', productId)
              .abortSignal(controller.signal);
          }
        },
        {
          name: 'server_action',
          fn: async () => {
            console.log('Trying server action');
            const result = await getQRCodesForProduct(productId);
            // Convert server action response to match Supabase format
            return {
              data: result.success ? result.data : null,
              error: result.success ? null : { message: result.error }
            };
          }
        }
      ];
      
      // Try each approach until one works
      for (const approach of approaches) {
        try {
          console.log(`Attempting to fetch QR codes using: ${approach.name}`);
          const result = await approach.fn();
          data = result.data;
          error = result.error;
          
          if (error) {
            console.warn(`${approach.name} failed:`, error);
            lastError = error;
            continue; // Try the next approach
          }
          
          // If we got here, the approach worked
          console.log(`Successfully fetched QR codes using: ${approach.name}`);
          break;
        } catch (approachError) {
          console.error(`Error with ${approach.name}:`, approachError);
          lastError = approachError;
        }
      }
      
      // If we exhausted all approaches and still have no data
      if (!data && lastError) {
        error = lastError;
        
        // Try one last approach - the API endpoint
        try {
          console.log('All Supabase approaches failed, attempting API endpoint fallback');
          const response = await fetch(`/api/iqr/qr-codes/${productId}`);
          
          if (response.ok) {
            const apiResult = await response.json();
            if (apiResult.data) {
              console.log('Successfully fetched QR codes via API endpoint');
              data = apiResult.data;
              error = null;
            }
          } else {
            console.error('API endpoint fallback failed:', await response.text());
          }
        } catch (apiError) {
          console.error('Error with API endpoint fallback:', apiError);
        }
      }
      
      clearTimeout(timeoutId);
      
      console.log('Final QR codes query result:', { 
        data, 
        error, 
        dataLength: data?.length, 
        hasError: !!error
      });
      
      if (error) {
        throw error;
      }
      
      // If we received QR codes, set them and update cache
      if (data && data.length > 0) {
        console.log(`Found ${data.length} QR codes`);
        setQRCodes(data);
        setQRCodeCache(prev => ({ ...prev, [productId]: data }));
      } else {
        console.log('No QR codes found, checking product status');
        // If no QR codes were found, check the product status
        try {
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('status, qr_text_tag')
            .eq('id', productId)
            .single();
            
          if (productError) throw productError;
          
          console.log('Product status check:', productData);
          
          // Keep empty array but update UI accordingly based on product status
          setQRCodes([]);
          setQRCodeCache(prev => ({ ...prev, [productId]: [] }));
        } catch (productCheckErr) {
          console.error('Error checking product status:', productCheckErr);
          setQRCodes([]);
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      
      // Log detailed error information for debugging
      console.error('Error fetching QR codes:', err);
      
      // Analyze the error type for better error messaging
      let errorMessage = 'Could not load QR codes. Please try again.';
      
      // Check for common Supabase error types
      if (err.code === 'PGRST301') {
        errorMessage = 'Database permission error. Please contact support.';
      } else if (err.code === '42501') {
        errorMessage = 'You don\'t have permission to access this data.';
      } else if (err.code === '40001') {
        errorMessage = 'Database serialization error. Please retry.';
      } else if (err.message && err.message.includes('JWT')) {
        errorMessage = 'Authentication error. Please reload the page or log in again.';
      } else if (err.message && err.message.includes('network')) {
        errorMessage = 'Network connection issue. Please check your internet connection.';
      }
      
      setQRCodeDrawerError(errorMessage);
      setQRCodes([]);
    } finally {
      setQRCodesLoading(false);
    }
  }, [supabase, qrCodeCache, toast]);

  // Initial data load
  useEffect(() => {
    // We're only setting up cleanup, not fetching data automatically anymore
    // This ensures refresh only happens on button click
    
    // Cleanup function to abort any pending requests
    return () => {
      if (productsControllerRef.current) {
        productsControllerRef.current.abort();
      }
      if (qrCodesControllerRef.current) {
        qrCodesControllerRef.current.abort();
      }
    };
  }, [supabase]);

  // Check Supabase connectivity before critical operations
  const checkSupabaseConnectivity = async (): Promise<boolean> => {
    try {
      // A simple query to check if Supabase is responding
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      
      return true;
    } catch (err) {
      console.error('Supabase connectivity check failed:', err);
      return false;
    }
  };

  // Enhanced product refresh with connectivity check - only triggered by button click
  const refreshProductData = async () => {
    // Don't allow multiple refresh operations
    if (isRefreshingInBackground) return;
    
    setIsRefreshingInBackground(true);
    try {
      // Update products
      await fetchProducts();
      
      toast({
        title: "Data refreshed",
        description: "Product data has been updated",
        variant: "default",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshingInBackground(false);
    }
  };

  // Toggle product active status
  const toggleProductStatus = async (id: string, currentStatus: string | null) => {
    try {
      // Determine the new status based on current status
      const newStatus = currentStatus === 'ready' ? 'inactive' : 'ready';
      
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('business_id', businessId);
      
      if (error) throw error;
      
      // Update local state
      setProducts(products.map(product => 
        product.id === id ? { ...product, status: newStatus } : product
      ));
      
      toast({
        title: "Status updated",
        description: `Product is now ${newStatus === 'ready' ? 'active' : 'inactive'}`,
        variant: "default",
      });
    } catch (err) {
      console.error('Error toggling product status:', err);
      toast({
        title: "Update failed",
        description: "Could not update product status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle sorting
  const handleSort = (field: keyof Product) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending for dates, ascending for text
      const isDateField = field === 'created_at';
      setSortField(field);
      setSortDirection(isDateField ? 'desc' : 'asc');
    }
  };

  // Get sorted products
  const getSortedProducts = () => {
    return [...products].sort((a, b) => {
      const valueA = a[sortField];
      const valueB = b[sortField];
      
      if (valueA === null && valueB === null) return 0;
      if (valueA === null) return sortDirection === 'asc' ? -1 : 1;
      if (valueB === null) return sortDirection === 'asc' ? 1 : -1;
      
      // For date fields
      if (sortField === 'created_at') {
        const dateA = new Date(valueA as string).getTime();
        const dateB = new Date(valueB as string).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      // For text fields
      const textA = String(valueA).toLowerCase();
      const textB = String(valueB).toLowerCase();
      return sortDirection === 'asc' 
        ? textA.localeCompare(textB) 
        : textB.localeCompare(textA);
    });
  };

  // Open product edit drawer
  const openEditProductDrawer = (product: Product) => {
    setSelectedProduct(product);
    setEditedName(product.name);
    setEditedDescription(product.description || '');
    setEditedSystemPrompt(product.system_prompt || '');
    setSelectedFile(null);
    setEditError(null);
    setEditSuccess(null);
    setIsProductDrawerOpen(true);
  };

  // Update product
  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;
    
    setEditLoading(true);
    setEditError(null);
    setEditSuccess(null);
    
    try {
      // First update the product details
      const { error } = await supabase
        .from('products')
        .update({
          name: editedName,
          description: editedDescription,
          system_prompt: editedSystemPrompt,
        })
        .eq('id', selectedProduct.id)
        .eq('business_id', businessId);
      
      if (error) throw error;
      
      // Upload new PDF if selected
      if (selectedFile) {
        // Update product status to indicate processing
        await supabase
          .from('products')
          .update({ status: 'pending_upload' })
          .eq('id', selectedProduct.id)
          .eq('business_id', businessId);
        
        // Generate a unique path for the PDF
        const timestamp = new Date().getTime();
        const filePath = `${businessId}/${selectedProduct.id}/${timestamp}_${selectedFile.name}`;
        
        // Upload the file
        const { error: uploadError } = await supabase
          .storage
          .from('product-pdfs')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: true
          });
        
        if (uploadError) throw uploadError;
        
        // Get the public URL
        const { data } = supabase
          .storage
          .from('product-pdfs')
          .getPublicUrl(filePath);
        
        // Update product with new PDF info
        const { error: updateError } = await supabase
          .from('products')
          .update({
            pdf_url: data.publicUrl,
            pdf_path: filePath,
            status: 'pending_processing', // Set to pending so the processing can begin
          })
          .eq('id', selectedProduct.id)
          .eq('business_id', businessId);
        
        if (updateError) throw updateError;
      }
      
      // Update local state
      setProducts(products.map(product => 
        product.id === selectedProduct.id 
          ? { 
              ...product, 
              name: editedName, 
              description: editedDescription,
              system_prompt: editedSystemPrompt,
              // Only update status if we uploaded a new file
              status: selectedFile ? 'pending_processing' : product.status
            } 
          : product
      ));
      
      setEditSuccess('Product updated successfully');
      
      // Show toast notification
      toast({
        title: "Product updated",
        description: "Changes have been saved successfully",
        variant: "default",
      });
      
      // Close drawer after a delay
      setTimeout(() => {
        setIsProductDrawerOpen(false);
      }, 1500);
      
    } catch (err) {
      console.error('Error updating product:', err);
      setEditError('Failed to update product. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  // Open QR code viewer drawer
  const openQRCodeDrawer = async (product: Product) => {
    setSelectedProduct(product);
    setQRCodesLoading(true);
    setQRCodeDrawerError(null);
    setIsQRCodeDrawerOpen(true);
    setPreviewQuery('');
    setPreviewURL('');
    
    console.log(`Opening QR code drawer for product: ${product.id} - ${product.name}`);
    
    // Then fetch the QR codes
    fetchQRCodesForProduct(product.id);
  };

  // Download QR code
  const downloadQRCode = (qrCode: QRCode, productName: string) => {
    // Create a sanitized filename
    const sanitizedName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `qrcode_${sanitizedName}.png`;
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = qrCode.image_url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  // Add a function to clean up the QR code cache when it gets too large
  const cleanupQRCodeCache = useCallback(() => {
    const MAX_CACHE_ENTRIES = 10; // Maximum number of products to keep in cache
    
    setQRCodeCache(prevCache => {
      const cacheKeys = Object.keys(prevCache);
      if (cacheKeys.length <= MAX_CACHE_ENTRIES) return prevCache;
      
      // If we have too many entries, remove the oldest ones
      // Keep only the most recent MAX_CACHE_ENTRIES
      const newCache: Record<string, QRCode[]> = {};
      const keysToKeep = cacheKeys.slice(-MAX_CACHE_ENTRIES);
      
      keysToKeep.forEach(key => {
        newCache[key] = prevCache[key];
      });
      
      return newCache;
    });
  }, []);
  
  // Add cleanup to the effect when products change
  useEffect(() => {
    if (products.length > 0 && qrCodeCache && Object.keys(qrCodeCache).length > 10) {
      cleanupQRCodeCache();
    }
  }, [products, qrCodeCache, cleanupQRCodeCache]);

  // Update the QR code update function
  const updateQRCodeData = async (qrCodeId: string, newData: string) => {
    if (!selectedProduct) return;
    
    setSavingQRCode(true);
    
    try {
      // Generate QR code image client-side first for immediate feedback
      let clientImageUrl = '';
      try {
        clientImageUrl = await QRCode.toDataURL(newData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        
        // Update the preview image immediately for better user experience
        const imageElement = document.getElementById(`qr-preview-image-${qrCodeId}`) as HTMLImageElement;
        if (imageElement) {
          imageElement.src = clientImageUrl;
          imageElement.classList.add('opacity-100');
          imageElement.classList.remove('opacity-0');
        }
      } catch (imgError) {
        console.error('Failed to generate QR code preview image client-side:', imgError);
      }
      
      // First try the server action - this is the most reliable approach
      console.log('Attempting QR code update via server action');
      const result = await updateQRCodeWithURL(qrCodeId, newData);
      
      // If server action was successful, proceed with the result
      if (result.success) {
        console.log('Server action update successful');
        
        // Make sure we have an image URL - use client-generated one if needed
        const updatedData = {
          ...result.data,
          image_url: result.data.image_url || clientImageUrl
        };
        
        // Update local state with both new data and image
        setQRCodes(qrCodes.map(qr => 
          qr.id === qrCodeId ? updatedData : qr
        ));
        
        // Update cache with the updated QR code
        setQRCodeCache(prev => {
          const productId = selectedProduct.id;
          const updatedQRCodes = prev[productId]?.map(qr => 
            qr.id === qrCodeId ? updatedData : qr
          ) || [];
          
          return { ...prev, [productId]: updatedQRCodes };
        });
        
        toast({
          title: "QR Code updated",
          description: "QR code data and image have been updated successfully",
          variant: "default",
        });
        
        setSavingQRCode(false);
        return;
      }
      
      // If server action failed, try direct API call
      console.log('Server action failed, trying API endpoint');
      
      // Simple fetch to the API endpoint without authentication restrictions
      const apiResponse = await fetch('/api/iqr/qr-codes/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrCodeId,
          customURL: newData,
        }),
      });
      
      if (!apiResponse.ok) {
        const apiError = await apiResponse.json();
        throw new Error(`API update failed: ${apiError.error || apiResponse.statusText}`);
      }
      
      const apiResult = await apiResponse.json();
      
      if (!apiResult.success) {
        throw new Error(apiResult.error || 'API update failed with unknown error');
      }
      
      console.log('API route update successful');
      
      // Make sure we have an image URL - use client-generated one if needed
      const apiResultWithImage = { 
        ...apiResult,
        data: {
          ...apiResult.data,
          image_url: apiResult.data.image_url || clientImageUrl
        }
      };
      
      // Update local state with both new data and image
      setQRCodes(qrCodes.map(qr => 
        qr.id === qrCodeId ? apiResultWithImage.data : qr
      ));
      
      // Update cache with the updated QR code
      setQRCodeCache(prev => {
        const productId = selectedProduct.id;
        const updatedQRCodes = prev[productId]?.map(qr => 
          qr.id === qrCodeId ? apiResultWithImage.data : qr
        ) || [];
        
        return { ...prev, [productId]: updatedQRCodes };
      });
      
      toast({
        title: "QR Code updated",
        description: "QR code data and image have been updated successfully",
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error updating QR code:', error);
      toast({
        title: "QR Code update failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setSavingQRCode(false);
    }
  };

  // Add a function to update preview state
  const updatePreviewWithQuery = (query: string, qrCodeId?: string) => {
    if (!selectedProduct) return;
    
    // Use proper URL creation with encoding
    const url = createQRCodeURL(businessId, query);
    setPreviewQuery(query);
    setPreviewURL(url);
    
    // Generate image preview immediately when query changes
    try {
      QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).then(imageData => {
        // Update preview image immediately
        let imageElement: HTMLImageElement | null = null;
        
        if (qrCodeId) {
          // If we have a specific QR code ID, update just that one
          imageElement = document.getElementById(`qr-preview-image-${qrCodeId}`) as HTMLImageElement;
        } else {
          // Otherwise look for any preview image
          imageElement = document.querySelector('.qr-preview-image') as HTMLImageElement;
        }
        
        if (imageElement) {
          imageElement.src = imageData;
          imageElement.classList.add('opacity-100');
          imageElement.classList.remove('opacity-0');
          
          // Hide skeleton when image is loaded
          const parent = imageElement.parentElement;
          if (parent) {
            const skeleton = parent.querySelector('.skeleton-loader');
            if (skeleton) {
              skeleton.classList.add('hidden');
            }
          }
        }
      });
    } catch (error) {
      console.error('Error generating preview QR code:', error);
    }
  };

  const checkForEmptyQRCodes = async () => {
    setQrUpdateStatus({
      loading: true,
      message: "Checking for QR codes that need images...",
      error: null
    });
    
    try {
      const result = await updateEmptyQRCodeImagesAction();
      
      if (result.success) {
        if (result.updated > 0) {
          setQrUpdateStatus({
            loading: false,
            message: `Updated ${result.updated} QR code images successfully.`,
            error: null
          });
          
          // Refresh the product list since QR images may have changed
          fetchProducts();
        } else {
          setQrUpdateStatus({
            loading: false,
            message: "No QR codes needed updating.",
            error: null
          });
        }
      } else {
        setQrUpdateStatus({
          loading: false,
          message: null,
          error: `Failed to update some QR codes. Updated: ${result.updated}, Failed: ${result.failed}`
        });
      }
    } catch (error) {
      console.error('Error checking for empty QR codes:', error);
      setQrUpdateStatus({
        loading: false,
        message: null,
        error: 'An unexpected error occurred while updating QR codes'
      });
    }
  };

  // Add useEffect for initial load only, separate from refresh button
  useEffect(() => {
    // Only fetch on initial mount
    if (initialLoad) {
      fetchProducts().then(() => {
        setInitialLoad(false);
      });
    }
  }, [initialLoad, businessId]); // Only run on initial render and if businessId changes

  // Render component
  return (
    <Card className="bg-card text-card-foreground card-shadow border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-iqr-400 text-xl">
          Products & QR Codes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && products.length === 0 ? (
          // Show skeleton loader only for initial load
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/4" />
            </div>
            <div className="rounded-md border">
              <div className="h-10 bg-secondary px-4 flex items-center">
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/6 ml-auto" />
              </div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border-t">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-9 w-16" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold tracking-tight">Products</h2>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refreshProductData()}
                  disabled={isRefreshingInBackground}
                  className="h-8 px-2 text-iqr-400"
                >
                  {isRefreshingInBackground ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                      <div className="flex items-center">
                        Product Name
                        {sortField === 'name' && (
                          <ArrowUpDown className={`h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="hidden md:table-cell cursor-pointer" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center">
                        Created
                        {sortField === 'created_at' && (
                          <ArrowUpDown className={`h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedProducts().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No products found. Create a product to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    getSortedProducts().map((product) => {
                      const statusDisplay = getStatusDisplay(product.status);
                      
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">{
                              product.description 
                                ? (product.description.length > 60 
                                    ? product.description.substring(0, 60) + '...' 
                                    : product.description)
                                : 'No description'
                            }</div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatDate(product.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("font-medium", statusDisplay.color)}>
                              {statusDisplay.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openQRCodeDrawer(product)}
                                className="h-8 px-2 text-iqr-400"
                              >
                                <QrCode className="h-4 w-4" />
                                <span className="sr-only md:not-sr-only md:ml-2">QR Codes</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditProductDrawer(product)}
                                className="h-8 px-2 text-iqr-400"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only md:not-sr-only md:ml-2">Edit</span>
                              </Button>
                              {product.status && VALID_PRODUCT_STATUSES.includes(product.status) && (
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`status-${product.id}`}
                                    checked={product.status === 'ready'}
                                    onCheckedChange={() => toggleProductStatus(product.id, product.status)}
                                  />
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Product Edit Drawer */}
            <Drawer open={isProductDrawerOpen} onOpenChange={setIsProductDrawerOpen}>
              <DrawerContent>
                <div className="mx-auto w-full max-w-lg">
                  <DrawerHeader>
                    <DrawerTitle>Edit Product</DrawerTitle>
                    <DrawerDescription>
                      Update product details, description and PDF
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4 pb-0">
                    {editError && (
                      <Alert className="mb-4 bg-red-50 text-red-800 border-red-200">
                        <AlertDescription>
                          {editError}
                        </AlertDescription>
                      </Alert>
                    )}
                    {editSuccess && (
                      <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                        <AlertDescription>
                          {editSuccess}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name</Label>
                        <Input 
                          id="name" 
                          value={editedName} 
                          onChange={(e) => setEditedName(e.target.value)}
                          placeholder="Enter product name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea 
                          id="description" 
                          value={editedDescription} 
                          onChange={(e) => setEditedDescription(e.target.value)}
                          placeholder="Enter product description"
                          className="min-h-[100px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="system_prompt">System Prompt (Optional)</Label>
                        <Textarea 
                          id="system_prompt" 
                          value={editedSystemPrompt} 
                          onChange={(e) => setEditedSystemPrompt(e.target.value)}
                          placeholder="Custom system prompt for AI"
                          className="min-h-[100px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pdf">Update PDF (Optional)</Label>
                        <Input 
                          id="pdf" 
                          type="file" 
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.type === 'application/pdf') {
                              setSelectedFile(file);
                            } else {
                              setSelectedFile(null);
                            }
                          }}
                        />
                        {selectedFile && (
                          <p className="text-sm text-iqr-300">
                            Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <DrawerFooter>
                    <Button 
                      onClick={handleUpdateProduct} 
                      disabled={editLoading || !editedName.trim()}
                      className="bg-iqr-200 hover:bg-iqr-300"
                    >
                      {editLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <DrawerClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
            
            {/* QR Code Drawer */}
            <Drawer open={isQRCodeDrawerOpen} onOpenChange={setIsQRCodeDrawerOpen}>
              <DrawerContent className="bg-black text-white">
                <div className="mx-auto w-full max-w-lg">
                  <DrawerHeader>
                    <DrawerTitle className="flex items-center text-white">
                      {selectedProduct ? `QR Codes for ${selectedProduct.name}` : 'QR Codes'}
                      {qrCodesLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin text-iqr-300" />}
                    </DrawerTitle>
                    <DrawerDescription className="text-gray-400">
                      View and download QR codes for this product
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4 pb-0">
                    {qrCodesLoading ? (
                      <div className="space-y-4 pb-4">
                        {[...Array(1)].map((_, i) => (
                          <div key={i} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <Skeleton className="h-4 w-1/3" />
                              <Skeleton className="h-8 w-8" />
                            </div>
                            <div className="flex justify-center">
                              <Skeleton className="h-48 w-48 rounded-md" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : qrCodeDrawerError ? (
                      <div className="text-center py-6">
                        <X className="h-12 w-12 mx-auto text-red-500 opacity-80 mb-3" />
                        <h3 className="text-xl font-medium text-red-700 mb-1">Connection Error</h3>
                        <p className="text-muted-foreground mb-2">
                          {qrCodeDrawerError}
                        </p>
                        <div className="flex flex-col gap-2 items-center">
                          <Button 
                            variant="outline" 
                            className="mt-2"
                            onClick={() => selectedProduct && fetchQRCodesForProduct(selectedProduct.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Create a new Supabase client temporarily with specific headers for debugging
                              const debugClient = createClientComponentClient({
                                options: {
                                  global: {
                                    headers: {
                                      'X-Debug-Mode': 'true'
                                    }
                                  }
                                }
                              });
                              
                              // Try a debug fetch with this client
                              console.log('Attempting debug fetch with custom client');
                              if (selectedProduct) {
                                debugClient
                                  .from('qr_codes')
                                  .select('*')
                                  .eq('product_id', selectedProduct.id)
                                  .then(result => {
                                    console.log('Debug query result:', result);
                                    toast({
                                      title: "Debug Info",
                                      description: `Query result: ${result.data ? result.data.length + ' items' : 'No data'} ${result.error ? '- Error: ' + result.error.message : ''}`,
                                    });
                                  });
                              }
                            }}
                            className="text-sm text-muted-foreground"
                          >
                            Run Diagnostics
                          </Button>
                          <Button
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              // Reset everything and try again with a completely fresh state
                              console.log('Resetting QR code cache and state');
                              
                              // Clear all caches
                              setQRCodeCache({});
                              
                              // Close the drawer to reset the UI
                              setIsQRCodeDrawerOpen(false);
                              
                              // Show feedback
                              toast({
                                title: "Reset Complete",
                                description: "Cache and state have been reset. Please try again.",
                                variant: "default",
                              });
                              
                              // Delay reopening to ensure complete reset
                              setTimeout(() => {
                                if (selectedProduct) {
                                  openQRCodeDrawer(selectedProduct);
                                }
                              }, 1000);
                            }}
                            className="text-sm text-muted-foreground"
                          >
                            Reset & Reload
                          </Button>
                        </div>
                      </div>
                    ) : qrCodes.length === 0 ? (
                      <div className="text-center py-6">
                        <QrCode className="h-12 w-12 mx-auto text-iqr-300 opacity-20 mb-3" />
                        <h3 className="text-xl font-medium text-iqr-400 mb-1">No QR Codes Available</h3>
                        <p className="text-muted-foreground">
                          {selectedProduct && selectedProduct.status !== 'ready' ? 
                            `This product has status "${getStatusDisplay(selectedProduct.status).label}" and needs to be ready before QR codes can be generated.` : 
                            "There are no QR codes generated for this product yet."}
                        </p>
                        {selectedProduct && selectedProduct.status === 'ready' && (
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => selectedProduct && fetchQRCodesForProduct(selectedProduct.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Check Again
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 pb-4">
                        {qrCodes.map((qrCode) => (
                          <div key={qrCode.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <p className="text-sm text-muted-foreground">
                                Created: {formatDate(qrCode.created_at)}
                              </p>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(qrCode.data);
                                    toast({
                                      title: "Copied!",
                                      description: "QR code URL copied to clipboard",
                                      duration: 2000,
                                    });
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    className="lucide lucide-clipboard"
                                  >
                                    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                  </svg>
                                  <span className="sr-only">Copy URL</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => selectedProduct && downloadQRCode(qrCode, selectedProduct.name)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Download</span>
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-col gap-4 items-center">
                              {/* Add loading state for image */}
                              <div className="relative w-48 h-48">
                                {/* Use the preview URL if set, otherwise use the stored QR code */}
                                <img 
                                  id={`qr-preview-image-${qrCode.id}`}
                                  key={`${qrCode.id}-${previewURL}`}
                                  src={previewURL || qrCode.image_url} 
                                  alt="QR Code" 
                                  loading="eager"
                                  onLoad={(e) => {
                                    // Mark as loaded once the image is fully loaded
                                    (e.target as HTMLImageElement).classList.add('opacity-100');
                                    (e.target as HTMLImageElement).classList.remove('opacity-0');
                                    // Hide the skeleton loader when image is loaded
                                    const parent = (e.target as HTMLImageElement).parentElement;
                                    if (parent) {
                                      const skeleton = parent.querySelector('.skeleton-loader');
                                      if (skeleton) {
                                        skeleton.classList.add('hidden');
                                      }
                                    }
                                  }}
                                  style={{
                                    transition: 'opacity 0.3s ease',
                                  }}
                                  className="h-48 w-48 object-contain opacity-0 z-10 relative qr-preview-image"
                                />
                                {/* Show skeleton while loading */}
                                <div className="absolute inset-0 flex items-center justify-center skeleton-loader">
                                  <Skeleton className="h-48 w-48 rounded-md" />
                                </div>
                              </div>
                              
                              {/* QR code URL preview */}
                              <div className="w-full mt-3">
                                <div className="flex justify-between items-center mb-2">
                                  <Label htmlFor={`qr-url-preview-${qrCode.id}`} className="text-sm font-medium text-white">
                                    QR Code URL (Preview)
                                  </Label>
                                </div>
                                <Textarea
                                  id={`qr-url-preview-${qrCode.id}`}
                                  value={previewURL || qrCode.data}
                                  readOnly
                                  className="pr-4 font-mono text-sm min-h-[80px] bg-gray-800 text-white border-gray-700"
                                />
                              </div>
                              
                              {/* Query editor */}
                              <div className="w-full mt-3">
                                <div className="flex justify-between items-center mb-2">
                                  <Label htmlFor={`qr-query-edit-${qrCode.id}`} className="text-sm font-medium text-white">
                                    Edit Query
                                  </Label>
                                </div>
                                <div className="space-y-2">
                                  <Input
                                    id={`qr-query-edit-${qrCode.id}`}
                                    value={previewQuery || (qrCode.data ? formatQueryForDisplay(extractQueryFromURL(qrCode.data)) : '')}
                                    onChange={(e) => {
                                      // Get clean query text without URL encoding
                                      const cleanQueryText = e.target.value;
                                      updatePreviewWithQuery(cleanQueryText, qrCode.id);
                                    }}
                                    className="font-mono text-sm bg-gray-800 text-white border-gray-700"
                                    placeholder="Enter query text (e.g. 'iPhone 14 Pro describe')"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={savingQRCode || !previewURL}
                                      onClick={() => {
                                        setPreviewQuery('');
                                        setPreviewURL('');
                                      }}
                                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                    >
                                      Reset
                                    </Button>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      disabled={savingQRCode || !previewURL}
                                      onClick={() => updateQRCodeData(qrCode.id, previewURL)}
                                      className="bg-iqr-200 hover:bg-iqr-300 text-black"
                                    >
                                      {savingQRCode ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <Save className="h-4 w-4 mr-2" />
                                          Save QR Code
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <DrawerFooter className="border-t border-gray-800">
                    <DrawerClose asChild>
                      <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">Close</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
          </>
        )}
      </CardContent>
    </Card>
  );
};
