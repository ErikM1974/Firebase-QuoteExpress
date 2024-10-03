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
    STYLE_No: "",
    COLOR_NAME: "",
    quantities: {},
    error: null
  }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [styles, setStyles] = useState([]);
  const [colors, setColors] = useState({});

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/products');
        if (!response.data || !Array.isArray(response.data.Result)) {
          throw new Error('Invalid data structure received from the server');
        }
        const products = response.data.Result;

        const formattedData = {};
        const stylesSet = new Set();
        const colorsMap = {};

        products.forEach(product => {
          if (!product.STYLE_No || !product.COLOR_NAME) return; // skip incomplete data
          const key = `${product.STYLE_No}-${product.COLOR_NAME}`;
          if (!formattedData[key]) {
            formattedData[key] = {
              PRODUCT_TITLE: product.PRODUCT_TITLE,
              STYLE_No: product.STYLE_No,
              COLOR_NAME: product.COLOR_NAME,
              sizes: {},
              ...product
            };
          }
          formattedData[key].sizes[product.SIZE] = product;

          stylesSet.add(product.STYLE_No);
          if (!colorsMap[product.STYLE_No]) {
            colorsMap[product.STYLE_No] = new Set();
          }
          colorsMap[product.STYLE_No].add(product.COLOR_NAME);
        });

        const stylesArray = Array.from(stylesSet);
        console.log('Number of styles fetched:', stylesArray.length); // Debug log
        setProductDatabase(formattedData);
        setStyles(stylesArray);
        setColors(Object.fromEntries(Object.entries(colorsMap).map(([style, colorSet]) => [style, Array.from(colorSet)])));
        setError(null);
      } catch (err) {
        console.error('Error fetching product data:', err);
        setError(`Failed to load product data: ${err.message}. Please try again later.`);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // ... (rest of the component code remains unchanged)

  return (
    <div className="w-full p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-green-600">Embroidery Order Form</h1>
      {/* Debug display */}
      <p className="mb-4">Number of styles available: {styles.length}</p>
      <table className="w-full border-collapse border border-gray-300 mb-4 bg-white">
        <thead>
          <tr className="bg-green-600 text-white">
            <th className="border border-gray-300 p-2">Style No</th>
            <th className="border border-gray-300 p-2">Color Name</th>
            <th className="border border-gray-300 p-2">Product Title</th>
            {SIZES.map(size => (
              <th key={size} className="border border-gray-300 p-2">{size}</th>
            ))}
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => (
            <tr key={index}>
              <td className="border border-gray-300 p-2">
                {/* Temporary select element for debugging */}
                <select
                  value={order.STYLE_No}
                  onChange={(e) => updateOrder(index, 'STYLE_No', e.target.value)}
                  className="w-full"
                >
                  <option value="">Select style</option>
                  {styles.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </td>
              <td className="border border-gray-300 p-2">
                <select
                  value={order.COLOR_NAME}
                  onChange={(e) => updateOrder(index, 'COLOR_NAME', e.target.value)}
                  className="w-full"
                  disabled={!order.STYLE_No}
                >
                  <option value="">Select Color</option>
                  {colors[order.STYLE_No]?.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </td>
              <td className="border border-gray-300 p-2">
                {productDatabase[`${order.STYLE_No}-${order.COLOR_NAME}`]?.PRODUCT_TITLE || ''}
              </td>
              {SIZES.map(size => (
                <td key={size} className="border border-gray-300 p-2">
                  <input
                    type="number"
                    value={order.quantities[size] || ''}
                    onChange={(e) => updateQuantity(index, size, e.target.value)}
                    className="w-full"
                    min="0"
                  />
                </td>
              ))}
              <td className="border border-gray-300 p-2">
                <button onClick={() => removeLine(index)} className="bg-red-500 text-white px-2 py-1 rounded">
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* ... (rest of the component remains unchanged) */}
    </div>
  );
}
