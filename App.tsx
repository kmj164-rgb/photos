
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { Photo, Profile, GroupedPhotos } from './types';
import PhotoModal from './components/PhotoModal';
import Spinner from './components/Spinner';
import { getAllPhotos, addPhoto, getAllProfiles, saveProfile, deletePhotos } from './db';
import { isFirebaseConfigured, firebaseConfig } from './firebase';

declare const EXIF: any;
declare const JSZip: any;

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const YEARS = Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => new Date().getFullYear() - i);
const CONCURRENT_UPLOADS = 5;

const getExifDate = (file: File): Promise<Date> => {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve(new Date(file.lastModified));
            return;
        }
        EXIF.getData(file as any, function(this: any) {
            const exifDate = EXIF.getTag(this, "DateTimeOriginal");
            if (exifDate) {
                const parts = exifDate.split(' ');
                const dateParts = parts[0].split(':');
                const timeParts = parts.length > 1 ? parts[1].split(':') : ['0', '0', '0'];
                resolve(new Date(
                    parseInt(dateParts[0], 10),
                    parseInt(dateParts[1], 10) - 1,
                    parseInt(dateParts[2], 10),
                    parseInt(timeParts[0], 10),
                    parseInt(timeParts[1], 10),
                    parseInt(timeParts[2], 10)
                ));
            } else {
                resolve(new Date(file.lastModified));
            }
        });
    });
};

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const CheckCircleIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);

