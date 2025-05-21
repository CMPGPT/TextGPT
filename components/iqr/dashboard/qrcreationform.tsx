import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, FileText, Upload, RefreshCw, Loader2, CheckCircle2, XCircle, Cog } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ProcessingStatusBar } from './processingstatusbar';
import { generateQRCodeForProduct } from '@/app/actions/iqr/qrcode';

// Enhanced console logging with context
const log = (message: string, data?: any) => {
  console.log(`[QRCreationForm] ${message}`, data || '');
};

// Enhanced error logging
const logError = (context: string, error: any) => {
  console.error(`[QRCreationForm][ERROR][${context}]`, error);
};

interface QRCreationFormProps {
  businessId: string;
  onDataUpdate?: (data: any) => void;
  cachedData?: any;
}

export const QRCreationForm = ({ businessId, onDataUpdate, cachedData }: QRCreationFormProps) => {
  const supabase = createClientComponentClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form fields
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("No file chosen");
  
  // State variables
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<any>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [processingStage, setProcessingStage] = useState<string>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking'>('idle');
  
  // Dialog control
  const [showFallbackDialog, setShowFallbackDialog] = useState(false);
  const [showPdfProcessingFailedDialog, setShowPdfProcessingFailedDialog] = useState(false);
  
  // Data tracking
  const [productCreationData, setProductCreationData] = useState<any>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [showProcessingBar, setShowProcessingBar] = useState(false);
  const [processingLogs, setProcessingLogs] = useState<{stage: string, message: string}[]>([]);
  
  // Status polling
  const [statusPollingInterval, setStatusPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Function to add a processing log entry
  const addProcessingLog = (stage: string, message: string) => {
    setProcessingLogs(prev => [...prev, { stage, message }]);
  };
  
  // Start polling for status updates with enhanced tracking
  const startStatusPolling = (productId: string) => {
    // Clear any existing interval
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
    }
    
    log('Starting status polling for product', { productId });
    
    // Log the polling start to the database
    supabase.from('processing_logs').insert({
      product_id: productId,
      action: 'polling_started',
      details: { 
        timestamp: new Date().toISOString(),
        client: 'qrcreationform' 
      }
    }).then(({ error }) => {
      if (error) logError('DB log polling start', error);
    });
    
    // Poll every 2 seconds
    const interval = setInterval(async () => {
      try {
        log(`Checking status for product ID: ${productId}`);
        
        // Use the consolidated endpoint for PDF processing status
        const response = await fetch(`/api/pdf-manual?operation=status&productId=${productId}`);
        
        // Log each status check to the database for audit trail
        await supabase.from('processing_logs').insert({
          product_id: productId,
          action: 'polling_check',
          details: { 
            timestamp: new Date().toISOString(),
            responseStatus: response.status 
          }
        });
        
        if (!response.ok) {
          const errorMessage = `Status check failed with status ${response.status}`;
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          const errorMessage = result.error || 'Failed to check processing status';
          throw new Error(errorMessage);
        }
        
        // Update UI based on status
        setProcessingStage(result.status);
        setUploadProgress(result.progressPercent || 0);
        
        // Log the status check result to the database
        await supabase.from('processing_logs').insert({
          product_id: productId,
          action: 'status_received',
          details: { 
            status: result.status,
            progress: result.progressPercent || 0,
            chunkCount: result.chunkCount || 0,
            timestamp: new Date().toISOString() 
          }
        });
        
        // Add log based on status change
        if (result.status === 'completed') {
          addProcessingLog('completed', 'Processing completed successfully');
          
          // Log completion to database
          await supabase.from('processing_logs').insert({
            product_id: productId,
            action: 'client_completed',
            details: { 
              timestamp: new Date().toISOString(),
              source: 'qrcreationform'
            }
          });
          
          clearInterval(interval);
          setStatusPollingInterval(null);
          
          // Complete the form submission process
          await finishFormSubmission(productId);
        } else if (result.status === 'failed') {
          const errorDetails = result.metadata?.pdfProcessingError || 'Unknown error';
          addProcessingLog('failed', `Processing failed: ${errorDetails}`);
          
          // Log failure to database
          await supabase.from('processing_logs').insert({
            product_id: productId,
            action: 'client_processing_failed',
            details: { 
              timestamp: new Date().toISOString(),
              error: errorDetails
            }
          });
          
          clearInterval(interval);
          setStatusPollingInterval(null);
          
          // Show the failed dialog but allow the product to be created
          setShowPdfProcessingFailedDialog(true);
        } else {
          // For stages: starting, uploading, extracting, chunking, embedding, etc.
          // Only add a log if the stage changed
          if (result.status !== processingStage) {
            const stageMessages = {
              'starting': 'Starting PDF processing',
              'uploading': 'Uploading PDF to secure storage',
              'extracting': 'Extracting text content from PDF',
              'chunking': 'Splitting content into optimal chunks',
              'embedding': 'Creating AI-searchable embeddings',
              'processing': 'Processing document'  // Generic fallback
            };
            
            const stageMessage = stageMessages[result.status as keyof typeof stageMessages] || 
                              `Processing stage: ${result.status}`;
            
            addProcessingLog(result.status, stageMessage);
            
            // Log stage change to database
            await supabase.from('processing_logs').insert({
              product_id: productId,
              action: 'client_stage_change',
              details: { 
                timestamp: new Date().toISOString(),
                previousStage: processingStage,
                newStage: result.status,
                message: stageMessage
              }
            });
          }
        }
      } catch (err: any) {
        logError('Status polling', err);
        
        // Log error to database
        await supabase.from('processing_logs').insert({
          product_id: productId,
          action: 'polling_error',
          details: { 
            timestamp: new Date().toISOString(),
            error: err instanceof Error ? err.message : String(err)
          }
        }).then(({ error: dbErr }) => {
          if (dbErr) logError('DB log error', dbErr);
        });
        
        // Don't stop polling on error - it might be temporary
        addProcessingLog('error', `Status check error: ${err.message}`);
      }
    }, 2000);
    
    setStatusPollingInterval(interval);
  };

  // Use cached data if available
  useEffect(() => {
    if (cachedData && initialLoad && !loading) {
      // No need to restore form state from cache since this is a form
      // but we can track the initialization
      setInitialLoad(false);
      
      // Update the parent with form data if needed
      if (onDataUpdate) {
        onDataUpdate({ formInitialized: true });
      }
    }
  }, [cachedData, initialLoad, loading, onDataUpdate]);

  // Verify the API endpoint is available when component mounts but don't show loading
  useEffect(() => {
    const checkApiEndpoint = async () => {
      try {
        setApiStatus('checking');
        // Do a preflight check of the API to ensure it's available
        const response = await fetch('/api/iqr/scan', { 
          method: 'OPTIONS',
        });
        
        if (response.ok) {
          log('API endpoint check succeeded');
          setApiStatus('idle');
        } else {
          log('API endpoint check failed with status', response.status);
          setApiStatus('idle');
        }
      } catch (err) {
        logError('API endpoint check', err);
        setApiStatus('idle');
      }
    };
    
    // Only run this check once on mount
    checkApiEndpoint();
  }, []);

  // Form validation logic
  const isFormValid = () => {
    return productName.trim().length > 0;
  };

  // Handle PDF file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please select a valid PDF file.');
        return;
      }
      
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const getProcessingStageName = (stage: string) => {
    switch (stage) {
      case 'starting': return 'Initializing';
      case 'uploading': return 'Uploading PDF';
      case 'extracting': return 'Extracting text';
      case 'chunking': return 'Optimizing content';
      case 'embedding': return 'Creating embeddings';
      case 'completed': return 'Complete';
      case 'failed': return 'Failed';
      case 'processing': return 'Processing document';
      default: return 'Processing';
    }
  };

  const getProcessingStageIcon = (stage: string) => {
    switch (stage) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
      case 'chunking':
      case 'embedding':
        return <Cog className="h-4 w-4 animate-spin" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const handleSubmitWithoutPdf = async () => {
    setShowFallbackDialog(false);
    
    // Generate a product ID if we don't have one yet
    const productId = createdProductId || uuidv4();
    if (!createdProductId) {
      setCreatedProductId(productId);
    }
    
    // Finish submission without PDF processing
    await finishFormSubmission(productId);
  };
  
  const handleContinueWithoutPdfProcessing = async () => {
    setShowPdfProcessingFailedDialog(false);
    
    // Continue with finalizing the product even though PDF processing failed
    if (createdProductId) {
      await finishFormSubmission(createdProductId);
    }
  };
  
  const finishFormSubmission = async (productId: string) => {
    setUploadProgress(90);
    setProcessingStage('finalizing');
    
    addProcessingLog('finalizing', 'Finalizing product creation');
    
    setSuccess('Product created successfully!');
    setLoading(false);
    setSuccess('Your product has been created successfully!');
    
    // Clear form
    setProductName('');
    setProductDescription('');
    setSystemPrompt('');
    setSelectedFile(null);
    setFileName("No file chosen");
    setUploadProgress(0);
    setProcessingStage('idle');
    setProcessingLogs([]);
    
    // Generate QR Code for the product - with robust retries
    let qrCodeSuccess = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!qrCodeSuccess && attempts < maxAttempts) {
      attempts++;
      
      try {
        addProcessingLog('qrcode', attempts > 1 ? 
          `Generating QR code for product (attempt ${attempts})` : 
          'Generating QR code for product');
        
        const qrCodeResult = await generateQRCodeForProduct({
          productId,
          productName,
          businessId
        });
        
        if (qrCodeResult.success) {
          qrCodeSuccess = true;
          addProcessingLog('completed', 'QR code generated successfully');
        } else {
          addProcessingLog('warning', `QR code generation attempt ${attempts} failed: ${qrCodeResult.error}`);
          console.error(`QR code generation attempt ${attempts} failed:`, qrCodeResult.error);
          
          if (attempts < maxAttempts) {
            // Add a small delay between attempts
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (err: any) {
        addProcessingLog('warning', `QR code generation attempt ${attempts} error: ${err.message}`);
        console.error(`QR code generation attempt ${attempts} error:`, err);
        
        if (attempts < maxAttempts) {
          // Add a small delay between attempts
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!qrCodeSuccess) {
      addProcessingLog('error', `Failed to generate QR code after ${maxAttempts} attempts. The product was created but may need manual QR code generation.`);
      
      // Log this critical error to the database for monitoring
      try {
        await supabase.from('processing_logs').insert({
          product_id: productId,
          action: 'qr_code_generation_failed',
          details: { 
            timestamp: new Date().toISOString(),
            attempts,
            businessId
          }
        });
      } catch (logErr) {
        console.error('Error logging QR code failure:', logErr);
      }
    }
    
    // Reset product creation tracking
    setCreatedProductId(null);
    setProductCreationData(null);
    
    // Notify parent of data update
    if (onDataUpdate) {
      onDataUpdate({ 
        productCreated: true,
        productId
      });
    }
  };

  const submitForm = async () => {
    try {
      setLoading(true);
      setError(null);
      setDetailedError(null);
      setShowFallbackDialog(false);
      setProcessingLogs([]);

      // Generate a product ID if we don't have one yet
      const productId = createdProductId || uuidv4();
      if (!createdProductId) {
        setCreatedProductId(productId);
      }
      
      log('Starting product creation', { productId, businessId });
      addProcessingLog('starting', 'Starting product creation');
      
      // Initial progress update
      setUploadProgress(10);
      setProcessingStage('starting');
      setSuccess('Creating product...');
      
      // Prepare form data
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('businessId', businessId);
      formData.append('productName', productName);
      formData.append('productDescription', productDescription);
      formData.append('systemPrompt', systemPrompt);
      formData.append('serviceType', 'product-pdf');
      
      // Add the file if it exists (PDF processing is optional)
      if (selectedFile) {
        formData.append('file', selectedFile);
        addProcessingLog('upload', `Uploading file: ${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`);
      }
      
      setUploadProgress(20);
      
      try {
        log('Starting PDF processing', { 
          file: selectedFile?.name,
          size: selectedFile?.size,
          productId, 
          businessId 
        });
        
        // Call our new direct PDF processing endpoint
        const response = await fetch('/api/iqr/pdf-process', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          // If we get a network-level error, try the fallback approach
          log('PDF processing request failed with status', response.status);
          throw new Error(`Request failed with status ${response.status}`);
        }
        
        const result = await response.json();
        log('PDF processing response', result);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to process product');
        }
        
        // If we have a file, we need to monitor the processing status
        if (selectedFile) {
          addProcessingLog('submitted', 'PDF processing initiated');
          
          // Start polling for status updates
          startStatusPolling(productId);
        } else {
          // No PDF processing needed, finish up
          addProcessingLog('completed', 'Product created successfully');
          await finishFormSubmission(productId);
        }
      } catch (processError: any) {
        logError('PDF processing', processError);
        setDetailedError(processError);
        
        if (processError.message.includes('status 413')) {
          setError('The PDF file is too large. Please use a smaller file (< 10MB).');
          // Reset loading state so user can try again
          setLoading(false);
          setUploadProgress(0);
          setProcessingStage('idle');
        } else if (selectedFile) {
          // If we had a file, show the processing failed dialog
          setShowPdfProcessingFailedDialog(true);
        } else {
          // No file and error, just show the error
          setLoading(false);
          setError('Failed to create product. Please try again.');
          setProcessingStage('idle');
        }
      }
    } catch (err: any) {
      logError('Submit form', err);
      setLoading(false);
      setError('Failed to create product. Please try again.');
      setDetailedError(err);
      setUploadProgress(0);
      setProcessingStage('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setDetailedError(null);
    log('Retrying submission', { retryCount: retryCount + 1 });
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="space-y-2 mb-6 pt-5">
        <h1 className="text-3xl font-bold tracking-tight">Create New Product</h1>
        <p className="text-muted-foreground">
          Create a product with QR code for customers to access information. PDF documentation is optional.
        </p>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div>{error}</div>
            {detailedError && (
              <details className="text-xs">
                <summary>Technical details</summary>
                <pre className="mt-2 p-2 bg-gray-800 rounded text-white overflow-auto">
                  {JSON.stringify(detailedError, null, 2)}
                </pre>
              </details>
            )}
            {error.includes('failed with status 404') && (
              <div className="text-xs mt-1">
                The API endpoint could not be found. This might be due to:
                <ul className="list-disc pl-5 mt-1">
                  <li>The server might still be starting up</li>
                  <li>The API route might not be deployed correctly</li>
                  <li>There might be a network connectivity issue</li>
                </ul>
              </div>
            )}
            {retryCount > 0 && (
              <div className="text-xs mt-1">
                Retry count: {retryCount}
              </div>
            )}
            <Button 
              size="sm" 
              className="mt-2" 
              onClick={handleRetry}
              variant="outline">
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-600/20 text-green-600 border-green-600/10 mb-6">
          <FileText className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className={loading ? 'space-y-8 opacity-50 pointer-events-none' : 'space-y-8'}>
        <Card className="p-6 border-muted bg-card/30 backdrop-blur-sm">
          <div className="grid gap-6">
            <div className="grid gap-3">
              <Label htmlFor="productName" className="text-sm font-medium">
                Product Name
              </Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., SmartWatch XYZ"
                disabled={loading}
                required
                className="border-input/50 bg-secondary/50"
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="fileUpload" className="text-sm font-medium">
                    Product Documentation (PDF)
                  </Label>
                  <span className="text-xs text-muted-foreground">(Optional)</span>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="file-input-wrapper">
                    <Button
                      type="button"
                      variant="secondary"
                      className="relative flex gap-2 items-center"
                      disabled={loading}
                    >
                      <Upload className="h-4 w-4" />
                      Choose file
                      <input
                        type="file"
                        id="fileUpload"
                        accept=".pdf"
                        onChange={handleFileChange}
                        disabled={loading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {selectedFile && (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
                    {fileName}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid gap-3">
              <Label htmlFor="productDescription" className="text-sm font-medium">
                Product Description
              </Label>
              <Textarea
                id="productDescription"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Describe your product's features and intended use..."
                disabled={loading}
                rows={4}
                className="border-input/50 bg-secondary/50 resize-none"
              />
            </div>
            
            <div className="grid gap-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="systemPrompt" className="text-sm font-medium">
                  System Prompt
                </Label>
                <span className="text-xs text-muted-foreground">(Optional)</span>
              </div>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Custom instructions for the AI when responding to queries about this product..."
                disabled={loading}
                rows={4}
                className="border-input/50 bg-secondary/50 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Custom instructions for the AI when responding to queries about this product
              </p>
            </div>
          </div>
        </Card>
        
        {loading && (
          <Card className="p-6 border-muted bg-slate-50/80 backdrop-blur-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="font-medium text-sm">
                    {processingStage === 'idle' ? 'Creating product...' : 
                     processingStage === 'uploading' ? 'Uploading PDF...' : 
                     processingStage === 'completed' ? 'Complete!' : 
                     'Processing...'}
                  </span>
                </div>
                {uploadProgress > 0 && (
                  <Badge variant="outline" className="bg-white text-xs">{Math.round(uploadProgress)}%</Badge>
                )}
              </div>
              
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-in-out rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              
              {/* Simple status message */}
              {processingStage !== 'idle' && processingStage !== 'completed' && (
                <p className="text-xs text-slate-500 text-center">
                  {processingStage === 'uploading' ? 'Uploading document to secure storage' :
                   processingStage === 'extracting' ? 'Extracting content from PDF' :
                   processingStage === 'chunking' ? 'Preparing document for AI' :
                   processingStage === 'embedding' ? 'Creating AI searchable data' :
                   processingStage === 'failed' ? 'Processing failed, but product was created' :
                   'Processing your document'}
                </p>
              )}
            </div>
          </Card>
        )}
        
        <div className="flex justify-start">
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 gap-2"
            disabled={loading || apiStatus === 'checking' || !isFormValid()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : apiStatus === 'checking' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking API...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Create Product
              </>
            )}
          </Button>
        </div>
      </form>
      
      {/* Fallback Dialog for PDF Upload Issues */}
      <Dialog open={showFallbackDialog} onOpenChange={setShowFallbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PDF Upload Issue</DialogTitle>
            <DialogDescription>
              We're having trouble uploading your PDF. Would you like to continue creating this product without a PDF document?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>You can create the product now and add a PDF document later.</p>
            <p className="mt-2">Without a PDF, your product will still have a QR code but won't have document-based AI responses.</p>
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowFallbackDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={handleSubmitWithoutPdf}
            >
              Create Without PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Processing Failed Dialog */}
      <Dialog open={showPdfProcessingFailedDialog} onOpenChange={setShowPdfProcessingFailedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PDF Processing Issue</DialogTitle>
            <DialogDescription>
              Your product was created successfully, but we encountered an issue processing the PDF document.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>The product has been created and is ready to use, but the PDF content won't be available for AI responses.</p>
            <p className="mt-2">You can continue without PDF processing or try uploading the PDF again later.</p>
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={handleContinueWithoutPdfProcessing}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
