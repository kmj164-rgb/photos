// 🔥 Firebase 설정이 완료되었습니다. 🔥
// 이 앱은 이제 Firebase 클라우드와 연결되어 사진과 동영상을 영구적으로 저장합니다.
// 어떤 기기에서 접속하든 동일한 앨범을 볼 수 있습니다.

const firebaseConfig = {
  apiKey: "AIzaSyCPWW0Ozoiv3uLNDo9n-45qQpEuVrGifaY",
  authDomain: "photos-e84a7.firebaseapp.com",
  projectId: "photos-e84a7",
  storageBucket: "photos-e84a7.appspot.com",
  messagingSenderId: "932980052597",
  appId: "1:932980052597:web:ca4079fed98a2bb7fade3c"
};

// ❗️ 보안 규칙 확인 ❗️
// Firebase Console에서 Firestore Database와 Storage의 '규칙(Rules)' 탭을 확인하세요.
// 개발 중에는 아래와 같이 모든 접근을 허용할 수 있지만,
// 앱을 출시하기 전에는 반드시 인증된 사용자만 접근하도록 보안 규칙을 강화해야 합니다.
/*
  // Firestore Rules
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true; // ❗️ 프로덕션에서는: if request.auth != null;
      }
    }
  }

  // Storage Rules
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      match /{allPaths=**} {
        allow read, write: if true; // ❗️ 프로덕션에서는: if request.auth != null;
      }
    }
  }
*/


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