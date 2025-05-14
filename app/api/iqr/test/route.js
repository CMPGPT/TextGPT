import { NextResponse } from 'next/server';

// Simple logger
function log(...args) {
  console.log(`[IQR-TEST][${new Date().toISOString()}]`, ...args);
}

// Simple GET handler for testing
export async function GET(request) {
  log(`GET request received at: ${request.url}`);
  return NextResponse.json({ 
    message: "IQR Test API is working",
    timestamp: new Date().toISOString() 
  });
}

// OPTIONS handler for CORS
export async function OPTIONS(request) {
  log(`OPTIONS request received at: ${request.url}`);
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Simple POST handler
export async function POST(request) {
  log(`POST request received at: ${request.url}`);
  try {
    const body = await request.json();
    return NextResponse.json({ 
      message: "POST request received",
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      message: "Error processing POST request",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
} 