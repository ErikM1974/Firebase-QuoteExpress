require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

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
const fetchSanmarPricing = async () => {
  try {
    if (Date.now() >= tokenExpiryTime) {
      await refreshAccessToken();
    }

    let allRecords = [];
    let pageNumber = 1;
    let hasMoreRecords = true;

    while (hasMoreRecords) {
      const response = await axios.get(`${CASPIO_API_URL}`, {
        params: {
          pageNumber: pageNumber,
          pageSize: 1000 // Adjust this value based on Caspio's maximum allowed page size
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'accept': 'application/json'
        }
      });

      if (response.data.Result && response.data.Result.length > 0) {
        allRecords = allRecords.concat(response.data.Result);
        pageNumber++;
        console.log(`Fetched page ${pageNumber - 1}, total records: ${allRecords.length}`);
      } else {
        hasMoreRecords = false;
      }
    }

    console.log(`Total records fetched: ${allRecords.length}`);
    return allRecords;
  } catch (error) {
    console.error('Error fetching product data:', error.message);
    throw new Error('Failed to fetch product data');
  }
};

// API endpoint to fetch products
app.get('/api/products', async (req, res) => {
  try {
    console.log('Fetching products...');
    const data = await fetchSanmarPricing();
    console.log(`Sending response with ${data.length} products`);
    res.json({ Result: data });
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
