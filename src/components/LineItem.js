import React, { useState } from 'react';
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

const STANDARD_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

export default function LineItem({ onRemove, onQuantityChange }) {
  const [item, setItem] = useState({
    styleNo: '',
    colorName: '',
    productTitle: '',
    productData: null,
    quantities: {},
  });

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
      }));
      return;
    }

    const styleData = selectedOption.data;
    setItem((prevItem) => ({
      ...prevItem,
      styleNo: styleData.styleNo,
      productTitle: styleData.productTitle,
      productData: styleData,
      colorName: '',
      quantities: {},
    }));
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
        return {
          ...prevItem,
          quantities: newQuantities,
        };
      });
    } else {
      setItem((prevItem) => {
        const newQuantities = {
          ...prevItem.quantities,
          [size]: qty,
        };
        onQuantityChange(newQuantities);
        return {
          ...prevItem,
          quantities: newQuantities,
        };
      });
    }
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
          <p className="text-sm truncate">{item.productTitle || 'No product selected'}</p>
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
    </div>
  );
}