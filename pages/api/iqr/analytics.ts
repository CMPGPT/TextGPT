import { NextApiRequest, NextApiResponse } from 'next';
import { 
  db, 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy,
  limit
} from '../../../utils/firestore';
import { auth } from 'firebase-admin';
import { initAdminSDK } from '../../../utils/firebase-admin';

// Define interfaces for our data structures
interface QRCodeData {
  id: string;
  name: string;
  description?: string;
  url: string;
  dataUrl: string;
  type: string;
  createdAt: {
    toDate: () => Date;
  };
  userId: string;
  scans: number;
}

// Initialize Firebase Admin SDK
initAdminSDK();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      decodedToken = await auth().verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decodedToken.uid;
    
    // Get date range from query parameters
    const { startDate, endDate, period = 'month' } = req.query;
    
    // Default to last 30 days if no date range provided
    const endDateTime = endDate 
      ? new Date(endDate as string) 
      : new Date();
    
    const startDateTime = startDate 
      ? new Date(startDate as string) 
      : new Date(endDateTime.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get QR codes for the user
    const qrCodesSnapshot = await getDocs(
      query(
        collection(db, 'qrcodes'),
        where('userId', '==', userId),
        where('type', '==', 'iqr')
      )
    );
    
    // Extract QR code IDs
    const qrCodeIds = qrCodesSnapshot.docs.map(doc => doc.id);
    
    // Get messages for QR codes within date range
    const messagesSnapshot = await getDocs(
      query(
        collection(db, 'messages'),
        where('qrCodeId', 'in', qrCodeIds.length > 0 ? qrCodeIds : ['none']),
        where('createdAt', '>=', Timestamp.fromDate(startDateTime)),
        where('createdAt', '<=', Timestamp.fromDate(endDateTime)),
        orderBy('createdAt', 'asc')
      )
    );
    
    // Get scans for QR codes within date range
    const scansSnapshot = await getDocs(
      query(
        collection(db, 'scans'),
        where('qrCodeId', 'in', qrCodeIds.length > 0 ? qrCodeIds : ['none']),
        where('timestamp', '>=', Timestamp.fromDate(startDateTime)),
        where('timestamp', '<=', Timestamp.fromDate(endDateTime)),
        orderBy('timestamp', 'asc')
      )
    );

    // Process analytics data based on the requested period
    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    const scans = scansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Group data by period (day, week, month)
    const analyticsData = processAnalyticsData(messages, scans, period as string);
    
    // Get most recent QR codes
    const recentQRCodes = qrCodesSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => {
        const aDate = (a as any).createdAt?.toDate?.() || new Date();
        const bDate = (b as any).createdAt?.toDate?.() || new Date();
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, 5);

    // Get the total number of scans and interactions
    const totalScans = scans.length;
    const totalInteractions = messages.length;
    const conversionRate = totalScans > 0 
      ? Math.round((totalInteractions / totalScans) * 100) 
      : 0;

    // Return success response
    return res.status(200).json({
      success: true,
      analytics: {
        totalScans,
        totalInteractions,
        conversionRate,
        timeSeriesData: analyticsData,
        recentQRCodes,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function to process analytics data
function processAnalyticsData(messages: any[], scans: any[], period: string) {
  // Group data by time period
  const groupedData: Record<string, { scans: number; interactions: number }> = {};
  
  // Process scans
  scans.forEach(scan => {
    const date = scan.timestamp.toDate();
    const key = getKeyForPeriod(date, period);
    
    if (!groupedData[key]) {
      groupedData[key] = { scans: 0, interactions: 0 };
    }
    
    groupedData[key].scans += 1;
  });
  
  // Process messages
  messages.forEach(message => {
    const date = message.createdAt.toDate();
    const key = getKeyForPeriod(date, period);
    
    if (!groupedData[key]) {
      groupedData[key] = { scans: 0, interactions: 0 };
    }
    
    groupedData[key].interactions += 1;
  });
  
  // Convert to array format
  return Object.keys(groupedData)
    .sort()
    .map(key => ({
      name: key,
      scans: groupedData[key].scans,
      interactions: groupedData[key].interactions,
      conversions: groupedData[key].interactions,
    }));
}

// Helper function to get appropriate key for period grouping
function getKeyForPeriod(date: Date, period: string): string {
  const options: Intl.DateTimeFormatOptions = {};
  
  switch (period) {
    case 'day':
      options.year = 'numeric';
      options.month = 'short';
      options.day = 'numeric';
      break;
    case 'week':
      // Get the week number
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const weekNumber = Math.ceil(
        ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
      );
      return `Week ${weekNumber}, ${date.getFullYear()}`;
    case 'month':
    default:
      options.year = 'numeric';
      options.month = 'short';
      break;
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
} 