require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const NodeCache = require('node-cache');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

const CASPIO_API_URL = process.env.REACT_APP_CASPIO_API_URL;
const CASPIO_TOKEN_URL = process.env.REACT_APP_CASPIO_TOKEN_URL;
const CASPIO_CLIENT_ID = process.env.REACT_APP_CASPIO_CLIENT_ID;
const CASPIO_CLIENT_SECRET = process.env.REACT_APP_CASPIO_CLIENT_SECRET;
let accessToken = process.env.ACCESS_TOKEN;
let refreshToken = process.env.REFRESH_TOKEN;
let tokenExpiryTime = Date.now() + (process.env.TOKEN_EXPIRY ? parseInt(process.env.TOKEN_EXPIRY) * 1000 : 86399000);

// Initialize cache
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Function to refresh the access token
const refreshAccessToken = async () => {
  try {
    const response = await axios.post(CASPIO_TOKEN_URL, `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${CASPIO_CLIENT_ID}&client_secret=${CASPIO_CLIENT_SECRET}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    tokenExpiryTime = Date.now() + response.data.expires_in * 1000;

    console.log('Access Token refreshed');
  } catch (error) {
    console.error('Error refreshing access token:', error.message);
    throw new Error('Failed to refresh access token');
  }
};

// Function to fetch records from the Caspio API
const fetchSanmarPricing = async (page, pageSize) => {
  try {
    if (Date.now() >= tokenExpiryTime) {
      await refreshAccessToken();
    }

    const cacheKey = `products_${page}_${pageSize}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`Returning cached data for page ${page}`);
      return cachedData;
    }

    const response = await axios.get(`${CASPIO_API_URL}`, {
      params: {
        pageNumber: page,
        pageSize: pageSize
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'accept': 'application/json'
      }
    });

    if (response.data.Result && response.data.Result.length > 0) {
      console.log(`Fetched page ${page}, records: ${response.data.Result.length}`);
      cache.set(cacheKey, response.data.Result);
      return response.data.Result;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching product data:', error.message);
    throw new Error('Failed to fetch product data');
  }
};

// API endpoint to fetch products
app.get('/api/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;

    console.log(`Fetching products for page ${page} with pageSize ${pageSize}...`);
    const data = await fetchSanmarPricing(page, pageSize);
    console.log(`Sending response with ${data.length} products`);
    res.json({ Result: data, page, pageSize });
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ error: 'Error fetching products', details: error.message });
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Environment variables:');
  console.log('CASPIO_API_URL:', CASPIO_API_URL ? 'Set' : 'Not set');
  console.log('CASPIO_TOKEN_URL:', CASPIO_TOKEN_URL ? 'Set' : 'Not set');
  console.log('CASPIO_CLIENT_ID:', CASPIO_CLIENT_ID ? 'Set' : 'Not set');
  console.log('CASPIO_CLIENT_SECRET:', CASPIO_CLIENT_SECRET ? 'Set' : 'Not set');
  console.log('ACCESS_TOKEN:', accessToken ? 'Set' : 'Not set');
  console.log('REFRESH_TOKEN:', refreshToken ? 'Set' : 'Not set');
});
