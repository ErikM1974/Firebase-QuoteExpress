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

// API endpoint to fetch products (mock data for now)
app.get('/api/products', async (req, res) => {
  try {
    // Mock data - replace this with actual API call when ready
    const mockProducts = [
      { id: 1, name: 'T-Shirt', basePrice: 10 },
      { id: 2, name: 'Hoodie', basePrice: 25 },
      { id: 3, name: 'Cap', basePrice: 15 },
    ];
    res.json(mockProducts);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ error: 'Error fetching products' });
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
