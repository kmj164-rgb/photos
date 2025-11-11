export interface Photo {
  id: string;
  url: string;
  name: string;
  date: Date;
  type: 'image' | 'video';
}

// IndexedDB에 저장될 데이터 구조
export interface StoredPhoto {
    id: string;
    file: File;
    name: string;
    date: Date;
    type: 'image' | 'video';
}

export type GroupedPhotos = Record<number, Record<string, Photo[]>>;
