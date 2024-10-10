const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin SDK
const serviceAccount = require('../config/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function optimizeStylesCollection() {
  const embroideryProductsRef = db.collection('embroidery_products');
  const batchSize = 500;
  let lastDoc = null;
  let stylesMap = new Map();
  let totalProcessed = 0;

  while (true) {
    try {
      let query = embroideryProductsRef.orderBy('STYLE_No').limit(batchSize);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const querySnapshot = await query.get();

      if (querySnapshot.empty) {
        console.log('No more documents to process');
        break;
      }

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const styleNo = data.STYLE_No;

        if (!styleNo) {
          console.warn(`Document ${doc.id} is missing STYLE_No. Skipping.`);
          return;
        }

        if (!stylesMap.has(styleNo)) {
          stylesMap.set(styleNo, {
            styleNo: styleNo,
            productTitle: data.PRODUCT_TITLE || '',
            brand: data.brand || '',
            colors: [],
            sizes: [],
            basePrice: {
              '2_5': safeParseFloat(data.Price_2_5),
              '6_11': safeParseFloat(data.Price_6_11),
              '12_23': safeParseFloat(data.Price_12_23),
              '24_47': safeParseFloat(data.Price_24_47),
              '48_71': safeParseFloat(data.Price_48_71),
              '72_plus': safeParseFloat(data.Price_72_plus),
            },
            capPrices: {
              '2_23': data.CapPrice_2_23 || '',
              '24_143': data.CapPrice_24_143 || '',
              '144_plus': data.CapPrice_144_plus || '',
              cap_NoCap: data.Cap_NoCap || '',
            },
            sizeUpcharges: {},
            sizeOrders: {},
            gender: data.gender || '',
            UNIQUE_KEY: data.UNIQUE_KEY || '',
          });
        }

        const styleData = stylesMap.get(styleNo);

        // Add color if not already present
        if (data.COLOR_NAME && !styleData.colors.includes(data.COLOR_NAME)) {
          styleData.colors.push(data.COLOR_NAME);
        }

        // Add size if not already present
        if (data.SIZE && !styleData.sizes.includes(data.SIZE)) {
          styleData.sizes.push(data.SIZE);
        }

        // Add size upcharge if present
        if (data.Surcharge) {
          styleData.sizeUpcharges[data.SIZE] = safeParseFloat(data.Surcharge);
        }

        // Add size order if present
        if (data.SizeOrder) {
          styleData.sizeOrders[data.SIZE] = safeParseInt(data.SizeOrder);
        }

        totalProcessed++;
      });

      lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      console.log(`Processed ${totalProcessed} documents`);

    } catch (error) {
      console.error('Error processing batch:', error);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait before retrying
    }
  }

  // Write aggregated styles to Firestore
  let batch = db.batch();
  let count = 0;
  let batchCount = 0;

  for (const [styleNo, styleData] of stylesMap) {
    const styleRef = db.collection('styles').doc(styleNo);
    batch.set(styleRef, styleData);
    count++;
    batchCount++;

    if (batchCount === 500) {
      await batch.commit();
      console.log(`Committed batch of 500 documents. Total styles written: ${count}`);
      batch = db.batch();
      batchCount = 0;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before the next batch
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${batchCount} documents.`);
  }

  console.log(`Processed ${totalProcessed} documents in total`);
  console.log(`Optimized ${count} styles in the styles collection`);

  // Write to JSON file
  const stylesArray = Array.from(stylesMap.values());
  fs.writeFileSync('optimized_styles.json', JSON.stringify(stylesArray, null, 2));
  console.log('Optimized styles data written to optimized_styles.json');
}

function safeParseFloat(value) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function safeParseInt(value) {
  const parsed = parseInt(value);
  return isNaN(parsed) ? 0 : parsed;
}

optimizeStylesCollection()
  .then(() => {
    console.log('Styles collection optimization complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error optimizing styles collection:', error);
    process.exit(1);
  });