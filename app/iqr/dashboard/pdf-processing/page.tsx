'use client';

import React, { useState, useEffect } from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box, CircularProgress, Chip } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

interface Product {
  id: string;
  name: string;
  pdf_url: string | null;
  status: string;
  created_at: string;
}

interface QueueItem {
  id: string;
  product_id: string;
  status: string;
  file_path: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  processed_chunks: number | null;
  total_chunks: number | null;
  error: string | null;
}

export default function PDFProcessingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [nullChunksCount, setNullChunksCount] = useState<number>(0);
  
  const supabase = createClientComponentClient();
  
  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch products with PDF URLs that need processing
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, pdf_url, status, created_at')
          .not('pdf_url', 'is', null)
          .order('created_at', { ascending: false });
        
        if (productsError) throw new Error(`Error fetching products: ${productsError.message}`);
        
        // Fetch queue items
        const { data: queueData, error: queueError } = await supabase
          .from('processing_queue')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (queueError) throw new Error(`Error fetching queue: ${queueError.message}`);
        
        // Check for chunks with null embeddings
        const { count: nullCount, error: nullCountError } = await supabase
          .from('pdf_chunks')
          .select('id', { count: 'exact', head: true })
          .is('embedding', null);
          
        if (nullCountError) {
          console.error('Error fetching null chunks count:', nullCountError);
        } else {
          setNullChunksCount(nullCount || 0);
        }
        
        setProducts(productsData);
        setQueueItems(queueData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [supabase, refreshTrigger]);
  
  // Function to trigger processing for a product
  async function triggerProcessing(productId: string) {
    setProcessingId(productId);
    
    try {
      const response = await fetch(`/api/iqr/process-pdf?productId=${productId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger processing');
      }
      
      // Refresh data after processing is triggered
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  }
  
  // Helper to get status chip
  const getStatusChip = (status: string) => {
    let color: 'success' | 'error' | 'warning' | 'info' = 'info';
    
    switch (status) {
      case 'ready':
        color = 'success';
        break;
      case 'processing':
        color = 'info';
        break;
      case 'error':
      case 'failed':
        color = 'error';
        break;
      case 'queued':
        color = 'warning';
        break;
    }
    
    return <Chip label={status} color={color} size="small" />;
  };
  
  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          PDF Processing Dashboard
        </Typography>
        
        {error && (
          <Box sx={{ my: 2, p: 2, bgcolor: 'error.dark', borderRadius: 1 }}>
            <Typography color="error.contrastText">{error}</Typography>
          </Box>
        )}
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress size={60} />
          </Box>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 2 }}>
          <Button 
            variant="contained"
            color="secondary"
            onClick={async () => {
              try {
                const response = await fetch('/api/iqr/process-pdf/retry-null-embeddings');
                const data = await response.json();
                
                if (data.success) {
                  setRefreshTrigger(prev => prev + 1);
                } else {
                  setError(data.error || 'Failed to process null embeddings');
                }
              } catch (err) {
                setError('Failed to process null embeddings');
                console.error(err);
              }
            }}
            disabled={isLoading}
            startIcon={nullChunksCount > 0 ? <Typography variant="caption">{nullChunksCount}</Typography> : undefined}
          >
            Process Missing Embeddings {nullChunksCount > 0 ? `(${nullChunksCount})` : ''}
          </Button>
          
          <Button 
            variant="contained" 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Refresh'}
          </Button>
        </Box>
        
        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          Products with PDFs
        </Typography>
        
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">No products found with PDFs</TableCell>
                </TableRow>
              ) : (
                products.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{getStatusChip(product.status)}</TableCell>
                    <TableCell>{new Date(product.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        disabled={processingId === product.id || !product.pdf_url}
                        onClick={() => triggerProcessing(product.id)}
                      >
                        {processingId === product.id ? (
                          <CircularProgress size={24} />
                        ) : (
                          'Process PDF'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          Processing Queue
        </Typography>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Error</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queueItems.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">No queue items found</TableCell>
                </TableRow>
              ) : (
                queueItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{getStatusChip(item.status)}</TableCell>
                    <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      {item.started_at ? new Date(item.started_at).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.completed_at ? new Date(item.completed_at).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.processed_chunks && item.total_chunks ? (
                        `${item.processed_chunks}/${item.total_chunks} (${Math.round(
                          (item.processed_chunks / item.total_chunks) * 100
                        )}%)`
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      {item.error ? (
                        <Typography variant="body2" color="error">
                          {item.error.length > 50 ? `${item.error.substring(0, 50)}...` : item.error}
                        </Typography>
                      ) : (
                        'None'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </ThemeProvider>
  );
} 