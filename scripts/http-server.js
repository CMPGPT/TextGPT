/**
 * Simple HTTP server to test route handling
 * This bypasses Next.js to diagnose if there's an issue with the middleware or Next.js routing
 */
const http = require('http');
const formidable = require('formidable');
const { v4: uuidv4 } = require('uuid');

const PORT = 8000;

// Create an HTTP server
const server = http.createServer((req, res) => {
  const { method, url } = req;
  
  console.log(`[HTTP Server] Received ${method} request to ${url}`);
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle the API endpoint
  if (url === '/api/iqr/scan') {
    // Handle OPTIONS request for CORS preflight
    if (method === 'OPTIONS') {
      console.log('Handling OPTIONS request');
      res.statusCode = 204;
      res.end();
      return;
    }
    
    // Handle GET request
    if (method === 'GET') {
      console.log('Handling GET request');
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({
        message: 'IQR Scan test endpoint is working',
        timestamp: new Date().toISOString()
      }));
      return;
    }
    
    // Handle POST request
    if (method === 'POST') {
      console.log('Handling POST request');
      
      // Parse form data
      const form = new formidable.IncomingForm();
      
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Error parsing form data:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            error: 'Error parsing form data',
            details: err.message
          }));
          return;
        }
        
        // Get required fields
        const file = files.file?.[0];
        const businessId = fields.businessId?.[0];
        const productName = fields.productName?.[0];
        
        console.log('Received fields:', { 
          file: file?.originalFilename || 'None', 
          businessId, 
          productName 
        });
        
        // Validate required fields
        if (!file || !businessId || !productName) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            error: 'Missing required fields',
            received: {
              file: !!file,
              businessId: !!businessId,
              productName: !!productName
            }
          }));
          return;
        }
        
        // Generate IDs
        const productId = uuidv4();
        const qrTextTag = `iqr_${productName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-6)}`;
        
        // Return success response
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          productId,
          qrTextTag,
          message: 'Product created successfully (test server).',
          fileDetails: {
            name: file.originalFilename,
            size: file.size,
            type: file.mimetype
          }
        }));
      });
      
      return;
    }
    
    // Method not allowed
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  
  // Not found
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Start the server
server.listen(PORT, () => {
  console.log(`Test HTTP server running at http://localhost:${PORT}`);
  console.log(`Test the API endpoint at: http://localhost:${PORT}/api/iqr/scan`);
}); 