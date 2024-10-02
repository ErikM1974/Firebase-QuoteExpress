const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
const qs = require('querystring');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Caspio API configuration
const CASPIO_TOKEN_URL = process.env.CASPIO_TOKEN_URL;
const CASPIO_API_URL = process.env.CASPIO_API_URL;
const CLIENT_ID = process.env.CASPIO_CLIENT_ID;
const CLIENT_SECRET = process.env.CASPIO_CLIENT_SECRET;

let accessToken = null;
let tokenExpiration = null;

// Function to get a new access token
async function getAccessToken() {
  try {
    const response = await axios.post(CASPIO_TOKEN_URL, qs.stringify({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    accessToken = response.data.access_token;
    tokenExpiration = Date.now() + (response.data.expires_in * 1000);
    return accessToken;
  } catch (error) {
    console.error('Error getting access token:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Function to get a valid access token (refreshing if necessary)
async function getValidAccessToken() {
  if (!accessToken || Date.now() >= tokenExpiration) {
    return getAccessToken();
  }
  return accessToken;
}

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// API endpoint to fetch products from Caspio
app.get('/api/products', async (req, res) => {
  try {
    const token = await getValidAccessToken();
    const response = await axios.get(`${CASPIO_API_URL}/tables/Products/records`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching products:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error fetching products', details: error.response ? error.response.data : error.message });
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
