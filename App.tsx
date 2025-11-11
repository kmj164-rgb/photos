import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { Photo, GroupedPhotos, StoredPhoto } from './types';
import PhotoModal from './components/PhotoModal';
import Spinner from './components/Spinner';
import { initDB, getAllPhotos, addPhoto } from './db';

declare const EXIF: any;

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2000 + 1 }, (_, i) => CURRENT_YEAR - i);

// Base64 문자열을 사용하여 프로필 이미지를 직접 코드에 포함시킵니다.
// 이렇게 하면 데이터베이스 오류와 관계없이 항상 프로필 사진이 표시됩니다.
const PROFILE_IMAGE_1 = `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAJEA7kDASIAAhEBAxEB/8QAGwABAQACAwEAAAAAAAAAAAAAAAEFBgIDBAf/xABMEAABAwMDAgMFBgMHAwIDCAMBAAIDBBEFEiExQQYTUWEicYEUMpGhscFCUtEHIzNSYnLh8CRDU4KSorLC8RaTo8IWJSY0c5PT0//EABoBAQEBAQEBAQAAAAAAAAAAAAABAgMEBQb/xAAoEQEBAAIBBAICAgICAwEAAAAAAQIRAzEEEiETBUEiUTJhcRQjQpH/2gAMAwEAAhEDEQA/APFhCEAihCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCE-L/g/9k=`;
const PROFILE_IMAGE_2 = `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAK5A7gDASIAAhEBAxEB/8QAGwABAQACAwEAAAAAAAAAAAAAAAEFBgIDBAf/xAA9EAABAwIDBgQDBgQGAgMAAAABAAIDBBEFEiEGEzFBUWEHInGBFDJCkaGxwULR4fAjM1JicoKS8RUkY4Oi/8QAGwEBAQADAQEBAAAAAAAAAAAAAAECAwQFBgf/xAAoEQEBAAICAgICAwEBAQEBAAAAAQIRAzEEEiETQQUiUTJhcRQjQpH/2gAMAwEAAhEDEQA/AP2UUIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQg-ccx5UUIQgxCEIAEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQgEIQg-ccx5d`;

// 앱 상태를 위한 포토 타입 정의 (URL 포함)
type AppPhoto = Photo & { file: File };

