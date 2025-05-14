/**
 * Script to test the IQR scan API endpoint
 * Run with: node scripts/test-api.js
 */
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001'; // Updated port
const ROUTES = {
  SCAN: '/api/iqr/scan',
  TEST: '/api/iqr/test'
};

async function testApiRoute(route, description) {
  console.log(`\n🔬 Testing ${description} API endpoint`);
  console.log(`URL: ${BASE_URL}${route}`);
  console.log('--------------------------------------');

  try {
    // Test GET request
    console.log('🔍 Testing GET request...');
    try {
      const getResponse = await axios.get(`${BASE_URL}${route}`);
      console.log(`✅ GET Status: ${getResponse.status}`);
      console.log('GET Response data:');
      console.log(JSON.stringify(getResponse.data, null, 2));
    } catch (getError) {
      console.log(`❌ GET Error: ${getError.message}`);
      if (getError.response) {
        console.log(`Status: ${getError.response.status}`);
        console.log('Response data:', getError.response.data);
      }
    }

    // Test OPTIONS request
    console.log('\n🔍 Testing OPTIONS request...');
    try {
      const optionsResponse = await axios({
        method: 'OPTIONS',
        url: `${BASE_URL}${route}`,
      });
      
      console.log(`✅ OPTIONS Status: ${optionsResponse.status}`);
      console.log('Headers:');
      console.log(optionsResponse.headers);
    } catch (optionsError) {
      console.log(`❌ OPTIONS Error: ${optionsError.message}`);
      if (optionsError.response) {
        console.log(`Status: ${optionsError.response.status}`);
        console.log('Response headers:', optionsError.response.headers);
      }
    }

    // Test POST request
    console.log('\n🔍 Testing POST request...');
    try {
      const postData = { test: true, message: 'Test data' };
      const postResponse = await axios.post(`${BASE_URL}${route}`, postData);
      console.log(`✅ POST Status: ${postResponse.status}`);
      console.log('POST Response data:');
      console.log(JSON.stringify(postResponse.data, null, 2));
    } catch (postError) {
      console.log(`❌ POST Error: ${postError.message}`);
      if (postError.response) {
        console.log(`Status: ${postError.response.status}`);
        console.log('Response data:', postError.response.data);
      }
    }
    
    console.log('\n✅ Test completed');
  } catch (error) {
    console.log(`❌ General Error: ${error.message}`);
  }
}

async function testScanEndpoint() {
  console.log('\n🔬 Testing file upload to IQR Scan endpoint');
  console.log(`URL: ${BASE_URL}${ROUTES.SCAN}`);
  console.log('--------------------------------------');

  try {
    // Create a sample PDF file for testing
    console.log('🔍 Creating test PDF file...');
    const testPdfPath = path.join(__dirname, 'test.pdf');
    
    // Create a simple empty file as a placeholder
    fs.writeFileSync(testPdfPath, 'Test PDF content', 'utf8');
    console.log(`✅ Test PDF created at ${testPdfPath}`);
    
    // Create form data for the request
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testPdfPath), 'test.pdf');
    
    // Add required form fields
    formData.append('businessId', 'test-business-id');
    formData.append('productName', 'Test Product');
    formData.append('productDescription', 'Test Description');
    formData.append('systemPrompt', 'You are a helpful assistant');
    
    console.log('Sending POST request with form data...');
    
    try {
      // Make POST request
      const response = await axios({
        method: 'POST',
        url: `${BASE_URL}${ROUTES.SCAN}`,
        data: formData,
        headers: {
          ...formData.getHeaders(),
        },
      });
      
      console.log(`✅ POST Status: ${response.status}`);
      console.log('Response data:');
      console.log(JSON.stringify(response.data, null, 2));
      
      console.log('\n✅ File upload test completed successfully');
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log('Response data:', error.response.data);
      }
      
      console.log('\n❌ File upload test failed');
    }
  } catch (error) {
    console.log(`❌ General Error: ${error.message}`);
  }
}

async function runTests() {
  // Test the simplified test endpoint first
  await testApiRoute(ROUTES.TEST, 'Simplified Test');
  
  // Test the scan endpoint with file upload
  await testScanEndpoint();
}

// Run the tests
runTests(); 