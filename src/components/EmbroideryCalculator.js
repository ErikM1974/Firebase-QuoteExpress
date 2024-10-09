import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  limit,
  orderBy,
  startAt,
  endAt,
} from 'firebase/firestore';
import AsyncSelect from 'react-select/async';
import './EmbroideryCalculator.css';

const STANDARD_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

export default function EmbroideryCalculator() {
  const [order, setOrder] = useState({
    styleNo: '',
    colorName: '',
    productTitle: '',
    productData: null,
    quantities: {},
  });
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!db) {
      console.error('Firestore db is not initialized');
      setErrorMessage('Firebase initialization failed. Please check your configuration.');
    }
  }, []);

  // Function to load style options asynchronously
  const loadStyleOptions = async (inputValue) => {
    console.log('loadStyleOptions called with:', inputValue);
    try {
      if (!inputValue) {
        console.log('No input value, returning empty array');
        return [];
      }

      const searchTerm = inputValue.toUpperCase();
      const stylesRef = collection(db, 'styles');

      const styleQuery = query(
        stylesRef,
        orderBy('styleNo'),
        startAt(searchTerm),
        endAt(searchTerm + '\uf8ff'),
        limit(20)
      );

      console.log('Executing Firestore query');
      const querySnapshot = await getDocs(styleQuery);
      console.log('Query snapshot:', querySnapshot);

      const loadedStyles = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log('Document data:', data);
        return {
          value: doc.id,
          label: data.styleNo,
          data: data,
        };
      });

      console.log('Loaded styles:', loadedStyles);
      return loadedStyles;
    } catch (err) {
      console.error('Error loading styles:', err);
      setErrorMessage(`Error loading styles: ${err.message}`);
      return [];
    }
  };

  // Handle selection of a style
  const handleStyleSelect = (selectedOption) => {
    console.log('Selected option:', selectedOption);
    if (!selectedOption) {
      setOrder((prevOrder) => ({
        ...prevOrder,
        styleNo: '',
        productTitle: '',
        productData: null,
        colorName: '',
        quantities: {},
      }));
      return;
    }

    const styleData = selectedOption.data;
    setOrder((prevOrder) => ({
      ...prevOrder,
      styleNo: styleData.styleNo,
      productTitle: styleData.productTitle,
      productData: styleData,
      colorName: '',
      quantities: {},
    }));
  };

  const handleColorSelect = (color) => {
    setOrder((prevOrder) => ({
      ...prevOrder,
      colorName: color,
    }));
  };

  const handleQuantityChange = (size, quantity) => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      setOrder((prevOrder) => {
        const newQuantities = { ...prevOrder.quantities };
        delete newQuantities[size];
        return {
          ...prevOrder,
          quantities: newQuantities,
        };
      });
    } else {
      setOrder((prevOrder) => ({
        ...prevOrder,
        quantities: {
          ...prevOrder.quantities,
          [size]: qty,
        },
      }));
    }
  };

  const validateForm = () => {
    if (!order.styleNo) {
      setErrorMessage('Please select a style');
      return false;
    }
    if (!order.colorName) {
      setErrorMessage('Please select a color');
      return false;
    }
    const totalQuantity = Object.values(order.quantities).reduce((sum, qty) => sum + qty, 0);
    if (totalQuantity === 0) {
      setErrorMessage('Please enter at least one quantity');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    console.log('Order submitted:', order);
    // Implement your submission logic here
    try {
      // Example: Add order to Firestore
      // await addDoc(collection(db, 'orders'), order);
      // Reset form after submission
      // setOrder({ styleNo: '', colorName: '', productTitle: '', productData: null, quantities: {} });
      // alert('Order submitted successfully!');
    } catch (error) {
      console.error('Error submitting order:', error);
      setErrorMessage(`Error submitting order: ${error.message}`);
    }
  };

  const renderSizingMatrix = () => {
    if (!order.productData || !order.productData.sizes) return null;

    const availableSizes = order.productData.sizes;
    const standardSizes = STANDARD_SIZES.filter(size => availableSizes.includes(size));
    const otherSizes = availableSizes.filter(size => !STANDARD_SIZES.includes(size));

    return (
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-700 mb-2">Sizing Matrix</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                {standardSizes.map((size) => (
                  <th
                    key={size}
                    className="px-4 py-2 border-b-2 border-gray-200 bg-gray-100 text-center text-xs leading-4 font-medium text-gray-700 uppercase tracking-wider"
                  >
                    {size}
                  </th>
                ))}
                {otherSizes.length > 0 && (
                  <th
                    className="px-4 py-2 border-b-2 border-gray-200 bg-gray-100 text-center text-xs leading-4 font-medium text-gray-700 uppercase tracking-wider"
                  >
                    Other Sizes
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                {standardSizes.map((size) => (
                  <td key={size} className="px-4 py-2 border-b border-gray-200 text-center">
                    <input
                      type="number"
                      min="0"
                      value={order.quantities[size] || ''}
                      onChange={(e) => handleQuantityChange(size, e.target.value)}
                      className="mt-1 block w-16 mx-auto rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      aria-label={`Quantity for size ${size}`}
                    />
                  </td>
                ))}
                {otherSizes.length > 0 && (
                  <td className="px-4 py-2 border-b border-gray-200 text-center">
                    <div className="flex flex-col items-center">
                      {otherSizes.map((size) => (
                        <div key={size} className="flex items-center mb-2">
                          <span className="mr-2">{size}:</span>
                          <input
                            type="number"
                            min="0"
                            value={order.quantities[size] || ''}
                            onChange={(e) => handleQuantityChange(size, e.target.value)}
                            className="block w-16 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            aria-label={`Quantity for size ${size}`}
                          />
                        </div>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <h1 className="text-2xl font-bold text-green-600 p-4 bg-green-100">
          Embroidery Order Form
        </h1>
        {errorMessage && (
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4"
            role="alert"
          >
            <p className="font-bold">Error</p>
            <p>{errorMessage}</p>
          </div>
        )}
        <div className="p-4">
          <div className="flex flex-wrap space-x-4">
            {/* Style Number Input */}
            <div className="w-full md:w-1/3 relative">
              <label className="block text-sm font-medium text-gray-700">Style</label>
              <AsyncSelect
                className="mt-1"
                classNamePrefix="select"
                isClearable
                isSearchable
                name="style"
                loadOptions={loadStyleOptions}
                onChange={handleStyleSelect}
                placeholder="Search styles..."
                noOptionsMessage={() => 'No styles found'}
                loadingMessage={() => 'Loading...'}
                cacheOptions
                defaultOptions
              />
            </div>

            {/* Color Selection */}
            <div className="w-full md:w-1/3 mt-4 md:mt-0">
              <label className="block text-sm font-medium text-gray-700">Color</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                onChange={(e) => handleColorSelect(e.target.value)}
                value={order.colorName}
                disabled={!order.productData || !order.productData.colors}
                aria-label="Select color"
              >
                <option value="">Select Color</option>
                {order.productData &&
                  order.productData.colors &&
                  order.productData.colors.map((color, index) => (
                    <option key={index} value={color}>
                      {color}
                    </option>
                  ))}
              </select>
            </div>

            {/* Product Description */}
            <div className="w-full md:w-1/3 mt-4 md:mt-0">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1">
                {order.productTitle || 'Product description will appear here.'}
              </p>
            </div>
          </div>

          {/* Sizing Matrix */}
          {renderSizingMatrix()}

          {/* Submit Button */}
          <div className="mt-4">
            <button
              type="button"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none disabled:opacity-50"
              onClick={handleSubmit}
              disabled={!order.styleNo || !order.colorName}
            >
              Submit Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
