import type { Photo, Profile } from './types';
import { firestore, storage } from './firebase';

const PHOTO_STORE = 'photos';
const PROFILE_STORE = 'profiles';

export const addPhoto = async (photo: Photo): Promise<Photo> => {
    if (!firestore || !storage) throw new Error("Firebase is not configured.");
    if (!photo.file) {
        throw new Error('Photo object must have a file to be stored.');
    }

    const filePath = `${PHOTO_STORE}/${Date.now()}_${photo.file.name}`;
    const storageRef = storage.ref(filePath);
    await storageRef.put(photo.file);
    const url = await storageRef.getDownloadURL();

    const photoCollection = firestore.collection(PHOTO_STORE);
    
    const storablePhotoData = {
        name: photo.name,
        date: new Date(photo.date),
        type: photo.type,
        url: url,
    };
    
    const docRef = await photoCollection.add(storablePhotoData);

    return {
        ...photo,
        id: docRef.id,
        url: url,
        file: undefined,
    };
};

export const getAllPhotos = async (): Promise<Photo[]> => {
    if (!firestore) return [];
    const snapshot = await firestore.collection(PHOTO_STORE).orderBy('date', 'desc').get();
    return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            url: data.url,
            date: data.date.toDate(),
            type: data.type,
        } as Photo;
    });
};

export const deletePhotos = async (photosToDelete: Photo[]): Promise<void> => {
    if (!firestore || !storage) throw new Error("Firebase is not configured.");
    const batch = firestore.batch();

    const deletePromises = photosToDelete.map(async (photo) => {
        const docRef = firestore.collection(PHOTO_STORE).doc(photo.id);
        batch.delete(docRef);

        if (photo.url) {
            try {
                const storageRef = storage.refFromURL(photo.url);
                await storageRef.delete();
            } catch (error) {
                console.error(`Failed to delete file from storage for photo ${photo.id}:`, error);
            }
        }
    });

    await Promise.all(deletePromises);
    await batch.commit();
};

export const saveProfile = async (profile: Profile): Promise<Profile> => {
    if (!firestore || !storage) throw new Error("Firebase is not configured.");
    if (!profile.file) {
        throw new Error('Profile object must have a file to be stored.');
    }

    const filePath = `${PROFILE_STORE}/profile_${profile.id}`;
    const storageRef = storage.ref(filePath);
    await storageRef.put(profile.file);
    const url = await storageRef.getDownloadURL();

    await firestore.collection(PROFILE_STORE).doc(String(profile.id)).set({
        id: profile.id,
        url: url,
    }, { merge: true });

    return { ...profile, url, file: undefined };
};

export const getAllProfiles = async (): Promise<Profile[]> => {
    if (!firestore) return [];
    const snapshot = await firestore.collection(PROFILE_STORE).get();
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map((doc: any) => doc.data() as Profile);
};