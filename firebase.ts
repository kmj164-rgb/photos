// 🔥 [중요] Firebase 설정 가이드 🔥
// 이 애플리케이션이 정상적으로 작동하려면 Firebase 프로젝트 설정이 반드시 필요합니다.
// 아래 단계를 따라 설정해주세요.

// 1. Firebase 프로젝트 생성:
//    - https://console.firebase.google.com/ 로 이동하여 새 프로젝트를 만듭니다.

// 2. 웹 앱 등록:
//    - 프로젝트 설정(좌측 상단 톱니바퀴 아이콘) > 일반 탭으로 이동합니다.
//    - '내 앱' 섹션에서 웹 아이콘 (</>)을 클릭하여 새 웹 앱을 등록합니다.
//    - 앱 등록 후 'firebaseConfig' 객체를 복사하여 아래 `firebaseConfig` 변수에 붙여넣으세요.
const firebaseConfig = {
  apiKey: "AIzaSyCPWW0Ozoiv3uLNDo9n-45qQpEuVrGifaY",
  authDomain: "photos-e84a7.firebaseapp.com",
  projectId: "photos-e84a7",
  storageBucket: "photos-e84a7.appspot.com",
  messagingSenderId: "932980052597",
  appId: "1:932980052597:web:ca4079fed98a2bb7fade3c"
};

// 3. Authentication (인증) 설정:
//    - 왼쪽 메뉴에서 '빌드' > 'Authentication'으로 이동합니다.
//    - 'Sign-in method' 탭을 클릭합니다.
//    - 제공업체 목록에서 'Google'을 선택하고, '사용 설정' 스위치를 켠 후 저장합니다.

// 4. Firestore 데이터베이스 보안 규칙:
//    - 왼쪽 메뉴에서 '빌드' > 'Firestore Database'로 이동합니다.
//    - '규칙' 탭으로 이동하여, 모든 내용을 아래 코드로 교체하고 '게시'를 클릭합니다.
//
//      rules_version = '2';
//      service cloud.firestore {
//        match /databases/{database}/documents {
//          match /{document=**} {
//            // 로그인한 사용자만 데이터를 읽고 쓸 수 있도록 허용합니다.
//            allow read, write: if request.auth != null;
//          }
//        }
//      }

// 5. Storage 보안 규칙:
//    - 왼쪽 메뉴에서 '빌드' > 'Storage'로 이동합니다.
//    - '규칙' 탭으로 이동하여, 모든 내용을 아래 코드로 교체하고 '게시'를 클릭합니다.
//
//      rules_version = '2';
//      service firebase.storage {
//        match /b/{bucket}/o {
//          match /{allPaths=**} {
//            // 로그인한 사용자만 파일을 업로드/다운로드할 수 있도록 허용합니다.
//            allow read, write: if request.auth != null;
//          }
//        }
//      }


// Initialize Firebase using the global 'firebase' object from the CDN scripts in index.html
declare const firebase: any;

// Function to check if the Firebase configuration object is populated with essential values.
export const isFirebaseConfigured = (): boolean => {
    return !!(
        firebaseConfig.apiKey &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId &&
        firebaseConfig.storageBucket
    );
};

let firestore: any;
let storage: any;
let auth: any;

// Only initialize Firebase if the configuration is valid to prevent errors.
if (isFirebaseConfigured()) {
    let app: any;
    if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.app();
    }
    firestore = app.firestore();
    storage = app.storage();
    auth = app.auth();
} else {
    console.warn("Firebase is not configured. Please update `firebase.ts` with your project credentials.");
}

export { firestore, storage, auth };