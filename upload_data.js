const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const { parse } = require('csv-parse');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;
  fs.appendFileSync('upload_log.txt', logMessage);
  console.log(message);
}

log('Starting the upload process...');

// Initialize Firebase Admin SDK
try {
  log('Attempting to load service account...');
  const serviceAccount = require('./config/serviceAccountKey.json');
  log('Service account loaded successfully');
  
  log('Initializing Firebase Admin SDK...');
  initializeApp({
    credential: cert(serviceAccount)
  });
  log('Firebase Admin SDK initialized successfully');
} catch (error) {
  log(`Error initializing Firebase Admin SDK: ${error.stack}`);
  process.exit(1);
}

const db = getFirestore();

let rowCount = 0;
let successCount = 0;
let errorCount = 0;

// Verify Firestore connection with increased timeout
log('Verifying Firestore connection...');
const connectionTimeout = setTimeout(() => {
  log('Firestore connection verification timed out after 60 seconds');
  process.exit(1);
}, 60000); // Increased to 60 seconds

db.collection('test').add({ test: 'connection' })
  .then(() => {
    clearTimeout(connectionTimeout);
    log('Firestore connection verified successfully');
    startUpload();
  })
  .catch((error) => {
    clearTimeout(connectionTimeout);
    log(`Error verifying Firestore connection: ${error.stack}`);
    log(`Error code: ${error.code}`);
    log(`Error message: ${error.message}`);
    if (error.details) {
      log(`Error details: ${error.details}`);
    }
    process.exit(1);
  });

function startUpload() {
  log('Starting CSV upload process...');
  
  // Check if CSV file exists
  if (!fs.existsSync('your_data.csv')) {
    log('Error: your_data.csv file not found in the current directory');
    process.exit(1);
  }
  
  // Read and parse the CSV file
  fs.createReadStream('your_data.csv')
    .pipe(parse({ columns: true, skip_empty_lines: true }))
    .on('data', async (row) => {
      rowCount++;
      try {
        // Process each row and upload to Firestore
        await db.collection('embroidery_items').add({
          UNIQUE_KEY: row.UNIQUE_KEY,
          STYLE_No: row.STYLE_No,
          COLOR_NAME: row.COLOR_NAME,
          PRODUCT_TITLE: row.PRODUCT_TITLE,
          Price_2_5: parseFloat(row.Price_2_5),
          Price_6_11: parseFloat(row.Price_6_11),
          Price_12_23: parseFloat(row.Price_12_23),
          Price_24_47: parseFloat(row.Price_24_47),
          Price_48_71: parseFloat(row.Price_48_71),
          Price_72_plus: parseFloat(row.Price_72_plus),
          SIZE: row.SIZE,
          Surcharge: parseFloat(row.Surcharge),
          SizeOrder: parseInt(row.SizeOrder),
          CapPrice_2_23: row.CapPrice_2_23 ? parseFloat(row.CapPrice_2_23) : null,
          CapPrice_24_143: row.CapPrice_24_143 ? parseFloat(row.CapPrice_24_143) : null,
          CapPrice_144_plus: row.CapPrice_144_plus ? parseFloat(row.CapPrice_144_plus) : null,
          Cap_NoCap: row.Cap_NoCap
        });
        successCount++;
        if (successCount % 10 === 0) {
          log(`Processed ${successCount} rows successfully`);
        }
      } catch (error) {
        errorCount++;
        log(`Error adding document for ${row.UNIQUE_KEY}: ${error.stack}`);
      }
    })
    .on('end', () => {
      log('CSV file processing completed');
      log(`Total rows processed: ${rowCount}`);
      log(`Successful uploads: ${successCount}`);
      log(`Errors encountered: ${errorCount}`);
      process.exit(0);
    })
    .on('error', (error) => {
      log(`Error processing CSV file: ${error.stack}`);
      process.exit(1);
    });

  log('CSV processing initiated. Please wait for completion...');
}

process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});