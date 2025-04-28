import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, collection, addDoc, Timestamp } from '@/utils/firestore';
import { auth } from 'firebase-admin';
import { initAdminSDK } from '@/utils/firebase-admin';

// Initialize Firebase Admin SDK
initAdminSDK();

// Disable Next.js body parsing to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
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

    // Parse the form data
    const form = new IncomingForm({
      keepExtensions: true,
      filter: (part) => {
        return part.mimetype === 'application/pdf';
      },
    });

    // Parse form and get files
    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const file = files.file[0]; // Assuming field name for the file is 'file'
    
    if (!file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    // Extract service type from form data
    const serviceType = fields.serviceType ? fields.serviceType[0] : 'iqr';

    // Read the file
    const fileData = await fs.readFile(file.filepath);

    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}_${file.originalFilename}`;
    const storagePath = `pdfs/${serviceType}/${filename}`;

    // Upload to Firebase Storage
    const storage = getStorage();
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, fileData);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    // Store document reference in Firestore
    const docRef = await addDoc(collection(db, 'documents'), {
      fileName: file.originalFilename,
      filePath: storagePath,
      fileUrl: downloadURL,
      mimeType: file.mimetype,
      size: file.size,
      serviceType,
      userId,
      createdAt: Timestamp.now(),
      status: 'uploaded',
    });

    // Clean up the temporary file
    await fs.unlink(file.filepath);

    // Return success response
    return res.status(200).json({
      success: true,
      documentId: docRef.id,
      fileName: file.originalFilename,
      fileUrl: downloadURL,
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    return res.status(500).json({ 
      error: 'Failed to upload PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 