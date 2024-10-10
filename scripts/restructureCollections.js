const admin = require('firebase-admin');
const serviceAccount = require('../config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function determineStandardSize(size) {
  const standardSizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];
  return standardSizes.includes(size) ? size : "OSFA";
}

function determineSizeOrder(size) {
  const sizeOrder = {
    "XS": 1, "S": 2, "M": 3, "L": 4, "XL": 5, 
    "2XL": 6, "3XL": 7, "4XL": 8, "5XL": 9, "6XL": 10,
    "OSFA": 1 // One Size Fits All is typically first in order
  };
  return sizeOrder[size] || 1; // Default to 1 if size is not found
}

function calculatePriceWithUpcharge(basePrice, upcharge) {
  return Object.entries(basePrice).reduce((acc, [key, value]) => {
    acc[key] = parseFloat(value) + parseFloat(upcharge);
    return acc;
  }, {});
}

function determineGender(productTitle) {
  if (productTitle.toLowerCase().includes("women's")) {
    return "Women's";
  } else if (productTitle.toLowerCase().includes("men's")) {
    return "Men's";
  } else {
    return "Unisex";
  }
}

function determineBrand(productTitle) {
  const brands = ["Port Authority", "Sport-Tek", "Nike", "Jerzees", "Red House"];
  for (const brand of brands) {
    if (productTitle.includes(brand)) {
      return brand;
    }
  }
  return "Unknown";
}

async function restructureCollections() {
  const batchSize = 500;
  let lastDoc = null;
  let processedCount = 0;
  
  try {
    while (true) {
      let query = db.collection('embroidery_products').orderBy('UNIQUE_KEY').limit(batchSize);
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        console.log('Finished processing all documents.');
        break;
      }

      const batch = db.batch();
      const styleUpdates = {};

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const styleNo = data.STYLE_No;

        if (!styleUpdates[styleNo]) {
          styleUpdates[styleNo] = {
            productTitle: data.PRODUCT_TITLE,
            colors: new Set(),
            sizes: new Set(),
            basePrice: {
              '2_5': data.Price_2_5,
              '6_11': data.Price_6_11,
              '12_23': data.Price_12_23,
              '24_47': data.Price_24_47,
              '48_71': data.Price_48_71,
              '72_plus': data.Price_72_plus
            },
            sizeUpcharges: {},
            gender: determineGender(data.PRODUCT_TITLE),
            brand: determineBrand(data.PRODUCT_TITLE),
            nonStandardSizes: new Set()
          };
        }

        const standardSize = determineStandardSize(data.SIZE);
        const sizeOrder = determineSizeOrder(standardSize);

        styleUpdates[styleNo].colors.add(data.COLOR_NAME);
        styleUpdates[styleNo].sizes.add(standardSize);

        if (standardSize === "OSFA") {
          styleUpdates[styleNo].nonStandardSizes.add(data.SIZE);
        }

        if (parseFloat(data.Surcharge) > 0) {
          styleUpdates[styleNo].sizeUpcharges[standardSize] = parseFloat(data.Surcharge);
        }

        const basePrice = {
          '2_5': data.Price_2_5,
          '6_11': data.Price_6_11,
          '12_23': data.Price_12_23,
          '24_47': data.Price_24_47,
          '48_71': data.Price_48_71,
          '72_plus': data.Price_72_plus
        };

        const pricesWithUpcharge = calculatePriceWithUpcharge(basePrice, data.Surcharge);

        // Update current document in embroidery_products
        batch.update(doc.ref, {
          styleNo: data.STYLE_No,
          colorName: data.COLOR_NAME,
          productTitle: data.PRODUCT_TITLE,
          size: data.SIZE,
          standardSize: standardSize,
          sizeOrder: sizeOrder,
          surcharge: parseFloat(data.Surcharge),
          prices: pricesWithUpcharge,
          capPrices: {
            '2_23': data.CapPrice_2_23,
            '24_143': data.CapPrice_24_143,
            '144_plus': data.CapPrice_144_plus
          },
          cap_NoCap: data.Cap_NoCap
        });

        processedCount++;
      }

      // Update styles collection
      for (const [styleNo, styleData] of Object.entries(styleUpdates)) {
        const styleRef = db.collection('styles').doc(styleNo);
        batch.set(styleRef, {
          ...styleData,
          colors: Array.from(styleData.colors),
          sizes: Array.from(styleData.sizes),
          nonStandardSizes: Array.from(styleData.nonStandardSizes)
        }, { merge: true });
      }

      await batch.commit();
      console.log(`Processed ${processedCount} documents.`);

      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    console.log(`Restructuring complete. Processed ${processedCount} documents.`);
  } catch (error) {
    console.error('Error during restructuring:', error);
  }
}

// Run the restructuring function
restructureCollections().catch(console.error);