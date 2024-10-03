require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 5000; // Use Heroku's port or default to 5000

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// API endpoint to fetch products (mock data for now)
app.get('/api/products', async (req, res) => {
  try {
    // Mock data - replace this with actual API call when ready
    const mockProducts = {
      Result: [
        {
          UNIQUE_KEY: '1',
          PRODUCT_TITLE: 'T-Shirt',
          STYLE_No: 'TS001',
          COLOR_NAME: 'Black',
          SIZE: 'M',
          Price_2_5: '10',
          Price_6_11: '9',
          Price_12_23: '8',
          Price_24_47: '7',
          Price_48_71: '6',
          Price_72_plus: '5',
          Surcharge: '0'
        },
        {
          UNIQUE_KEY: '2',
          PRODUCT_TITLE: 'Hoodie',
          STYLE_No: 'HD001',
          COLOR_NAME: 'Navy',
          SIZE: 'L',
          Price_2_5: '25',
          Price_6_11: '24',
          Price_12_23: '23',
          Price_24_47: '22',
          Price_48_71: '21',
          Price_72_plus: '20',
          Surcharge: '2'
        },
        {
          UNIQUE_KEY: '3',
          PRODUCT_TITLE: 'Cap',
          STYLE_No: 'CP001',
          COLOR_NAME: 'Red',
          SIZE: 'One Size',
          Price_2_5: '15',
          Price_6_11: '14',
          Price_12_23: '13',
          Price_24_47: '12',
          Price_48_71: '11',
          Price_72_plus: '10',
          Surcharge: '0'
        }
      ]
    };
    res.json(mockProducts);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ error: 'Error fetching products' });
  }
});

// New endpoint to serve environment variables
app.get('/api/config', (req, res) => {
  res.json({
    REACT_APP_CASPIO_TOKEN_URL: process.env.REACT_APP_CASPIO_TOKEN_URL,
    REACT_APP_CASPIO_API_URL: process.env.REACT_APP_CASPIO_API_URL,
    REACT_APP_CASPIO_CLIENT_ID: process.env.REACT_APP_CASPIO_CLIENT_ID,
    REACT_APP_CASPIO_CLIENT_SECRET: process.env.REACT_APP_CASPIO_CLIENT_SECRET,
  });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
