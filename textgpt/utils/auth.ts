import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import { doc, getDoc } from './firestore';
import { db } from './firestore';

// Firebase authentication service
const auth = getAuth();

// Function to sign in user
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { user: null, error };
    }
    return { user: null, error: new Error('Unknown error occurred during sign in') };
  }
};

// Function to create new user
export const createUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { user: null, error };
    }
    return { user: null, error: new Error('Unknown error occurred during user creation') };
  }
};

// Function to sign out user
export const logOut = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { error };
    }
    return { error: new Error('Unknown error occurred during sign out') };
  }
};

// Hook to get the current auth state and user role
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'business' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      
      if (authUser) {
        setUser(authUser);
        
        // Get user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role as 'admin' | 'business' | null);
          } else {
            setUserRole(null);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { user, loading, userRole };
};

export { auth }; 