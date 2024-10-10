import React from 'react';
import './App.css';
import EmbroideryCalculator from './components/EmbroideryCalculator';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

function App() {
  const testFirebaseConnection = async () => {
    try {
      const docRef = await addDoc(collection(db, "test"), {
        message: "Hello from QuoteExpress-Dev!",
        timestamp: new Date()
      });
      console.log("Document written with ID: ", docRef.id);
      alert("Firebase connection successful! Check the console for the document ID.");
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Firebase connection failed. Check the console for details.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-green-600 text-white p-4">
        <h1 className="text-2xl font-bold">Embroidery Order Form</h1>
      </header>
      <main className="container mx-auto px-4 py-8">
        <EmbroideryCalculator />
        <button 
          onClick={testFirebaseConnection}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Test Firebase Connection
        </button>
      </main>
    </div>
  );
}

export default App;
