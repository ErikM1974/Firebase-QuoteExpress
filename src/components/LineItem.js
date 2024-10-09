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

const STANDARD_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

export default function LineItem({ onRemove, onQuantityChange, onPriceChange, totalGarmentQuantity, totalCapQuantity }) {
  const [item, setItem] = useState({
    styleNo: '',
    colorName: '',
    productTitle: '',
    productData: null,
    quantities: {},
    totalQuantity: 0,
    price: 0,
    subtotal: 0,
    isCap: false,
  });

  useEffect(() => {
    calculatePrice();
  }, [item.quantities, item.productData, totalGarmentQuantity, totalCapQuantity]);

  const loadStyleOptions = async (inputValue) => {
    try {
      if (!inputValue) return [];

      const searchTerm = inputValue.toUpperCase();
      const stylesRef = collection(db, 'styles');

      const styleQuery = query(
        stylesRef,
        orderBy('styleNo'),
        startAt(searchTerm),
        endAt(searchTerm + '\uf8ff'),
        limit(20)
      );

      const querySnapshot = await getDocs(styleQuery);

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          value: doc.id,
          label: data.styleNo,
          data: data,
        };
      });
    } catch (err) {
      console.error('Error loading styles:', err);
      return [];
    }
  };

  const handleStyleSelect = (selectedOption) => {
    if (!selectedOption) {
      setItem((prevItem) => ({
        ...prevItem,
        styleNo: '',
        productTitle: '',
        productData: null,
        colorName: '',
        quantities: {},
        totalQuantity: 0,
        price: 0,
        subtotal: 0,
        isCap: false,
      }));
      onQuantityChange(0, false);
      onPriceChange(0, false);
      return;
    }

    const styleData = selectedOption.data;
    const isCap = styleData.productTitle.toLowerCase().includes('cap');
    setItem((prevItem) => ({
      ...prevItem,
      styleNo: styleData.styleNo,
      productTitle: styleData.productTitle,
      productData: styleData,
      colorName: '',
      quantities: {},
      totalQuantity: 0,
      price: 0,
      subtotal: 0,
      isCap: isCap,
    }));
    onQuantityChange(0, isCap);
    onPriceChange(0, isCap);
  };

  const handleColorSelect = (color) => {
    setItem((prevItem) => ({
      ...prevItem,
      colorName: color,
    }));
  };

  const handleQuantityChange = (size, quantity) => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      setItem((prevItem) => {
        const newQuantities = { ...prevItem.quantities };
        delete newQuantities[size];
        const newTotalQuantity = Object.values(newQuantities).reduce((a, b) => a + b, 0);
        onQuantityChange(newTotalQuantity, prevItem.isCap);
        return {
          ...prevItem,
          quantities: newQuantities,
          totalQuantity: newTotalQuantity,
        };
      });
    } else {
      setItem((prevItem) => {
        const newQuantities = {
          ...prevItem.quantities,
          [size]: qty,
        };
        const newTotalQuantity = Object.values(newQuantities).reduce((a, b) => a + b, 0);
        onQuantityChange(newTotalQuantity, prevItem.isCap);
        return {
          ...prevItem,
          quantities: newQuantities,
          totalQuantity: newTotalQuantity,
        };
      });
    }
  };

  const calculatePrice = () => {
    if (!item.productData || item.totalQuantity === 0) {
      setItem((prevItem) => ({ ...prevItem, price: 0, subtotal: 0 }));
      onPriceChange(0, item.isCap);
      return;
    }

    const { basePrice, capPrices, sizeUpcharges } = item.productData;
    const totalQuantity = item.isCap ? totalCapQuantity : totalGarmentQuantity;
    
    let baseItemPrice;
    if (item.isCap) {
      if (totalQuantity >= 144) baseItemPrice = parseFloat(capPrices['144_plus']);
      else if (totalQuantity >= 24) baseItemPrice = parseFloat(capPrices['24_143']);
      else baseItemPrice = parseFloat(capPrices['2_23']);
    } else {
      if (totalQuantity >= 72) baseItemPrice = basePrice['72_plus'];
      else if (totalQuantity >= 48) baseItemPrice = basePrice['48_71'];
      else if (totalQuantity >= 24) baseItemPrice = basePrice['24_47'];
      else if (totalQuantity >= 12) baseItemPrice = basePrice['12_23'];
      else if (totalQuantity >= 6) baseItemPrice = basePrice['6_11'];
      else baseItemPrice = basePrice['2_5'];
    }

    let subtotal = 0;
    for (const [size, quantity] of Object.entries(item.quantities)) {
      let itemPrice = baseItemPrice;
      if (sizeUpcharges && sizeUpcharges[size]) {
        itemPrice += sizeUpcharges[size];
      }
      subtotal += itemPrice * quantity;
    }

    setItem((prevItem) => ({ 
      ...prevItem, 
      price: baseItemPrice,
      subtotal: subtotal
    }));
    onPriceChange(subtotal, item.isCap);
  };

  const renderSizingMatrix = () => {
    if (!item.productData || !item.productData.sizes) return null;

    const availableSizes = item.productData.sizes;
    const standardSizes = STANDARD_SIZES.filter(size => availableSizes.includes(size));
    const otherSizes = availableSizes.filter(size => !STANDARD_SIZES.includes(size));

    return (
      <div className="mt-2">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                {standardSizes.map((size) => (
                  <th key={size} className="px-2 py-1 border-b border-gray-200 bg-gray-50 text-center text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    {size}
                  </th>
                ))}
                {otherSizes.length > 0 && (
                  <th className="px-2 py-1 border-b border-gray-200 bg-gray-50 text-center text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Other Sizes
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                {standardSizes.map((size) => (
                  <td key={size} className="px-2 py-1 border-b border-gray-200 text-center">
                    <input
                      type="number"
                      min="0"
                      value={item.quantities[size] || ''}
                      onChange={(e) => handleQuantityChange(size, e.target.value)}
                      className="w-12 text-center rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      aria-label={`Quantity for size ${size}`}
                    />
                    {item.quantities[size] > 0 && (
                      <div className="text-xs mt-1">
                        ${(item.price + (item.productData.sizeUpcharges?.[size] || 0)).toFixed(2)} each
                      </div>
                    )}
                  </td>
                ))}
                {otherSizes.length > 0 && (
                  <td className="px-2 py-1 border-b border-gray-200 text-center">
                    <div className="flex flex-col items-center">
                      {otherSizes.map((size) => (
                        <div key={size} className="flex items-center mb-1">
                          <span className="mr-1 text-xs">{size}:</span>
                          <input
                            type="number"
                            min="0"
                            value={item.quantities[size] || ''}
                            onChange={(e) => handleQuantityChange(size, e.target.value)}
                            className="w-12 text-center rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            aria-label={`Quantity for size ${size}`}
                          />
                          {item.quantities[size] > 0 && (
                            <div className="text-xs ml-1">
                              ${(item.price + (item.productData.sizeUpcharges?.[size] || 0)).toFixed(2)} each
                            </div>
                          )}
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
    <div className="border p-2 mb-2 rounded-lg">
      <div className="flex flex-wrap items-center mb-2">
        <div className="w-full sm:w-1/4 pr-2 mb-2 sm:mb-0">
          <AsyncSelect
            className="text-sm"
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
        <div className="w-full sm:w-1/4 pr-2 mb-2 sm:mb-0">
          <select
            className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            onChange={(e) => handleColorSelect(e.target.value)}
            value={item.colorName}
            disabled={!item.productData || !item.productData.colors}
          >
            <option value="">Select Color</option>
            {item.productData &&
              item.productData.colors &&
              item.productData.colors.map((color, index) => (
                <option key={index} value={color}>
                  {color}
                </option>
              ))}
          </select>
        </div>
        <div className="w-full sm:w-1/4 pr-2 mb-2 sm:mb-0">
          <p className="text-sm truncate">
            {item.productTitle || 'No product selected'}
            {item.isCap && <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">Cap</span>}
          </p>
        </div>
        <div className="w-full sm:w-1/4 text-right">
          <button
            onClick={onRemove}
            className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
          >
            Remove
          </button>
        </div>
      </div>
      {renderSizingMatrix()}
      <div className="mt-2 text-right">
        <p className="text-sm font-bold">Total Quantity: {item.totalQuantity}</p>
        <p className="text-sm font-bold">Subtotal: ${item.subtotal.toFixed(2)}</p>
      </div>
    </div>
  );
}