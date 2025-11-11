import type { StoredPhoto, StoredProfile } from './types';

const DB_NAME = 'PhotoAlbumDB';
const DB_VERSION = 2; // Incremented version to trigger upgrade for all users
const PHOTO_STORE = 'photos';
const PROFILE_STORE = 'profiles';

let db: IDBDatabase;

// Function to initialize the database
export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        // If db is already initialized, return it
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Database error:', request.error);
            reject('Error opening database');
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        // This event is only fired when the version changes
        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            if (!dbInstance.objectStoreNames.contains(PHOTO_STORE)) {
                dbInstance.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
            }
            
            let profileStore;
            if (!dbInstance.objectStoreNames.contains(PROFILE_STORE)) {
                profileStore = dbInstance.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
                 // If creating for the first time, add placeholders
                profileStore.add({ id: 1, file: null });
                profileStore.add({ id: 2, file: null });
            } else {
                // If store exists, this is an upgrade. Ensure placeholders exist without overwriting.
                profileStore = (event.target as IDBOpenDBRequest).transaction!.objectStore(PROFILE_STORE);
                profileStore.get(1).onsuccess = (e) => {
                    if (!(e.target as IDBRequest).result) {
                        profileStore.add({ id: 1, file: null });
                    }
                };
                profileStore.get(2).onsuccess = (e) => {
                    if (!(e.target as IDBRequest).result) {
                        profileStore.add({ id: 2, file: null });
                    }
                };
            }
        };
    });
};

// Add a new photo to the database
export const addPhoto = async (photo: StoredPhoto): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PHOTO_STORE, 'readwrite');
        const store = transaction.objectStore(PHOTO_STORE);
        const request = store.add(photo);
        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error('Error adding photo:', request.error);
            reject(request.error);
        };
    });
};

// Retrieve all photos from the database
export const getAllPhotos = async (): Promise<StoredPhoto[]> => {
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

// Retrieve profiles from the database
export const getProfiles = async (): Promise<StoredProfile[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PROFILE_STORE, 'readonly');
        const store = transaction.objectStore(PROFILE_STORE);
        const request = store.getAll();
        request.onsuccess = () => {
            const results = request.result || [];
            // Ensure we always return two profiles to prevent rendering crashes
            const profile1 = results.find(p => p.id === 1) || { id: 1, file: null };
            const profile2 = results.find(p => p.id === 2) || { id: 2, file: null };
            resolve([profile1, profile2]);
        };
        request.onerror = () => {
            console.error('Error getting profiles:', request.error);
             // On failure, return defaults to prevent UI crash
            resolve([
                { id: 1, file: null },
                { id: 2, file: null },
            ]);
        };
    });
};

// Update a profile picture in the database
export const updateProfile = async (id: number, file: File): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PROFILE_STORE, 'readwrite');
        const store = transaction.objectStore(PROFILE_STORE);
        const request = store.put({ id, file });
        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error('Error updating profile:', request.error);
            reject(request.error);
        };
    });
};