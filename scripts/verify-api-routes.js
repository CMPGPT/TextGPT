/**
 * Utility script to verify API routes are properly registered
 * Run with: node scripts/verify-api-routes.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const API_DIR = path.resolve(__dirname, '../app/api');

/**
 * Discover all API routes in the app directory
 */
function discoverApiRoutes(dir = API_DIR, baseRoute = '/api', routes = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const relativePath = filePath.replace(API_DIR, '').replace(/\\/g, '/');
    const isDirectory = fs.statSync(filePath).isDirectory();
    
    if (isDirectory) {
      // Check if this is a route directory with route.ts file
      const routeFile = path.join(filePath, 'route.ts');
      if (fs.existsSync(routeFile)) {
        // This is a valid API route
        const apiPath = `${baseRoute}${relativePath}`;
        routes.push(apiPath);
      }
      
      // Continue searching nested directories
      discoverApiRoutes(filePath, baseRoute, routes);
    }
  }
  
  return routes;
}

/**
 * Check if a route is accessible
 */
async function checkRoute(route) {
  console.log(`Testing route: ${route}`);
  
  try {
    // First try OPTIONS request (CORS preflight)
    const optionsResponse = await axios({
      method: 'OPTIONS',
      url: `${BASE_URL}${route}`,
      timeout: 5000,
    });
    
    console.log(`✅ [OPTIONS] ${route} - ${optionsResponse.status}`);
  } catch (error) {
    console.log(`❌ [OPTIONS] ${route} - ${error.response?.status || 'Network Error'}`);
  }
  
  try {
    // Then try GET request (if applicable)
    const getResponse = await axios({
      method: 'GET',
      url: `${BASE_URL}${route}`,
      timeout: 5000,
    });
    
    console.log(`✅ [GET] ${route} - ${getResponse.status}`);
  } catch (error) {
    if (error.response?.status === 405) {
      console.log(`⚠️ [GET] ${route} - Method not allowed (expected for POST-only endpoints)`);
    } else {
      console.log(`❌ [GET] ${route} - ${error.response?.status || 'Network Error'}`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔍 Discovering API routes...');
    const routes = discoverApiRoutes();
    console.log(`Found ${routes.length} API routes:`);
    routes.forEach(route => console.log(` - ${route}`));
    
    console.log('\n🧪 Testing API routes...');
    for (const route of routes) {
      await checkRoute(route);
    }
    
    console.log('\n✅ API route verification complete');
  } catch (error) {
    console.error('Error verifying API routes:', error);
  }
}

main(); 