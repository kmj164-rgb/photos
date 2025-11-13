export interface Photo {
  id: string;
  url: string;
  file?: File; // To handle the file object for storage
  name: string;
  date: Date;
  type: 'image' | 'video';
}

export type GroupedPhotos = Record<number, Record<string, Photo[]>>;

export interface Profile {
  id: number;
  url: string | null;
  file?: File; // To handle the file object for storage
}
