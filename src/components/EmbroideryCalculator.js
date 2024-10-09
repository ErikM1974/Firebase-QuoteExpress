import React, { useState, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import LineItem from './LineItem';
import OrderPDF from './OrderPDF';
import './EmbroideryCalculator.css';

const salespeople = [
  { name: 'Taylar Hanson', email: 'taylar@nwcustomapparel.com' },
  { name: 'Dyonii Flores', email: 'dyonii@nwcustomapparel.com' },
  { name: 'Nika Lao', email: 'nika@nwcustomapparel.com' },
  { name: 'Jim Mickelson', email: 'jim@nwcustomapparel.com' },
  { name: 'Erik Mickelson', email: 'erik@nwcustomapparel.com' },
  { name: 'Ruthie Nhoung', email: 'ruth@nwcustomapparel.com' },
  { name: 'Other', email: '' }
];

export default function EmbroideryCalculator() {
  const [lineItems, setLineItems] = useState([]);
  const [totalGarmentQuantity, setTotalGarmentQuantity] = useState(0);
  const [totalCapQuantity, setTotalCapQuantity] = useState(0);
  const [totalGarmentPrice, setTotalGarmentPrice] = useState(0);
  const [totalCapPrice, setTotalCapPrice] = useState(0);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [isOrderCompleted, setIsOrderCompleted] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [quoteNumber, setQuoteNumber] = useState('');
  const [salesperson, setSalesperson] = useState(salespeople[0]);
  const [otherSalespersonName, setOtherSalespersonName] = useState('');
  const [otherSalespersonEmail, setOtherSalespersonEmail] = useState('');

  useEffect(() => {
    calculateTotals();
  }, [lineItems]);

  const addLineItem = () => {
    setLineItems([...lineItems, {
      styleNo: '',
      colorName: '',
      productTitle: '',
      quantities: {},
      totalQuantity: 0,
      price: 0,
      subtotal: 0,
      isCap: false
    }]);
  };

  const removeLineItem = (index) => {
    const newLineItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newLineItems);
  };

  const updateLineItem = (index, updatedItem) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = { ...newLineItems[index], ...updatedItem };
    setLineItems(newLineItems);
  };

  const calculateTotals = () => {
    let garmentQuantity = 0;
    let capQuantity = 0;
    let garmentPrice = 0;
    let capPrice = 0;

    lineItems.forEach(item => {
      if (item.isCap) {
        capQuantity += item.totalQuantity || 0;
        capPrice += item.subtotal || 0;
      } else {
        garmentQuantity += item.totalQuantity || 0;
        garmentPrice += item.subtotal || 0;
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

  const generateQuoteNumber = () => {
    const currentYear = new Date().getFullYear().toString().substr(-2);
    const randomNum = Math.floor(Math.random() * 99) + 1;
    return `${currentYear}${randomNum.toString().padStart(2, '0')}`;
  };

  const completeOrder = () => {
    const customerName = prompt("Please enter the customer's name:");
    if (customerName) {
      setCustomerName(customerName);
      setQuoteDate(new Date().toISOString().split('T')[0]);
      setQuoteNumber(generateQuoteNumber());
      setIsOrderCompleted(true);
    }
  };

  const unlockOrder = () => {
    setIsOrderCompleted(false);
  };

  const generatePDF = async () => {
    const selectedSalesperson = salesperson.name === 'Other' 
      ? { name: otherSalespersonName, email: otherSalespersonEmail }
      : salesperson;

    const blob = await pdf(
      <OrderPDF
        lineItems={lineItems}
        totalGarmentQuantity={totalGarmentQuantity}
        totalCapQuantity={totalCapQuantity}
        totalPrice={totalGarmentPrice + totalCapPrice}
        customerName={customerName}
        quoteDate={quoteDate}
        quoteNumber={quoteNumber}
        salesperson={selectedSalesperson}
      />
    ).toBlob();
    setPdfBlob(blob);
  };

  const downloadPDF = () => {
    if (pdfBlob) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      const fileName = `Quote_${quoteNumber}_${customerName.replace(/\s+/g, '_')}.pdf`;
      link.download = fileName;
      link.click();
    }
  };

  const handleSalespersonChange = (e) => {
    const selected = salespeople.find(sp => sp.name === e.target.value);
    setSalesperson(selected);
    if (selected.name !== 'Other') {
      setOtherSalespersonName('');
      setOtherSalespersonEmail('');
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-green-100 flex items-center justify-between">
          <img 
            src="https://cdn.caspio.com/A0E15000/Safety%20Stripes/web%20northwest%20custom%20apparel%20logo.png?ver=1" 
            alt="Northwest Custom Apparel Logo" 
            className="h-16 object-contain"
          />
          <h1 className="text-2xl font-bold text-green-600">
            Embroidery Quote Form
          </h1>
        </div>
        <div className="p-4 bg-gray-200">
          <p>Northwest Custom Apparel</p>
          <p>2025 Freeman Road East, Milton, WA 98354</p>
          <p>Phone: 253-922-5793</p>
          <p>Website: www.nwcustomapparel.com</p>
        </div>
        <div className="p-4 bg-blue-100">
          <label htmlFor="salesperson" className="block text-sm font-medium text-gray-700">Salesperson</label>
          <select
            id="salesperson"
            value={salesperson.name}
            onChange={handleSalespersonChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {salespeople.map((sp) => (
              <option key={sp.name} value={sp.name}>{sp.name}</option>
            ))}
          </select>
          {salesperson.name === 'Other' && (
            <div className="mt-2">
              <input
                type="text"
                placeholder="Other Salesperson Name"
                value={otherSalespersonName}
                onChange={(e) => setOtherSalespersonName(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              />
              <input
                type="email"
                placeholder="Other Salesperson Email"
                value={otherSalespersonEmail}
                onChange={(e) => setOtherSalespersonEmail(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              />
            </div>
          )}
        </div>
        <div className="p-4">
          {lineItems.map((item, index) => (
            <LineItem
              key={index}
              item={item}
              onRemove={() => removeLineItem(index)}
              onUpdate={(updatedItem) => updateLineItem(index, updatedItem)}
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
          <h2 className="text-xl font-bold">Quote Summary</h2>
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
              Complete Quote
            </button>
          ) : (
            <button
              onClick={unlockOrder}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 mr-4"
            >
              Unlock Quote
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
            <h3 className="font-bold">Quote Details:</h3>
            <p>Customer Name: {customerName}</p>
            <p>Quote Date: {quoteDate}</p>
            <p>Quote Number: {quoteNumber}</p>
            <p>Salesperson: {salesperson.name === 'Other' ? otherSalespersonName : salesperson.name}</p>
          </div>
        )}
      </div>
    </div>
  );
}
