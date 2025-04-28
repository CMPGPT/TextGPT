import * as admin from 'firebase-admin';

// Check if Firebase Admin is already initialized
let firebaseAdmin: admin.app.App;

export function initAdminSDK(): admin.app.App {
  if (admin.apps.length > 0) {
    firebaseAdmin = admin.apps[0]!;
    return firebaseAdmin;
  }

  // Initialize with service account if provided
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace '\n' with actual newlines
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } else {
    // Initialize without credentials (for local dev or using ADC in the cloud)
    firebaseAdmin = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  return firebaseAdmin;
}

export function getFirebaseAdmin(): admin.app.App {
  if (!firebaseAdmin) {
    return initAdminSDK();
  }
  return firebaseAdmin;
}

export const getAdminAuth = () => {
  const app = getFirebaseAdmin();
  return admin.auth(app);
};

export const getAdminFirestore = () => {
  const app = getFirebaseAdmin();
  return admin.firestore(app);
};

export const getAdminStorage = () => {
  const app = getFirebaseAdmin();
  return admin.storage(app);
};

export default admin; 