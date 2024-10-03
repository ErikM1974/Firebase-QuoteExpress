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

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/products');
        const products = response.data.Result;

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
        console.error('Error fetching product data:', err);
        setError(`Failed to load product data: ${err.message}. Please try again later.`);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

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
      <h1 className="text-2xl font-bold mb-4">Embroidery Order Form</h1>
      <table className="w-full border-collapse border border-gray-300 mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2">Style</th>
            <th className="border border-gray-300 p-2">Color</th>
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
                <input
                  type="text"
                  value={order.style}
                  onChange={(e) => updateOrder(index, 'style', e.target.value)}
                  className="w-full"
                />
              </td>
              <td className="border border-gray-300 p-2">
                <input
                  type="text"
                  value={order.color}
                  onChange={(e) => updateOrder(index, 'color', e.target.value)}
                  className="w-full"
                />
              </td>
              {SIZES.map(size => (
                <td key={size} className="border border-gray-300 p-2">
                  <input
                    type="number"
                    value={order.quantities[size] || ''}
                    onChange={(e) => updateQuantity(index, size, e.target.value)}
                    className="w-full"
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
      {orders.some(order => order.error) && (
        <div className="text-red-500 mb-4">
          {orders.map((order, index) => order.error && (
            <div key={index}>Line {index + 1}: {order.error}</div>
          ))}
        </div>
      )}
      <div className="mb-4">
        <button onClick={addNewLine} className="bg-blue-500 text-white px-4 py-2 rounded mr-2">
          Add Line
        </button>
        <button onClick={handleSubmitOrder} className="bg-green-500 text-white px-4 py-2 rounded">
          Submit Order
        </button>
      </div>
      <div className="text-xl font-bold">
        Total Quantity: {totals.quantity}
      </div>
      <div className="text-xl font-bold">
        Total Price: ${totals.price.toFixed(2)}
      </div>
    </div>
  );
}
