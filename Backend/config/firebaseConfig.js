
var admin = require("firebase-admin");
require('dotenv').config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  
});

const db = admin.firestore();
const adminAuth = admin.auth();

module.exports = { admin,db ,adminAuth};
