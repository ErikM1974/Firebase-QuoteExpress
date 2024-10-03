import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

const getPriceForQuantity = (product, totalQuantity) => {
  if (totalQuantity >= 72) return parseFloat(product.Price_72_plus) || 0;
  if (totalQuantity >= 48) return parseFloat(product.Price_48_71) || 0;
  if (totalQuantity >= 24) return parseFloat(product.Price_24_47) || 0;
  if (totalQuantity >= 12) return parseFloat(product.Price_12_23) || 0;
  if (totalQuantity >= 6) return parseFloat(product.Price_6_11) || 0;
  return parseFloat(product.Price_2_5) || 0;
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
  </div>
);

export default function EmbroideryCalculator() {
  const [productDatabase, setProductDatabase] = useState({});
  const [orders, setOrders] = useState([{
    style: "",
    color: "",
    quantities: {},
    error: null
  }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get('/api/config');
        setConfig(response.data);
      } catch (err) {
        console.error('Error fetching configuration:', err);
        setError('Failed to load configuration. Please try again later.');
      }
    };

    fetchConfig();
  }, []);

  const fetchAccessToken = async () => {
    if (!config) {
      throw new Error('Configuration not loaded');
    }

    const { REACT_APP_CASPIO_TOKEN_URL, REACT_APP_CASPIO_CLIENT_ID, REACT_APP_CASPIO_CLIENT_SECRET } = config;

    if (!REACT_APP_CASPIO_TOKEN_URL) {
      throw new Error('REACT_APP_CASPIO_TOKEN_URL is not defined in the server configuration');
    }
    if (!REACT_APP_CASPIO_CLIENT_ID) {
      throw new Error('REACT_APP_CASPIO_CLIENT_ID is not defined in the server configuration');
    }
    if (!REACT_APP_CASPIO_CLIENT_SECRET) {
      throw new Error('REACT_APP_CASPIO_CLIENT_SECRET is not defined in the server configuration');
    }

    try {
      const response = await axios.post(REACT_APP_CASPIO_TOKEN_URL, null, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
          username: REACT_APP_CASPIO_CLIENT_ID,
          password: REACT_APP_CASPIO_CLIENT_SECRET,
        },
        params: {
          grant_type: 'client_credentials',
        },
      });

      if (!response.data || !response.data.access_token) {
        throw new Error('Invalid response from Caspio token endpoint');
      }

      return response.data.access_token;
    } catch (error) {
      console.error('Error fetching access token:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      throw new Error(`Failed to get access token from Caspio: ${error.message}`);
    }
  };

  const fetchProductsFromAPI = async (accessToken) => {
    if (!config) {
      throw new Error('Configuration not loaded');
    }

    const { REACT_APP_CASPIO_API_URL } = config;

    if (!REACT_APP_CASPIO_API_URL) {
      throw new Error('REACT_APP_CASPIO_API_URL is not defined in the server configuration');
    }

    try {
      const response = await axios.get(`${REACT_APP_CASPIO_API_URL}/tables/Products/rows`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.data || !Array.isArray(response.data.Result)) {
        throw new Error('Invalid product data structure');
      }

      return response.data.Result;
    } catch (error) {
      console.error('Error fetching product data:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      throw new Error(`Failed to fetch product data from Caspio: ${error.message}`);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!config) return; // Wait for config to be loaded
      setLoading(true);
      try {
        const accessToken = await fetchAccessToken();
        const products = await fetchProductsFromAPI(accessToken);

        const formattedData = {};
        products.forEach(product => {
          if (!product.STYLE_No || !product.COLOR_NAME) return; // skip incomplete data
          const key = `${product.STYLE_No}-${product.COLOR_NAME}`;
          if (!formattedData[key]) {
            formattedData[key] = {
              UNIQUE_KEY: product.UNIQUE_KEY,
              PRODUCT_TITLE: product.PRODUCT_TITLE,
              STYLE_No: product.STYLE_No,
              COLOR_NAME: product.COLOR_NAME,
              sizes: {},
              ...product
            };
          }
          formattedData[key].sizes[product.SIZE] = product;
        });

        setProductDatabase(formattedData);
      } catch (err) {
        console.error('Error fetching or processing product data:', err);
        setError(`Failed to load product data: ${err.message}. Please check your server configuration and try again.`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [config]);

  // Rest of the component remains unchanged
  const addNewLine = () => {
    setOrders([...orders, {
      style: "",
      color: "",
      quantities: {},
      error: null
    }]);
  };

  const removeLine = (index) => {
    if (orders.length > 1) {
      const newOrders = orders.filter((_, i) => i !== index);
      setOrders(newOrders);
    }
  };

  const updateOrder = (index, field, value) => {
    const newOrders = [...orders];
    newOrders[index] = {
      ...newOrders[index],
      [field]: value,
      error: null
    };

    if (field === 'style' || field === 'color') {
      newOrders[index].quantities = {};
      const key = `${newOrders[index].style}-${newOrders[index].color}`;
      if (value && !productDatabase[key]) {
        newOrders[index].error = "Invalid style or color combination";
      }
    }

    setOrders(newOrders);
  };

  const updateQuantity = (orderIndex, size, value) => {
    const newOrders = [...orders];
    const newQuantities = {
      ...newOrders[orderIndex].quantities,
      [size]: parseInt(value) || 0
    };
    newOrders[orderIndex].quantities = newQuantities;
    setOrders(newOrders);
  };

  const calculateOrderTotals = () => {
    const totalQuantity = orders.reduce((acc, order) => {
      return acc + Object.values(order.quantities).reduce((sum, qty) => sum + (qty || 0), 0);
    }, 0);

    return orders.reduce((acc, order) => {
      const key = `${order.style}-${order.color}`;
      const product = productDatabase[key];
      if (!product) return acc;

      const orderQuantity = Object.values(order.quantities).reduce((sum, qty) => sum + (qty || 0), 0);
      const basePrice = getPriceForQuantity(product, totalQuantity);

      const orderPrice = Object.entries(order.quantities).reduce((sum, [size, qty]) => {
        if (!qty) return sum;
        const sizeProduct = product.sizes[size];
        const surcharge = sizeProduct && sizeProduct.Surcharge ? parseFloat(sizeProduct.Surcharge) || 0 : 0;
        return sum + (basePrice + surcharge) * qty;
      }, 0);

      return {
        quantity: acc.quantity + orderQuantity,
        price: acc.price + orderPrice
      };
    }, { quantity: 0, price: 0 });
  };

  const handleSubmitOrder = () => {
    console.log('Submitting order:', orders);
    alert('Order submitted successfully!');
  };

  const totals = calculateOrderTotals();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="w-full p-4">
      {/* The rest of your JSX for displaying the table remains the same */}
      {/* Add Line button and Submit button logic remains unchanged */}
    </div>
  );
}
