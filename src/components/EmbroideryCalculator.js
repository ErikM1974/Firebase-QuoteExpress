import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

  // Update quantity for a size
  const updateQuantity = (orderIndex, size, value) => {
    const newOrders = [...orders];
    const newQuantities = {
      ...newOrders[orderIndex].quantities,
      [size]: parseInt(value) || 0,
    };
    newOrders[orderIndex].quantities = newQuantities;
    setOrders(newOrders);
  };

  // Get available sizes for the selected product
  const getAvailableSizes = (order) => {
    const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
    const product = productDatabase[key];
    if (!product) return STANDARD_SIZES;

    const availableSizes = Object.keys(product.sizes);
    if (availableSizes.includes('OSFA')) {
      return ['OSFA'];
    }
    return availableSizes.sort(
      (a, b) => STANDARD_SIZES.indexOf(a) - STANDARD_SIZES.indexOf(b)
    );
  };

  // Get price based on total quantity
  const getPriceForQuantity = (product, totalQuantity) => {
    if (!product) return 0;
    if (totalQuantity >= 72) return parseFloat(product.Price_72_plus) || 0;
    if (totalQuantity >= 48) return parseFloat(product.Price_48_71) || 0;
    if (totalQuantity >= 24) return parseFloat(product.Price_24_47) || 0;
    if (totalQuantity >= 12) return parseFloat(product.Price_12_23) || 0;
    if (totalQuantity >= 6) return parseFloat(product.Price_6_11) || 0;
    return parseFloat(product.Price_2_5) || 0;
  };

  // Calculate totals
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

      const orderQuantity = Object.values(order.quantities).reduce(
        (sum, qty) => sum + (qty || 0),
        0
      );
      const basePrice = getPriceForQuantity(product, totalQuantity);

      const orderPrice = Object.entries(order.quantities).reduce(
        (sum, [size, qty]) => {
          if (!qty) return sum;
          const sizeProduct = product.sizes[size];
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
  }, [orders, productDatabase]);

  // Calculate row total for an order
  const calculateRowTotal = (order, totalQuantity) => {
    const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
    const product = productDatabase[key];
    if (!product) return 0;

    const basePrice = getPriceForQuantity(product, totalQuantity);
    return Object.entries(order.quantities).reduce((sum, [size, qty]) => {
      if (!qty) return sum;
      const sizeProduct = product.sizes[size];
      const surcharge =
        sizeProduct && sizeProduct.Surcharge
          ? parseFloat(sizeProduct.Surcharge) || 0
          : 0;
      return sum + (basePrice + surcharge) * qty;
    }, 0);
  };

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
      <table className="w-full border-collapse border border-gray-300 mb-4 bg-white">
        <thead>
          <tr className="bg-green-600 text-white">
            <th className="border border-gray-300 p-2">Style No</th>
            <th className="border border-gray-300 p-2">Color Name</th>
            <th className="border border-gray-300 p-2">Product Title</th>
            <th className="border border-gray-300 p-2">Sizes</th>
            <th className="border border-gray-300 p-2">Row Total</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            const availableSizes = getAvailableSizes(order);
            const totalQuantity = totals.quantity;
            return (
              <tr key={index}>
                <td className="border border-gray-300 p-2">
                  <label htmlFor={`style-${index}`} className="sr-only">
                    Style Number
                  </label>
                  <AutocompleteInput
                    id={`style-${index}`}
                    list={`styles-${index}`}
                    value={order.STYLE_No}
                    onChange={(e) =>
                      updateOrder(index, 'STYLE_No', e.target.value)
                    }
                    placeholder="Enter or select style"
                  />
                  <datalist id={`styles-${index}`}>
                    {styles.map((style) => (
                      <option key={style} value={style} />
                    ))}
                  </datalist>
                </td>
                <td className="border border-gray-300 p-2">
                  <label htmlFor={`color-${index}`} className="sr-only">
                    Color Name
                  </label>
                  <select
                    id={`color-${index}`}
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
                  {
                    productDatabase[
                      `${order.STYLE_No}-${order.COLOR_NAME}`
                    ]?.PRODUCT_TITLE || ''
                  }
                </td>
                <td className="border border-gray-300 p-2">
                  <div className="flex flex-wrap">
                    {availableSizes.map((size) => {
                      const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
                      const product = productDatabase[key];
                      const basePrice = product
                        ? getPriceForQuantity(product, totalQuantity)
                        : 0;
                      const sizeProduct = product?.sizes[size];
                      const surcharge =
                        sizeProduct && sizeProduct.Surcharge
                          ? parseFloat(sizeProduct.Surcharge) || 0
                          : 0;
                      const price = basePrice + surcharge;

                      return (
                        <div
                          key={size}
                          className={`w-1/4 p-1 ${
                            LARGE_SIZES.includes(size) ? 'bg-green-100' : ''
                          }`}
                        >
                          <label
                            htmlFor={`qty-${index}-${size}`}
                            className="text-xs font-bold mb-1 block"
                          >
                            {size}
                          </label>
                          <input
                            id={`qty-${index}-${size}`}
                            type="number"
                            value={order.quantities[size] || ''}
                            onChange={(e) =>
                              updateQuantity(index, size, e.target.value)
                            }
                            className="w-full mb-1 text-sm p-1 border rounded"
                            min="0"
                            aria-label={`Quantity for size ${size}`}
                          />
                          <div className="text-xs text-gray-500">
                            ${price.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className="border border-gray-300 p-2 font-bold">
                  ${calculateRowTotal(order, totalQuantity).toFixed(2)}
                </td>
                <td className="border border-gray-300 p-2">
                  <button
                    onClick={() => removeLine(index)}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    aria-label="Remove line"
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
