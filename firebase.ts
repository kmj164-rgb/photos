// 1. Go to https://console.firebase.google.com/ and create a new project.
// 2. In your project, go to Project Settings (gear icon) -> General.
// 3. Under "Your apps", click the web icon (</>) to register a new web app.
// 4. After registration, you'll see a firebaseConfig object. Copy its content and paste it below.
const firebaseConfig = {
  apiKey: "AIzaSyCPWW0Ozoiv3uLNDo9n-45qQpEuVrGifaY",
  authDomain: "photos-e84a7.firebaseapp.com",
  projectId: "photos-e84a7",
  storageBucket: "photos-e84a7.appspot.com",
  messagingSenderId: "932980052597",
  appId: "1:932980052597:web:ca4079fed98a2bb7fade3c",
  measurementId: "G-KT7ZY3XZCR"
};

// Initialize Firebase using the global 'firebase' object from the CDN scripts in index.html
declare const firebase: any;

let app: any;
if (!firebase.apps.length) {
  app = firebase.initializeApp(firebaseConfig);
} else {
  app = firebase.app();
}

const firestore = app.firestore();
const storage = app.storage();

export { firestore, storage };
