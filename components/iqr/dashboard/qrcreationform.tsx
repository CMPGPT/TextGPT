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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDetailedError(null);
    setSuccess(null);
    setLoading(true);
    setUploadProgress(0);

    log('Form submitted', { 
      productName, 
      fileSelected: !!selectedFile, 
      businessId,
      retryCount 
    });

    try {
      if (!productName.trim()) {
        throw new Error('Product name is required');
      }

      if (!selectedFile) {
        throw new Error('PDF file is required');
      }

      // Create FormData for API request
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('businessId', businessId);
      formData.append('productName', productName);
      formData.append('productDescription', productDescription || '');
      formData.append('systemPrompt', systemPrompt || '');

      // Use the fetch API with better error handling
      try {
        log('Sending API request to /api/iqr/scan');
        
        // Set up a fetch with upload progress tracking via XMLHttpRequest
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 70);
            setUploadProgress(percentage); // 70% for upload
          }
        });

        // Use a Promise to handle the XHR response
        const uploadPromise = new Promise<any>((resolve, reject) => {
          xhr.onload = () => {
            log(`XHR response received with status: ${xhr.status}`);
            
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (error) {
                const parseError = new Error('Invalid response format');
                logError('responseFormat', error);
                reject(parseError);
              }
            } else {
              let errorMessage = `Upload failed with status ${xhr.status}`;
              let responseData = null;
              
              try {
                responseData = JSON.parse(xhr.responseText);
                errorMessage = responseData.error || errorMessage;
              } catch (parseError) {
                logError('parseError', parseError);
              }
              
              const uploadError = new Error(errorMessage);
              logError('uploadError', { 
                status: xhr.status, 
                statusText: xhr.statusText,
                responseData
              });
              setDetailedError({ 
                status: xhr.status, 
                statusText: xhr.statusText,
                data: responseData
              });
              reject(uploadError);
            }
          };
          
          xhr.onerror = () => {
            const networkError = new Error('Network error occurred');
            logError('networkError', networkError);
            reject(networkError);
          };
          
          xhr.ontimeout = () => {
            const timeoutError = new Error('Request timed out');
            logError('timeoutError', timeoutError);
            reject(timeoutError);
          };
        });

        // Set a reasonable timeout (30 seconds)
        xhr.timeout = 30000;
        
        // Get the base URL (either from environment or window.location)
        const baseUrl = typeof window !== 'undefined' 
          ? `${window.location.protocol}//${window.location.host}`
          : 'http://localhost:3000';
        
        // Open and send the request with absolute URL
        const apiUrl = `${baseUrl}/api/iqr/scan`;
        log(`Making request to absolute URL: ${apiUrl}`);
        xhr.open('POST', apiUrl, true);
        xhr.send(formData);

        // Wait for response
        const response = await uploadPromise;
        log('API response received', response);
        
        // Simulate the rest of the process
        setUploadProgress(80); // 80% after server processing starts
        
        // Poll for product status or just simulate completion after a delay
        setTimeout(() => {
          setUploadProgress(100);
          setSuccess(`Product "${productName}" created successfully with QR code for tag: ${response.qrTextTag}`);
          
          // Reset form
          setProductName('');
          setProductDescription('');
          setSystemPrompt('');
          setSelectedFile(null);
          setLoading(false);
          setRetryCount(0); // Reset retry count on success
        }, 2000);
      } catch (apiError) {
        logError('apiCall', apiError);
        throw apiError;
      }

    } catch (err: any) {
      logError('formSubmission', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setDetailedError(null);
    log('Retrying submission', { retryCount: retryCount + 1 });
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
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
            <Label htmlFor="fileUpload">Product Documentation (PDF)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="fileUpload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={loading}
                className="file:bg-iqr-200 file:text-black file:border-0 file:rounded file:px-2 file:py-1 file:mr-2 cursor-pointer"
              />
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
            <div className="text-sm text-muted-foreground">
              <span>
                {uploadProgress < 70 
                  ? 'Processing...' 
                  : uploadProgress < 80 
                    ? 'Processing...' 
                    : uploadProgress < 100 
                      ? 'Processing...' 
                      : 'Finalizing...'}
              </span>
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
              Processing...
            </>
          ) : apiStatus === 'checking' ? (
            <>
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
    </div>
  );
};
