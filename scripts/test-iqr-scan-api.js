// A simple script to test the /api/iqr/scan endpoint

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function testIqrScanApi() {
  try {
    console.log('Testing /api/iqr/scan endpoint...');
    
    // Create a test PDF if it doesn't exist
    const testPdfPath = path.join(__dirname, 'test.pdf');
    if (!fs.existsSync(testPdfPath)) {
      console.log('Creating test PDF...');
      fs.writeFileSync(testPdfPath, 'Test PDF content');
    }
    
    // Create mock business ID
    const businessId = uuidv4();
    
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(testPdfPath));
    form.append('businessId', businessId);
    form.append('productName', 'Test Product');
    form.append('productDescription', 'This is a test product');
    form.append('systemPrompt', 'You are a helpful assistant for Test Product');
    
    // Send request to the API
    console.log('Sending request to /api/iqr/scan...');
    const response = await axios.post('http://localhost:3000/api/iqr/scan', form, {
      headers: {
        ...form.getHeaders(),
      },
    });
    
    console.log('Response:', response.data);
    console.log('Test successful!');
  } catch (error) {
    console.error('Error testing API:', error.response?.data || error.message);
  }
}

testIqrScanApi(); 