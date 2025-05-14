/**
 * Diagnostic script to test the IQR scan API endpoint
 * Usage: node scripts/diagnose-api-route.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const API_PATH = '/api/iqr/scan';
const TEST_FILE_PATH = path.join(__dirname, 'test.pdf');
const BUSINESS_ID = 'test-business-id';

// Create a test PDF file if it doesn't exist
function createTestPdf() {
  if (!fs.existsSync(TEST_FILE_PATH)) {
    console.log('Creating test PDF file...');
    fs.writeFileSync(TEST_FILE_PATH, 'Test PDF content for API diagnostics');
    console.log(`Created test file at ${TEST_FILE_PATH}`);
  }
  return TEST_FILE_PATH;
}

// Test OPTIONS request (CORS preflight)
async function testOptionsRequest() {
  console.log('\n🔍 Testing OPTIONS request (CORS preflight)...');
  try {
    const response = await axios({
      method: 'OPTIONS',
      url: `${BASE_URL}${API_PATH}`,
      timeout: 5000,
      validateStatus: () => true, // Don't throw on any status code
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log('Headers:');
    console.log(response.headers);
    
    // Check for CORS headers
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
    ];
    
    const missingHeaders = corsHeaders.filter(header => !response.headers[header]);
    
    if (missingHeaders.length > 0) {
      console.log(`❌ Missing CORS headers: ${missingHeaders.join(', ')}`);
    } else {
      console.log('✅ All required CORS headers present');
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('The server is not running or not accessible');
    }
    return false;
  }
}

// Test POST request with minimal form data
async function testPostRequest() {
  console.log('\n🔍 Testing POST request with minimal form data...');
  
  try {
    // Create test PDF
    const testFile = createTestPdf();
    
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(testFile));
    form.append('businessId', BUSINESS_ID);
    form.append('productName', 'Test Product');
    form.append('productDescription', 'Test Description');
    form.append('systemPrompt', 'You are a helpful assistant');
    
    console.log('Sending POST request with form data:');
    console.log({
      file: 'test.pdf',
      businessId: BUSINESS_ID,
      productName: 'Test Product',
      productDescription: 'Test Description',
      systemPrompt: 'You are a helpful assistant',
    });
    
    // Send request
    const response = await axios.post(`${BASE_URL}${API_PATH}`, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 15000,
      validateStatus: () => true, // Don't throw on any status code
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response headers:');
    console.log(response.headers);
    
    if (response.status >= 200 && response.status < 300) {
      console.log('✅ Request successful');
      console.log('Response data:');
      console.log(JSON.stringify(response.data, null, 2));
      return true;
    } else {
      console.log(`❌ Request failed with status ${response.status}`);
      console.log('Response data:');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Provide diagnostic information based on status code
      if (response.status === 404) {
        console.log('The API route was not found. Possible causes:');
        console.log('- The route file might not be in the correct location (should be app/api/iqr/scan/route.ts)');
        console.log('- Next.js might not have recognized the route due to incorrect exports');
        console.log('- The server might need to be restarted to recognize new routes');
      } else if (response.status === 500) {
        console.log('The server encountered an internal error. Check the server logs for more details.');
      }
      
      return false;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('The server is not running or not accessible');
    } else if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log('Response data:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    
    return false;
  }
}

// Test with fetch API (similar to browser)
async function testFetchApproach() {
  console.log('\n🔍 Testing with node-fetch (browser-like approach)...');
  
  try {
    // Import node-fetch dynamically
    const fetch = (await import('node-fetch')).default;
    
    // Create test PDF
    const testFile = createTestPdf();
    
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(testFile));
    form.append('businessId', BUSINESS_ID);
    form.append('productName', 'Test Product');
    
    console.log(`Sending fetch request to ${BASE_URL}${API_PATH}`);
    
    // Send request
    const response = await fetch(`${BASE_URL}${API_PATH}`, {
      method: 'POST',
      body: form,
      timeout: 15000,
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status >= 200 && response.status < 300) {
      const data = await response.json();
      console.log('✅ Request successful');
      console.log('Response data:');
      console.log(JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log(`❌ Request failed with status ${response.status}`);
      try {
        const text = await response.text();
        console.log('Response text:');
        console.log(text);
      } catch (e) {
        console.log('Could not read response text');
      }
      return false;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

// Check the route file existence and exports
function checkRouteFile() {
  console.log('\n🔍 Checking route file...');
  
  const routeFilePath = path.resolve(__dirname, '../app/api/iqr/scan/route.ts');
  
  if (!fs.existsSync(routeFilePath)) {
    console.log(`❌ Route file not found: ${routeFilePath}`);
    return false;
  }
  
  console.log(`✅ Route file exists: ${routeFilePath}`);
  
  // Read the file content
  const content = fs.readFileSync(routeFilePath, 'utf8');
  
  // Check for export of POST method
  if (!content.includes('export async function POST')) {
    console.log('❌ No export of POST method found in route file');
    return false;
  }
  
  console.log('✅ POST method export found in route file');
  return true;
}

// Run all tests
async function runDiagnostics() {
  console.log('🔬 RUNNING API ROUTE DIAGNOSTICS');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Path: ${API_PATH}`);
  console.log('--------------------------------------');
  
  // Check route file first
  const fileExists = checkRouteFile();
  
  if (!fileExists) {
    console.log('\n❌ Route file issues detected - fix file issues before continuing');
    return;
  }
  
  // Run tests
  const optionsSuccess = await testOptionsRequest();
  const postSuccess = await testPostRequest();
  
  // Only run fetch test if the others failed
  if (!optionsSuccess || !postSuccess) {
    await testFetchApproach();
  }
  
  console.log('\n--------------------------------------');
  console.log('🔬 DIAGNOSTICS SUMMARY:');
  console.log(`- Route file check: ${fileExists ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- OPTIONS request: ${optionsSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- POST request: ${postSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  if (fileExists && optionsSuccess && postSuccess) {
    console.log('\n✅ All tests passed! The API route is working correctly.');
    console.log('If you are still experiencing issues in the browser, check:');
    console.log('1. Browser console for CORS errors');
    console.log('2. Network requests in DevTools');
    console.log('3. Client-side code making the request');
  } else {
    console.log('\n❌ Some tests failed. See above logs for details.');
  }
}

// Run the diagnostics
runDiagnostics(); 