import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const STANDARD_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const LARGE_SIZES = ['2XL', '3XL'];

const fetchSanmarPricingData = async () => {
  try {
    const apiUrl = process.env.REACT_APP_CASPIO_API_URL;
    const accessToken = process.env.REACT_APP_CASPIO_ACCESS_TOKEN;

    const response = await axios.get(`${apiUrl}/tables/Sanmar_Pricing_2024/records`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
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

  const handleStyleChange = (e) => {
    setSelectedStyle(e.target.value);
  };

  const handleColorChange = (e) => {
    setSelectedColor(e.target.value);
    setQuantities({});
  };

  const handleQuantityChange = (size, value) => {
    setQuantities(prev => ({ ...prev, [size]: parseInt(value) || 0 }));
  };

  const totalQuantity = useMemo(() => 
    Object.values(quantities).reduce((sum, qty) => sum + qty, 0),
    [quantities]
  );

  const totalPrice = useMemo(() => {
    if (!selectedStyle || !selectedColor) return 0;
    const products = allProducts.filter(p => p.STYLE_No === selectedStyle && p.COLOR_NAME === selectedColor);
    if (products.length === 0) return 0;
    const basePrice = getPriceForQuantity(products[0], totalQuantity);
    return Object.entries(quantities).reduce((sum, [size, qty]) => {
      const sizeProduct = products.find(p => p.SIZE === size);
      if (!sizeProduct) return sum;
      const surcharge = parseFloat(sizeProduct.Surcharge) || 0;
      return sum + (basePrice + surcharge) * qty;
    }, 0);
  }, [allProducts, selectedStyle, selectedColor, quantities, totalQuantity]);

  if (loading) return <div className="text-center py-4">Loading product data...</div>;
  if (error) return <div className="text-red-500 text-center py-4">{error}</div>;

  return (
    <div className="w-full p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-green-600">Embroidery Pricing Calculator</h1>
      <div className="mb-4">
        <label className="block mb-2">Style Number:</label>
        <select 
          value={selectedStyle} 
          onChange={handleStyleChange}
          className="w-full p-2 border rounded"
        >
          <option value="">Select a style</option>
          {styles.map(style => (
            <option key={style} value={style}>{style}</option>
          ))}
        </select>
      </div>
      {selectedStyle && (
        <div className="mb-4">
          <label className="block mb-2">Color:</label>
          <select 
            value={selectedColor} 
            onChange={handleColorChange}
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
                  onChange={(e) => handleQuantityChange(size, e.target.value)}
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
