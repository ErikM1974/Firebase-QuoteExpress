import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import debounce from 'lodash.debounce';

const API_BASE_URL = 'https://c3eku948.caspio.com/rest/v2/views/Heroku/records';
const STANDARD_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const LARGE_SIZES = ['2XL', '3XL'];

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

  // Fetch all styles
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
        const styleNumbers = [...new Set(response.data.Result
          .map(item => item.STYLE_No)
          .filter(styleNo => typeof styleNo === 'string' && styleNo.trim() !== ''))];
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

  // Fetch colors for a specific style
  const fetchColors = useCallback(async (styleNo) => {
    try {
      const accessToken = await getAccessToken();

      const response = await axios.get(
        `${API_BASE_URL}?q={"STYLE_No":"${styleNo}"}&q.select=COLOR_NAME&q.distinct=true`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data?.Result?.length > 0) {
        const colorNames = [...new Set(response.data.Result
          .map(item => item.COLOR_NAME)
          .filter(colorName => typeof colorName === 'string' && colorName.trim() !== ''))];
        setColors(prevColors => ({
          ...prevColors,
          [styleNo]: colorNames.sort(),
        }));
      } else {
        throw new Error('No colors returned for the selected style');
      }
    } catch (err) {
      if (err.response) {
        console.error('API Error:', err.response.status, err.response.data, 'URL:', err.config.url);
      } else {
        console.error('Error:', err.message);
      }
      setError('Failed to load colors. Please try again later.');
    }
  }, [getAccessToken]);

  // Fetch product details
  const fetchProductDetails = useCallback(async (styleNo, colorName) => {
    try {
      const accessToken = await getAccessToken();

      const response = await axios.get(
        `${API_BASE_URL}?q={"STYLE_No":"${styleNo}","COLOR_NAME":"${colorName}"}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data?.Result?.length > 0) {
        const products = response.data.Result;
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
        });

        setProductDatabase(prevState => ({ ...prevState, ...productData }));
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

  // Filter styles based on user input
  const filterStyles = useCallback((input) => {
    const filtered = styles.filter(style => 
      style.toLowerCase().includes(input.toLowerCase())
    );
    setFilteredStyles(filtered);
  }, [styles]);

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
        fetchColors(value);
      } else if (field === 'COLOR_NAME') {
        newOrders[index].quantities = {};
        fetchProductDetails(newOrders[index].STYLE_No, value);
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
    [orders, productDatabase, fetchColors, fetchProductDetails]
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
    return availableSizes.sort((a, b) => {
      const aIndex = STANDARD_SIZES.indexOf(a);
      const bIndex = STANDARD_SIZES.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
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

      const basePrice = getPriceForQuantity(product.sizes[Object.keys(product.sizes)[0]], totalQuantity);

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
  const calculateRowTotal = (order) => {
    const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
    const product = productDatabase[key];
    if (!product) return 0;

    const basePrice = getPriceForQuantity(product.sizes[Object.keys(product.sizes)[0]], totals.quantity);
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
            {STANDARD_SIZES.map(size => (
              <th key={size} className={`border border-gray-300 p-2 ${LARGE_SIZES.includes(size) ? 'bg-green-700' : ''}`}>{size}</th>
            ))}
            <th className="border border-gray-300 p-2">Other Sizes</th>
            <th className="border border-gray-300 p-2">Row Total</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            const availableSizes = getAvailableSizes(order);
            const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
            const product = productDatabase[key];
            return (
              <tr key={index}>
                <td className="border border-gray-300 p-2">
                  <AutocompleteInput
                    type="text"
                    value={order.STYLE_No}
                    onChange={(e) => {
                      updateOrder(index, 'STYLE_No', e.target.value);
                      filterStyles(e.target.value);
                    }}
                    placeholder="Enter style number"
                    list={`styles-list-${index}`}
                  />
                  <datalist id={`styles-list-${index}`}>
                    {filteredStyles.map(style => (
                      <option key={style} value={style} />
                    ))}
                  </datalist>
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
                {STANDARD_SIZES.map(size => (
                  <td key={size} className={`border border-gray-300 p-2 ${LARGE_SIZES.includes(size) ? 'bg-green-100' : ''}`}>
                    <input
                      type="number"
                      value={order.quantities[size] || ''}
                      onChange={(e) => updateQuantity(index, size, e.target.value)}
                      className="w-full p-1 border rounded"
                      min="0"
                      disabled={!availableSizes.includes(size)}
                    />
                    {availableSizes.includes(size) && product && (
                      <div className="text-xs text-gray-500">
                        ${(getPriceForQuantity(product.sizes[size], totals.quantity) + 
                           (LARGE_SIZES.includes(size) ? parseFloat(product.sizes[size]?.Surcharge || 0) : 0)).toFixed(2)}
                      </div>
                    )}
                  </td>
                ))}
                <td className="border border-gray-300 p-2">
                  {availableSizes.filter(size => !STANDARD_SIZES.includes(size)).map(size => (
                    <div key={size} className="mb-2">
                      <label className="text-xs font-bold">{size}:</label>
                      <input
                        type="number"
                        value={order.quantities[size] || ''}
                        onChange={(e) => updateQuantity(index, size, e.target.value)}
                        className="w-full p-1 border rounded"
                        min="0"
                      />
                      {product && (
                        <div className="text-xs text-gray-500">
                          ${(getPriceForQuantity(product.sizes[size], totals.quantity) + 
                             parseFloat(product.sizes[size]?.Surcharge || 0)).toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))}
                </td>
                <td className="border border-gray-300 p-2 font-bold">
                  ${calculateRowTotal(order).toFixed(2)}
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
