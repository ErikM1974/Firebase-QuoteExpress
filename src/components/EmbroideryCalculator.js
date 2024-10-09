import React, { useState, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import LineItem from './LineItem';
import OrderPDF from './OrderPDF';
import './EmbroideryCalculator.css';

export default function EmbroideryCalculator() {
  const [lineItems, setLineItems] = useState([]);
  const [totalGarmentQuantity, setTotalGarmentQuantity] = useState(0);
  const [totalCapQuantity, setTotalCapQuantity] = useState(0);
  const [totalGarmentPrice, setTotalGarmentPrice] = useState(0);
  const [totalCapPrice, setTotalCapPrice] = useState(0);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [isOrderCompleted, setIsOrderCompleted] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

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

    newLineItems[index] = { ...newLineItems[index], totalQuantity: newTotalQuantity, isCap };
    setLineItems(newLineItems);

    if (isCap) {
      setTotalCapQuantity(prev => prev + quantityDifference);
    } else {
      setTotalGarmentQuantity(prev => prev + quantityDifference);
    }
  };

  const handlePriceChange = (index, price, isCap) => {
    const newLineItems = [...lineItems];
    const oldPrice = newLineItems[index].price || 0;
    const priceDifference = price - oldPrice;

    newLineItems[index] = { ...newLineItems[index], price, isCap };
    setLineItems(newLineItems);

    if (isCap) {
      setTotalCapPrice(prev => prev + priceDifference);
    } else {
      setTotalGarmentPrice(prev => prev + priceDifference);
    }
  };

  const calculateTotals = () => {
    let garmentQuantity = 0;
    let capQuantity = 0;
    let garmentPrice = 0;
    let capPrice = 0;

    lineItems.forEach(item => {
      if (item.isCap) {
        capQuantity += item.totalQuantity || 0;
        capPrice += item.price || 0;
      } else {
        garmentQuantity += item.totalQuantity || 0;
        garmentPrice += item.price || 0;
      }
    });

    setTotalGarmentQuantity(garmentQuantity);
    setTotalCapQuantity(capQuantity);
    setTotalGarmentPrice(garmentPrice);
    setTotalCapPrice(capPrice);
  };

  const isOrderValid = () => {
    return (totalGarmentQuantity >= 6 || totalCapQuantity >= 2) && lineItems.length > 0;
  };

  const completeOrder = () => {
    const customerName = prompt("Please enter the customer's name:");
    if (customerName) {
      setCustomerName(customerName);
      setOrderDate(new Date().toISOString().split('T')[0]);
      setOrderNumber(generateOrderNumber());
      setIsOrderCompleted(true);
    }
  };

  const unlockOrder = () => {
    setIsOrderCompleted(false);
  };

  const generateOrderNumber = () => {
    return 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const generatePDF = async () => {
    const blob = await pdf(
      <OrderPDF
        lineItems={lineItems}
        totalGarmentQuantity={totalGarmentQuantity}
        totalCapQuantity={totalCapQuantity}
        totalPrice={totalGarmentPrice + totalCapPrice}
        customerName={customerName}
        orderDate={orderDate}
        orderNumber={orderNumber}
      />
    ).toBlob();
    setPdfBlob(blob);
  };

  const downloadPDF = () => {
    if (pdfBlob) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = 'embroidery_order.pdf';
      link.click();
    }
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
              item={item}
              onRemove={() => removeLineItem(index)}
              onQuantityChange={(newTotalQuantity, isCap) => handleQuantityChange(index, newTotalQuantity, isCap)}
              onPriceChange={(price, isCap) => handlePriceChange(index, price, isCap)}
              totalGarmentQuantity={totalGarmentQuantity}
              totalCapQuantity={totalCapQuantity}
              isLocked={isOrderCompleted}
            />
          ))}
          <button
            onClick={addLineItem}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={isOrderCompleted}
          >
            Add Item
          </button>
        </div>
        <div className="p-4 bg-gray-200">
          <h2 className="text-xl font-bold">Order Summary</h2>
          <p>Total Garment Quantity: {totalGarmentQuantity}</p>
          <p>Garment Subtotal: ${totalGarmentPrice.toFixed(2)}</p>
          <p>Total Cap Quantity: {totalCapQuantity}</p>
          <p>Cap Subtotal: ${totalCapPrice.toFixed(2)}</p>
          <p>Total Price: ${(totalGarmentPrice + totalCapPrice).toFixed(2)}</p>
          {!isOrderValid() && (
            <p className="text-red-500">
              Minimum order: 6 garments or 2 caps
            </p>
          )}
        </div>
        <div className="p-4">
          {!isOrderCompleted ? (
            <button
              onClick={completeOrder}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-4"
              disabled={!isOrderValid()}
            >
              Complete Order
            </button>
          ) : (
            <button
              onClick={unlockOrder}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 mr-4"
            >
              Unlock Order
            </button>
          )}
          <button
            onClick={generatePDF}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Generate PDF
          </button>
          {pdfBlob && (
            <button
              onClick={downloadPDF}
              className="ml-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Download PDF
            </button>
          )}
        </div>
        {isOrderCompleted && (
          <div className="p-4 bg-blue-100">
            <h3 className="font-bold">Order Details:</h3>
            <p>Customer Name: {customerName}</p>
            <p>Order Date: {orderDate}</p>
            <p>Order Number: {orderNumber}</p>
          </div>
        )}
      </div>
    </div>
  );
}
