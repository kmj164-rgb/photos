// 🔥 [중요] Firebase 설정 가이드 🔥
// 이 애플리케이션이 정상적으로 작동하려면 Firebase 프로젝트 설정이 반드시 필요합니다.
// 아래 단계를 따라 설정해주세요.

// 1. Firebase 프로젝트 생성:
//    - https://console.firebase.google.com/ 로 이동하여 새 프로젝트를 만듭니다.

// 2. 웹 앱 등록:
//    - 프로젝트 설정(좌측 상단 톱니바퀴 아이콘) > 일반 탭으로 이동합니다.
//    - '내 앱' 섹션에서 웹 아이콘 (</>)을 클릭하여 새 웹 앱을 등록합니다.
//    - 앱 등록 후 'firebaseConfig' 객체를 복사하여 아래 `firebaseConfig` 변수에 붙여넣으세요.
export const firebaseConfig = {
  apiKey: "AIzaSyCPWW0Ozoiv3uLNDo9n-45qQpEuVrGifaY",
  authDomain: "photos-e84a7.firebaseapp.com",
  projectId: "photos-e84a7",
  storageBucket: "photos-e84a7.firebasestorage.app",
  messagingSenderId: "932980052597",
  appId: "1:932980052597:web:ca4079fed98a2bb7fade3c",
  measurementId: "G-KT7ZY3XZCR"
};

// 3. Firestore 데이터베이스 설정:
//    - Firebase 콘솔의 왼쪽 메뉴에서 '빌드' > 'Firestore Database'로 이동합니다.
//    - '데이터베이스 만들기'를 클릭하고, '테스트 모드에서 시작'을 선택하여 생성합니다.
//    - ❗️ 중요: 기본 보안 규칙은 데이터 접근을 차단합니다. 아래 규칙으로 반드시 업데이트해야 앱이 작동합니다.
//    - '규칙' 탭에서 아래와 같이 규칙을 수정하고 게시하세요.
//
//      rules_version = '2';
//      service cloud.firestore {
//        match /databases/{database}/documents {
//          // 'photos' 컬렉션의 모든 문서에 대한 읽기/쓰기를 허용합니다.
//          match /photos/{photoId} {
//            allow read, write: if true;
//          }
//          // 'profiles' 컬렉션의 모든 문서에 대한 읽기/쓰기를 허용합니다.
//          match /profiles/{profileId} {
//            allow read, write: if true;
//          }
//        }
//      }

// 4. Storage 설정:
//    - 왼쪽 메뉴에서 '빌드' > 'Storage'로 이동합니다.
//    - '시작하기'를 클릭하고, 안내에 따라 기본 설정을 완료합니다.
//    - ❗️ 중요: 기본 보안 규칙은 파일 접근을 차단합니다. 아래 규칙으로 반드시 업데이트해야 앱이 작동합니다.
//    - Storage 화면에서 '규칙' 탭으로 이동하여 아래와 같이 규칙을 수정하고 게시하세요.
//
//      rules_version = '2';
//      service firebase.storage {
//        match /b/{bucket}/o {
//          // 'photos' 폴더 아래의 모든 파일에 대한 읽기/쓰기를 허용합니다.
//          match /photos/{allPaths=**} {
//            allow read, write: if true;
//          }
//          // 'profiles' 폴더 아래의 모든 파일에 대한 읽기/쓰기를 허용합니다.
//          match /profiles/{allPaths=**} {
//            allow read, write: if true;
//          }
//        }
//      }

// 5. [중요] Storage CORS 설정 (사진 다운로드 기능):
//    - 선택한 사진들을 ZIP 파일로 다운로드하는 기능이 정상 작동하려면 CORS 설정이 필요합니다.
//    - a. Google Cloud SDK (gcloud CLI)를 설치하세요: https://cloud.google.com/sdk/docs/install
//    - b. 터미널에서 `gcloud auth login` 명령어로 로그인합니다.
//    - c. `cors.json`이라는 파일을 만들고 아래 내용을 붙여넣으세요:
//      [
//        {
//          "origin": ["*"],
//          "method": ["GET"],
//          "maxAgeSeconds": 3600
//        }
//      ]
//    - d. 터미널에서 아래 명령어를 실행하여 CORS 설정을 적용하세요.
//       `gsutil cors set cors.json gs://YOUR_PROJECT_ID.appspot.com`
//       (YOUR_PROJECT_ID.appspot.com 부분은 Firebase Storage URL의 버킷 이름으로 변경하세요.)

// 설정이 플레이스홀더 값에서 변경되었는지 확인합니다.
export const isFirebaseConfigured = 
    firebaseConfig.apiKey !== "YOUR_API_KEY" && 
    firebaseConfig.projectId !== "YOUR_PROJECT_ID";


// Initialize Firebase using the global 'firebase' object from the CDN scripts in index.html
declare const firebase: any;

let app: any;
// 설정이 완료된 경우에만 Firebase를 초기화합니다.
if (isFirebaseConfigured) {
    if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.app();
    }
}

const firestore = isFirebaseConfigured ? app.firestore() : null;
const storage = isFirebaseConfigured ? app.storage() : null;

export { firestore, storage };