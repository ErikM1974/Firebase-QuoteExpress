import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import styled from 'styled-components';

const STANDARD_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
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
    const expiresIn = response.data.expires_in || 3600; // Default to 1 hour if not provided
    
    localStorage.setItem('caspioAccessToken', newAccessToken);

    return { newAccessToken, expiresIn };
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    throw error;
  }
};

const fetchSanmarPricingData = async (retryCount = 0) => {
  let accessToken = localStorage.getItem('caspioAccessToken');

  if (!accessToken) {
    const { newAccessToken } = await refreshToken();
    accessToken = newAccessToken;
  }

  try {
    const response = await axios.get(`${process.env.REACT_APP_CASPIO_API_URL}/tables/Sanmar_Pricing_2024/records`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401 && retryCount < 3) {
      const { newAccessToken } = await refreshToken();
      return fetchSanmarPricingData(retryCount + 1);
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

  const fetchData = async () => {
    try {
      const data = await fetchSanmarPricingData();
      setAllProducts(data.Result);
      const uniqueStyles = [...new Set(data.Result.map(p => p.STYLE_No))];
      setStyles(uniqueStyles);
      setError(null);
    } catch (err) {
      if (!err.response) {
        setError('Network error, please check your connection.');
      } else if (err.response.status === 401) {
        setError('Unauthorized access. Please refresh or login again.');
      } else {
        setError('Failed to load product data. Please try again later.');
      }
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const setupTokenRefresh = async () => {
      try {
        const { expiresIn } = await refreshToken();
        timeoutRef.current = setTimeout(() => {
          refreshToken().catch(console.error);
        }, (expiresIn - 60) * 1000); // Refresh 1 minute before token expires
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

  // ... (rest of the component logic remains the same)

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="text-red-500">
        {error}
        <button onClick={fetchData} className="ml-2 p-2 bg-blue-500 text-white rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-green-600">Embroidery Pricing Calculator</h1>
      {/* ... (rest of the JSX remains the same) */}
    </div>
  );
}

// Helper function to calculate total price (implement this based on your pricing logic)
function calculateTotalPrice() {
  // Implement your pricing calculation logic here
  return 0; // Placeholder return value
}
