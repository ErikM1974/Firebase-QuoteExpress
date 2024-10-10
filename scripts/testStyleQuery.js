#!/usr/bin/env node

require('dotenv').config(); // Load environment variables
const { db } = require('../src/firebase');
const { collection, getDocs, query, where, orderBy, limit } = require('firebase/firestore');

const testLoadStyleOptions = async (searchTerm) => {
  try {
    console.log('Searching for styles with input:', searchTerm);

    const stylesRef = collection(db, 'styles');
    console.log('Styles collection reference:', stylesRef);

    const styleQuery = query(
      stylesRef,
      orderBy('__name__'),
      where('__name__', '>=', searchTerm),
      where('__name__', '<=', searchTerm + '\uf8ff'),
      limit(20)
    );
    console.log('Style query:', styleQuery);

    const querySnapshot = await getDocs(styleQuery);
    console.log('Query snapshot size:', querySnapshot.size);

    const styles = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const styleNo = doc.id;
      styles.push({
        id: styleNo,
        data: data,
      });
      console.log('Document ID:', styleNo, 'Data:', data);
    });

    console.log('Styles:', styles);
  } catch (err) {
    console.error('Error testing query:', err);
  }
};

// If this script is run directly, execute the test function
if (require.main === module) {
  const searchTerm = process.argv[2] || 'J790';
  testLoadStyleOptions(searchTerm)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = testLoadStyleOptions;