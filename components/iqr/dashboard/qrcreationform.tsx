import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, FileText, Upload, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

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
}

export const QRCreationForm = ({ businessId }: QRCreationFormProps) => {
  const supabase = createClientComponentClient();
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<any>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking'>('idle');
  const [showFallbackDialog, setShowFallbackDialog] = useState(false);
  const [skipPdfUpload, setSkipPdfUpload] = useState(false);
  const [attemptedWithoutPdf, setAttemptedWithoutPdf] = useState(false);

  // Verify the API endpoint is available when component mounts but don't show loading
  useEffect(() => {
    const checkApiEndpoint = async () => {
      try {
        setApiStatus('checking');
        // Do a preflight check of the API to ensure it's available
        const response = await fetch('/api/iqr/scan', { 
          method: 'OPTIONS',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          log('API endpoint /api/iqr/scan is available');
        } else {
          logError('API check', `API endpoint returned status ${response.status}`);
        }
      } catch (err) {
        logError('API check', err);
      } finally {
        setApiStatus('idle');
      }
    };

    // Check the API silently without showing loading state
    checkApiEndpoint();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== 'application/pdf') {
      setError('Only PDF files are supported');
      return;
    }
    setSelectedFile(file);
    setError(null);
    setDetailedError(null);
    log('File selected', { name: file?.name, size: file?.size });
  };

  const handleSubmitWithoutPdf = async () => {
    setShowFallbackDialog(false);
    setSkipPdfUpload(true);
    setAttemptedWithoutPdf(true);
    await submitForm(true);
  };

  const submitForm = async (skipPdf = false) => {
    setError(null);
    setDetailedError(null);
    setSuccess(null);
    setLoading(true);
    setUploadProgress(0);

    log('Form submitted', { 
      productName, 
      fileSelected: !!selectedFile,
      skipPdf,
      attemptedWithoutPdf,
      businessId,
      retryCount 
    });

    try {
      if (!productName.trim()) {
        throw new Error('Product name is required');
      }

      if (!skipPdf && !selectedFile) {
        throw new Error('PDF file is required or choose to create without PDF');
      }

      // Create FormData for API request
      const formData = new FormData();
      if (selectedFile && !skipPdf) {
        formData.append('file', selectedFile);
      }
      formData.append('businessId', businessId);
      formData.append('productName', productName);
      formData.append('productDescription', productDescription || '');
      formData.append('systemPrompt', systemPrompt || '');
      formData.append('skipPdfCheck', skipPdf ? 'true' : 'false');

      // Use the fetch API with better error handling
      try {
        log('Sending API request to /api/iqr/scan');
        
        // Use regular fetch instead of XMLHttpRequest to avoid CORS issues
        const baseUrl = typeof window !== 'undefined' 
          ? `${window.location.protocol}//${window.location.host}`
          : 'http://localhost:3000';
        
        const apiUrl = `${baseUrl}/api/iqr/scan`;
        log(`Making request to absolute URL: ${apiUrl}`);
        
        // If skipping PDF, simulate progress
        if (skipPdf) {
          setUploadProgress(50);
        }
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorStatus = response.status;
          let errorData = null;
          
          try {
            errorData = await response.json();
          } catch (e) {
            // Unable to parse JSON response
          }
          
          const errorMessage = errorData?.error || `Upload failed with status ${errorStatus}`;
          
          setDetailedError({
            status: errorStatus,
            statusText: response.statusText,
            data: errorData
          });
          
          // Only show fallback dialog for 405 errors and only if we haven't already tried without PDF
          if (errorStatus === 405 && !skipPdf && !attemptedWithoutPdf) {
            setShowFallbackDialog(true);
            setLoading(false);
            return; // Exit early to prevent throwing the error
          }
          
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        log('API response received', result);
        
        // Simulate the rest of the process
        setUploadProgress(80); // 80% after server processing starts
        
        // Poll for product status or just simulate completion after a delay
        setTimeout(() => {
          setUploadProgress(100);
          setSuccess(`Product "${productName}" created successfully ${result.skipPdfCheck ? 'without PDF' : ''} with QR code for tag: ${result.qrTextTag}`);
          
          // Reset form
          setProductName('');
          setProductDescription('');
          setSystemPrompt('');
          setSelectedFile(null);
          setLoading(false);
          setRetryCount(0); // Reset retry count on success
          setSkipPdfUpload(false); // Reset skip PDF flag
          setAttemptedWithoutPdf(false); // Reset attempted flag
        }, 2000);
      } catch (apiError: any) {
        logError('apiCall', apiError);
        throw apiError;
      }

    } catch (err: any) {
      logError('formSubmission', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
      
      // If we're seeing an error even after trying without PDF, reset the attempted flag
      // so user can try again if needed
      if (skipPdf && attemptedWithoutPdf) {
        setAttemptedWithoutPdf(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submitForm(skipPdfUpload);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setDetailedError(null);
    setAttemptedWithoutPdf(false);
    log('Retrying submission', { retryCount: retryCount + 1 });
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  const handleSkipPdfChange = (checked: boolean) => {
    setSkipPdfUpload(checked);
    if (checked) {
      setSelectedFile(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Create New Product</h2>
        <p className="text-muted-foreground text-sm">
          Upload a product PDF and create a product with QR code for customers to access information.
        </p>
      </div>
      
      {error && (
        <Alert variant="destructive">
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
        <Alert className="bg-green-600/20 text-green-600 border-green-600/10">
          <FileText className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name</Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., SmartWatch XYZ"
              disabled={loading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fileUpload" className="flex items-center justify-between">
              <span>Product Documentation (PDF)</span>
              <div className="text-xs text-muted-foreground">
                {skipPdfUpload ? '(Optional)' : '(Required)'}
              </div>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="fileUpload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={loading || skipPdfUpload}
                className="file:bg-iqr-200 file:text-black file:border-0 file:rounded file:px-2 file:py-1 file:mr-2 cursor-pointer"
                required={!skipPdfUpload}
              />
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <Checkbox 
                id="skipPdf" 
                checked={skipPdfUpload}
                onCheckedChange={(checked) => handleSkipPdfChange(checked === true)}
                disabled={loading}
              />
              <label
                htmlFor="skipPdf"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Create without PDF document
              </label>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="productDescription">Product Description</Label>
          <Textarea
            id="productDescription"
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="Describe your product's features and intended use..."
            disabled={loading}
            rows={2}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="systemPrompt">
            System Prompt (Optional)
            <span className="ml-1 text-muted-foreground text-xs font-normal">
              - Custom instructions for the AI when responding to queries about this product
            </span>
          </Label>
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful assistant for SmartWatch XYZ. Answer questions based on the product documentation..."
            disabled={loading}
            rows={3}
          />
        </div>
        
        {loading && (
          <div className="space-y-2">
            <div className="text-sm flex justify-between text-muted-foreground mb-1">
              <span>
                {skipPdfUpload 
                  ? (uploadProgress < 80 
                      ? 'Creating product...' 
                      : 'Generating QR code...')
                  : (uploadProgress < 70 
                      ? 'Uploading...' 
                      : uploadProgress < 80 
                        ? 'Processing PDF...' 
                        : uploadProgress < 100 
                          ? 'Generating QR code...' 
                          : 'Finalizing...')}
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-iqr-100/30 rounded-full h-2.5">
              <div 
                className="bg-iqr-200 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <Button
          type="submit"
          className="bg-iqr-200 text-black hover:bg-iqr-200/80"
          disabled={loading || apiStatus === 'checking'}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : apiStatus === 'checking' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking API...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Create Product
            </>
          )}
        </Button>
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
              className="bg-iqr-200 text-black hover:bg-iqr-200/80"
              onClick={handleSubmitWithoutPdf}
            >
              Create Without PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
