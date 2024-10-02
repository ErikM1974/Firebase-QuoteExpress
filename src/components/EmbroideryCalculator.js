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
      try {
        setLoading(true);
        const response = await axios.get('/api/products');
        
        if (!response.data || !response.data.Result || !Array.isArray(response.data.Result)) {
          throw new Error('Invalid data structure received from the server');
        }

        const formattedData = {};
        try {
          response.data.Result.forEach(product => {
            if (!product.STYLE_No || !product.COLOR_NAME) {
              console.warn('Product missing STYLE_No or COLOR_NAME:', product);
              return; // Skip this product
            }
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
        } catch (formatError) {
          console.error('Error formatting product data:', formatError);
          throw new Error('Error processing product data');
        }

        setProductDatabase(formattedData);
        setLoading(false);
        console.log('Product database:', formattedData);
      } catch (error) {
        console.error('Error fetching or processing product data:', error);
        setError(`Failed to load product data: ${error.message}. Please try again later.`);
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Rest of the component code remains unchanged
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
      <h1 className="text-2xl font-bold mb-4">Embroidery Order Calculator</h1>
      <p className="mb-4">Enter your order details below. Select a style and color, then enter quantities for each size. The calculator will automatically update totals and apply any size surcharges.</p>
      <table className="w-full border-collapse mb-4 text-sm">
        <thead>
          <tr className="bg-green-500 text-white">
            <th className="border p-2 text-left">STYLE#</th>
            <th className="border p-2 text-left">COLOR_NAME</th>
            <th className="border p-2 text-left">PRODUCT TITLE</th>
            {SIZES.map(size => (
              <th key={size} className="border p-2">{size}</th>
            ))}
            <th className="border p-2">Qty</th>
            <th className="border p-2">Price</th>
            <th className="border p-2"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            const key = `${order.style}-${order.color}`;
            const product = productDatabase[key];
            const orderQuantity = Object.values(order.quantities).reduce((sum, qty) => sum + (qty || 0), 0);
            const basePrice = product ? getPriceForQuantity(product, totals.quantity) : 0;
            const orderPrice = Object.entries(order.quantities).reduce((sum, [size, qty]) => {
              if (!qty || !product) return sum;
              const sizeProduct = product.sizes[size];
              const surcharge = sizeProduct && sizeProduct.Surcharge ? parseFloat(sizeProduct.Surcharge) || 0 : 0;
              return sum + (basePrice + surcharge) * qty;
            }, 0);

            return (
              <React.Fragment key={index}>
                <tr className="hover:bg-gray-50">
                  <td className="border p-2">
                    <input
                      type="text"
                      value={order.style}
                      onChange={(e) => updateOrder(index, 'style', e.target.value.toUpperCase())}
                      className="w-24 p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Style#"
                      list="style-options"
                      title="Enter the style number"
                    />
                    <datalist id="style-options">
                      {Object.keys(productDatabase).map(key => (
                        <option key={key} value={productDatabase[key].STYLE_No} />
                      ))}
                    </datalist>
                  </td>
                  <td className="border p-2">
                    <select
                      value={order.color}
                      onChange={(e) => updateOrder(index, 'color', e.target.value)}
                      className="w-full p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Select the color"
                    >
                      <option value="">Select Color</option>
                      {Object.values(productDatabase)
                        .filter(p => p.STYLE_No === order.style)
                        .map(p => (
                          <option key={p.COLOR_NAME} value={p.COLOR_NAME}>{p.COLOR_NAME}</option>
                        ))}
                    </select>
                  </td>
                  <td className="border p-2">
                    {product?.PRODUCT_TITLE || ''}
                  </td>
                  {SIZES.map(size => {
                    const sizeProduct = product?.sizes[size];
                    const surcharge = sizeProduct && sizeProduct.Surcharge ? parseFloat(sizeProduct.Surcharge) || 0 : 0;
                    return (
                      <td key={size} className="border p-2">
                        <input
                          type="number"
                          min="0"
                          value={order.quantities[size] || ''}
                          onChange={(e) => updateQuantity(index, size, e.target.value)}
                          className="w-16 p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title={`Enter quantity for size ${size}`}
                        />
                        {product && (
                          <div className="text-xs mt-1">
                            <span className="font-bold">${basePrice.toFixed(2)}</span>
                            {surcharge > 0 && (
                              <span className="text-red-500 ml-1" title={`Size surcharge for ${size}`}>
                                +${surcharge.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="border p-2 text-center">
                    {orderQuantity}
                  </td>
                  <td className="border p-2 text-right">
                    ${orderPrice.toFixed(2)}
                  </td>
                  <td className="border p-2">
                    <button
                      onClick={() => removeLine(index)}
                      className="text-red-500 hover:text-red-700"
                      disabled={orders.length === 1}
                      title="Remove this line"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
                {order.error && (
                  <tr>
                    <td colSpan={SIZES.length + 5} className="border p-2 bg-red-100 text-red-700">
                      {order.error}
                    </td>
                  </tr>
                )}
                {index < orders.length - 1 && (
                  <tr className="h-4"></tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-gray-100">
            <td colSpan={SIZES.length + 3} className="border p-2 text-right">Total Quantity:</td>
            <td className="border p-2 text-center">{totals.quantity}</td>
            <td className="border p-2 text-right">${totals.price.toFixed(2)}</td>
            <td className="border p-2"></td>
          </tr>
        </tfoot>
      </table>
      
      <div className="flex justify-between items-center">
        <button 
          onClick={addNewLine}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          title="Add a new order line"
        >
          Add Line
        </button>
        <button 
          onClick={handleSubmitOrder}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={orders.some(order => order.error) || totals.quantity === 0}
          title="Submit your order"
        >
          Submit Order
        </button>
      </div>
      {orders.some(order => order.error) && (
        <div className="mt-4 text-red-500">
          Please correct the errors in your order before proceeding.
        </div>
      )}
    </div>
  );
}