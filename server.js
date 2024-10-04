require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const NodeCache = require('node-cache');
const throng = require('throng');

const WORKERS = process.env.WEB_CONCURRENCY || 1;
const PORT = process.env.PORT || 5000;

const CASPIO_API_URL = process.env.REACT_APP_CASPIO_API_URL;
const CASPIO_TOKEN_URL = process.env.REACT_APP_CASPIO_TOKEN_URL;
const CASPIO_CLIENT_ID = process.env.REACT_APP_CASPIO_CLIENT_ID;
const CASPIO_CLIENT_SECRET = process.env.REACT_APP_CASPIO_CLIENT_SECRET;

let ACCESS_TOKEN = "lpDHzizHBYGq_t9o1mZFS_H8zeDdZhJJzPO5_fjaICa6y96_d_q6Wbtx1NqWsyW-8AfaQmU7OFXR4FruKPACMdIFyd483N4zG49XAbJj14aIW830nDxcpi12KiTnCFdbiXlN9fegXF-A10OzUy8zP8cfs634_M7fu-nZ8K0TAIhGyQnhgsX-Dd5-qw7RRxgiPgcTzVQOLMJ2ctX6mAYq_dhsprQ_kql3A9x7UXuKdYkJkFazM_uO0Slj2O0fC9_QO4JUkneBMgPghHWggOKqaKeoQuUNH3fYNB7arw8iSPw0cX3gajNVHhUB18yPd0r1WsrjYGlJh5gEuV_G-CiZQblNch4YvHhTZ-088jVGyjJpAvx0I8e_DKj0Li06UC_d";
let REFRESH_TOKEN = "063336a7ca2041fcad43297178ca1361e733eb7912534a028910cc96d74f3440";
let TOKEN_EXPIRY = Date.now() + 86399000; // Set expiry to 24 hours from now

function start() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, 'build')));

  // Initialize cache
  const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

  // Function to refresh the access token
  const refreshAccessToken = async () => {
    try {
      const response = await axios.post(CASPIO_TOKEN_URL, 
        `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}&client_id=${CASPIO_CLIENT_ID}&client_secret=${CASPIO_CLIENT_SECRET}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      ACCESS_TOKEN = response.data.access_token;
      REFRESH_TOKEN = response.data.refresh_token;
      TOKEN_EXPIRY = Date.now() + (response.data.expires_in * 1000);

      console.log('Access Token refreshed');
    } catch (error) {
      console.error('Error refreshing access token:', error.message);
      throw new Error('Failed to refresh access token');
    }
  };

  // Function to fetch records from the Caspio API
  const fetchSanmarPricing = async (style = null) => {
    try {
      if (Date.now() >= TOKEN_EXPIRY) {
        await refreshAccessToken();
      }

      console.log('Fetching from Caspio API:', CASPIO_API_URL);
      const url = new URL(CASPIO_API_URL);
      url.searchParams.append('q.select', 'UNIQUE_KEY, STYLE_No, COLOR_NAME, PRODUCT_TITLE, Price_2_5, Price_6_11, Price_12_23, Price_24_47, Price_48_71, Price_72_plus, SIZE, Surcharge, SizeOrder, CapPrice_2_23, CapPrice_24_143, CapPrice_144_plus, Cap_NoCap');
      if (style) {
        url.searchParams.append('q.where', `STYLE_No='${style}'`);
      }

      const response = await axios.get(url.toString(), {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'accept': 'application/json'
        }
      });

      console.log('Received response from Caspio API');
      console.log('Response data structure:', JSON.stringify(response.data, null, 2));
      
      if (!response.data || !response.data.Result) {
        console.log('No Result array in the response');
        return [];
      }
      
      return response.data.Result;
    } catch (error) {
      console.error('Error fetching product data:', error.message);
      if (error.response && error.response.status === 401) {
        console.log('Unauthorized error. Attempting to refresh token...');
        await refreshAccessToken();
        return fetchSanmarPricing(style); // Retry the request with the new token
      }
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error('Failed to fetch product data');
    }
  };

  // API endpoint to fetch all unique style numbers
  app.get('/api/styles', async (req, res) => {
    try {
      const cacheKey = 'all_styles';
      let styles = cache.get(cacheKey);

      if (!styles) {
        console.log('Fetching all styles from Caspio API');
        const products = await fetchSanmarPricing();
        styles = [...new Set(products.map(product => product.STYLE_No))];
        cache.set(cacheKey, styles);
        console.log(`Cached ${styles.length} styles`);
      } else {
        console.log('Returning cached styles');
      }

      console.log('Sending styles to client:', styles);
      res.json(styles);
    } catch (error) {
      console.error('Error fetching styles:', error.message);
      res.status(500).json({ error: 'Error fetching styles', details: error.message });
    }
  });

  // API endpoint to fetch products for a specific style
  app.get('/api/products', async (req, res) => {
    try {
      const style = req.query.style;

      if (!style) {
        return res.status(400).json({ error: 'Style parameter is required' });
      }

      const cacheKey = `products_${style}`;
      let products = cache.get(cacheKey);

      if (!products) {
        console.log(`Fetching products for style ${style} from Caspio API`);
        products = await fetchSanmarPricing(style);
        cache.set(cacheKey, products);
        console.log(`Cached ${products.length} products for style ${style}`);
      } else {
        console.log(`Returning cached products for style ${style}`);
      }

      console.log(`Sending ${products.length} products to client for style ${style}`);
      console.log('First product:', products[0]);
      res.json(products);
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

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Environment variables:');
    console.log('REACT_APP_CASPIO_API_URL:', CASPIO_API_URL ? 'Set' : 'Not set');
    console.log('CASPIO_TOKEN_URL:', CASPIO_TOKEN_URL ? 'Set' : 'Not set');
    console.log('CASPIO_CLIENT_ID:', CASPIO_CLIENT_ID ? 'Set' : 'Not set');
    console.log('CASPIO_CLIENT_SECRET:', CASPIO_CLIENT_SECRET ? 'Set' : 'Not set');
    console.log('ACCESS_TOKEN: Set');
    console.log('REFRESH_TOKEN: Set');
  });
}

throng({
  workers: WORKERS,
  lifetime: Infinity,
  start: start
});
