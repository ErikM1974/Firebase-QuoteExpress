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
        const query = `q={"STYLE_No":{"ilike":"%${inputValue}%"}}&q.select=STYLE_No,COLOR_NAME&q.distinct=true&q.sort=STYLE_No`;
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
              label: `${item.STYLE_No} - ${item.COLOR_NAME || 'N/A'}`,
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

  // ... (rest of the component code remains unchanged)

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
                {/* ... (rest of the table row remains unchanged) */}
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* ... (rest of the component JSX remains unchanged) */}
    </div>
  );
}
