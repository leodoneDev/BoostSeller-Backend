
const admin = require("firebase-admin");

if (!admin.apps.length) {
  let serviceAccount;

  if (process.env.NODE_ENV === "production") {
    // In production (like Railway), decode base64 env variable
    const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(serviceAccountJson);
  } else {
    // In development (your local machine), read from file
    serviceAccount = require('./config/firebase-adminsdk.json');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const serviceAccount = require("./config/serviceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const sendPushNotification = async (fcmToken, data) => {
  await admin.messaging().send({
    token: fcmToken,
    notification: {
      title: '📢 New Lead Assigned',
      body: data.message,
    },
    data: {
      payload: JSON.stringify(data),
    },
  });
};

module.exports = { sendPushNotification };