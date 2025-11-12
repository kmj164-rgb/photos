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
  apiKey: "YOUR_API_KEY", // 여기에 복사한 내용을 붙여넣으세요
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 3. Firestore 데이터베이스 설정:
//    - Firebase 콘솔의 왼쪽 메뉴에서 '빌드' > 'Firestore Database'로 이동합니다.
//    - '데이터베이스 만들기'를 클릭하고, '테스트 모드에서 시작'을 선택하여 생성합니다.
//    - ❗️ 경고: 테스트 모드는 30일 후에 만료되며, 누구나 데이터에 접근할 수 있습니다.
//    - 장기적인 사용을 위해서는 '규칙' 탭에서 아래와 같이 규칙을 수정하고 게시하세요.
//
//      rules_version = '2';
//      service cloud.firestore {
//        match /databases/{database}/documents {
//          match /{document=**} {
//            // 경고: 이 규칙은 모든 사용자의 읽기/쓰기를 허용합니다.
//            // 실제 프로덕션 환경에서는 인증을 구현하여 보안을 강화해야 합니다.
//            allow read, write: if true;
//          }
//        }
//      }

// 4. Storage 설정:
//    - 왼쪽 메뉴에서 '빌드' > 'Storage'로 이동합니다.
//    - '시작하기'를 클릭하고, 안내에 따라 기본 설정을 완료합니다.
//    - Storage 화면에서 '규칙' 탭으로 이동하여 아래와 같이 규칙을 수정하고 게시하세요.
//
//      rules_version = '2';
//      service firebase.storage {
//        match /b/{bucket}/o {
//          match /{allPaths=**} {
//            // 경고: 이 규칙은 모든 사용자의 파일 업로드/다운로드를 허용합니다.
//            // 실제 프로덕션 환경에서는 인증을 구현하여 보안을 강화해야 합니다.
//            allow read, write: if true;
//          }
//        }
//      }


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
