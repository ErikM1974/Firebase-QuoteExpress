import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import debounce from 'lodash.debounce';

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const LARGE_SIZES = ['2XL', '3XL'];

const Spinner = styled.div`
  border: 16px solid #f3f3f3;
  border-radius: 50%;
  border-top: 16px solid #3498db;
  width: 120px;
  height: 120px;
  animation: spin 2s linear infinite;
  margin: 20px auto;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const AutocompleteInput = styled.input`
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
`;

const refreshToken = async () => {
  try {
    const response = await axios.post('https://c3eku948.caspio.com/oauth/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.REACT_APP_CASPIO_CLIENT_ID,
        client_secret: process.env.REACT_APP_CASPIO_CLIENT_SECRET,
        refresh_token: process.env.REACT_APP_CASPIO_REFRESH_TOKEN,
      }),
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
};

const fetchSanmarPricingData = async (styleSearch = '', retryCount = 0) => {
  let accessToken = localStorage.getItem('caspioAccessToken');

  if (!accessToken) {
    const { newAccessToken } = await refreshToken();
    accessToken = newAccessToken;
  }

  try {
    const response = await axios.get(`${process.env.REACT_APP_CASPIO_API_URL}/views/Heroku/records?q={"STYLE_No":{"like":"${styleSearch}"}}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401 && retryCount < 3) {
      const { newAccessToken } = await refreshToken();
      return fetchSanmarPricingData(styleSearch, retryCount + 1);
    }
    throw error;
  }
};

export default function EmbroideryCalculator() {
  const [allProducts, setAllProducts] = useState([]);
  const [styles, setStyles] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState('');
  const [colors, setColors] = useState([]);
  const [selectedColor, setSelectedColor] = useState('');
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  const debouncedFetchStyles = useRef(
    debounce(async (styleSearch) => {
      try {
        const data = await fetchSanmarPricingData(styleSearch);
        setStyles([...new Set(data.Result.map(p => p.STYLE_No))]);
        setAllProducts(data.Result);
        setError(null);
      } catch (error) {
        console.error('Error fetching styles:', error);
        setError('Failed to fetch styles.');
      } finally {
        setLoading(false);
      }
    }, 300)
  ).current;

  const handleStyleInputChange = (e) => {
    const searchValue = e.target.value;
    setSelectedStyle(searchValue);
    setLoading(true);
    debouncedFetchStyles(searchValue);
  };

  useEffect(() => {
    debouncedFetchStyles('');

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
  }, []);

  useEffect(() => {
    if (selectedStyle) {
      const styleProducts = allProducts.filter(p => p.STYLE_No === selectedStyle);
      const uniqueColors = [...new Set(styleProducts.map(p => p.COLOR_NAME))];
      setColors(uniqueColors);
    } else {
      setColors([]);
    }
    setSelectedColor('');
    setQuantities({});
  }, [selectedStyle, allProducts]);

  const getPriceForQuantity = (product, totalQuantity) => {
    if (!product) return 0;
    if (totalQuantity >= 72) return parseFloat(product.Price_72_plus) || 0;
    if (totalQuantity >= 48) return parseFloat(product.Price_48_71) || 0;
    if (totalQuantity >= 24) return parseFloat(product.Price_24_47) || 0;
    if (totalQuantity >= 12) return parseFloat(product.Price_12_23) || 0;
    if (totalQuantity >= 6) return parseFloat(product.Price_6_11) || 0;
    return parseFloat(product.Price_2_5) || 0;
  };

  const totalQuantity = useMemo(() => 
    Object.values(quantities).reduce((sum, qty) => sum + qty, 0),
    [quantities]
  );

  const totalPrice = useMemo(() => {
    if (!selectedStyle || !selectedColor) return 0;
    const products = allProducts.filter(p => p.STYLE_No === selectedStyle && p.COLOR_NAME === selectedColor);
    if (products.length === 0) return 0;
    return Object.entries(quantities).reduce((sum, [size, qty]) => {
      const sizeProduct = products.find(p => p.SIZE === size);
      if (!sizeProduct) return sum;
      const basePrice = getPriceForQuantity(sizeProduct, totalQuantity);
      const surcharge = parseFloat(sizeProduct.Surcharge) || 0;
      return sum + (basePrice + surcharge) * qty;
    }, 0);
  }, [allProducts, selectedStyle, selectedColor, quantities, totalQuantity]);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="text-red-500">
        {error}
        <button onClick={() => debouncedFetchStyles('')} className="ml-2 p-2 bg-blue-500 text-white rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-green-600">Embroidery Pricing Calculator</h1>

      <div className="mb-4">
        <label className="block mb-2">Style Number:</label>
        <AutocompleteInput
          type="text"
          value={selectedStyle}
          onChange={handleStyleInputChange}
          placeholder="Search for a style"
          list="styleOptions"
        />
        <datalist id="styleOptions">
          {styles.map((style) => (
            <option key={style} value={style}>
              {style}
            </option>
          ))}
        </datalist>
      </div>

      {selectedStyle && (
        <div className="mb-4">
          <label className="block mb-2">Color:</label>
          <select 
            value={selectedColor} 
            onChange={(e) => setSelectedColor(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select a color</option>
            {colors.map(color => (
              <option key={color} value={color}>{color}</option>
            ))}
          </select>
        </div>
      )}
      {selectedColor && (
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Quantities:</h2>
          <div className="grid grid-cols-3 gap-4">
            {STANDARD_SIZES.map(size => (
              <div key={size} className={`p-2 ${LARGE_SIZES.includes(size) ? 'bg-green-100' : ''}`}>
                <label className="block mb-1">{size}:</label>
                <input
                  type="number"
                  value={quantities[size] || ''}
                  onChange={(e) => setQuantities({...quantities, [size]: parseInt(e.target.value) || 0})}
                  className="w-full p-1 border rounded"
                  min="0"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4">
        <h2 className="text-xl font-bold">Order Summary:</h2>
        <p>Total Quantity: {totalQuantity}</p>
        <p>Total Price: ${totalPrice.toFixed(2)}</p>
      </div>
    </div>
  );
}
