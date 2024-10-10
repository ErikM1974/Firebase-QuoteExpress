const admin = require('firebase-admin');
const serviceAccount = require('./config/serviceAccountKey.json');

console.log('Starting Firestore data retrieval test...');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testDataRetrieval() {
  try {
    console.log('Attempting to read documents from embroidery_orders collection...');
    const collectionRef = db.collection('embroidery_orders');
    const snapshot = await collectionRef.limit(5).get();

    if (snapshot.empty) {
      console.log('No matching documents.');
      return;
    }

    console.log('Retrieved documents:');
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());
    });

    // Get unique STYLE_No values
    const stylesSnapshot = await collectionRef.select('STYLE_No').get();
    const styles = new Set();
    stylesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.STYLE_No) {
        styles.add(data.STYLE_No);
      }
    });

    console.log('Unique STYLE_No values:', Array.from(styles));

    // Get colors for a specific STYLE_No
    if (styles.size > 0) {
      const sampleStyle = Array.from(styles)[0];
      console.log(`Fetching colors for STYLE_No: ${sampleStyle}`);
      const colorSnapshot = await collectionRef.where('STYLE_No', '==', sampleStyle).select('COLOR_NAME').get();
      const colors = new Set();
      colorSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.COLOR_NAME) {
          colors.add(data.COLOR_NAME);
        }
      });
      console.log(`Colors for STYLE_No ${sampleStyle}:`, Array.from(colors));
    }

    console.log('Data retrieval test completed successfully');
  } catch (error) {
    console.error('Error during Firestore data retrieval:', error);
  } finally {
    await admin.app().delete();
    console.log('Firebase Admin SDK terminated');
  }
}

testDataRetrieval();