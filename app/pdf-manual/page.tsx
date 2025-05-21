"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ClipboardCopy, UploadCloud, FileText, Layers, Cpu, Play } from 'lucide-react';

// Helper function to generate a proper UUID v4
function generateUUID() {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function PdfManualProcessingPage() {
  const [file, setFile] = useState<File | null>(null);
  // Auto-generate a valid UUID for product ID
  const [productId, setProductId] = useState(generateUUID());
  const [businessId, setBusinessId] = useState('fa822a5a-08b7-4a81-9609-427e7152356c');
  const [activeTab, setActiveTab] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState(0);

  // Results from each step
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [extractResult, setExtractResult] = useState<any>(null);
  const [chunkResult, setChunkResult] = useState<any>(null);
  const [embedResult, setEmbedResult] = useState<any>(null);
  const [processingComplete, setProcessingComplete] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError('');
      } else {
        setFile(null);
        setError('Please select a valid PDF file.');
      }
    }
  };

  const resetStates = () => {
    setUploadResult(null);
    setExtractResult(null);
    setChunkResult(null);
    setEmbedResult(null);
    setProcessingComplete(false);
    setError('');
    setSuccess('');
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    // Ensure we have a valid UUID
    if (!productId) {
      const newUuid = generateUUID();
      setProductId(newUuid);
      console.log(`Generated new UUID for product: ${newUuid}`);
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setProgress(25);

    try {
      const formData = new FormData();
      formData.append('operation', 'upload');
      formData.append('file', file);
      formData.append('productId', productId);
      formData.append('businessId', businessId);
      formData.append('serviceType', 'product-pdf');

      setSuccess('Uploading file... This may take a moment for large PDFs');
      const response = await fetch('/api/pdf-manual', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Use the server-generated UUID if provided in the response
        if (result.productId && result.productId !== productId) {
          console.log(`Using server-generated UUID: ${result.productId} (was: ${productId})`);
          setProductId(result.productId);
        }
        
        setUploadResult(result);
        setSuccess('File uploaded successfully.');
        setProgress(100);
        setActiveTab('extract');
      } else {
        setError(`Upload failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error during upload:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!uploadResult?.fileUrl) {
      setError('Please upload a file first.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setProgress(25);

    try {
      const formData = new FormData();
      formData.append('operation', 'extract');
      formData.append('fileUrl', uploadResult.fileUrl);
      formData.append('productId', productId);
      formData.append('businessId', businessId);

      const response = await fetch('/api/pdf-manual', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setExtractResult(result);
        setSuccess('Text extracted successfully.');
        setProgress(100);
        setActiveTab('chunk');
      } else {
        setError(`Extraction failed: ${result.error}`);
      }
    } catch (error: any) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChunk = async () => {
    if (!extractResult?.extractedTextId) {
      setError('Please extract text first.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setProgress(25);

    try {
      // Show a notification that this might take time for large documents
      setSuccess('Processing chunks... This may take a moment for large documents');
      
      const formData = new FormData();
      formData.append('operation', 'chunk');
      formData.append('extractedTextId', extractResult.extractedTextId);
      formData.append('chunkSize', '1000');
      formData.append('overlap', '200');

      const response = await fetch('/api/pdf-manual', {
        method: 'POST',
        body: formData,
      });

      // Update progress while waiting for response
      setProgress(60);
      
      const result = await response.json();

      if (result.success) {
        setChunkResult(result);
        setSuccess(`Text chunked successfully into ${result.chunkCount} chunks.`);
        setProgress(100);
        setActiveTab('embed');
      } else {
        setError(`Chunking failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error during chunking:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmbed = async () => {
    if (!chunkResult?.chunks || !chunkResult?.productId) {
      setError('Please chunk text first.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setProgress(10);

    try {
      // Show a notification that this might take time
      setSuccess('Generating embeddings... This process may take several minutes for large documents');
      
      // For large documents, we want to show a more informative progress message
      const chunkCount = chunkResult.chunkCount || 0;
      if (chunkCount > 50) {
        setSuccess(`Processing ${chunkCount} chunks. This may take 5+ minutes. Please be patient...`);
      }
      
      const formData = new FormData();
      formData.append('operation', 'embed');
      formData.append('chunks', JSON.stringify(chunkResult.chunks));
      formData.append('productId', chunkResult.productId);
      formData.append('totalChunks', chunkResult.chunkCount.toString());

      const response = await fetch('/api/pdf-manual', {
        method: 'POST',
        body: formData,
      });

      // Update progress periodically while waiting for response
      let progressInterval = setInterval(() => {
        setProgress((prev) => {
          // Cap at 90% until we get the actual result
          return prev < 90 ? prev + 5 : prev;
        });
      }, 10000); // Update every 10 seconds

      const result = await response.json();
      
      // Clear the interval when we get the response
      clearInterval(progressInterval);

      if (result.success) {
        setEmbedResult(result);
        setSuccess(`Embeddings generated successfully for ${result.chunkCount} chunks${result.failedCount ? `, but ${result.failedCount} chunks failed` : ''}.`);
        setProgress(100);
        setProcessingComplete(true);
      } else {
        setError(`Embedding failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error during embedding:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFullProcess = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    if (!productId) {
      setError('Product ID is required.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    resetStates();
    setProgress(5);
    setSuccess('Starting end-to-end PDF processing...');

    try {
      const formData = new FormData();
      formData.append('operation', 'full-process');
      formData.append('file', file);
      formData.append('productId', productId);
      formData.append('businessId', businessId);
      formData.append('serviceType', 'product-pdf');
      
      // Add progress tracking with server-sent events
      const updateProgressFromServer = async (stage: string, percent: number) => {
        let overallProgress = 0;
        // Convert stage-specific progress to overall progress
        switch (stage) {
          case 'starting':
            overallProgress = 5;
            setSuccess('Initializing PDF processing...');
            break;
          case 'uploading':
            overallProgress = 5 + (percent * 0.2); // 5-25%
            setSuccess('Uploading PDF to storage...');
            break;
          case 'extracting':
            overallProgress = 25 + (percent * 0.25); // 25-50%
            setSuccess('Extracting text from PDF using Mistral AI...');
            break;
          case 'chunking':
            overallProgress = 50 + (percent * 0.25); // 50-75%
            setSuccess('Chunking text into segments...');
            break;
          case 'embedding':
            overallProgress = 75 + (percent * 0.25); // 75-100%
            setSuccess('Generating and storing embeddings...');
            break;
          default:
            overallProgress = percent;
        }
        setProgress(Math.round(overallProgress));
      };

      // Add progress monitoring parameters
      formData.append('enableProgressUpdates', 'true');

      const response = await fetch('/api/pdf-manual', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadResult({ fileUrl: result.fileUrl, path: result.path });
        setExtractResult({ extractedTextId: result.extractedTextId });
        setChunkResult({ chunkCount: result.chunkCount });
        setEmbedResult({ chunkCount: result.chunkCount });
        setSuccess('PDF processed successfully end-to-end!');
        setProcessingComplete(true);
        setProgress(100);
        
        // Automatically switch to the last tab to show completion
        setActiveTab('embed');
      } else {
        setError(`Processing failed: ${result.error}`);
      }
    } catch (error: any) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Manual PDF Processing</h1>
      <p className="text-gray-500 mb-8">
        This page allows you to manually process PDFs step by step or all at once.
      </p>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>PDF Information</CardTitle>
            <CardDescription>
              Set the file and associated product information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="file">PDF File</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      className="flex-1"
                    />
                    {file && (
                      <Badge variant="outline" className="text-xs">
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="productId">Product ID (Auto-generated)</Label>
                  <div className="flex">
                    <Input 
                      id="productId" 
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      placeholder="Auto-generated UUID" 
                      disabled={true}
                      className="flex-grow"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="ml-2 px-3" 
                      onClick={() => setProductId(generateUUID())}
                      title="Generate new UUID"
                      disabled={loading}
                    >
                      <ClipboardCopy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">UUID automatically generated for this upload.</p>
                </div>
                <div>
                  <Label htmlFor="businessId">Business ID (Default)</Label>
                  <Input 
                    id="businessId" 
                    value={businessId}
                    onChange={(e) => setBusinessId(e.target.value)}
                    placeholder="Enter business UUID" 
                    disabled={true}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center justify-between">
                <span>Process Options</span>
                {processingComplete && (
                  <Badge className="bg-green-500">Processing Complete</Badge>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              Choose to process step by step or all at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Button 
                onClick={handleFullProcess} 
                className="flex items-center gap-2"
                disabled={loading || !file || !productId}
              >
                <Play className="h-4 w-4" />
                Process End-to-End
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-2 text-muted-foreground text-sm">
                    OR Process Step by Step
                  </span>
                </div>
              </div>

              <Tabs 
                value={activeTab} 
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="upload" className="flex items-center gap-1">
                    <UploadCloud className="h-4 w-4" />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger 
                    value="extract" 
                    disabled={!uploadResult}
                    className="flex items-center gap-1"
                  >
                    <FileText className="h-4 w-4" />
                    Extract
                  </TabsTrigger>
                  <TabsTrigger 
                    value="chunk" 
                    disabled={!extractResult}
                    className="flex items-center gap-1"
                  >
                    <Layers className="h-4 w-4" />
                    Chunk
                  </TabsTrigger>
                  <TabsTrigger 
                    value="embed" 
                    disabled={!chunkResult}
                    className="flex items-center gap-1"
                  >
                    <Cpu className="h-4 w-4" />
                    Embed
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4 min-h-[150px]">
                  {loading && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Processing...</p>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="mb-4 bg-green-50 border-green-200">
                      <AlertTitle>Success</AlertTitle>
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}

                  <TabsContent value="upload" className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Upload your PDF file to the server. The file will be stored in Supabase Storage.
                    </p>
                    <Button 
                      onClick={handleUpload} 
                      disabled={loading || !file || !productId}
                      className="flex items-center gap-2"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Upload PDF
                    </Button>
                    
                    {uploadResult && (
                      <div className="mt-4 p-4 border rounded-md bg-gray-50">
                        <h3 className="font-medium">Upload Result:</h3>
                        <div className="mt-2 text-sm">
                          <p>
                            <span className="font-medium">Status:</span> {uploadResult.status || 'Completed'}
                          </p>
                          {uploadResult.path && (
                            <p>
                              <span className="font-medium">Path:</span> {uploadResult.path}
                            </p>
                          )}
                          {uploadResult.fileUrl && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-medium">URL:</span>
                              <code className="text-xs bg-gray-100 p-1 rounded flex-1 truncate">
                                {uploadResult.fileUrl}
                              </code>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigator.clipboard.writeText(uploadResult.fileUrl)}
                                title="Copy URL"
                              >
                                <ClipboardCopy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="extract" className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Extract text from the uploaded PDF file using Mistral AI.
                    </p>
                    <Button 
                      onClick={handleExtract} 
                      disabled={loading || !uploadResult?.fileUrl}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Extract Text
                    </Button>
                    
                    {extractResult && (
                      <div className="mt-4 p-4 border rounded-md bg-gray-50">
                        <h3 className="font-medium">Extraction Result:</h3>
                        <div className="mt-2 text-sm">
                          <p>
                            <span className="font-medium">Extracted Text ID:</span> {extractResult.extractedTextId}
                          </p>
                          {extractResult.text && (
                            <div className="mt-2">
                              <p className="font-medium">Preview (first 200 characters):</p>
                              <p className="mt-1 text-xs bg-white p-2 rounded border">
                                {extractResult.text.substring(0, 200)}...
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="chunk" className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Chunk the extracted text into smaller segments for embedding.
                    </p>
                    <Button 
                      onClick={handleChunk} 
                      disabled={loading || !extractResult?.extractedTextId}
                      className="flex items-center gap-2"
                    >
                      <Layers className="h-4 w-4" />
                      Chunk Text
                    </Button>
                    
                    {chunkResult && (
                      <div className="mt-4 p-4 border rounded-md bg-gray-50">
                        <h3 className="font-medium">Chunking Result:</h3>
                        <div className="mt-2 text-sm">
                          <p>
                            <span className="font-medium">Total Chunks:</span> {chunkResult.chunkCount}
                          </p>
                          {chunkResult.metadata && (
                            <p>
                              <span className="font-medium">Chunk Size:</span> {chunkResult.metadata.chunkSize} characters
                              with {chunkResult.metadata.overlap} character overlap
                            </p>
                          )}
                          {chunkResult.chunks && (
                            <div className="mt-2">
                              <p className="font-medium">First Chunk Preview:</p>
                              <p className="mt-1 text-xs bg-white p-2 rounded border">
                                {chunkResult.chunks[0].substring(0, 150)}...
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="embed" className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Generate OpenAI embeddings for the text chunks and store them in the database.
                    </p>
                    <Button 
                      onClick={handleEmbed} 
                      disabled={loading || !chunkResult?.chunks}
                      className="flex items-center gap-2"
                    >
                      <Cpu className="h-4 w-4" />
                      Generate Embeddings
                    </Button>
                    
                    {embedResult && (
                      <div className="mt-4 p-4 border rounded-md bg-gray-50">
                        <h3 className="font-medium">Embedding Result:</h3>
                        <div className="mt-2 text-sm">
                          <p>
                            <span className="font-medium">Chunks Processed:</span> {embedResult.chunkCount}
                          </p>
                          {processingComplete && (
                            <p className="mt-2 text-green-600 font-medium">
                              PDF processing completed successfully!
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
