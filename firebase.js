
const admin = require("firebase-admin");

serviceAccount = require('./config/firebase-adminsdk.json');
  
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
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