export const App: React.FC = () => {
    const [allPhotos, setAllPhotos] = useState<AppPhoto[]>([]);
    const [groupedPhotos, setGroupedPhotos] = useState<GroupedPhotos>({});
    const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [modalPhotos, setModalPhotos] = useState<Photo[]>([]);
    const [currentModalIndex, setCurrentModalIndex] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const existingPhotoIds = useMemo(() => new Set(allPhotos.map(p => p.id)), [allPhotos]);

    const loadPhotos = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            await initDB();
            const storedPhotos = await getAllPhotos();
            const appPhotos = storedPhotos.map(p => ({
                ...p,
                url: URL.createObjectURL(p.file)
            }));
            setAllPhotos(appPhotos);
        } catch (err) {
            console.error('사진 로딩 실패:', err);
            setError('사진을 불러오는 데 실패했습니다. 페이지를 새로고침 해주세요.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPhotos();
    }, [loadPhotos]);

    useEffect(() => {
        const newGroupedPhotos: GroupedPhotos = {};
        allPhotos.forEach(photo => {
            const year = photo.date.getFullYear();
            const month = photo.date.getMonth();
            if (!newGroupedPhotos[year]) {
                newGroupedPhotos[year] = {};
            }
            if (!newGroupedPhotos[year][MONTHS[month]]) {
                newGroupedPhotos[year][MONTHS[month]] = [];
            }
            newGroupedPhotos[year][MONTHS[month]].push(photo);
        });
        
        // 날짜 순으로 정렬
        for (const year in newGroupedPhotos) {
            for (const month in newGroupedPhotos[year]) {
                newGroupedPhotos[year][month].sort((a, b) => b.date.getTime() - a.date.getTime());
            }
        }
        setGroupedPhotos(newGroupedPhotos);
    }, [allPhotos]);

    const getFileDate = (file: File): Promise<Date> => {
        return new Promise((resolve) => {
            if (file.type.startsWith('image/')) {
                EXIF.getData(file, function(this: any) {
                    const exifDate = EXIF.getTag(this, "DateTimeOriginal");
                    if (exifDate) {
                        const [datePart, timePart] = exifDate.split(' ');
                        const [year, month, day] = datePart.split(':');
                        const [hours, minutes, seconds] = timePart.split(':');
                        resolve(new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds)));
                    } else {
                        resolve(new Date(file.lastModified));
                    }
                });
            } else {
                resolve(new Date(file.lastModified));
            }
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setLoading(true);
        const newPhotos: AppPhoto[] = [];

        for (const file of Array.from(files)) {
            const fileId = `${file.name}-${file.size}-${file.lastModified}`;

            if (existingPhotoIds.has(fileId)) {
                console.log(`중복 파일 건너뛰기: ${file.name}`);
                continue;
            }

            const date = await getFileDate(file);
            const type = file.type.startsWith('image/') ? 'image' : 'video';

            const newPhoto: StoredPhoto = { id: fileId, file, name: file.name, date, type };
            
            try {
                await addPhoto(newPhoto);
                newPhotos.push({ ...newPhoto, url: URL.createObjectURL(file) });
            } catch (error) {
                console.error('사진 저장 실패:', file.name, error);
            }
        }

        if (newPhotos.length > 0) {
            setAllPhotos(prev => [...prev, ...newPhotos]);
        }
        setLoading(false);

        // 파일 입력 초기화
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const openModal = (year: number, month: string, photoIndex: number) => {
        const photosInMonth = groupedPhotos[year]?.[month] || [];
        setModalPhotos(photosInMonth);
        setCurrentModalIndex(photoIndex);
    };

    const closeModal = () => {
        setCurrentModalIndex(null);
        setModalPhotos([]);
    };

    const navigateModal = (newIndex: number) => {
        setCurrentModalIndex(newIndex);
    };

    const currentPhotos = groupedPhotos[selectedYear]?.[MONTHS[selectedMonth]] || [];

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans">
            <header className="sticky top-0 bg-slate-800 bg-opacity-80 backdrop-blur-md shadow-lg z-10 p-4">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-3">
                            <img src={PROFILE_IMAGE_1} alt="Profile 1" className="w-16 h-16 rounded-full border-2 border-sky-400 object-cover" />
                            <img src={PROFILE_IMAGE_2} alt="Profile 2" className="w-16 h-16 rounded-full border-2 border-pink-400 object-cover" />
                        </div>
                        <h1 className="text-3xl font-bold text-sky-300 tracking-wider">두 아들을 둔 행복한 집</h1>
                    </div>

                    <label htmlFor="file-upload" className="cursor-pointer bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105">
                        사진/동영상 추가
                    </label>
                    <input id="file-upload" type="file" multiple accept="image/*,video/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-8">
                <div className="bg-slate-800 rounded-xl p-4 mb-8 shadow-inner">
                    <div className="flex flex-wrap justify-center items-center gap-4">
                        <div className="flex items-center gap-2">
                             <label htmlFor="year-select" className="text-slate-300 font-semibold">년도:</label>
                             <select id="year-select" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-slate-700 border border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-sky-500">
                                {YEARS.map(year => <option key={year} value={year}>{year}년</option>)}
                            </select>
                        </div>
                         <div className="flex items-center gap-2">
                             <label htmlFor="month-select" className="text-slate-300 font-semibold">월:</label>
                            <select id="month-select" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-700 border border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-sky-500">
                                {MONTHS.map((month, index) => <option key={month} value={index}>{month}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <Spinner />
                ) : error ? (
                     <div className="text-center text-red-400 text-xl p-8">{error}</div>
                ) : currentPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {currentPhotos.map((photo, index) => (
                            <div
                                key={photo.id}
                                className="relative group cursor-pointer aspect-square overflow-hidden rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-300"
                                onClick={() => openModal(selectedYear, MONTHS[selectedMonth], index)}
                            >
                                {photo.type === 'video' ? (
                                    <>
                                        <video src={photo.url} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                                            <svg className="w-16 h-16 text-white opacity-80" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                                        </div>
                                    </>
                                ) : (
                                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <p className="font-semibold truncate">{photo.name}</p>
                                    <p className="text-xs text-slate-300">{photo.date.toLocaleDateString('ko-KR')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-slate-400 text-xl p-8">
                        <p>{selectedYear}년 {MONTHS[selectedMonth]}에 해당하는 사진이나 동영상이 없습니다.</p>
                        <p className="mt-2 text-base">다른 날짜를 선택하거나 새로운 파일을 추가해보세요.</p>
                    </div>
                )}
            </main>

            {currentModalIndex !== null && (
                <PhotoModal
                    photos={modalPhotos}
                    currentIndex={currentModalIndex}
                    onClose={closeModal}
                    onNavigate={navigateModal}
                />
            )}
        </div>
    );
};
