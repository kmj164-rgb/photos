import type { StoredPhoto } from './types';

const DB_NAME = 'PhotoAlbumDB';
const DB_VERSION = 4; // DB 버전을 올려서 스키마 변경을 트리거합니다.
const PHOTO_STORE = 'photos';

let db: IDBDatabase;

// 데이터베이스 초기화 함수
export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Database error:', request.error);
            reject('데이터베이스를 여는 중 오류가 발생했습니다.');
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        // 버전이 변경될 때만 실행됩니다.
        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;

            // 'photos' 저장소가 없으면 생성합니다.
            if (!dbInstance.objectStoreNames.contains(PHOTO_STORE)) {
                dbInstance.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
            }
            
            // 이전 버전의 'profiles' 저장소가 있으면 삭제합니다.
            if (dbInstance.objectStoreNames.contains('profiles')) {
                dbInstance.deleteObjectStore('profiles');
            }
        };
    });
};

// 새 사진을 데이터베이스에 추가하는 함수
export const addPhoto = async (photo: StoredPhoto): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PHOTO_STORE, 'readwrite');
        const store = transaction.objectStore(PHOTO_STORE);
        const request = store.add(photo);
        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error('사진 추가 오류:', request.error);
            reject(request.error);
        };
    });
};

// 데이터베이스에서 모든 사진을 가져오는 함수
export const getAllPhotos = async (): Promise<StoredPhoto[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PHOTO_STORE, 'readonly');
        const store = transaction.objectStore(PHOTO_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            console.error('모든 사진 가져오기 오류:', request.error);
            reject(request.error);
        };
    });
};
