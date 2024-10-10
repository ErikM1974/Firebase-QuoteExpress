import React from 'react';
import './App.css';
import EmbroideryCalculator from './components/EmbroideryCalculator';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-green-600 text-white p-4">
        <h1 className="text-2xl font-bold">Embroidery Order Form</h1>
      </header>
      <main className="container mx-auto px-4 py-8">
        <EmbroideryCalculator />
      </main>
    </div>
  );
}

export default App;