import React, { useState } from 'react';
import LineItem from './LineItem';
import './EmbroideryCalculator.css';

export default function EmbroideryCalculator() {
  const [lineItems, setLineItems] = useState([]);
  const [totalQuantity, setTotalQuantity] = useState(0);

  const addLineItem = () => {
    setLineItems([...lineItems, {}]);
  };

  const removeLineItem = (index) => {
    const newLineItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newLineItems);
    calculateTotalQuantity(newLineItems);
  };

  const handleQuantityChange = (index, quantities) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = { ...newLineItems[index], quantities };
    setLineItems(newLineItems);
    calculateTotalQuantity(newLineItems);
  };

  const calculateTotalQuantity = (items) => {
    const total = items.reduce((sum, item) => {
      const itemTotal = Object.values(item.quantities || {}).reduce((a, b) => a + b, 0);
      return sum + itemTotal;
    }, 0);
    setTotalQuantity(total);
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <h1 className="text-2xl font-bold text-green-600 p-4 bg-green-100">
          Embroidery Order Form
        </h1>
        <div className="p-4">
          {lineItems.map((_, index) => (
            <LineItem
              key={index}
              onRemove={() => removeLineItem(index)}
              onQuantityChange={(quantities) => handleQuantityChange(index, quantities)}
            />
          ))}
          <button
            onClick={addLineItem}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Item
          </button>
        </div>
        <div className="p-4 bg-gray-200">
          <h2 className="text-xl font-bold">Total Quantity: {totalQuantity}</h2>
        </div>
      </div>
    </div>
  );
}
