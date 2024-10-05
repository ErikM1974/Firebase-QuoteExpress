import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';

const STANDARD_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const LARGE_SIZES = ['2XL', '3XL'];

// Corrected API_ENDPOINT construction
const API_ENDPOINT = `${process.env.REACT_APP_CASPIO_API_URL}/tables/Sanmar_Pricing_2024/records`;
const API_PARAMS = 'q.select=UNIQUE_KEY%2C%20STYLE_No%2C%20COLOR_NAME%2C%20PRODUCT_TITLE%2C%20Price_2_5%2C%20Price_6_11%2C%20Price_12_23%2C%20Price_24_47%2C%20Price_48_71%2C%20Price_72_plus%2C%20SIZE%2C%20Surcharge%2C%20SizeOrder%2C%20CapPrice_2_23%2C%20CapPrice_24_143%2C%20CapPrice_144_plus%2C%20Cap_NoCap';

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
    const fetchAllProducts = async () => {
      try {
        console.log('API URL:', process.env.REACT_APP_CASPIO_API_URL);
        console.log('Access Token (first 10 chars):', process.env.REACT_APP_CASPIO_ACCESS_TOKEN.substring(0, 10) + '...');
        
        const response = await axios.get(`${API_ENDPOINT}?${API_PARAMS}`, {
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_CASPIO_ACCESS_TOKEN}`
          }
        });
        console.log('API Response:', response.data);
        setAllProducts(response.data.Result);
        const uniqueStyles = [...new Set(response.data.Result.map(p => p.STYLE_No))];
        setStyles(uniqueStyles);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          setError('Authentication failed. Please check your access token.');
        } else if (err.response && err.response.status === 429) {
          setError('API rate limit exceeded. Please try again later.');
        } else {
          setError(`Failed to load product data. Error: ${err.message}`);
        }
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllProducts();
  }, []);

  // ... rest of the component code remains the same

  return (
    <div className="w-full p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-green-600">Embroidery Pricing Calculator</h1>
      {/* ... rest of the JSX remains the same */}
    </div>
  );
}
