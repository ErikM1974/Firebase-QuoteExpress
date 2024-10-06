import React, { useState, useCallback, useMemo, useEffect } from 'react';
import axios from 'axios';
import AsyncSelect from 'react-select/async';
import debounce from 'lodash/debounce';
import './EmbroideryCalculator.css';

const API_BASE_URL = 'https://c3eku948.caspio.com/rest/v2/views/Heroku/records';
const MAIN_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
  </div>
);

const getPriceForQuantity = (product, totalQuantity) => {
  if (totalQuantity >= 72) return parseFloat(product.Price_72_plus) || 0;
  if (totalQuantity >= 48) return parseFloat(product.Price_48_71) || 0;
  if (totalQuantity >= 24) return parseFloat(product.Price_24_47) || 0;
  if (totalQuantity >= 12) return parseFloat(product.Price_12_23) || 0;
  if (totalQuantity >= 6) return parseFloat(product.Price_6_11) || 0;
  return parseFloat(product.Price_2_5) || 0;
};

const getPricePerItem = (product, totalQuantity, size) => {
  const basePrice = getPriceForQuantity(product, totalQuantity);
  const surcharge = parseFloat(product.sizes[size]?.Surcharge) || 0;
  return basePrice + surcharge;
};

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
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRows, setLoadingRows] = useState({});

  const abortController = React.useRef(null);

  useEffect(() => {
    console.log('Client ID:', process.env.REACT_APP_CASPIO_CLIENT_ID.substring(0, 5) + '...');
    console.log('Client Secret:', process.env.REACT_APP_CASPIO_CLIENT_SECRET.substring(0, 5) + '...');
  }, []);

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

  const fetchAllStyles = useCallback(async () => {
    setIsLoading(true);
    try {
      const accessToken = await getAccessToken();
      const query = 'q.select=STYLE_No,PRODUCT_TITLE&q.distinct=true&q.sort=STYLE_No&q.limit=1000';
      const response = await axios.get(`${API_BASE_URL}?${query}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const stylesData = {};
      response.data?.Result.forEach((item) => {
        if (item.STYLE_No) {
          stylesData[item.STYLE_No] = item;
        }
      });

      setStyles(Object.keys(stylesData));
      setProductDatabase(stylesData);
      console.log('Fetched styles:', stylesData);
    } catch (err) {
      console.error('Error fetching styles:', err);
      setErrorMessage('Failed to load styles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    fetchAllStyles();
  }, [fetchAllStyles]);

  const fetchColors = useCallback(async (styleNo, index) => {
    if (!styleNo) return;

    setLoadingRows(prev => ({ ...prev, [index]: true }));
    try {
      console.log(`Fetching colors for style: ${styleNo}`);
      const accessToken = await getAccessToken();
      const query = `q=${encodeURIComponent(JSON.stringify({ STYLE_No: styleNo }))}&q.select=COLOR_NAME,PRODUCT_TITLE,Price_2_5,Price_6_11,Price_12_23,Price_24_47,Price_48_71,Price_72_plus,Surcharge,SIZE,SizeOrder&q.sort=COLOR_NAME`;
      const response = await axios.get(`${API_BASE_URL}?${query}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const colorSet = new Set();
      const productDetails = {};
      response.data?.Result.forEach((item) => {
        if (item.COLOR_NAME) colorSet.add(item.COLOR_NAME);
        if (!productDetails[item.COLOR_NAME]) {
          productDetails[item.COLOR_NAME] = {
            ...item,
            sizes: {},
          };
        }
        productDetails[item.COLOR_NAME].sizes[item.SIZE] = {
          Surcharge: parseFloat(item.Surcharge) || 0,
          SizeOrder: parseInt(item.SizeOrder) || 0,
        };
      });

      setColors((prevColors) => ({
        ...prevColors,
        [styleNo]: Array.from(colorSet),
      }));

      setProductDatabase((prevDatabase) => ({
        ...prevDatabase,
        [styleNo]: {
          ...prevDatabase[styleNo],
          colors: productDetails,
        },
      }));

      console.log('Fetched colors for style:', styleNo, productDetails);
    } catch (err) {
      console.error('Error fetching colors:', err);
      setErrorMessage('Failed to load color options. Please try again later.');
    } finally {
      setLoadingRows(prev => ({ ...prev, [index]: false }));
    }
  }, [getAccessToken]);

  const updateOrder = useCallback(
    (index, field, value) => {
      console.log(`Updating order ${index}, field: ${field}, value:`, value);
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
            fetchColors(value, index);
          }
        } else if (field === 'COLOR_NAME') {
          newOrders[index].quantities = {};
        }

        console.log('Updated orders:', newOrders);
        return newOrders;
      });
    },
    [colors, fetchColors]
  );

  const calculateOrderTotals = useCallback(() => {
    const totalQuantity = orders.reduce((acc, order) => {
      return acc + Object.values(order.quantities).reduce((sum, qty) => sum + (qty || 0), 0);
    }, 0);

    return orders.reduce((acc, order) => {
      const key = order.STYLE_No;
      const product = productDatabase[key]?.colors?.[order.COLOR_NAME];
      if (!product) return acc;

      const orderPrice = Object.entries(order.quantities).reduce((sum, [size, qty]) => {
        if (!qty) return sum;
        const pricePerItem = getPricePerItem(product, totalQuantity, size);
        return sum + pricePerItem * qty;
      }, 0);

      return {
        quantity: acc.quantity + Object.values(order.quantities).reduce((sum, qty) => sum + (qty || 0), 0),
        price: acc.price + orderPrice,
      };
    }, { quantity: 0, price: 0 });
  }, [orders, productDatabase]);

  const totals = useMemo(() => calculateOrderTotals(), [calculateOrderTotals]);

  const getAvailableSizes = useMemo(() => (product) => {
    if (!product) return { mainSizes: [], otherSizes: [] };
    const availableSizes = Object.keys(product.sizes).sort((a, b) => product.sizes[a].SizeOrder - product.sizes[b].SizeOrder);
    const mainSizes = MAIN_SIZES.filter(size => availableSizes.includes(size));
    const otherSizes = availableSizes.filter(size => !MAIN_SIZES.includes(size));
    return { mainSizes, otherSizes };
  }, []);

  const handleRemoveOrder = useCallback((index) => {
    if (window.confirm('Are you sure you want to remove this order line?')) {
      setOrders(orders.filter((_, i) => i !== index));
    }
  }, [orders]);

  return (
    <div className="embroidery-calculator">
      <h1>Embroidery Order Form</h1>
      {errorMessage && (
        <div className="error-message" role="alert">
          <strong>Error: </strong>
          <span>{errorMessage}</span>
        </div>
      )}
      {isLoading && <LoadingSpinner />}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="style-no-column">Style No</th>
              <th>Color Name</th>
              <th>Product Title</th>
              {MAIN_SIZES.map((size) => (
                <th key={size}>{size}</th>
              ))}
              <th>Other Sizes</th>
              <th>Line Qty</th>
              <th>Row Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => {
              const product = productDatabase[order.STYLE_No]?.colors?.[order.COLOR_NAME];
              const { mainSizes, otherSizes } = getAvailableSizes(product);
              const lineQuantity = Object.values(order.quantities).reduce((sum, qty) => sum + (qty || 0), 0);

              return (
                <tr key={index}>
                  <td className="style-no-column">
                    <AsyncSelect
                      cacheOptions
                      loadOptions={async (inputValue) => {
                        const filteredStyles = styles.filter((style) =>
                          style.toLowerCase().includes(inputValue.toLowerCase())
                        );
                        return filteredStyles.map((style) => ({ label: style, value: style }));
                      }}
                      defaultOptions={styles.map((style) => ({ label: style, value: style }))}
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
                      isDisabled={isLoading || loadingRows[index]}
                    />
                  </td>
                  <td>
                    <select
                      value={order.COLOR_NAME}
                      onChange={(e) => updateOrder(index, 'COLOR_NAME', e.target.value)}
                      disabled={!order.STYLE_No || isLoading || loadingRows[index]}
                    >
                      <option value="">Select Color</option>
                      {colors[order.STYLE_No]?.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{product?.PRODUCT_TITLE || ''}</td>
                  {MAIN_SIZES.map((size) => (
                    <td key={size}>
                      <div>
                        <input
                          type="number"
                          value={order.quantities[size] || ''}
                          onChange={(e) =>
                            updateOrder(index, 'quantities', {
                              ...order.quantities,
                              [size]: parseInt(e.target.value) || 0,
                            })
                          }
                          min="0"
                          disabled={isLoading || loadingRows[index] || !mainSizes.includes(size)}
                        />
                        <div className="price-info">
                          {product ? `$${getPricePerItem(product, totals.quantity, size).toFixed(2)}` : ''}
                        </div>
                      </div>
                    </td>
                  ))}
                  <td>
                    {otherSizes.map((size) => (
                      <div key={size}>
                        <span>{size}: </span>
                        <input
                          type="number"
                          value={order.quantities[size] || ''}
                          onChange={(e) =>
                            updateOrder(index, 'quantities', {
                              ...order.quantities,
                              [size]: parseInt(e.target.value) || 0,
                            })
                          }
                          min="0"
                          disabled={isLoading || loadingRows[index]}
                        />
                        <span className="price-info">
                          {product ? `$${getPricePerItem(product, totals.quantity, size).toFixed(2)}` : ''}
                        </span>
                      </div>
                    ))}
                  </td>
                  <td>{lineQuantity}</td>
                  <td>${(Object.entries(order.quantities).reduce((sum, [size, qty]) => {
                    return sum + (product ? getPricePerItem(product, totals.quantity, size) * qty : 0);
                  }, 0)).toFixed(2)}</td>
                  <td>
                    <button onClick={() => handleRemoveOrder(index)} disabled={isLoading || loadingRows[index]}>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="button-container">
        <button
          onClick={() =>
            setOrders([...orders, { STYLE_No: '', COLOR_NAME: '', quantities: {}, error: null }])
          }
          disabled={isLoading}
        >
          Add Line
        </button>
        <button 
          onClick={() => console.log('Submit order:', orders)} 
          disabled={isLoading || orders.length === 0 || orders.every(order => !order.STYLE_No)}
        >
          Submit Order
        </button>
      </div>
      <div className="totals">
        <p>Total Quantity: {totals.quantity}</p>
        <p>Total Price: ${totals.price.toFixed(2)}</p>
      </div>
    </div>
  );
}