const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

console.log('Script started');

// Initialize Firebase Admin SDK
const serviceAccount = require('./config/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

console.log('Firebase Admin SDK initialized');

const db = admin.firestore();

// Function to add jitter to our backoff
function jitter(delay) {
  return delay * (Math.random() + 0.5);
}

// Retry operation with exponential backoff and jitter
async function retryOperation(operation, maxRetries = 15, initialDelay = 1000) {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Error in retry operation (attempt ${i + 1}/${maxRetries}):`, error);
      if (i === maxRetries - 1) throw error;
      delay = jitter(Math.min(delay * 2, 60000)); // Cap at 1 minute
      console.log(`Retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Function to upload CSV data to Firestore in batches
async function uploadCSVToFirestore(filePath, collectionName, batchSize = 500) {
  console.log(`Starting to read file: ${filePath}`);
  const results = [];
  let totalRecords = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .on('error', (error) => {
        console.error(`Error reading file: ${error.message}`);
        reject(error);
      })
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
        totalRecords++;
        if (totalRecords % 10000 === 0) {
          console.log(`Read ${totalRecords} records so far`);
        }
      })
      .on('end', async () => {
        console.log(`Finished reading file. Total records: ${totalRecords}`);
        try {
          const totalBatches = Math.ceil(results.length / batchSize);
          console.log(`Starting upload process. Total batches: ${totalBatches}`);
          const startTime = Date.now();
          for (let i = 0; i < results.length; i += batchSize) {
            const batch = db.batch();
            const collectionRef = db.collection(collectionName);
            const chunk = results.slice(i, i + batchSize);

            chunk.forEach((record) => {
              const docRef = collectionRef.doc();
              batch.set(docRef, record);
            });

            const currentBatch = Math.floor(i / batchSize) + 1;
            console.log(`Committing batch ${currentBatch}/${totalBatches}`);
            const batchStartTime = Date.now();
            try {
              await retryOperation(() => batch.commit());
              const batchEndTime = Date.now();
              const batchTimeTaken = (batchEndTime - batchStartTime) / 1000; // Convert to seconds
              const progress = ((currentBatch / totalBatches) * 100).toFixed(2);
              const elapsedTime = (batchEndTime - startTime) / 1000;
              const estimatedTotalTime = (elapsedTime / currentBatch) * totalBatches;
              const remainingTime = estimatedTotalTime - elapsedTime;
              console.log(`Uploaded batch ${currentBatch}/${totalBatches} (${chunk.length} records) - ${progress}% complete. Time taken: ${batchTimeTaken.toFixed(2)} seconds`);
              console.log(`Estimated time remaining: ${(remainingTime / 3600).toFixed(2)} hours`);
              
              // Add a short delay between batches to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
              console.error(`Error committing batch ${currentBatch}/${totalBatches}:`, error);
              throw error;
            }
          }

          console.log(`Successfully uploaded ${totalRecords} records to Firestore.`);
          resolve();
        } catch (error) {
          console.error('Error uploading data to Firestore:', error);
          reject(error);
        }
      });
  });
}

// Function to verify uploaded data
async function verifyUploadedData(collectionName) {
  try {
    console.log(`Verifying uploaded data in collection '${collectionName}'`);
    const snapshot = await db.collection(collectionName).limit(5).get();
    console.log(`Sample of uploaded data (first 5 records) from collection '${collectionName}':`);
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());
    });
  } catch (error) {
    console.error('Error verifying uploaded data:', error);
  }
}

// Main function to run the script
async function main() {
  const args = process.argv.slice(2);
  const csvFilePath = args[0] || './your_data.csv';
  const collectionName = args[1] || 'embroidery_products';
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`File not found: ${csvFilePath}`);
    process.exit(1);
  }

  console.log(`Uploading data from ${path.basename(csvFilePath)} to collection '${collectionName}'`);
  
  try {
    await uploadCSVToFirestore(csvFilePath, collectionName);
    console.log('CSV upload completed successfully.');
    await verifyUploadedData(collectionName);
  } catch (error) {
    console.error('Error in main function:', error);
  } finally {
    // Ensure the Firebase Admin SDK is terminated
    await admin.app().delete();
    console.log('Script finished');
  }
}

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

main();