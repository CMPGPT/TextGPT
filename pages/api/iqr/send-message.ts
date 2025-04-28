import { NextApiRequest, NextApiResponse } from 'next';
import { sendSMS } from '@/utils/twilio';
import { db, collection, addDoc, Timestamp, query, where, getDocs } from '@/utils/firestore';
import { auth } from 'firebase-admin';
import { initAdminSDK } from '@/utils/firebase-admin';

// Initialize Firebase Admin SDK
initAdminSDK();

type MessageData = {
  to: string;
  body: string;
  from?: string;
  qrCodeId?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication or API key
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;
    
    // If no authentication is provided
    if (!authHeader?.startsWith('Bearer ') && !apiKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let userId: string;
    
    // If using Bearer token
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await auth().verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    } 
    // If using API key
    else if (apiKey) {
      // Fetch user ID associated with API key from database
      const apiKeysSnapshot = await getDocs(
        query(collection(db, 'apiKeys'), where('key', '==', apiKey))
      );
      
      if (apiKeysSnapshot.empty) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      userId = apiKeysSnapshot.docs[0].data().userId;
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract data from request body
    const { to, body, from, qrCodeId }: MessageData = req.body;
    
    if (!to || !body) {
      return res.status(400).json({ error: 'Recipient and message body are required' });
    }

    // Send the SMS
    const result = await sendSMS(to, body, from);
    
    if (!result.success) {
      throw result.error;
    }

    // Store message in Firestore
    const messageDoc = await addDoc(collection(db, 'messages'), {
      to,
      body,
      from,
      userId,
      qrCodeId,
      service: 'iqr',
      status: 'sent',
      createdAt: Timestamp.now(),
    });
    
    // If QR code ID is provided, increment scan/interaction count
    if (qrCodeId) {
      // Update QR code statistics (this would be implemented in actual code)
      // await updateQRCodeStats(qrCodeId);
    }

    // Return success response
    return res.status(200).json({
      success: true,
      messageId: messageDoc.id,
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 