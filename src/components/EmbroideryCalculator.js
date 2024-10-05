import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import styled from 'styled-components';

const API_BASE_URL = 'https://c3eku948.caspio.com/rest/v2/views/Heroku/records';
const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const LARGE_SIZES = ['2XL', '3XL', '4XL'];

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

const AutocompleteInput = styled.input`
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
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
  const [styles, setStyles] = useState([]);
  const [filteredStyles, setFilteredStyles] = useState([]);
  const [colors, setColors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const timeoutRef = useRef(null);

  // Token management functions
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

  // Fetch styles
  const fetchStyles = useCallback(async () => {
    try {
      const accessToken = await getAccessToken();

      const response = await axios.get(
        `${API_BASE_URL}?q.select=STYLE_No&q.distinct=true`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data?.Result?.length > 0) {
        const styleNumbers = response.data.Result
          .map(item => item.STYLE_No)
          .filter(styleNo => typeof styleNo === 'string' && styleNo.trim() !== '');
        setStyles(styleNumbers);
        setFilteredStyles(styleNumbers);
      } else {
        throw new Error('No styles returned from the server');
      }
    } catch (err) {
      if (err.response) {
        console.error('API Error:', err.response.status, err.response.data, 'URL:', err.config.url);
      } else {
        console.error('Error:', err.message);
      }
      setError('Failed to load styles. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  // Fetch product details
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

        products.forEach(product => {
          const key = `${product.STYLE_No}-${product.COLOR_NAME}`;
          if (!productData[key]) {
            productData[key] = {
              PRODUCT_TITLE: product.PRODUCT_TITLE,
              STYLE_No: product.STYLE_No,
              COLOR_NAME: product.COLOR_NAME,
              sizes: {},
            };
          }
          productData[key].sizes[product.SIZE] = product;

          if (!colorMap[product.STYLE_No]) {
            colorMap[product.STYLE_No] = new Set();
          }
          colorMap[product.STYLE_No].add(product.COLOR_NAME);
        });

        setProductDatabase(prevState => ({ ...prevState, ...productData }));
        setColors(prevColors => ({
          ...prevColors,
          [styleNo]: Array.from(colorMap[styleNo] || []).sort(),
        }));
      } else {
        throw new Error('No product details returned from the server');
      }
    } catch (err) {
      if (err.response) {
        console.error('API Error:', err.response.status, err.response.data, 'URL:', err.config.url);
      } else {
        console.error('Error:', err.message);
      }
      setError('Failed to load product details. Please try again later.');
    }
  }, [getAccessToken]);

  // Initial data fetch and token setup
  useEffect(() => {
    fetchStyles();

    const setupTokenRefresh = async () => {
      try {
        const { expiresIn } = await refreshToken();
        timeoutRef.current = setTimeout(() => {
          refreshToken().catch(console.error);
        }, (expiresIn - 60) * 1000);
      } catch (error) {
        console.error('Error setting up token refresh:', error);
      }
    };

    setupTokenRefresh();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fetchStyles, refreshToken]);

  // Update order
  const updateOrder = useCallback(
    (index, field, value) => {
      const newOrders = [...orders];
      newOrders[index] = {
        ...newOrders[index],
        [field]: value,
        error: null,
      };

      if (field === 'STYLE_No') {
        newOrders[index].COLOR_NAME = '';
        newOrders[index].quantities = {};
        fetchProductDetails(value);
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

      setOrders(newOrders);
    },
    [orders, productDatabase, fetchProductDetails]
  );

  const addNewLine = () => {
    setOrders(prevOrders => [
      ...prevOrders,
      {
        STYLE_No: '',
        COLOR_NAME: '',
        quantities: {},
        error: null,
      },
    ]);
  };

  const removeLine = (index) => {
    setOrders(prevOrders => prevOrders.filter((_, i) => i !== index));
  };

  const handleSubmitOrder = () => {
    console.log('Submitting order:', orders);
    alert('Order submitted successfully!');
  };

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
            setLoading(true);
            fetchStyles();
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
      <p className="mb-4">Number of styles available: {styles.length}</p>
      <div className="mb-4">
        {orders.map((order, index) => (
          <div key={index} className="flex items-center mb-2">
            <AutocompleteInput
              type="text"
              value={order.STYLE_No}
              onChange={(e) => updateOrder(index, 'STYLE_No', e.target.value)}
              placeholder="Enter style number"
              list={`styles-list-${index}`}
            />
            <datalist id={`styles-list-${index}`}>
              {filteredStyles.map(style => (
                <option key={style} value={style} />
              ))}
            </datalist>
            <select
              value={order.COLOR_NAME}
              onChange={(e) => updateOrder(index, 'COLOR_NAME', e.target.value)}
              className="ml-2 p-2 border rounded"
              disabled={!order.STYLE_No}
            >
              <option value="">Select Color</option>
              {colors[order.STYLE_No]?.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
            <button
              onClick={() => removeLine(index)}
              className="ml-2 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
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
    </div>
  );
}
