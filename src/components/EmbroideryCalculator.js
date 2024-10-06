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

      return { newAccessToken, expiresIn };
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
  }, []);

  const getAccessToken = useCallback(async () => {
    let accessToken = localStorage.getItem('caspioAccessToken');

    if (!accessToken) {
      const { newAccessToken } = await refreshToken();
      accessToken = newAccessToken;
    }

    return accessToken;
  }, [refreshToken]);

  const loadStyles = useCallback(
    debounce(async (inputValue) => {
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      console.log('Loading styles with input:', inputValue);

      try {
        const accessToken = await getAccessToken();
        const query = `q={"STYLE_No":{"ilike":"%${inputValue}%"}}&q.select=STYLE_No,COLOR_NAME&q.distinct=true&q.sort=STYLE_No`;
        console.log('Querying styles with:', query);
        const response = await axios.get(`${API_BASE_URL}?${query}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: abortController.current.signal,
        });

        console.log('Styles API response:', response.data);

        if (response.data?.Result?.length > 0) {
          const styleOptions = response.data.Result
            .filter((item) => item.STYLE_No && typeof item.STYLE_No === 'string')
            .map((item) => ({
              value: item.STYLE_No,
              label: `${item.STYLE_No} - ${item.COLOR_NAME || 'N/A'}`,
            }));

          // Remove duplicates based on value (STYLE_No)
          const uniqueOptions = Array.from(
            new Map(styleOptions.map((item) => [item.value, item])).values()
          );

          console.log('Unique style options:', uniqueOptions);
          return uniqueOptions;
        } else {
          console.warn('No styles found matching input:', inputValue);
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
    console.log('Fetching product details for style number:', styleNo);
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

      console.log('Product details API response:', response.data);

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

        console.log('Color map:', colorMap);
        console.log('Product data:', productData);

        setProductDatabase((prevState) => ({ ...prevState, ...productData }));
        setColors((prevColors) => ({
          ...prevColors,
          [styleNo]: Array.from(colorMap[styleNo] || []).sort(),
        }));

        // Update orders with the first available color
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.STYLE_No === styleNo && !order.COLOR_NAME
              ? { ...order, COLOR_NAME: Array.from(colorMap[styleNo] || [])[0] || '' }
              : order
          )
        );
      } else {
        console.warn('No product details returned from the server for style number:', styleNo);
        throw new Error('No product details returned from the server');
      }
    } catch (err) {
      console.error('Failed to load product details:', err);
      setError('Failed to load product details. Please try again later.');
    }
  }, [getAccessToken]);

  const updateOrder = useCallback(
    (index, field, value) => {
      console.log(`Updating order at index ${index}, field ${field}, with value:`, value);
      const newOrders = [...orders];
      newOrders[index] = {
        ...newOrders[index],
        [field]: value,
        error: null,
      };

      if (field === 'STYLE_No') {
        newOrders[index].COLOR_NAME = '';
        newOrders[index].quantities = {};
        if (value && !colors[value]) {
          fetchProductDetails(value);
        }
      } else if (field === 'COLOR_NAME') {
        newOrders[index].quantities = {};
      }

      const key = `${newOrders[index].STYLE_No}-${newOrders[index].COLOR_NAME}`;
      if (
        newOrders[index].STYLE_No &&
        newOrders[index].COLOR_NAME &&
        !productDatabase[key]
      ) {
        newOrders[index].error = 'Invalid style or color combination';
      }

      console.log('Updated orders:', newOrders);
      setOrders(newOrders);
    },
    [orders, colors, productDatabase, fetchProductDetails]
  );

  const updateQuantity = (orderIndex, size, value) => {
    console.log(`Updating quantity for order at index ${orderIndex}, size ${size}, with value:`, value);
    const newOrders = [...orders];
    const newQuantities = {
      ...newOrders[orderIndex].quantities,
      [size]: parseInt(value) || 0,
    };
    newOrders[orderIndex].quantities = newQuantities;
    console.log('Updated orders after quantity change:', newOrders);
    setOrders(newOrders);
  };

  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="text-red-500">
        {error}
        <button
          onClick={() => {
            setError(null);
            fetchProductDetails(orders[0].STYLE_No);
          }}
          className="ml-2 p-2 bg-blue-500 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

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
                        ? { value: order.STYLE_No, label: `${order.STYLE_No} - ${order.COLOR_NAME || 'Select Color'}` }
                        : null
                    }
                    placeholder="Enter or select style"
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <select
                    value={order.COLOR_NAME}
                    onChange={(e) =>
                      updateOrder(index, 'COLOR_NAME', e.target.value)
                    }
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
                {MAIN_SIZES.map((size) => {
                  const sizeAvailable = mainSizes.includes(size);
                  const sizeProduct = product?.sizes[size];
                  const basePrice = product
                    ? getPriceForQuantity(product, totalQuantity)
                    : 0;
                  const surcharge =
                    sizeProduct && sizeProduct.Surcharge
                      ? parseFloat(sizeProduct.Surcharge) || 0
                      : 0;
                  const price = basePrice + surcharge;

                  return (
                    <td
                      key={size}
                      className={`border border-gray-300 p-2 ${
                        ['2XL', '3XL'].includes(size) ? 'bg-yellow-100' : ''
                      }`}
                    >
                      {sizeAvailable ? (
                        <div>
                          <input
                            type="number"
                            value={order.quantities[size] || ''}
                            onChange={(e) =>
                              updateQuantity(index, size, e.target.value)
                            }
                            className="w-full mb-1 text-sm p-1 border rounded"
                            min="0"
                          />
                          <Tooltip>
                            ${price.toFixed(2)}
                            <span className="tooltiptext">
                              Base: ${basePrice.toFixed(2)}<br />
                              Surcharge: ${surcharge.toFixed(2)}
                            </span>
                          </Tooltip>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">N/A</div>
                      )}
                    </td>
                  );
                })}
                <td className="border border-gray-300 p-2">
                  {otherSizes.length > 0 ? (
                    otherSizes.map((size) => {
                      const sizeProduct = product?.sizes[size];
                      const basePrice = product
                        ? getPriceForQuantity(product, totalQuantity)
                        : 0;
                      const surcharge =
                        sizeProduct && sizeProduct.Surcharge
                          ? parseFloat(sizeProduct.Surcharge) || 0
                          : 0;
                      const price = basePrice + surcharge;

                      return (
                        <div key={size} className="mb-2">
                          <label className="text-xs font-bold block">
                            {size}
                          </label>
                          <input
                            type="number"
                            value={order.quantities[size] || ''}
                            onChange={(e) =>
                              updateQuantity(index, size, e.target.value)
                            }
                            className="w-full mb-1 text-sm p-1 border rounded"
                            min="0"
                          />
                          <Tooltip>
                            ${price.toFixed(2)}
                            <span className="tooltiptext">
                              Base: ${basePrice.toFixed(2)}<br />
                              Surcharge: ${surcharge.toFixed(2)}
                            </span>
                          </Tooltip>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-400">N/A</div>
                  )}
                </td>
                <td className="border border-gray-300 p-2 font-bold">
                  {lineQuantity}
                </td>
                <td className="border border-gray-300 p-2 font-bold">
                  ${calculateRowTotal(order, totalQuantity).toFixed(2)}
                </td>
                <td className="border border-gray-300 p-2">
                  <button
                    onClick={() => removeLine(index)}
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
      {orders.some((order) => order.error) && (
        <div className="text-red-500 mb-4">
          {orders.map(
            (order, index) =>
              order.error && (
                <div key={index}>
                  Line {index + 1}: {order.error}
                </div>
              )
          )}
        </div>
      )}
      <div className="mb-4">
        <button
          onClick={addNewLine}
          className="bg-green-600 text-white px-4 py-2 rounded mr-2 hover:bg-green-700"
        >
          Add Line
        </button>
        <button
          onClick={handleSubmitOrder}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Submit Order
        </button>
      </div>
      <div className="text-xl font-bold text-gray-700">
        Total Quantity: {totals.quantity}
      </div>
      <div className="text-xl font-bold text-gray-700">
        Total Price: ${totals.price.toFixed(2)}
      </div>
    </div>
  );
}
