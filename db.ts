// The data we store in IndexedDB. We store the File object itself.
interface StoredPhoto {
    id: string;
    file: File;
    name: string;
    date: Date;
    type: 'image' | 'video';
}

interface StoredProfile {
    id: number;
    file: File | null;
}

const DB_NAME = 'PhotoAlbumDB';
const DB_VERSION = 1;
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
            if (!dbInstance.objectStoreNames.contains(PROFILE_STORE)) {
                dbInstance.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
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
            // Provide default profiles if the store is empty
            if (request.result.length === 0) {
                 resolve([{ id: 1, file: null }, { id: 2, file: null }]);
            } else {
                 resolve(request.result);
            }
        };
        request.onerror = () => {
            console.error('Error getting profiles:', request.error);
            reject(request.error);
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
