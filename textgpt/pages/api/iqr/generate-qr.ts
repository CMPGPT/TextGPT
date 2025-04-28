import { NextApiRequest, NextApiResponse } from 'next';
import QRCode from 'qrcode';
import { db, addDoc, collection, Timestamp } from '../../../utils/firestore';
import { auth } from 'firebase-admin';
import { initAdminSDK } from '../../../utils/firebase-admin';

// Initialize Firebase Admin SDK
initAdminSDK();

type QRCodeData = {
  name: string;
  description?: string;
  redirectUrl?: string;
  type?: string;
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
    
    // Extract data from request body
    const { name, description, redirectUrl, type }: QRCodeData = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'QR code name is required' });
    }

    // Generate a unique link for the QR code
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const qrCodeUrl = redirectUrl || `https://${req.headers.host}/iqr/scan/${uniqueId}`;
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, {
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Store QR code data in Firestore
    const qrCodeDoc = await addDoc(collection(db, 'qrcodes'), {
      name,
      description: description || '',
      url: qrCodeUrl,
      dataUrl: qrCodeDataUrl,
      type: type || 'iqr', // 'iqr' or 'kiwi'
      createdAt: Timestamp.now(),
      userId,
      scans: 0,
    });

    // Return success response
    return res.status(200).json({
      success: true,
      qrCode: {
        id: qrCodeDoc.id,
        name,
        description: description || '',
        url: qrCodeUrl,
        dataUrl: qrCodeDataUrl,
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return res.status(500).json({ error: 'Failed to generate QR code' });
  }
} 