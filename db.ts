import type { Photo, Profile } from './types';

const DB_NAME = 'PhotoAlbumDB';
const DB_VERSION = 5; // Increment version for schema change
const PHOTO_STORE = 'photos';
const PROFILE_STORE = 'profiles';

let db: IDBDatabase;

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

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;

            if (!dbInstance.objectStoreNames.contains(PHOTO_STORE)) {
                dbInstance.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
            }
            if (!dbInstance.objectStoreNames.contains(PROFILE_STORE)) {
                dbInstance.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
            }
        };
    });
};

export const addPhoto = async (photo: Photo): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PHOTO_STORE, 'readwrite');
        const store = transaction.objectStore(PHOTO_STORE);
        
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { url, ...storablePhoto } = photo;
        if (!storablePhoto.file) {
            return reject('Photo object must have a file to be stored.');
        }

        const request = store.add(storablePhoto);
        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error('Error adding photo:', request.error);
            reject(request.error);
        };
    });
};

export const getAllPhotos = async (): Promise<Photo[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PHOTO_STORE, 'readonly');
        const store = transaction.objectStore(PHOTO_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            console.error('Error getting all photos:', request.error);
            reject(request.error);
        };
    });
};

export const saveProfile = async (profile: Profile): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PROFILE_STORE, 'readwrite');
        const store = transaction.objectStore(PROFILE_STORE);
        
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { url, ...storableProfile } = profile;
        if (!storableProfile.file) {
            return reject('Profile object must have a file to be stored.');
        }

        const request = store.put(storableProfile); // Use put to overwrite existing
        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error('Error saving profile:', request.error);
            reject(request.error);
        };
    });
};

export const getAllProfiles = async (): Promise<Profile[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PROFILE_STORE, 'readonly');
        const store = transaction.objectStore(PROFILE_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            console.error('Error getting all profiles:', request.error);
            reject(request.error);
        };
    });
};
