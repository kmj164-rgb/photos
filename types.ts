export interface Photo {
  id: string;
  url: string;
  name: string;
  date: Date;
  type: 'image' | 'video';
}

// Data structure for IndexedDB
export interface StoredPhoto {
    id: string;
    file: File;
    name: string;
    date: Date;
    type: 'image' | 'video';
}

export interface StoredProfile {
    id: number;
    file: File | null;
}

export type GroupedPhotos = Record<number, Record<string, Photo[]>>;

export interface Profile {
  id: number;
  url: string | null;
}