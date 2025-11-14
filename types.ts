export interface Photo {
  id: string;
  url: string;
  file?: File; // To handle the file object for storage
  name: string;
  date: Date;
  type: 'image' | 'video';
  size: number;
  lastModified: number;
}

// FIX: Changed GroupedPhotos to group by month string key, which is how it's used for rendering.
export type GroupedPhotos = Record<string, Photo[]>;

export interface Profile {
  id: number;
  url: string | null;
  file?: File; // To handle the file object for storage
}