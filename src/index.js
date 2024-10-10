import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { db } from './firebase'; // Import Firebase configuration and db

const root = ReactDOM.createRoot(document.getElementById('root'));

// Ensure Firebase is initialized before rendering the app
const renderApp = () => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Check if Firebase is initialized
if (db) {
  renderApp();
} else {
  console.error('Firebase initialization failed');
}