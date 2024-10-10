const functions = require('firebase-functions');
const admin = require('firebase-admin');
const algoliasearch = require('algoliasearch');

admin.initializeApp();

const ALGOLIA_APP_ID = 'YOUR_ALGOLIA_APP_ID';
const ALGOLIA_ADMIN_KEY = 'YOUR_ALGOLIA_ADMIN_KEY';
const ALGOLIA_INDEX_NAME = 'YOUR_ALGOLIA_INDEX_NAME';

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const index = client.initIndex(ALGOLIA_INDEX_NAME);

exports.onProductCreated = functions.firestore
  .document('embroidery_products/{productId}')
  .onCreate((snap, context) => {
    const product = snap.data();
    product.objectID = context.params.productId;

    return index.saveObject(product);
  });

exports.onProductUpdated = functions.firestore
  .document('embroidery_products/{productId}')
  .onUpdate((change, context) => {
    const newData = change.after.data();
    newData.objectID = context.params.productId;

    return index.saveObject(newData);
  });

exports.onProductDeleted = functions.firestore
  .document('embroidery_products/{productId}')
  .onDelete((snap, context) => {
    return index.deleteObject(context.params.productId);
  });