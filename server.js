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

const CASPIO_API_URL = 'https://c3eku948.caspio.com/rest/v2/tables/Sanmar_Pricing_2024/records';
const CASPIO_TOKEN_URL = 'https://c3eku948.caspio.com/oauth/token';
const CASPIO_CLIENT_ID = process.env.REACT_APP_CASPIO_CLIENT_ID || '25bea36404d34215e23255861c370d0fc417444f0af8e8477c';
const CASPIO_CLIENT_SECRET = process.env.REACT_APP_CASPIO_CLIENT_SECRET || '5316be27cadd4b56a235a544c9018aa54feb64d90805430011';
let accessToken = process.env.ACCESS_TOKEN || 'Odhkm10pbNyJX7YviRjqpGczY9nESZxyIwPAlqZ6F71YL4wzC-B2q4gRiDo-wvnuuXloptmSmyqrDKAWeIrJdRzOdH9wMf_JTehcZqTUKqRh9W95f8-ox6_jxCLcmh346qlqfMxcU0uTuItTFGlAkimnSYF5ippsLxk_AgEkoPu-r9dQvkq8L2b9Pm1VbttWtsPk9hx9nI3sKTRYCBm-ZuK9wFqPCu4ga1UFIqvxPYmbQq9j7p2P6as70ihbSHezdf-QBeSITJRc-quzBQskl-OtIr25TeOZJdGkMQlYqb09KbQhvMIMdwGaH5---8pH_wBCelgoBPzwL6w4PcXEcsi3mfrhwaZckfSt1JfmPwk-E_fx_TmLrxCUzmU1j-nh';
let refreshToken = process.env.REFRESH_TOKEN || '3ca1b0cd28474bd0a70ce4c774a937506b7ae503f5654ef2849fa1fd83c7e9a7';
let tokenExpiryTime = Date.now() + 86399000; // Set the expiry time in milliseconds

// Function to refresh the access token
const refreshAccessToken = async () => {
  try {
    const response = await axios.post(CASPIO_TOKEN_URL, `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${CASPIO_CLIENT_ID}&client_secret=${CASPIO_CLIENT_SECRET}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    accessToken = response.data.access_token; // Update the access token
    refreshToken = response.data.refresh_token; // Update the refresh token
    tokenExpiryTime = Date.now() + response.data.expires_in * 1000; // Update the token expiry time

    console.log('New Access Token:', accessToken);
    console.log('Token Expiry Time:', new Date(tokenExpiryTime));

  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
};

// Function to fetch records from the Caspio API
const fetchSanmarPricing = async () => {
  try {
    // Check if the token is expired or close to expiry
    if (Date.now() >= tokenExpiryTime) {
      await refreshAccessToken(); // Refresh token if needed
    }

    const response = await axios.get(CASPIO_API_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'accept': 'application/json'
      }
    });

    return response.data.Result;
  } catch (error) {
    console.error('Error fetching product data:', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch product data');
  }
};

// API endpoint to fetch products
app.get('/api/products', async (req, res) => {
  try {
    const data = await fetchSanmarPricing();
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
  console.log('CASPIO_API_URL:', CASPIO_API_URL);
  console.log('CASPIO_TOKEN_URL:', CASPIO_TOKEN_URL);
  console.log('CASPIO_CLIENT_ID:', CASPIO_CLIENT_ID ? 'Set' : 'Not set');
  console.log('CASPIO_CLIENT_SECRET:', CASPIO_CLIENT_SECRET ? 'Set' : 'Not set');
  console.log('ACCESS_TOKEN:', accessToken ? 'Set' : 'Not set');
  console.log('REFRESH_TOKEN:', refreshToken ? 'Set' : 'Not set');
  console.log('Token Expiry Time:', new Date(tokenExpiryTime));
});
