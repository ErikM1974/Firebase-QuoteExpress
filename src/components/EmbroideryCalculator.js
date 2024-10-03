import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const LARGE_SIZES = ['2XL', '3XL', '4XL'];

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

  const addNewLine = () => {
    setOrders([...orders, {
      STYLE_No: "",
      COLOR_NAME: "",
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

    if (field === 'STYLE_No') {
      newOrders[index].COLOR_NAME = '';
      newOrders[index].quantities = {};
    } else if (field === 'COLOR_NAME') {
      newOrders[index].quantities = {};
    }

    const key = `${newOrders[index].STYLE_No}-${newOrders[index].COLOR_NAME}`;
    if (newOrders[index].STYLE_No && newOrders[index].COLOR_NAME && !productDatabase[key]) {
      newOrders[index].error = "Invalid style or color combination";
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
      const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
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

  const calculateRowTotal = (order, totalQuantity) => {
    const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
    const product = productDatabase[key];
    if (!product) return 0;

    const basePrice = getPriceForQuantity(product, totalQuantity);
    return Object.entries(order.quantities).reduce((sum, [size, qty]) => {
      if (!qty) return sum;
      const sizeProduct = product.sizes[size];
      const surcharge = sizeProduct && sizeProduct.Surcharge ? parseFloat(sizeProduct.Surcharge) || 0 : 0;
      return sum + (basePrice + surcharge) * qty;
    }, 0);
  };

  const handleSubmitOrder = () => {
    console.log('Submitting order:', orders);
    alert('Order submitted successfully!');
  };

  const getAvailableSizes = (order) => {
    const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
    const product = productDatabase[key];
    if (!product) return DEFAULT_SIZES;

    const availableSizes = Object.keys(product.sizes);
    if (availableSizes.includes('OSFA')) {
      return ['OSFA'];
    }
    return availableSizes.sort((a, b) => DEFAULT_SIZES.indexOf(a) - DEFAULT_SIZES.indexOf(b));
  };

  const totals = calculateOrderTotals();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="w-full p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-green-600">Embroidery Order Form</h1>
      <p className="mb-4">Number of styles available: {styles.length}</p>
      <table className="w-full border-collapse border border-gray-300 mb-4 bg-white">
        <thead>
          <tr className="bg-green-600 text-white">
            <th className="border border-gray-300 p-2">Style No</th>
            <th className="border border-gray-300 p-2">Color Name</th>
            <th className="border border-gray-300 p-2">Product Title</th>
            <th className="border border-gray-300 p-2">Sizes</th>
            <th className="border border-gray-300 p-2">Row Total</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            const availableSizes = getAvailableSizes(order);
            return (
              <tr key={index}>
                <td className="border border-gray-300 p-2">
                  <input
                    list={`styles-${index}`}
                    value={order.STYLE_No}
                    onChange={(e) => updateOrder(index, 'STYLE_No', e.target.value)}
                    className="w-full"
                    placeholder="Enter or select style"
                  />
                  <datalist id={`styles-${index}`}>
                    {styles.map(style => (
                      <option key={style} value={style} />
                    ))}
                  </datalist>
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
                <td className="border border-gray-300 p-2">
                  <div className="flex flex-wrap">
                    {availableSizes.map(size => {
                      const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
                      const product = productDatabase[key];
                      const basePrice = product ? getPriceForQuantity(product, totals.quantity) : 0;
                      const sizeProduct = product?.sizes[size];
                      const surcharge = sizeProduct && sizeProduct.Surcharge ? parseFloat(sizeProduct.Surcharge) || 0 : 0;
                      const price = basePrice + surcharge;

                      return (
                        <div key={size} className={`w-1/4 p-1 ${LARGE_SIZES.includes(size) ? 'bg-green-100' : ''}`}>
                          <div className="text-xs font-bold mb-1">{size}</div>
                          <input
                            type="number"
                            value={order.quantities[size] || ''}
                            onChange={(e) => updateQuantity(index, size, e.target.value)}
                            className="w-full mb-1 text-sm"
                            min="0"
                          />
                          <div className="text-xs text-gray-500">${price.toFixed(2)}</div>
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className="border border-gray-300 p-2 font-bold">
                  ${calculateRowTotal(order, totals.quantity).toFixed(2)}
                </td>
                <td className="border border-gray-300 p-2">
                  <button onClick={() => removeLine(index)} className="bg-red-500 text-white px-2 py-1 rounded">
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {orders.some(order => order.error) && (
        <div className="text-red-500 mb-4">
          {orders.map((order, index) => order.error && (
            <div key={index}>Line {index + 1}: {order.error}</div>
          ))}
        </div>
      )}
      <div className="mb-4">
        <button onClick={addNewLine} className="bg-green-600 text-white px-4 py-2 rounded mr-2 hover:bg-green-700">
          Add Line
        </button>
        <button onClick={handleSubmitOrder} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
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
