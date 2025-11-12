import type { Photo, Profile } from './types';

const PHOTO_KEY = 'photos-storage';
const PROFILE_KEY = 'profiles-storage';

// Helper to convert File to Base64 Data URL
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

// Helper to convert Base64 Data URL to Blob
const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const base64Data = base64.split(',')[1];
    if (!base64Data) {
        return new Blob();
    }
    try {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    } catch (e) {
        console.error("Failed to decode base64 string:", e);
        return new Blob();
    }
};

// No-op for compatibility, localStorage doesn't need explicit initialization.
export const initDB = (): Promise<void> => Promise.resolve();

interface StoredPhoto extends Omit<Photo, 'file' | 'url'> {
    base64: string;
    mimeType: string;
}

interface StoredProfile extends Omit<Profile, 'file' | 'url'> {
    base64: string | null;
    mimeType: string | null;
}

const getAllStoredPhotos = (): StoredPhoto[] => {
    try {
        const data = localStorage.getItem(PHOTO_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to parse photos from localStorage", e);
        return [];
    }
};

const getAllStoredProfiles = (): StoredProfile[] => {
    try {
        const data = localStorage.getItem(PROFILE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to parse profiles from localStorage", e);
        return [];
    }
};

export const addPhoto = async (photo: Photo): Promise<void> => {
    if (!photo.file) {
        throw new Error('Photo object must have a file to be stored.');
    }

    const photos = getAllStoredPhotos();
    const base64 = await fileToBase64(photo.file);

    const newStoredPhoto: StoredPhoto = {
        id: photo.id,
        name: photo.name,
        date: photo.date,
        type: photo.type,
        base64: base64,
        mimeType: photo.file.type,
    };

    photos.push(newStoredPhoto);
    try {
        localStorage.setItem(PHOTO_KEY, JSON.stringify(photos));
    } catch (e) {
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
            alert('저장 공간이 부족합니다. 일부 사진/동영상을 삭제하거나 브라우저 저장 공간을 늘려주세요.');
        } else {
             alert('사진을 저장하는 중 오류가 발생했습니다.');
        }
        console.error('Error adding photo to localStorage:', e);
        throw e;
    }
};

export const getAllPhotos = async (): Promise<Photo[]> => {
    const storedPhotos = getAllStoredPhotos();
    return storedPhotos.map(p => {
        const blob = base64ToBlob(p.base64, p.mimeType);
        const file = new File([blob], p.name, { type: p.mimeType, lastModified: new Date(p.date).getTime() });
        return {
            ...p,
            url: URL.createObjectURL(file),
            file: file,
        };
    });
};

export const saveProfile = async (profile: Profile): Promise<void> => {
    if (!profile.file) {
        throw new Error('Profile object must have a file to be stored.');
    }
    
    const profiles = getAllStoredProfiles();
    const base64 = await fileToBase64(profile.file);

    const newStoredProfile: StoredProfile = {
        id: profile.id,
        base64: base64,
        mimeType: profile.file.type,
    };

    const existingIndex = profiles.findIndex(p => p.id === profile.id);
    if (existingIndex > -1) {
        profiles[existingIndex] = newStoredProfile;
    } else {
        profiles.push(newStoredProfile);
    }
    
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    } catch (e) {
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
            alert('저장 공간이 부족합니다.');
        } else {
            alert('프로필을 저장하는 중 오류가 발생했습니다.');
        }
        console.error('Error saving profile to localStorage:', e);
        throw e;
    }
};


export const getAllProfiles = async (): Promise<Profile[]> => {
    const storedProfiles = getAllStoredProfiles();
    return storedProfiles.map(p => {
        if (!p.base64 || !p.mimeType) {
            return { id: p.id, url: null };
        }
        const blob = base64ToBlob(p.base64, p.mimeType);
        const file = new File([blob], `profile-${p.id}`, { type: p.mimeType });
        return {
            id: p.id,
            url: URL.createObjectURL(file),
            file: file
        };
    });
};