import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const getFirebaseConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production configuration
    return {
      // Add your production Firebase configuration here
      // This should be different from your development configuration
    };
  } else {
    // Development configuration
    return {
      apiKey: "AIzaSyB2aOPl3hfWK7T8yr9z-JKT9q-8M2l9Fk4",
      authDomain: "quoteexpress-dev-new.firebaseapp.com",
      projectId: "quoteexpress-dev-new",
      storageBucket: "quoteexpress-dev-new.appspot.com",
      messagingSenderId: "716688815009",
      appId: "1:716688815009:web:848366aa6342feb7f291e0",
      measurementId: "G-NWY6W9Z05Y"
    };
  }
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db, analytics };
