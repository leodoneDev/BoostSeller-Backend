require('dotenv').config();
const admin = require("firebase-admin");

// serviceAccount = require('./config/firebase-adminsdk.json');
const serviceAccountJson = Buffer.from(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64,
  'base64'
).toString('utf8');

const serviceAccount = JSON.parse(serviceAccountJson);
  
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


const sendPushNotification = async (fcmToken, title, message) => {
  await admin.messaging().send({
    token: fcmToken,
    notification: {
      title: title,
      body: message,
    },
  });
};

module.exports = { sendPushNotification };