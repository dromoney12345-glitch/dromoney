importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCD4gYLJeZR7BaOmYWvFIxoegyTHRXBOrY",
  authDomain: "dromoney-1d6df.firebaseapp.com",
  projectId: "dromoney-1d6df",
  storageBucket: "dromoney-1d6df.firebasestorage.app",
  messagingSenderId: "277091263571",
  appId: "1:277091263571:web:a9e8bbca80f91039ac52a6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  // Firebase SDK automatically shows notifications if payload.notification exists.
  // Only manually show notification if it's a data-only payload.
  if (!payload.notification) {
    const notificationTitle = payload.data?.title || 'DroMoney Notification';
    const notificationOptions = {
      body: payload.data?.body || 'You have a new message',
      icon: '/logo.png',
      badge: '/logo.png',
      data: payload.data
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});
