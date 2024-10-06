import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import AsyncSelect from 'react-select/async';
import debounce from 'lodash/debounce';

const API_BASE_URL = 'https://c3eku948.caspio.com/rest/v2/views/Heroku/records';
const MAIN_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

const Spinner = styled.div`
  border: 16px solid #f3f3f3;
  border-top: 16px solid #3498db;
  border-radius: 50%;
  width: 80px;
  height: 80px;
  animation: spin 1s linear infinite;
  margin: 20px auto;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const Tooltip = styled.span`
  position: relative;
  display: inline-block;
  border-bottom: 1px dotted black;

  .tooltiptext {
    visibility: hidden;
    width: 120px;
    background-color: black;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 5px 0;
    position: absolute;
    z-index: 1;
    bottom: 125%;
    left: 50%;
    margin-left: -60px;
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover .tooltiptext {
    visibility: visible;
    opacity: 1;
  }
`;

export default function EmbroideryCalculator() {
  const [productDatabase, setProductDatabase] = useState({});
  const [orders, setOrders] = useState([
    {
      STYLE_No: '',
      COLOR_NAME: '',
      quantities: {},
      error: null,
    },
  ]);
  const [colors, setColors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const timeoutRef = useRef(null);
  const abortController = useRef(null);

  const refreshToken = useCallback(async () => {
    try {
      console.log('Refreshing token...');
      const response = await axios.post(
        'https://c3eku948.caspio.com/oauth/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.REACT_APP_CASPIO_CLIENT_ID,
          client_secret: process.env.REACT_APP_CASPIO_CLIENT_SECRET,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const newAccessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;

      localStorage.setItem('caspioAccessToken', newAccessToken);
      console.log('Token refreshed successfully');

      return { newAccessToken, expiresIn };
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
  }, []);

  const getAccessToken = useCallback(async () => {
    let accessToken = localStorage.getItem('caspioAccessToken');

    if (!accessToken) {
      console.log('No token found, refreshing...');
      const { newAccessToken } = await refreshToken();
      accessToken = newAccessToken;
    }

    return accessToken;
  }, [refreshToken]);

  const loadStyles = useCallback(
    debounce(async (inputValue) => {
      console.log('Loading styles for input:', inputValue);
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      try {
        const accessToken = await getAccessToken();
        const query = `q={"STYLE_No":{"ilike":"%${inputValue}%"}}&q.select=STYLE_No&q.distinct=true&q.sort=STYLE_No`;
        console.log('API request URL:', `${API_BASE_URL}?${query}`);
        const response = await axios.get(`${API_BASE_URL}?${query}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: abortController.current.signal,
        });

        console.log('API response:', response.data);

        if (response.data?.Result?.length > 0) {
          const styleOptions = response.data.Result
            .filter((item) => item.STYLE_No && typeof item.STYLE_No === 'string')
            .map((item) => ({
              value: item.STYLE_No,
              label: item.STYLE_No,
            }));

          // Remove duplicates based on value (STYLE_No)
          const uniqueOptions = Array.from(
            new Map(styleOptions.map((item) => [item.value, item])).values()
          );

          console.log('Unique style options:', uniqueOptions);
          return uniqueOptions;
        } else {
          console.log('No styles found');
          return [];
        }
      } catch (err) {
        if (axios.isCancel(err)) {
          console.log('Request canceled', err.message);
        } else {
          console.error('Error loading styles:', err);
          setError('Failed to load styles. Please try again.');
        }
        return [];
      }
    }, 300),
    [getAccessToken]
  );

  const fetchProductDetails = useCallback(async (styleNo) => {
    try {
      const accessToken = await getAccessToken();
      const response = await axios.get(
        `${API_BASE_URL}?q={"STYLE_No":"${styleNo}"}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data?.Result?.length > 0) {
        const products = response.data.Result;
        const colorMap = {};
        const productData = {};

        products.forEach((product) => {
          const key = `${product.STYLE_No}-${product.COLOR_NAME}`;
          if (!productData[key]) {
            productData[key] = {
              PRODUCT_TITLE: product.PRODUCT_NAME || `${product.STYLE_No} - ${product.COLOR_NAME}`,
              STYLE_No: product.STYLE_No,
              COLOR_NAME: product.COLOR_NAME,
              sizes: {},
              prices: {
                Price_2_5: product.Price_2_5,
                Price_6_11: product.Price_6_11,
                Price_12_23: product.Price_12_23,
                Price_24_47: product.Price_24_47,
                Price_48_71: product.Price_48_71,
                Price_72_plus: product.Price_72,
              },
            };
          }
          productData[key].sizes[product.SIZE] = {
            ...product,
            Surcharge: parseFloat(product.Surcharge) || 0,
            SizeOrder: parseInt(product.SizeOrder) || 999,
          };

          if (!colorMap[product.STYLE_No]) {
            colorMap[product.STYLE_No] = new Set();
          }
          colorMap[product.STYLE_No].add(product.COLOR_NAME);
        });

        setProductDatabase((prevState) => ({ ...prevState, ...productData }));
        setColors((prevColors) => ({
          ...prevColors,
          [styleNo]: Array.from(colorMap[styleNo] || []).sort(),
        }));
      } else {
        throw new Error('No product details returned from the server');
      }
    } catch (err) {
      console.error('Failed to load product details:', err);
      setError('Failed to load product details. Please try again later.');
    }
  }, [getAccessToken]);

  const getAvailableSizes = useCallback((order) => {
    const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
    const product = productDatabase[key];
    if (!product) return { mainSizes: [], otherSizes: [] };

    const availableSizes = Object.keys(product.sizes);
    const mainSizes = [];
    const otherSizes = [];

    availableSizes.forEach((size) => {
      if (MAIN_SIZES.includes(size)) {
        mainSizes.push(size);
      } else {
        otherSizes.push(size);
      }
    });

    return { mainSizes, otherSizes };
  }, [productDatabase]);

  const calculateLineQuantity = useCallback((order) => {
    return Object.values(order.quantities).reduce(
      (sum, qty) => sum + (qty || 0),
      0
    );
  }, []);

  const updateOrder = useCallback(
    (index, field, value) => {
      setOrders((prevOrders) => {
        const newOrders = [...prevOrders];
        newOrders[index] = {
          ...newOrders[index],
          [field]: value,
          error: null,
        };

        if (field === 'STYLE_No') {
          newOrders[index].COLOR_NAME = '';
          newOrders[index].quantities = {};
          if (value && !colors[value]) {
            // Fetch product details if not already in the database
            fetchProductDetails(value);
          }
        } else if (field === 'COLOR_NAME') {
          newOrders[index].quantities = {};
        }

        return newOrders;
      });
    },
    [colors, fetchProductDetails]
  );

  const getPriceForQuantity = useCallback((product, totalQuantity) => {
    if (!product) return 0;

    const { prices } = product;

    if (totalQuantity >= 72) return parseFloat(prices.Price_72_plus) || 0;
    if (totalQuantity >= 48) return parseFloat(prices.Price_48_71) || 0;
    if (totalQuantity >= 24) return parseFloat(prices.Price_24_47) || 0;
    if (totalQuantity >= 12) return parseFloat(prices.Price_12_23) || 0;
    if (totalQuantity >= 6) return parseFloat(prices.Price_6_11) || 0;
    return parseFloat(prices.Price_2_5) || 0;
  }, []);

  const totals = useMemo(() => {
    const totalQuantity = orders.reduce((acc, order) => {
      return (
        acc +
        Object.values(order.quantities).reduce(
          (sum, qty) => sum + (qty || 0),
          0
        )
      );
    }, 0);

    const totalPrice = orders.reduce((acc, order) => {
      const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
      const product = productDatabase[key];
      if (!product) return acc;

      const orderPrice = Object.entries(order.quantities).reduce(
        (sum, [size, qty]) => {
          if (!qty) return sum;
          const sizeProduct = product.sizes[size];
          const basePrice = getPriceForQuantity(product, totalQuantity);
          const surcharge =
            sizeProduct && sizeProduct.Surcharge
              ? parseFloat(sizeProduct.Surcharge) || 0
              : 0;
          return sum + (basePrice + surcharge) * qty;
        },
        0
      );

      return acc + orderPrice;
    }, 0);

    return { quantity: totalQuantity, price: totalPrice };
  }, [orders, productDatabase, getPriceForQuantity]);

  return (
    <div className="w-full p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-green-600">
        Embroidery Order Form
      </h1>
      <table className="w-full border-collapse border border-gray-300 mb-4 bg-white">
        <thead>
          <tr className="bg-green-600 text-white">
            <th className="border border-gray-300 p-2">Style No</th>
            <th className="border border-gray-300 p-2">Color Name</th>
            <th className="border border-gray-300 p-2">Product Title</th>
            {MAIN_SIZES.map((size) => (
              <th key={size} className="border border-gray-300 p-2">
                {size}
              </th>
            ))}
            <th className="border border-gray-300 p-2">Other Sizes</th>
            <th className="border border-gray-300 p-2">Line Qty</th>
            <th className="border border-gray-300 p-2">Row Total</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            const { mainSizes, otherSizes } = getAvailableSizes(order);
            const totalQuantity = totals.quantity;
            const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
            const product = productDatabase[key];
            const lineQuantity = calculateLineQuantity(order);

            return (
              <tr key={index}>
                <td className="border border-gray-300 p-2">
                  <AsyncSelect
                    cacheOptions
                    loadOptions={loadStyles}
                    defaultOptions
                    onChange={(selectedOption) => {
                      const value = selectedOption ? selectedOption.value : '';
                      updateOrder(index, 'STYLE_No', value);
                    }}
                    value={
                      order.STYLE_No
                        ? { value: order.STYLE_No, label: order.STYLE_No }
                        : null
                    }
                    placeholder="Enter or select style"
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <select
                    value={order.COLOR_NAME}
                    onChange={(e) => updateOrder(index, 'COLOR_NAME', e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={!order.STYLE_No}
                  >
                    <option value="">Select Color</option>
                    {colors[order.STYLE_No]?.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border border-gray-300 p-2">
                  {product?.PRODUCT_TITLE || ''}
                </td>
                {MAIN_SIZES.map((size) => (
                  <td key={size} className="border border-gray-300 p-2">
                    <input
                      type="number"
                      value={order.quantities[size] || ''}
                      onChange={(e) => updateOrder(index, 'quantities', { ...order.quantities, [size]: e.target.value })}
                      className="w-full p-1 border rounded"
                      min="0"
                    />
                    {product && (
                      <div className="text-xs text-gray-500 mt-1">
                        ${(getPriceForQuantity(product, totalQuantity) + (product.sizes[size]?.Surcharge || 0)).toFixed(2)}
                      </div>
                    )}
                  </td>
                ))}
                <td className="border border-gray-300 p-2">
                  {otherSizes.map((size) => (
                    <div key={size} className="mb-2">
                      <span>{size}: </span>
                      <input
                        type="number"
                        value={order.quantities[size] || ''}
                        onChange={(e) => updateOrder(index, 'quantities', { ...order.quantities, [size]: e.target.value })}
                        className="w-20 p-1 border rounded"
                        min="0"
                      />
                      {product && (
                        <div className="text-xs text-gray-500 mt-1">
                          ${(getPriceForQuantity(product, totalQuantity) + (product.sizes[size]?.Surcharge || 0)).toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))}
                </td>
                <td className="border border-gray-300 p-2">{lineQuantity}</td>
                <td className="border border-gray-300 p-2">
                  ${(calculateLineQuantity(order) * (product ? getPriceForQuantity(product, totalQuantity) : 0)).toFixed(2)}
                </td>
                <td className="border border-gray-300 p-2">
                  <button
                    onClick={() => setOrders(orders.filter((_, i) => i !== index))}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        onClick={() => setOrders([...orders, { STYLE_No: '', COLOR_NAME: '', quantities: {}, error: null }])}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2"
      >
        Add Line
      </button>
      <button
        onClick={() => console.log('Submit order:', orders)}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Submit Order
      </button>
      <div className="mt-4">
        <p>Total Quantity: {totals.quantity}</p>
        <p>Total Price: ${totals.price.toFixed(2)}</p>
      </div>
    </div>
  );
}
