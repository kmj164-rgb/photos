export interface Photo {
  id: string;
  url: string;
  storagePath: string; // To handle file deletion from Firebase Storage
  name: string;
  date: string; // ISO string format for Firestore compatibility
  type: 'image' | 'video';
}

export type GroupedPhotos = Record<number, Record<string, Photo[]>>;

export interface Profile {
  id: number;
  url: string | null;
  storagePath?: string; // To handle file deletion from Firebase Storage
}