import { firestore, storage } from './firebase';
import type { Photo, Profile } from './types';

const photosCollection = firestore.collection('photos');
const profilesCollection = firestore.collection('profiles');

export const addPhoto = async (photo: Photo): Promise<Photo> => {
    if (!photo.file) {
        throw new Error('Photo object must have a file to be stored.');
    }

    const storageRef = storage.ref();
    const photoRef = storageRef.child(`photos/${photo.id}/${photo.name}`);
    
    await photoRef.put(photo.file);
    const downloadURL = await photoRef.getDownloadURL();

    const photoDataForFirestore: Omit<Photo, 'file'> = {
        id: photo.id,
        name: photo.name,
        date: photo.date,
        type: photo.type,
        url: downloadURL,
    };
    
    await photosCollection.doc(photo.id).set(photoDataForFirestore);
    
    // Return the photo object with the cloud URL and without the file blob
    return photoDataForFirestore as Photo;
};

export const getAllPhotos = async (): Promise<Photo[]> => {
    const snapshot = await photosCollection.orderBy('date', 'desc').get();
    const photos: Photo[] = [];
    snapshot.forEach((doc: any) => {
        const data = doc.data();
        // Firestore stores Date as Timestamp, so we need to convert it back
        photos.push({ ...data, date: data.date.toDate() } as Photo);
    });
    return photos;
};

export const saveProfile = async (profile: Profile): Promise<Profile> => {
    if (!profile.file) {
        throw new Error('Profile object must have a file to be stored.');
    }
    
    const storageRef = storage.ref();
    const profileRef = storageRef.child(`profiles/profile-${profile.id}`);

    await profileRef.put(profile.file);
    const downloadURL = await profileRef.getDownloadURL();

    const profileData = {
        id: profile.id,
        url: downloadURL,
    };

    await profilesCollection.doc(String(profile.id)).set(profileData);
    
    return { ...profile, url: downloadURL };
};


export const getAllProfiles = async (): Promise<Profile[]> => {
    const snapshot = await profilesCollection.get();
    const profiles: Profile[] = [];
    snapshot.forEach((doc: any) => {
        profiles.push(doc.data() as Profile);
    });
    return profiles;
};