const App: React.FC = () => {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
    const [isDragOver, setIsDragOver] = useState(false);
    const [currentYear, setCurrentYear] = useState<number | 'all'>(new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState<number | 'all'>('all');
    const [modalState, setModalState] = useState<{ isOpen: boolean; index: number | null }>({ isOpen: false, index: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadPhotos = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedPhotos = await getAllPhotos();
            setPhotos(fetchedPhotos);
        } catch (err) {
            console.error(err);
            setError('사진을 불러오는 데 실패했습니다. Firebase 설정을 확인해주세요.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadProfiles = useCallback(async () => {
        try {
            const fetchedProfiles = await getAllProfiles();
            const initialProfiles = Array.from({ length: 5 }, (_, i) => {
                const found = fetchedProfiles.find(p => p.id === i);
                return found || { id: i, url: null };
            });
            setProfiles(initialProfiles);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        if (isFirebaseConfigured) {
            loadPhotos();
            loadProfiles();
        } else {
            setIsLoading(false);
        }
    }, [loadPhotos, loadProfiles]);

    const processFiles = useCallback(async (files: File[]) => {
        setIsUploading(true);
        setTotalFiles(files.length);
        setUploadProgress(0);
        
        let completed = 0;

        const uploadQueue = Array.from(files);

        const worker = async () => {
            while(uploadQueue.length > 0) {
                const file = uploadQueue.shift();
                if(!file) continue;

                const date = await getExifDate(file);
                const newPhotoData: Photo = {
                    id: '', // Temp ID
                    file: file,
                    url: URL.createObjectURL(file),
                    name: file.name,
                    date: date,
                    type: file.type.startsWith('image/') ? 'image' : 'video',
                };
                
                try {
                    const savedPhoto = await addPhoto(newPhotoData);
                    setPhotos(prev => [savedPhoto, ...prev]);
                } catch (err) {
                    console.error('Upload failed for', file.name, err);
                    setError(`'${file.name}' 업로드 실패`);
                } finally {
                    completed++;
                    setUploadProgress(completed);
                }
            }
        };

        const workers = Array(CONCURRENT_UPLOADS).fill(null).map(() => worker());
        await Promise.all(workers);

        setIsUploading(false);
    }, [loadPhotos]);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            processFiles(Array.from(files));
        }
    }, [processFiles]);
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(false);
        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            processFiles(Array.from(files));
        }
    }, [processFiles]);

    const filteredPhotos = useMemo(() => {
        return photos.filter(photo => {
            const photoDate = new Date(photo.date);
            const yearMatch = currentYear === 'all' || photoDate.getFullYear() === currentYear;
            const monthMatch = currentMonth === 'all' || photoDate.getMonth() === currentMonth;
            const searchMatch = photo.name.toLowerCase().includes(searchTerm.toLowerCase());
            const typeMatch = filterType === 'all' || photo.type === filterType;
            return yearMatch && monthMatch && searchMatch && typeMatch;
        });
    }, [photos, currentYear, currentMonth, searchTerm, filterType]);

    const groupedPhotos = useMemo(() => {
        // FIX: The grouping logic was incorrect and mismatched the data type.
        // It now correctly groups photos by month name, which aligns with the rendering logic.
        return filteredPhotos.reduce<GroupedPhotos>((acc, photo) => {
            const month = MONTHS[new Date(photo.date).getMonth()];
            if (!acc[month]) {
                acc[month] = [];
            }
            acc[month].push(photo);
            return acc;
        }, {});
    }, [filteredPhotos]);

    const allPhotosList = useMemo(() => filteredPhotos, [filteredPhotos]);
    
    const handleSelectPhoto = (photoId: string) => {
        setSelectedPhotos(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(photoId)) {
                newSelection.delete(photoId);
            } else {
                newSelection.add(photoId);
            }
            return newSelection;
        });
    };
    
    const handleSelectAll = () => {
        if (selectedPhotos.size === allPhotosList.length) {
            setSelectedPhotos(new Set());
        } else {
            setSelectedPhotos(new Set(allPhotosList.map(p => p.id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedPhotos.size === 0) return;
        if (window.confirm(`${selectedPhotos.size}개의 항목을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            const photosToDelete = photos.filter(p => selectedPhotos.has(p.id));
            try {
                await deletePhotos(photosToDelete);
                setPhotos(prev => prev.filter(p => !selectedPhotos.has(p.id)));
                setSelectedPhotos(new Set());
            } catch (err) {
                console.error(err);
                setError('사진 삭제에 실패했습니다.');
            }
        }
    };

    const handleDownloadSelected = async () => {
        if (selectedPhotos.size === 0) return;
        const zip = new JSZip();
        const photosToDownload = photos.filter(p => selectedPhotos.has(p.id));

        for (const photo of photosToDownload) {
            try {
                const response = await fetch(photo.url);
                const blob = await response.blob();
                zip.file(photo.name, blob);
            } catch (error) {
                console.error(`Failed to fetch ${photo.name}:`, error);
                alert(`${photo.name}을(를) 다운로드하는 데 실패했습니다. CORS 설정 문제일 수 있습니다. firebase.ts 파일의 가이드를 확인해주세요.`);
            }
        }

        zip.generateAsync({ type: 'blob' }).then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `우리가족_행복앨범_${new Date().toLocaleDateString()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    const handleProfileImageChange = async (event: React.ChangeEvent<HTMLInputElement>, profileId: number) => {
        const file = event.target.files?.[0];
        if (file) {
            const newProfileData: Profile = { id: profileId, file, url: null };
            const savedProfile = await saveProfile(newProfileData);
            setProfiles(prev => prev.map(p => p.id === profileId ? savedProfile : p));
        }
    };

    const FirebaseConfigWarning = () => (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-800 rounded-lg shadow-2xl m-4">
            <h2 className="text-3xl font-bold text-red-400 mb-4">🚨 Firebase 설정이 필요합니다!</h2>
            <p className="text-slate-300 max-w-2xl mb-6">
                이 애플리케이션을 사용하려면 Firebase 프로젝트 설정이 필수적입니다.
                <code className="bg-slate-700 text-amber-300 rounded px-2 py-1 mx-1 text-sm">firebase.ts</code> 파일 상단에 있는 상세한 단계별 가이드를 따라 설정을 완료해주세요.
            </p>
            <div className="text-left bg-slate-900 p-6 rounded-lg max-w-xl w-full">
                <p className="font-semibold text-lg text-sky-300 mb-3">설정 요약:</p>
                <ol className="list-decimal list-inside space-y-2 text-slate-400">
                    <li>Firebase 프로젝트 생성 및 웹 앱 등록</li>
                    <li><code className="text-amber-300">firebase.ts</code> 파일에 <code className="text-amber-300">firebaseConfig</code> 붙여넣기</li>
                    <li>Firestore 및 Storage 데이터베이스 생성 및 <strong className="text-red-400">보안 규칙 업데이트</strong></li>
                    <li>(선택사항) 다운로드 기능을 위한 Storage CORS 설정</li>
                </ol>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans">
            <PhotoModal 
                photos={allPhotosList} 
                currentIndex={modalState.index} 
                onClose={() => setModalState({ isOpen: false, index: null })}
                onNavigate={(newIndex) => setModalState({ isOpen: true, index: newIndex })}
            />
            
            <header className="py-6 px-4 md:px-8 bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">우리가족 행복 앨범</h1>
                    <div className="flex items-center space-x-2">
                        {profiles.map(profile => (
                            <div key={profile.id} className="relative w-12 h-12">
                                <label htmlFor={`profile-upload-${profile.id}`} className="cursor-pointer group">
                                    <img 
                                        src={profile.url || 'https://via.placeholder.com/150'} 
                                        alt={`Profile ${profile.id}`} 
                                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 group-hover:border-sky-400 transition-all duration-300" 
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition-all duration-300">
                                      <p className="text-white text-xs opacity-0 group-hover:opacity-100">변경</p>
                                    </div>
                                </label>
                                <input type="file" id={`profile-upload-${profile.id}`} accept="image/*" className="hidden" onChange={(e) => handleProfileImageChange(e, profile.id)} />
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-screen-2xl mx-auto">
                {!isFirebaseConfigured ? <FirebaseConfigWarning /> : (
                <>
                <div 
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                    className={`m-4 md:m-8 p-8 border-4 border-dashed rounded-2xl transition-all duration-300 ${isDragOver ? 'border-sky-500 bg-slate-800' : 'border-slate-700 bg-slate-800/50'}`}
                >
                    <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                    <div className="flex flex-col items-center justify-center text-center">
                        <UploadIcon />
                        <p className="mt-4 text-lg font-semibold text-slate-300">사진과 동영상을 여기에 드래그하거나 클릭하여 업로드하세요</p>
                        <p className="text-slate-500">EXIF 정보가 있는 사진은 촬영일 기준으로 자동 정리됩니다.</p>
                        <button onClick={() => fileInputRef.current?.click()} className="mt-4 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                            파일 선택
                        </button>
                    </div>
                </div>

                {isUploading && (
                    <div className="m-4 md:m-8 p-4 bg-slate-800 rounded-lg">
                        <p className="text-lg font-semibold mb-2">업로드 중... ({uploadProgress}/{totalFiles})</p>
                        <div className="w-full bg-slate-700 rounded-full h-4">
                            <div className="bg-sky-500 h-4 rounded-full" style={{ width: `${(uploadProgress / totalFiles) * 100}%` }}></div>
                        </div>
                    </div>
                )}
                
                <div className="sticky top-[100px] bg-slate-900/80 backdrop-blur-lg z-10 py-4 shadow-md">
                    <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
                         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <button onClick={handleSelectAll} className="flex items-center bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                                    <CheckCircleIcon />
                                    <span>{selectedPhotos.size === allPhotosList.length ? '전체 해제' : '전체 선택'} ({selectedPhotos.size})</span>
                                </button>
                                <button onClick={handleDownloadSelected} disabled={selectedPhotos.size === 0} className="flex items-center bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">
                                    <DownloadIcon />
                                    <span>다운로드</span>
                                </button>
                                <button onClick={handleDeleteSelected} disabled={selectedPhotos.size === 0} className="flex items-center bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">
                                    <TrashIcon />
                                    <span>삭제</span>
                                </button>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="relative flex-grow w-full sm:w-auto">
                                    <input
                                        type="text"
                                        placeholder="이름으로 검색..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
                                    />
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1">
                                    <button onClick={() => setFilterType('all')} className={`px-4 py-1 rounded-md text-sm font-medium transition ${filterType === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>모두</button>
                                    <button onClick={() => setFilterType('image')} className={`px-4 py-1 rounded-md text-sm font-medium transition ${filterType === 'image' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>사진</button>
                                    <button onClick={() => setFilterType('video')} className={`px-4 py-1 rounded-md text-sm font-medium transition ${filterType === 'video' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>동영상</button>
                                </div>
                                <select value={currentYear} onChange={(e) => setCurrentYear(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white">
                                    <option value="all">전체 년도</option>
                                    {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                                </select>
                                <select value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white">
                                    <option value="all">전체 월</option>
                                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {isLoading ? <Spinner /> : (
                  <div className="p-4 md:px-8">
                  {Object.keys(groupedPhotos).length > 0 ? Object.entries(groupedPhotos).map(([month, monthPhotos]) => (
                      <div key={month} className="mb-12">
                          <h2 className="text-2xl font-bold text-slate-300 mb-4 pl-2 border-l-4 border-sky-500">{month}</h2>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                              {monthPhotos.map((photo, index) => (
                                  <div key={photo.id} className="relative group cursor-pointer aspect-square" onClick={() => {
                                      const flatIndex = allPhotosList.findIndex(p => p.id === photo.id);
                                      if (flatIndex !== -1) setModalState({ isOpen: true, index: flatIndex });
                                  }}>
                                      {photo.type === 'video' ? (
                                          <video src={photo.url} className="w-full h-full object-cover rounded-lg bg-slate-800" />
                                      ) : (
                                          <img src={photo.url} alt={photo.name} loading="lazy" className="w-full h-full object-cover rounded-lg bg-slate-800" />
                                      )}
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 rounded-lg"></div>
                                      <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                                          <input 
                                              type="checkbox" 
                                              checked={selectedPhotos.has(photo.id)} 
                                              onChange={() => handleSelectPhoto(photo.id)} 
                                              className="h-6 w-6 rounded text-sky-500 bg-slate-700 border-slate-500 focus:ring-sky-500" 
                                          />
                                      </div>
                                      {photo.type === 'video' && <div className="absolute bottom-2 right-2 text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg></div>}
                                  </div>
                              ))}
                          </div>
                      </div>
                  )) : (
                      <div className="text-center py-16">
                          <p className="text-xl text-slate-500">표시할 사진이나 동영상이 없습니다.</p>
                          <p className="text-slate-600 mt-2">다른 필터를 선택하거나 새 파일을 업로드해 보세요.</p>
                      </div>
                  )}
                  </div>
                )}
                </>
                )}
            </main>
        </div>
    );
};

export default App;