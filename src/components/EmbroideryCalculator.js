import React, { useState, useEffect } from 'react';
import LineItem from './LineItem';
import './EmbroideryCalculator.css';

export default function EmbroideryCalculator() {
  const [lineItems, setLineItems] = useState([]);
  const [totalGarmentQuantity, setTotalGarmentQuantity] = useState(0);
  const [totalCapQuantity, setTotalCapQuantity] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    calculateTotals();
  }, [lineItems]);

  const addLineItem = () => {
    setLineItems([...lineItems, {}]);
  };

  const removeLineItem = (index) => {
    const newLineItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newLineItems);
  };

  const handleQuantityChange = (index, newTotalQuantity, isCap) => {
    const newLineItems = [...lineItems];
    const oldQuantity = newLineItems[index].totalQuantity || 0;
    const quantityDifference = newTotalQuantity - oldQuantity;

    newLineItems[index] = { ...newLineItems[index], totalQuantity: newTotalQuantity };
    setLineItems(newLineItems);

    if (isCap) {
      setTotalCapQuantity(prev => prev + quantityDifference);
    } else {
      setTotalGarmentQuantity(prev => prev + quantityDifference);
    }
  };

  const handlePriceChange = (index, price) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = { ...newLineItems[index], price };
    setLineItems(newLineItems);
  };

  const calculateTotals = () => {
    let totalPrice = 0;

    lineItems.forEach(item => {
      totalPrice += item.price || 0;
    });

    setTotalPrice(totalPrice);
  };

  const isOrderValid = () => {
    return (totalGarmentQuantity >= 6 || totalCapQuantity >= 2) && lineItems.length > 0;
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <h1 className="text-2xl font-bold text-green-600 p-4 bg-green-100">
          Embroidery Order Form
        </h1>
        <div className="p-4">
          {lineItems.map((item, index) => (
            <LineItem
              key={index}
              onRemove={() => removeLineItem(index)}
              onQuantityChange={(newTotalQuantity, isCap) => handleQuantityChange(index, newTotalQuantity, isCap)}
              onPriceChange={(price) => handlePriceChange(index, price)}
              totalGarmentQuantity={totalGarmentQuantity}
              totalCapQuantity={totalCapQuantity}
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
          <h2 className="text-xl font-bold">Order Summary</h2>
          <p>Total Garment Quantity: {totalGarmentQuantity}</p>
          <p>Total Cap Quantity: {totalCapQuantity}</p>
          <p>Total Price: ${totalPrice.toFixed(2)}</p>
          {!isOrderValid() && (
            <p className="text-red-500">
              Minimum order: 6 garments or 2 caps
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
