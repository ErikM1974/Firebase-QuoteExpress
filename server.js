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
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

function start() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, 'build')));

  // Initialize cache
  const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

  // Function to fetch records from the Caspio API
  const fetchSanmarPricing = async (style = null) => {
    try {
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
      return response.data.Result || [];
    } catch (error) {
      console.error('Error fetching product data:', error.message);
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
    console.log('ACCESS_TOKEN:', ACCESS_TOKEN ? 'Set' : 'Not set');
  });
}

throng({
  workers: WORKERS,
  lifetime: Infinity,
  start: start
});
