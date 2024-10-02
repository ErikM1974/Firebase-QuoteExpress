const express = require('express');
const cors = require('cors');
const app = express();
const port = 3003; // Changed from 3002 to 3003

app.use(cors());
app.use(express.json());

const mockProducts = [
  {
    STYLE_No: "ST5000",
    PRODUCT_TITLE: "Sport-Tek PosiCharge Reversible Mesh Tank",
    COLOR_NAME: "Gold/ Black",
    SIZE: "XL",
    Price_2_5: 34,
    Price_6_11: 25,
    Price_12_23: 21,
    Price_24_47: 20,
    Price_48_71: 19,
    Price_72_plus: 18,
    Surcharge: 0,
    Garment_Logo_Left_2_5: 13.25,
    Garment_Logo_Left_6_11: 11,
    Garment_Logo_Left_12_23: 10,
    Garment_Logo_Left_24_47: 9.25,
    Garment_Logo_Left_48_71: 8.25,
    Garment_Logo_Left_72_plus: 7.75,
    Garment_Logo_Medium_2_5: 24.75,
    Garment_Logo_Medium_6_11: 20.75,
    Garment_Logo_Medium_12_23: 18.75,
    Garment_Logo_Medium_24_47: 17.25,
    Garment_Logo_Medium_48_71: 15.5,
    Garment_Logo_Medium_72_plus: 14.5,
    Garment_Logo_Big_2_5: 33,
    Garment_Logo_Big_6_11: 27.5,
    Garment_Logo_Big_12_23: 24.75,
    Garment_Logo_Big_24_47: 22.75,
    Garment_Logo_Big_48_71: 20.75,
    Garment_Logo_Big_72_plus: 19.25,
  },
  // Add more mock products here...
];

app.get('/api/products', (req, res) => {
  res.json({ Result: mockProducts });
});

app.listen(port, () => {
  console.log(`Mock API server running at http://localhost:${port}`);
});