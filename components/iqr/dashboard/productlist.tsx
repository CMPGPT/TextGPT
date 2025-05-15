import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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
import { QrCode, ArrowUpDown, Edit, BarChartBig, Save, Trash, X, Download, RefreshCw } from 'lucide-react';
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
import { useDashboardCache } from '@/hooks/useDashboardCache';

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
}

export const ProductList = ({ businessId }: ProductListProps) => {
  const supabase = createClientComponentClient();
  const { cache, setCache, isDataCached } = useDashboardCache();
  const [products, setProducts] = useState<Product[]>([]);
  const [qrCodes, setQRCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
  const [qrCodeError, setQRCodeError] = useState<string | null>(null);

  // Drawers states
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [isQRCodeDrawerOpen, setIsQRCodeDrawerOpen] = useState(false);
  
  // Sort states
  const [sortField, setSortField] = useState<keyof Product>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    // Use cached data immediately if available to prevent loading screen on tab switch
    if (isDataCached('products')) {
      const cachedProducts = cache.products;
      if (cachedProducts) {
        console.log('Using cached products data on mount');
        setProducts(cachedProducts.productsList || []);
        
        // Fetch QR codes without showing loading state
        fetchQRCodes();
        
        // Only if this is new tab visit, fetch new data in background
        if (isInitialLoad) {
          // Fetch fresh data in background without showing loading state
          fetchProducts(false);
          setIsInitialLoad(false);
        }
        return;
      }
    }
    
    // No cache available, this is a true initial load
    if (isInitialLoad) {
      setLoading(true);
    }
    
    // Fetch data
    fetchProducts(isInitialLoad);
    fetchQRCodes();
    
    // Reset initial load flag
    setIsInitialLoad(false);
  }, [businessId]);

  const fetchProducts = async (showLoading = true) => {
    // Don't show loading if explicitly told not to
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId);
      
      if (error) throw error;
      
      setProducts(data || []);
      
      // Cache the products data
      setCache('products', data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*');
      
      if (error) throw error;
      
      setQRCodes(data || []);
    } catch (err) {
      console.error('Error fetching QR codes:', err);
    }
  };

  const toggleProductStatus = async (id: string, currentStatus: string | null) => {
    try {
      // For simplicity, we'll just toggle between 'ready' and 'processing'
      const newStatus = currentStatus === 'ready' ? 'processing' : 'ready';
      
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      const updatedProducts = products.map(product => 
        product.id === id ? { ...product, status: newStatus } : product
      );
      
      setProducts(updatedProducts);
      
      // Update cache
      setCache('products', updatedProducts);
    } catch (err) {
      console.error('Error updating product status:', err);
      setError('Failed to update product status');
    }
  };
  
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const sortedProducts = [...products].sort((a, b) => {
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle opening product edit drawer
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setEditedName(product.name);
    setEditedDescription(product.description || '');
    setEditedSystemPrompt(product.system_prompt || '');
    setSelectedFile(null);
    setEditError(null);
    setEditSuccess(null);
    setIsProductDrawerOpen(true);
  };

  // Handle opening QR code drawer
  const handleViewQRCode = (product: Product) => {
    setSelectedProduct(product);
    
    // Find QR code for this product
    const qrCode = qrCodes.find(qr => qr.product_id === product.id);
    setSelectedQRCode(qrCode || null);
    
    if (qrCode) {
      setQRCodeData(qrCode.data);
    } else {
      setQRCodeData(product.qr_text_tag || '');
    }
    
    setQRCodeError(null);
    setQRCodeSuccess(null);
    setIsQRCodeDrawerOpen(true);
  };

  // Handle file change for PDF upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== 'application/pdf') {
      setEditError('Only PDF files are supported');
      return;
    }
    setSelectedFile(file);
    setEditError(null);
  };

  // Handle saving product edits
  const handleSaveProduct = async () => {
    if (!selectedProduct) return;
    
    try {
      setEditLoading(true);
      setEditError(null);
      
      // Update product in database
      const { error } = await supabase
        .from('products')
        .update({
          name: editedName,
          description: editedDescription,
          system_prompt: editedSystemPrompt
        })
        .eq('id', selectedProduct.id);
      
      if (error) throw error;

      // Handle file upload if a new file is selected
      if (selectedFile) {
        // This is simplified. In a real app, you'd need to upload to storage
        // and process the PDF for AI/chatbot use as in the QRCreationForm
        const filePath = `products/${selectedProduct.id}/${selectedFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-pdfs')
          .upload(filePath, selectedFile, {
            upsert: true
          });
          
        if (uploadError) throw uploadError;
        
        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('product-pdfs')
          .getPublicUrl(filePath);
          
        // Update product with new PDF URL
        const { error: updateError } = await supabase
          .from('products')
          .update({
            pdf_url: urlData.publicUrl
          })
          .eq('id', selectedProduct.id);
          
        if (updateError) throw updateError;
      }
      
      setEditSuccess('Product updated successfully');
      
      // Update local state and cache with edited product
      const updatedProducts = products.map(product => 
        product.id === selectedProduct.id 
          ? { 
              ...product, 
              name: editedName, 
              description: editedDescription,
              system_prompt: editedSystemPrompt,
              // Only update pdf_url if a new file was uploaded
              ...(selectedFile ? { pdf_url: `products/${selectedProduct.id}/${selectedFile.name}` } : {})
            } 
          : product
      );
      
      setProducts(updatedProducts);
      
      // Update cache
      setCache('products', updatedProducts);
      
      // Close drawer after short delay
      setTimeout(() => {
        setIsProductDrawerOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Error updating product:', err);
      setEditError('Failed to update product');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle generating/updating QR code
  const handleGenerateQRCode = async () => {
    if (!selectedProduct) return;
    
    try {
      setQRCodeLoading(true);
      setQRCodeError(null);
      
      // In a real app, you would call an API to generate the QR code image
      // and save it to storage. Here we'll just update the data.
      
      // Check if QR code exists
      if (selectedQRCode) {
        // Update existing QR code
        const { error } = await supabase
          .from('qr_codes')
          .update({
            data: qrCodeData
          })
          .eq('id', selectedQRCode.id);
          
        if (error) throw error;
      } else {
        // Create new QR code
        // This would normally include generating the actual QR code image
        const { error } = await supabase
          .from('qr_codes')
          .insert({
            product_id: selectedProduct.id,
            data: qrCodeData,
            image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(qrCodeData)
          });
          
        if (error) throw error;
      }
      
      // Update the product's QR text tag
      const { error: updateError } = await supabase
        .from('products')
        .update({
          qr_text_tag: qrCodeData
        })
        .eq('id', selectedProduct.id);
        
      if (updateError) throw updateError;
      
      // Refresh data
      await fetchProducts();
      await fetchQRCodes();
      
      setQRCodeSuccess('QR code updated successfully');
      
      // Find updated QR code
      const { data } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('product_id', selectedProduct.id)
        .single();
        
      if (data) {
        setSelectedQRCode(data);
      }
      
    } catch (err) {
      console.error('Error updating QR code:', err);
      setQRCodeError(err instanceof Error ? err.message : 'Failed to update QR code');
    } finally {
      setQRCodeLoading(false);
    }
  };

  // Handle downloading QR code
  const handleDownloadQRCode = () => {
    if (!selectedQRCode) return;
    
    // Create a temporary link to download the image
    const link = document.createElement('a');
    link.href = selectedQRCode.image_url;
    link.download = `qrcode-${selectedProduct?.name || 'product'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Card className="bg-card text-card-foreground card-shadow border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-semibold flex items-center">
            <QrCode className="h-5 w-5 mr-2 text-iqr-200" />
            Your Products
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('name')}
                      className="flex items-center text-iqr-300 hover:text-iqr-400 p-0"
                    >
                      Product
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('created_at')}
                      className="flex items-center text-iqr-300 hover:text-iqr-400 p-0"
                    >
                      Created
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">QR Tag</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('status')}
                      className="flex items-center text-iqr-300 hover:text-iqr-400 p-0"
                    >
                      Status
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-iqr-300/70">
                      {/* Removed loading text */}
                    </TableCell>
                  </TableRow>
                ) : sortedProducts.length > 0 ? (
                  sortedProducts.map(product => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="truncate max-w-[300px]">
                          {product.description || 'No description'}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {product.created_at ? format(new Date(product.created_at), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{product.qr_text_tag || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={product.status === 'ready'} 
                            onCheckedChange={() => toggleProductStatus(product.id, product.status)}
                            className="data-[state=checked]:bg-iqr-200"
                          />
                          <Badge className={cn(
                            "text-xs",
                            product.status === 'ready' 
                              ? "bg-green-600/20 text-green-400" 
                              : product.status === 'failed'
                                ? "bg-red-600/20 text-red-400"
                                : "bg-blue-600/20 text-blue-400"
                          )}>
                            {product.status === 'ready' 
                              ? 'Active' 
                              : product.status === 'failed'
                                ? 'Failed'
                                : 'Processing'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleViewQRCode(product)}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <BarChartBig className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-iqr-300/70">
                      No products found. Create your first product in the Create Product tab.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Product Edit Drawer */}
      <Drawer open={isProductDrawerOpen} onOpenChange={setIsProductDrawerOpen}>
        <DrawerContent className="max-h-[90%] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>Edit Product: {selectedProduct?.name}</DrawerTitle>
            <DrawerDescription>
              Update product details and documentation
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 py-2">
            {editError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}
            
            {editSuccess && (
              <Alert className="mb-4 bg-green-600/20 text-green-600 border-green-600/10">
                <AlertDescription>{editSuccess}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Product Name"
                  disabled={editLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="productDescription">Product Description</Label>
                <Textarea
                  id="productDescription"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Describe your product..."
                  disabled={editLoading}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  value={editedSystemPrompt}
                  onChange={(e) => setEditedSystemPrompt(e.target.value)}
                  placeholder="Custom instructions for the AI..."
                  disabled={editLoading}
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fileUpload">Product Documentation (PDF)</Label>
                <div className="space-y-2">
                  {selectedProduct?.pdf_url && (
                    <div className="flex items-center justify-between p-2 bg-secondary rounded-md">
                      <div className="truncate flex-1">
                        Current PDF: {selectedProduct.pdf_url.split('/').pop()}
                      </div>
                      <a
                        href={selectedProduct.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-iqr-200 hover:underline"
                      >
                        View
                      </a>
                    </div>
                  )}
                  
                  <Input
                    id="fileUpload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={editLoading}
                    className="file:bg-iqr-200 file:text-white file:border-0 file:rounded file:px-2 file:py-1 file:mr-2 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
          <DrawerFooter>
            <Button 
              variant="default" 
              className="bg-iqr-200 text-white hover:bg-iqr-200/80"
              onClick={handleSaveProduct}
              disabled={editLoading}
            >
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* QR Code Drawer */}
      <Drawer open={isQRCodeDrawerOpen} onOpenChange={setIsQRCodeDrawerOpen}>
        <DrawerContent className="max-h-[90%] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>{selectedProduct?.name} QR Code</DrawerTitle>
            <DrawerDescription>
              View and manage product QR code
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 py-2">
            {qrCodeError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{qrCodeError}</AlertDescription>
              </Alert>
            )}
            
            {qrCodeSuccess && (
              <Alert className="mb-4 bg-green-600/20 text-green-600 border-green-600/10">
                <AlertDescription>{qrCodeSuccess}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-6">
              {selectedQRCode ? (
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={selectedQRCode.image_url} 
                    alt="QR Code" 
                    className="w-48 h-48 object-contain mb-4" 
                  />
                  <div className="text-sm text-center text-gray-600">
                    Scan with a QR code reader to access product information
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 bg-secondary rounded-lg">
                  <div className="text-center text-muted-foreground">
                    No QR code found for this product. Generate one below.
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="qrCodeData">QR Code Data</Label>
                <Textarea
                  id="qrCodeData"
                  value={qrCodeData}
                  onChange={(e) => setQRCodeData(e.target.value)}
                  placeholder="Enter text to encode in the QR code"
                  disabled={qrCodeLoading}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This text will be encoded in the QR code. It can be a URL, product ID, or any text.
                </p>
              </div>
            </div>
          </div>
          <DrawerFooter className="flex-col gap-2 sm:flex-row">
            <Button 
              variant="default" 
              className="bg-iqr-200 text-white hover:bg-iqr-200/80 w-full sm:w-auto"
              onClick={handleGenerateQRCode}
              disabled={qrCodeLoading || !qrCodeData.trim()}
            >
              {qrCodeLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Generate QR Code
                </>
              )}
            </Button>
            
            {selectedQRCode && (
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={handleDownloadQRCode}
                disabled={qrCodeLoading}
              >
                <Download className="mr-2 h-4 w-4" />
                Download QR Code
              </Button>
            )}
            
            <DrawerClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};
