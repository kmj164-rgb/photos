export interface Photo {
  id: string;
  url: string;
  name: string;
  date: Date;
  type: 'image' | 'video';
}

export type GroupedPhotos = Record<number, Record<string, Photo[]>>;

export interface Profile {
  id: number;
  url: string | null;
}
