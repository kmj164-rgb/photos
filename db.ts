import type { Photo, Profile } from './types';

const DB_NAME = 'PhotoAlbumDB';
const DB_VERSION = 5;
const PHOTO_STORE = 'photos';
const PROFILE_STORE = 'profiles';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Database error:', request.error);
            reject(new Error('데이터베이스를 여는 중 오류가 발생했습니다.'));
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(PHOTO_STORE)) {
                db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(PROFILE_STORE)) {
                db.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
            }
        };
    });
    return dbPromise;
};

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export const addPhoto = async (photo: Photo): Promise<void> => {
    const { url, ...storablePhoto } = photo;
    if (!storablePhoto.file) {
        throw new Error('Photo object must have a file to be stored.');
    }
    const db = await getDB();
    const transaction = db.transaction(PHOTO_STORE, 'readwrite');
    const store = transaction.objectStore(PHOTO_STORE);
    store.add(storablePhoto);
    return transactionToPromise(transaction);
};

export const getAllPhotos = async (): Promise<Photo[]> => {
    const db = await getDB();
    const store = db.transaction(PHOTO_STORE, 'readonly').objectStore(PHOTO_STORE);
    return requestToPromise(store.getAll());
};

export const deletePhoto = async (id: string): Promise<void> => {
    const db = await getDB();
    const transaction = db.transaction(PHOTO_STORE, 'readwrite');
    const store = transaction.objectStore(PHOTO_STORE);
    store.delete(id);
    return transactionToPromise(transaction);
};

export const deletePhotos = async (ids: string[]): Promise<void> => {
    const db = await getDB();
    const transaction = db.transaction(PHOTO_STORE, 'readwrite');
    const store = transaction.objectStore(PHOTO_STORE);
    ids.forEach(id => store.delete(id));
    return transactionToPromise(transaction);
};

export const getPhotosByIds = async (ids: string[]): Promise<Photo[]> => {
    const db = await getDB();
    const transaction = db.transaction(PHOTO_STORE, 'readonly');
    const store = transaction.objectStore(PHOTO_STORE);
    
    const photos = await Promise.all(
        ids.map(id => requestToPromise<Photo | undefined>(store.get(id)))
    );
    
    return photos.filter((p): p is Photo => p !== undefined);
};

export const saveProfile = async (profile: Profile): Promise<void> => {
    const { url, ...storableProfile } = profile;
    if (!storableProfile.file) {
        throw new Error('Profile object must have a file to be stored.');
    }
    const db = await getDB();
    const transaction = db.transaction(PROFILE_STORE, 'readwrite');
    const store = transaction.objectStore(PROFILE_STORE);
    store.put(storableProfile);
    return transactionToPromise(transaction);
};

export const getAllProfiles = async (): Promise<Profile[]> => {
    const db = await getDB();
    const store = db.transaction(PROFILE_STORE, 'readonly').objectStore(PROFILE_STORE);
    return requestToPromise(store.getAll());
};