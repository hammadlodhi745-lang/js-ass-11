import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDNSwC2REH5FniBgQgGcmcqLQGs-dD8Yqo",
  authDomain: "my-chat-app-d3531.firebaseapp.com",
  projectId: "my-chat-app-d3531",
  storageBucket: "my-chat-app-d3531.firebasestorage.app",
  messagingSenderId: "659264686302",
  appId: "1:659264686302:web:7955783513b1f533dd5a4f",
  measurementId: "G-E97RPTB2C3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
