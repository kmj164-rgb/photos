
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { Photo, Profile, GroupedPhotos } from './types';
import PhotoModal from './components/PhotoModal';
import { getAllPhotos, addPhoto, getAllProfiles, saveProfile, deletePhotos, getPhotosByIds, deletePhoto } from './db';

declare const EXIF: any;

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const YEARS = Array.from({ length: 2030 - 2010 + 1 }, (_, i) => 2010 + i);

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
                const timeParts = parts[1].split(':');
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


const ProfileCircle: React.FC<{ profile: Profile; onImageDrop: (id: number, file: File) => void }> = ({ profile, onImageDrop }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [profileUrl, setProfileUrl] = useState<string | null>(null);

    useEffect(() => {
        if (profile.file) {
            const url = URL.createObjectURL(profile.file);
            setProfileUrl(url);
            return () => URL.revokeObjectURL(url);
        } else if (profile.url) {
            setProfileUrl(profile.url)
        }
    }, [profile.file, profile.url]);


    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onImageDrop(profile.id, e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleDragEnter = () => setIsDragOver(true);
    const handleDragLeave = () => setIsDragOver(false);

    return (
        <div 
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-dashed flex items-center justify-center text-center text-xs p-2 transition-all duration-300 ${isDragOver ? 'border-sky-400 bg-slate-700' : 'border-slate-600'}`}
            style={{
                backgroundImage: `url(${profileUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {!profileUrl && <span className="text-slate-400">여기에 사진 드롭</span>}
        </div>
    );
};


const App: React.FC = () => {
  const [accessGranted, setAccessGranted] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([
      { id: 1, url: 'https://storage.googleapis.com/aistudio-hosting/workspace-assets/google-project-media/484a084c-31d4-4a53-8b77-3e28080f3a3a' },
      { id: 2, url: 'https://storage.googleapis.com/aistudio-hosting/workspace-assets/google-project-media/16c6424e-728b-4b47-8f85-78c6411f7c6e' }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [uploadProgress, setUploadProgress] = useState({ processed: 0, total: 0 });
  const [skippedCount, setSkippedCount] = useState(0);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  
  const photoUrlsRef = useRef(photoUrls);
  photoUrlsRef.current = photoUrls;

  useEffect(() => {
    if (localStorage.getItem('albumAccessGranted') === 'true') {
        setAccessGranted(true);
    }
  }, []);

  useEffect(() => {
    if (!accessGranted) return;

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [storedPhotos, storedProfiles] = await Promise.all([getAllPhotos(), getAllProfiles()]);
            
            const sortedPhotos = storedPhotos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAllPhotos(sortedPhotos);

            if (storedProfiles.length > 0) {
                setProfiles(prev => {
                    const profileMap = new Map(storedProfiles.map(p => [p.id, p]));
                    return prev.map(dp => profileMap.get(dp.id) || dp);
                });
            }

        } catch (error) {
            console.error("Failed to load data from IndexedDB", error);
        }
        setIsLoading(false);
        setIsInitialLoad(false);
    };

    loadData();
    
    return () => {
       Object.values(photoUrlsRef.current).forEach(URL.revokeObjectURL);
    }

  }, [accessGranted]);

  useEffect(() => {
    const newUrls: Record<string, string> = {};
    let needsUpdate = false;
    allPhotos.forEach(photo => {
        if (photo.file && !photoUrls[photo.id]) {
            newUrls[photo.id] = URL.createObjectURL(photo.file);
            needsUpdate = true;
        }
    });

    if (needsUpdate) {
        setPhotoUrls(prev => ({ ...prev, ...newUrls }));
    }
  }, [allPhotos, photoUrls]);


  const existingPhotoIds = useMemo(() => new Set(allPhotos.map(p => p.id)), [allPhotos]);
  
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setUploadProgress({ processed: 0, total: files.length });
    setCurrentFileName(null);
    setSkippedCount(0);
    
    const newPhotos: Photo[] = [];
    let skipped = 0;
    const newPhotoIds = new Set<string>();

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileName(file.name);
        
        const photoId = `${file.name}-${file.size}-${file.lastModified}`;
        if (existingPhotoIds.has(photoId) || newPhotoIds.has(photoId)) {
            skipped++;
            setSkippedCount(skipped);
            setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1 }));
            continue;
        }
        newPhotoIds.add(photoId);
        
        const date = await getExifDate(file);
        const photo: Photo = {
            id: photoId,
            url: '', // URL is generated on demand
            file,
            name: file.name,
            date,
            type: file.type.startsWith('video/') ? 'video' : 'image',
        };
        
        try {
            await addPhoto(photo);
            newPhotos.push(photo);
        } catch (error) {
            console.error(`Failed to add photo ${photo.name} to DB:`, error);
            alert(`${photo.name}을(를) 저장하는 데 실패했습니다.`);
        }
        setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1 }));
    }

    setAllPhotos(prev => [...prev, ...newPhotos].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setIsLoading(false);
    setCurrentFileName(null);
    
    event.target.value = '';
  }, [existingPhotoIds]);
  
  const handleProfileDrop = useCallback(async (id: number, file: File) => {
      const profile: Profile = { id, url: null, file };
      await saveProfile(profile);
      setProfiles(prev => prev.map(p => p.id === id ? profile : p));
  }, []);

  const photosByYear = useMemo(() => {
    return allPhotos.reduce((acc, photo) => {
        const year = new Date(photo.date).getFullYear();
        if(!acc[year]) acc[year] = {};
        const month = MONTHS[new Date(photo.date).getMonth()];
        if(!acc[year][month]) acc[year][month] = [];
        acc[year][month].push(photo);
        return acc;
    }, {} as GroupedPhotos);
  }, [allPhotos]);

  const photosInCurrentView = useMemo(() => {
      if (!selectedYear || !selectedMonth) return [];
      const monthlyPhotos = photosByYear[selectedYear]?.[selectedMonth] || [];
      if (filterType === 'all') {
        return monthlyPhotos;
      }
      return monthlyPhotos.filter(p => p.type === filterType);
  }, [selectedYear, selectedMonth, photosByYear, filterType]);

  const getPhotoUrl = useCallback((photo: Photo) => {
    return photoUrls[photo.id] || '';
  }, [photoUrls]);

  const photosInCurrentViewWithUrls = useMemo(() => {
      return photosInCurrentView.map(p => ({
          ...p,
          url: getPhotoUrl(p),
      }));
  }, [photosInCurrentView, getPhotoUrl]);

  const handlePhotoClick = (photo: Photo) => {
      if(isSelectionMode) {
        handlePhotoSelect(photo.id);
        return;
      }
      const index = photosInCurrentViewWithUrls.findIndex(p => p.id === photo.id);
      if (index !== -1) {
          setSelectedPhotoIndex(index);
      }
  };
  
  const handlePhotoSelect = (photoId: string) => {
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

  const handleNavigateModal = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < photosInCurrentViewWithUrls.length) {
        setSelectedPhotoIndex(newIndex);
    }
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setSelectedMonth(null);
    setIsSelectionMode(false);
    setSelectedPhotos(new Set());
  }

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setIsSelectionMode(false);
    setSelectedPhotos(new Set());
  }
  
  const handleToggleSelectionMode = () => {
    setIsSelectionMode(prev => !prev);
    setSelectedPhotos(new Set());
  }

  const handleSelectAll = () => {
    if(selectedPhotos.size === photosInCurrentView.length) {
        setSelectedPhotos(new Set());
    } else {
        setSelectedPhotos(new Set(photosInCurrentView.map(p => p.id)));
    }
  }
  
  const handleDeleteSelected = async () => {
    if (selectedPhotos.size === 0) return;
    if(window.confirm(`${selectedPhotos.size}개의 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
        const idsToDelete = Array.from(selectedPhotos);
        try {
            await deletePhotos(idsToDelete);
            setPhotoUrls(prevUrls => {
                const newUrls = { ...prevUrls };
                idsToDelete.forEach(id => {
                    if (newUrls[id]) {
                        URL.revokeObjectURL(newUrls[id]);
                        delete newUrls[id];
                    }
                });
                return newUrls;
            });
            setAllPhotos(prev => prev.filter(p => !idsToDelete.includes(p.id)));
            setSelectedPhotos(new Set());
            setIsSelectionMode(false);
        } catch (error) {
            console.error("Failed to delete photos:", error);
            alert("사진 삭제에 실패했습니다.");
        }
    }
  };
  
  const handleDownloadSelected = async () => {
    if (selectedPhotos.size === 0) return;
    const idsToDownload = Array.from(selectedPhotos);
    try {
      const photosToDownload = await getPhotosByIds(idsToDownload);
      photosToDownload.forEach(photo => {
        if (photo.file) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(photo.file);
          a.download = photo.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
        }
      });
    } catch (error) {
      console.error("Failed to download photos:", error);
      alert("사진 다운로드에 실패했습니다.");
    }
  }
  
  const handleDeleteFromModal = async (photoId: string) => {
      try {
          await deletePhoto(photoId);
          setPhotoUrls(prevUrls => {
            const newUrls = { ...prevUrls };
            if (newUrls[photoId]) {
                URL.revokeObjectURL(newUrls[photoId]);
                delete newUrls[photoId];
            }
            return newUrls;
          });
          setAllPhotos(prev => prev.filter(p => p.id !== photoId));
          setSelectedPhotoIndex(null);
      } catch (error) {
          console.error("Failed to delete photo:", error);
          alert("사진 삭제에 실패했습니다.");
      }
  }

  const handleRequestAccess = () => {
    setRequestSent(true);
    setTimeout(() => {
        localStorage.setItem('albumAccessGranted', 'true');
        setAccessGranted(true);
    }, 2500);
  };

  if (!accessGranted) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-center px-4">
            <div className="bg-slate-800 p-8 sm:p-12 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full">
                <h1 className="text-3xl font-bold text-sky-400 mb-4">비공개 앨범</h1>
                <p className="text-slate-400 mb-8">이 앨범은 관리자의 초대를 받은 분들만 접근할 수 있습니다.</p>
                
                {!requestSent ? (
                    <button 
                        onClick={handleRequestAccess}
                        className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 text-lg"
                    >
                        접근 요청
                    </button>
                ) : (
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                        <p className="font-semibold text-green-400">요청이 전송되었습니다.</p>
                        <p className="text-slate-300 mt-1 text-sm">관리자 승인 후 자동으로 입장됩니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-24">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center p-4 mb-8 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-sm text-sky-300">초대된 가족과 친구만 볼 수 있는 소중한 순간들</p>
          </div>

          <header className="text-center mb-10 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
            <ProfileCircle profile={profiles[0]} onImageDrop={handleProfileDrop} />
            <div>
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
                두아들을 둔 행복한 집
                </h1>
                <p className="mt-4 text-lg text-slate-400">
                우리의 모든 순간, 모든 이야기
                </p>
            </div>
            <ProfileCircle profile={profiles[1]} onImageDrop={handleProfileDrop} />
          </header>

          <div className="max-w-2xl mx-auto mb-12">
            <label htmlFor="file-upload" className="cursor-pointer group block p-8 border-2 border-dashed border-slate-600 rounded-lg text-center hover:border-sky-500 hover:bg-slate-800 transition-all duration-300">
                <div className="flex flex-col items-center justify-center">
                    <UploadIcon />
                    <p className="mt-4 text-xl font-semibold text-slate-300 group-hover:text-sky-400">사진/동영상 업로드</p>
                    <p className="mt-1 text-sm text-slate-500">정리할 파일들을 선택하거나 여기에 드래그하세요.</p>
                </div>
                <input id="file-upload" name="file-upload" type="file" multiple accept="image/*,video/*" className="sr-only" onChange={handleFileChange} disabled={isLoading} />
            </label>
          </div>

          {isLoading && isInitialLoad && (
            <div className="text-center text-lg text-slate-400 p-8">앨범 데이터를 불러오는 중입니다...</div>
          )}

          {isLoading && !isInitialLoad && (
            <div className="max-w-2xl mx-auto my-8 px-4">
              <div className="text-center mb-4">
                <p className="text-lg font-semibold text-sky-400">파일 처리 중...</p>
                {uploadProgress.total > 0 && (
                  <p className="text-slate-400">{uploadProgress.processed} / {uploadProgress.total} 완료</p>
                )}
                {currentFileName && (
                  <p className="text-sm text-slate-500 truncate mt-1" title={currentFileName}>현재 파일: {currentFileName}</p>
                )}
              </div>
              {uploadProgress.total > 0 && (
                <div className="w-full bg-slate-700 rounded-full h-2.5 mb-2">
                  <div 
                    className="bg-sky-500 h-2.5 rounded-full transition-all duration-300 ease-linear" 
                    style={{ width: `${(uploadProgress.processed / uploadProgress.total) * 100}%` }}
                  ></div>
                </div>
              )}
              {skippedCount > 0 && (
                <p className="text-center text-sm text-amber-400">
                  {skippedCount}개의 중복된 파일은 건너뛰었습니다.
                </p>
              )}
            </div>
          )}

          <nav className="mb-8">
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {YEARS.map(year => (
                      <button key={year} onClick={() => handleYearSelect(year)} className={`px-4 py-2 rounded font-semibold transition-colors ${selectedYear === year ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                          {year}
                      </button>
                  ))}
              </div>

              {selectedYear && (
                   <div className="flex flex-wrap justify-center gap-2 p-4 bg-slate-800 rounded-lg">
                       {MONTHS.map(month => {
                           const hasPhotos = photosByYear[selectedYear]?.[month]?.length > 0;
                           return (
                            <button key={month} onClick={() => handleMonthSelect(month)} disabled={!hasPhotos} className={`px-3 py-1.5 rounded text-sm transition-colors ${selectedMonth === month ? 'bg-sky-500 text-white' : 'bg-slate-700'} ${hasPhotos ? 'hover:bg-slate-600' : 'opacity-50 cursor-not-allowed'}`}>
                                {month}
                            </button>
                           )
                       })}
                   </div>
              )}
          </nav>
          
          {selectedYear && selectedMonth && (
            <div className="flex justify-center gap-4 mb-8">
              <button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded font-semibold transition-colors ${filterType === 'all' ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                모두
              </button>
              <button onClick={() => setFilterType('image')} className={`px-4 py-2 rounded font-semibold transition-colors ${filterType === 'image' ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                사진
              </button>
              <button onClick={() => setFilterType('video')} className={`px-4 py-2 rounded font-semibold transition-colors ${filterType === 'video' ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                동영상
              </button>
            </div>
          )}

          {!isLoading && !isInitialLoad && allPhotos.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-500 text-lg">업로드한 사진과 동영상이 여기에 표시됩니다.</p>
            </div>
          )}
          
          {!isLoading && selectedYear && selectedMonth && photosInCurrentView.length === 0 && allPhotos.length > 0 && (
            <div className="text-center py-16">
              <p className="text-slate-500 text-lg">
                {photosByYear[selectedYear]?.[selectedMonth]?.length > 0 
                  ? '현재 필터와 일치하는 항목이 없습니다.' 
                  : '이 달에는 업로드된 사진이나 동영상이 없습니다.'}
              </p>
            </div>
          )}

          {!isLoading && selectedYear && selectedMonth && photosInCurrentView.length > 0 && (
            <section>
                <div className="flex justify-between items-center border-b-2 border-slate-700 pb-2 mb-6">
                    <h2 className="text-3xl font-bold text-sky-400">
                        {selectedYear}년 {selectedMonth}
                    </h2>
                    <button onClick={handleToggleSelectionMode} className="px-4 py-2 rounded font-semibold transition-colors bg-slate-700 hover:bg-slate-600">
                        {isSelectionMode ? '취소' : '선택'}
                    </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {photosInCurrentViewWithUrls.map(photo => (
                    <div key={photo.id} className="aspect-square bg-slate-800 rounded-lg overflow-hidden cursor-pointer group relative" onClick={() => handlePhotoClick(photo)}>
                        {photo.type === 'image' ? (
                            <img src={photo.url} alt={photo.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"/>
                        ) : (
                            <video src={photo.url} muted loop className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        )}

                        {isSelectionMode ? (
                             <div className={`absolute inset-0 transition-all duration-200 ${selectedPhotos.has(photo.id) ? 'bg-sky-500/70' : 'bg-black/50'}`}>
                                {selectedPhotos.has(photo.id) && (
                                    <div className="absolute top-2 right-2 text-white bg-sky-600 rounded-full p-1">
                                      <CheckCircleIcon />
                                    </div>
                                )}
                             </div>
                        ) : (
                             <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-300"></div>
                        )}

                        {photo.type === 'video' && (
                             <div className="absolute top-2 right-2 text-white bg-black bg-opacity-50 p-1 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 001.553.832l3-2a1 1 0 000-1.664l-3-2z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    ))}
                </div>
            </section>
          )}
        </main>
      </div>
      {isSelectionMode && (
          <div className="fixed bottom-0 left-0 right-0 bg-slate-800/90 backdrop-blur-sm border-t border-slate-700 p-4 z-40">
              <div className="container mx-auto flex justify-between items-center">
                  <div className="text-white font-semibold">
                      {selectedPhotos.size}개 선택됨
                  </div>
                  <div className="flex gap-4">
                      <button onClick={handleSelectAll} className="px-4 py-2 rounded font-semibold bg-slate-600 hover:bg-slate-500 text-white transition-colors">
                          {selectedPhotos.size === photosInCurrentView.length ? '선택 해제' : '모두 선택'}
                      </button>
                      <button onClick={handleDownloadSelected} disabled={selectedPhotos.size === 0} className="px-4 py-2 rounded font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          다운로드
                      </button>
                      <button onClick={handleDeleteSelected} disabled={selectedPhotos.size === 0} className="px-4 py-2 rounded font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          삭제
                      </button>
                  </div>
              </div>
          </div>
      )}
      <PhotoModal 
        photos={photosInCurrentViewWithUrls} 
        currentIndex={selectedPhotoIndex} 
        onClose={() => setSelectedPhotoIndex(null)}
        onNavigate={handleNavigateModal}
        onDelete={handleDeleteFromModal}
      />
    </>
  );
};

export default App;
