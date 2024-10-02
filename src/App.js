import React from 'react';
import EmbroideryCalculator from './components/EmbroideryCalculator';

function App() {
  return (
    <div className="App">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-2xl font-bold">Embroidery Pricing Calculator</h1>
      </header>
      <main className="container mx-auto mt-8">
        <EmbroideryCalculator />
      </main>
    </div>
  );
}

export default App;