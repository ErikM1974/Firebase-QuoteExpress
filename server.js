require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

let accessToken = process.env.ACCESS_TOKEN;
let tokenExpiry = Date.now() + parseInt(process.env.TOKEN_EXPIRY) * 1000;

async function refreshToken() {
  try {
    const response = await axios.post(process.env.REACT_APP_CASPIO_TOKEN_URL, {
      grant_type: 'refresh_token',
      client_id: process.env.REACT_APP_CASPIO_CLIENT_ID,
      client_secret: process.env.REACT_APP_CASPIO_CLIENT_SECRET,
      refresh_token: process.env.REFRESH_TOKEN
    });

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + response.data.expires_in * 1000;
    console.log('Token refreshed successfully');
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

async function getValidToken() {
  if (Date.now() >= tokenExpiry) {
    await refreshToken();
  }
  return accessToken;
}

// API endpoint to fetch products
app.get('/api/products', async (req, res) => {
  try {
    const token = await getValidToken();
    console.log('API URL:', process.env.REACT_APP_CASPIO_API_URL);
    console.log('Token:', token.substring(0, 10) + '...');
    const response = await axios.get(`${process.env.REACT_APP_CASPIO_API_URL}/tables/Sanmar_Pricing_2024/records`, {
      headers: {
        'Authorization': `bearer ${token}`,
        'accept': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    res.status(500).json({ error: 'Error fetching products', details: error.message });
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Environment variables:');
  console.log('REACT_APP_CASPIO_API_URL:', process.env.REACT_APP_CASPIO_API_URL);
  console.log('REACT_APP_CASPIO_TOKEN_URL:', process.env.REACT_APP_CASPIO_TOKEN_URL);
  console.log('REACT_APP_CASPIO_CLIENT_ID:', process.env.REACT_APP_CASPIO_CLIENT_ID ? 'Set' : 'Not set');
  console.log('REACT_APP_CASPIO_CLIENT_SECRET:', process.env.REACT_APP_CASPIO_CLIENT_SECRET ? 'Set' : 'Not set');
  console.log('ACCESS_TOKEN:', process.env.ACCESS_TOKEN ? 'Set' : 'Not set');
  console.log('REFRESH_TOKEN:', process.env.REFRESH_TOKEN ? 'Set' : 'Not set');
  console.log('TOKEN_EXPIRY:', process.env.TOKEN_EXPIRY);
});
