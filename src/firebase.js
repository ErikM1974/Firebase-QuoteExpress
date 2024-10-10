import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const getFirebaseConfig = () => {
  console.log('Current NODE_ENV:', process.env.NODE_ENV);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('Using production config');
    return {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID,
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
    };
  } else {
    console.log('Using development config');
    const config = {
      apiKey: process.env.REACT_APP_DEV_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_DEV_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_DEV_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_DEV_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_DEV_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_DEV_FIREBASE_APP_ID,
      measurementId: process.env.REACT_APP_DEV_FIREBASE_MEASUREMENT_ID
    };
    console.log('Development config:', config);
    return config;
  }
};

const firebaseConfig = getFirebaseConfig();
console.log('Final Firebase config:', firebaseConfig);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
