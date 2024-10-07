import React, { useState, useCallback, useMemo, useEffect } from 'react';
import axios from 'axios';
import AsyncSelect from 'react-select/async';
import debounce from 'lodash/debounce';
import './EmbroideryCalculator.css';

const API_BASE_URL = 'https://c3eku948.caspio.com/rest/v2/views/Heroku/records';
const MAIN_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const LARGE_SIZES = ['2XL', '3XL', '4XL', '5XL', '6XL'];

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
  </div>
);

const getPriceForQuantity = (product, totalQuantity) => {
  console.log('Calculating price for quantity:', totalQuantity);
  if (totalQuantity >= 72) return parseFloat(product.Price_72_plus) || 0;
  if (totalQuantity >= 48) return parseFloat(product.Price_48_71) || 0;
  if (totalQuantity >= 24) return parseFloat(product.Price_24_47) || 0;
  if (totalQuantity >= 12) return parseFloat(product.Price_12_23) || 0;
  if (totalQuantity >= 6) return parseFloat(product.Price_6_11) || 0;
  return parseFloat(product.Price_2_5) || 0;
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
  const [colors, setColors] = useState({});
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

    console.log('Using access token:', accessToken.substring(0, 5) + '...');
    return accessToken;
  }, [refreshToken]);

  const fetchStyles = useCallback(
    debounce(async (inputValue, callback) => {
      if (!inputValue) {
        callback([]);
        return;
      }

      setIsLoading(true);
      try {
        const accessToken = await getAccessToken();
        const queryObject = {
          STYLE_No: { like: `%${inputValue}%` },
        };
        const query = `q=${encodeURIComponent(JSON.stringify(queryObject))}&q.select=STYLE_No&q.distinct=true&q.sort=STYLE_No&q.limit=50`;
        console.log('Fetching styles with query:', query);
        const response = await axios.get(`${API_BASE_URL}?${query}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const results = response.data?.Result || [];
        const options = results.map((item) => ({
          label: item.STYLE_No,
          value: item.STYLE_No,
        }));
        callback(options);
      } catch (err) {
        console.error('Error fetching styles:', err);
        setErrorMessage('Failed to load styles. Please try again.');
        callback([]);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [getAccessToken]
  );

  const fetchColors = useCallback(async (styleNo) => {
    if (!styleNo) return;

    setIsLoading(true);
    try {
      console.log(`Fetching colors for style: ${styleNo}`);
      const accessToken = await getAccessToken();
      let offset = 0;
      const limit = 1000;
      let hasMore = true;
      const colorSet = new Set();
      const productDetails = {};

      while (hasMore) {
        const queryObject = {
          STYLE_No: styleNo,
        };
        const query = `q=${encodeURIComponent(JSON.stringify(queryObject))}&q.select=COLOR_NAME,PRODUCT_TITLE,Price_2_5,Price_6_11,Price_12_23,Price_24_47,Price_48_71,Price_72_plus,Surcharge,Size&q.sort=COLOR_NAME,Size&q.limit=${limit}&q.offset=${offset}`;
        console.log('Fetching colors with query:', query);
        const response = await axios.get(`${API_BASE_URL}?${query}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const results = response.data?.Result || [];
        results.forEach((item) => {
          if (item.COLOR_NAME) colorSet.add(item.COLOR_NAME);
          if (!productDetails[item.COLOR_NAME]) {
            productDetails[item.COLOR_NAME] = {
              PRODUCT_TITLE: item.PRODUCT_TITLE,
              Price_2_5: item.Price_2_5,
              Price_6_11: item.Price_6_11,
              Price_12_23: item.Price_12_23,
              Price_24_47: item.Price_24_47,
              Price_48_71: item.Price_48_71,
              Price_72_plus: item.Price_72_plus,
              Surcharge: item.Surcharge,
              sizes: {},
            };
          }
          productDetails[item.COLOR_NAME].sizes[item.Size] = {
            ...item,
          };
        });

        if (results.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      setColors((prevColors) => ({
        ...prevColors,
        [styleNo]: Array.from(colorSet),
      }));

      setProductDatabase((prevDatabase) => ({
        ...prevDatabase,
        [styleNo]: {
          colors: productDetails,
        },
      }));

      console.log('Fetched colors for style:', styleNo, Array.from(colorSet));
    } catch (err) {
      console.error('Error fetching colors:', err);
      setErrorMessage('Failed to load color options. Please try again later.');
    } finally {
      setIsLoading(false);
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
            fetchColors(value);
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
    console.log('Calculating order totals...');
    const totalQuantity = orders.reduce((acc, order) => {
      return acc + Object.values(order.quantities).reduce((sum, qty) => sum + (qty || 0), 0);
    }, 0);

    let totalPrice = 0;

    orders.forEach((order) => {
      const productColors = productDatabase[order.STYLE_No]?.colors;
      const colorDetails = productColors?.[order.COLOR_NAME];
      if (!colorDetails) return;

      const basePrice = getPriceForQuantity(colorDetails, totalQuantity);

      Object.entries(order.quantities).forEach(([size, qty]) => {
        if (!qty) return;
        const sizeDetails = colorDetails.sizes[size];
        if (!sizeDetails) return;

        const surcharge = LARGE_SIZES.includes(size) ? parseFloat(colorDetails.Surcharge) || 0 : 0;
        totalPrice += (basePrice + surcharge) * qty;
      });
    });

    console.log('Total quantity:', totalQuantity, 'Total price:', totalPrice);
    return { quantity: totalQuantity, price: totalPrice };
  }, [orders, productDatabase]);

  const totals = useMemo(() => calculateOrderTotals(), [calculateOrderTotals]);

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
      <table>
        <thead>
          <tr>
            <th>Style No</th>
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
            const productColors = productDatabase[order.STYLE_No]?.colors;
            const colorDetails = productColors?.[order.COLOR_NAME];
            const productTitle = colorDetails?.PRODUCT_TITLE || '';
            const sizesAvailable = colorDetails ? Object.keys(colorDetails.sizes) : [];
            const mainSizesAvailable = sizesAvailable.filter((size) => MAIN_SIZES.includes(size));
            const otherSizesAvailable = sizesAvailable.filter((size) => !MAIN_SIZES.includes(size));

            const lineQuantity = Object.values(order.quantities).reduce((sum, qty) => sum + (qty || 0), 0);

            const lineTotal = Object.entries(order.quantities).reduce((sum, [size, qty]) => {
              if (!qty) return sum;
              const sizeDetails = colorDetails?.sizes[size];
              if (!sizeDetails) return sum;

              const basePrice = getPriceForQuantity(colorDetails, totals.quantity);
              const surcharge = LARGE_SIZES.includes(size) ? parseFloat(colorDetails.Surcharge) || 0 : 0;
              return sum + (basePrice + surcharge) * qty;
            }, 0);

            return (
              <tr key={index}>
                <td>
                  <AsyncSelect
                    cacheOptions
                    loadOptions={fetchStyles}
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
                    isDisabled={isLoading}
                  />
                </td>
                <td>
                  <select
                    value={order.COLOR_NAME}
                    onChange={(e) => updateOrder(index, 'COLOR_NAME', e.target.value)}
                    disabled={!order.STYLE_No || isLoading}
                  >
                    <option value="">Select Color</option>
                    {colors[order.STYLE_No]?.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{productTitle}</td>
                {MAIN_SIZES.map((size) => (
                  <td key={size} className={LARGE_SIZES.includes(size) ? 'highlight-large-size' : ''}>
                    {colorDetails?.sizes[size] ? (
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
                          disabled={isLoading}
                        />
                        <div className="price-info">
                          {colorDetails ? `$${(getPriceForQuantity(colorDetails, totals.quantity) + (LARGE_SIZES.includes(size) ? parseFloat(colorDetails.Surcharge) || 0 : 0)).toFixed(2)}` : ''}
                        </div>
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>
                ))}
                <td>
                  {otherSizesAvailable.map((size) => (
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
                        disabled={isLoading}
                      />
                    </div>
                  ))}
                </td>
                <td>{lineQuantity}</td>
                <td>${lineTotal.toFixed(2)}</td>
                <td>
                  <button onClick={() => setOrders(orders.filter((_, i) => i !== index))} disabled={isLoading}>
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        onClick={() =>
          setOrders([...orders, { STYLE_No: '', COLOR_NAME: '', quantities: {}, error: null }])
        }
        disabled={isLoading}
      >
        Add Line
      </button>
      <button onClick={() => console.log('Submit order:', orders)} disabled={isLoading}>
        Submit Order
      </button>
      <div>
        <p>Total Quantity: {totals.quantity}</p>
        <p>Total Price: ${totals.price.toFixed(2)}</p>
      </div>
    </div>
  );
}