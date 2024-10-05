import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const STANDARD_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const LARGE_SIZES = ['2XL', '3XL'];

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
    localStorage.setItem('caspioAccessToken', newAccessToken);
    return newAccessToken;
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    throw error;
  }
};

const fetchSanmarPricingData = async () => {
  let accessToken = localStorage.getItem('caspioAccessToken') || process.env.REACT_APP_CASPIO_ACCESS_TOKEN;

  try {
    const response = await axios.get(`${process.env.REACT_APP_CASPIO_API_URL}/tables/Sanmar_Pricing_2024/records`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // Token expired, refresh it
      accessToken = await refreshToken();
      // Retry the request with the new token
      return fetchSanmarPricingData(); // recursive call
    }
    console.error('Error fetching Sanmar pricing data:', error);
    throw error;
  }
};

const getPriceForQuantity = (product, totalQuantity) => {
  if (!product) return 0;
  if (totalQuantity >= 72) return parseFloat(product.Price_72_plus) || 0;
  if (totalQuantity >= 48) return parseFloat(product.Price_48_71) || 0;
  if (totalQuantity >= 24) return parseFloat(product.Price_24_47) || 0;
  if (totalQuantity >= 12) return parseFloat(product.Price_12_23) || 0;
  if (totalQuantity >= 6) return parseFloat(product.Price_6_11) || 0;
  return parseFloat(product.Price_2_5) || 0;
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchSanmarPricingData();
        setAllProducts(data.Result);
        const uniqueStyles = [...new Set(data.Result.map(p => p.STYLE_No))];
        setStyles(uniqueStyles);
      } catch (err) {
        setError('Failed to load product data. Please try again later.');
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Set up token refresh timer
    const refreshTimer = setInterval(() => {
      refreshToken().catch(console.error);
    }, (3600 - 60) * 1000); // Refresh 1 minute before token expires

    return () => clearInterval(refreshTimer);
  }, []);

  // ... rest of the component code remains the same

  return (
    <div className="w-full p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-green-600">Embroidery Pricing Calculator</h1>
      {/* ... rest of the JSX remains the same */}
    </div>
  );
}
