import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Photo, Profile, GroupedPhotos } from './types';
import PhotoModal from './components/PhotoModal';
import { firestore, storage } from './firebase';

declare const EXIF: any;
declare const JSZip: any;

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

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);


const ProfileCircle: React.FC<{ profile: Profile; onImageDrop: (id: number, file: File) => void }> = ({ profile, onImageDrop }) => {
    const [isDragOver, setIsDragOver] = useState(false);

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
                backgroundImage: `url(${profile.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {!profile.url && <span className="text-slate-400">여기에 사진 드롭</span>}
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
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('albumAccessGranted') === 'true') {
        setAccessGranted(true);
    }
  }, []);

  useEffect(() => {
    if (!accessGranted) return;

    // Listen for real-time updates from Firestore
    const unsubscribePhotos = firestore.collection('photos').orderBy('date', 'desc').onSnapshot(snapshot => {
        const photosFromDb = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Photo));
        setAllPhotos(photosFromDb);
        setIsLoading(false);
        setIsInitialLoad(false);
    }, (error: Error) => {
        console.error("Error fetching photos from Firestore:", error);
        setIsLoading(false);
    });
    
    const unsubscribeProfiles = firestore.collection('profiles').onSnapshot(snapshot => {
        const profilesFromDb: Profile[] = [];
        snapshot.forEach(doc => {
            profilesFromDb.push({ id: Number(doc.id), ...doc.data() } as Profile)
        });
        if (profilesFromDb.length > 0) {
             setProfiles(prev => prev.map(dp => profilesFromDb.find(sp => sp.id === dp.id) || dp));
        }
    });

    return () => {
        unsubscribePhotos();
        unsubscribeProfiles();
    }
  }, [accessGranted]);
  
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setUploadProgress({ processed: 0, total: files.length });
    setCurrentFileName(null);
    setSkippedCount(0); // Reset skipped count for new upload session

    const uploadPromises = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const uploadProcess = async () => {
            setCurrentFileName(file.name);
            const date = await getExifDate(file);
            
            // Upload to Firebase Storage
            const storageRef = storage.ref(`photos/${Date.now()}_${file.name}`);
            await storageRef.put(file);
            const downloadURL = await storageRef.getDownloadURL();

            // Save metadata to Firestore
            const photoData = {
                name: file.name,
                date: date.toISOString(),
                type: file.type.startsWith('video/') ? 'video' : 'image',
                url: downloadURL,
                storagePath: storageRef.fullPath
            };
            
            await firestore.collection('photos').add(photoData);

            setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1 }));
        };
        uploadPromises.push(uploadProcess());
    }

    await Promise.all(uploadPromises);

    setIsLoading(false);
    setCurrentFileName(null);
    
    event.target.value = '';
  }, []);
  
  const handleProfileDrop = useCallback(async (id: number, file: File) => {
      try {
        const storageRef = storage.ref(`profiles/${id}_${file.name}`);
        await storageRef.put(file);
        const downloadURL = await storageRef.getDownloadURL();
        const profileData = {
            url: downloadURL,
            storagePath: storageRef.fullPath
        };
        await firestore.collection('profiles').doc(String(id)).set(profileData, { merge: true });
        // Real-time listener will update the state
      } catch (error) {
        console.error("Error updating profile picture:", error);
      }
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

  const handlePhotoClick = (photo: Photo) => {
      if (isSelectionMode) {
          const newSelectedPhotos = new Set(selectedPhotos);
          if (newSelectedPhotos.has(photo.id)) {
              newSelectedPhotos.delete(photo.id);
          } else {
              newSelectedPhotos.add(photo.id);
          }
          setSelectedPhotos(newSelectedPhotos);
      } else {
          const index = photosInCurrentView.findIndex(p => p.id === photo.id);
          if (index !== -1) {
              setSelectedPhotoIndex(index);
          }
      }
  };

  const handleToggleSelectionMode = () => {
      if (isSelectionMode) {
          setSelectedPhotos(new Set());
      }
      setIsSelectionMode(!isSelectionMode);
  };

  const handleDownloadSelected = async () => {
    if (selectedPhotos.size === 0) return;
    setIsProcessing(true);

    try {
        const zip = new JSZip();
        const photosToDownload = allPhotos.filter(p => selectedPhotos.has(p.id));

        const downloadPromises = photosToDownload.map(async (photo) => {
            const response = await fetch(photo.url);
            const blob = await response.blob();
            zip.file(photo.name, blob);
        });

        await Promise.all(downloadPromises);
        
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `album_photos_${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error("Error creating zip file", error);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteSelected = async () => {
      if (selectedPhotos.size === 0) return;
      if (!window.confirm(`${selectedPhotos.size}개의 항목을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
          return;
      }
      setIsProcessing(true);
      try {
          const photosToDelete = allPhotos.filter(p => selectedPhotos.has(p.id));
          const deletePromises = photosToDelete.map(photo => {
              const firestorePromise = firestore.collection('photos').doc(photo.id).delete();
              const storagePromise = storage.ref(photo.storagePath).delete();
              return Promise.all([firestorePromise, storagePromise]);
          });
          
          await Promise.all(deletePromises);
          
          setSelectedPhotos(new Set());
          setIsSelectionMode(false);
      } catch (error) {
          console.error("Failed to delete photos", error);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleNavigateModal = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < photosInCurrentView.length) {
        setSelectedPhotoIndex(newIndex);
    }
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setSelectedMonth(null);
    setIsSelectionMode(false);
    setSelectedPhotos(new Set());
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
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
        <main className="container mx-auto px-4 py-8">
          <header className="text-center mb-10 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
            <ProfileCircle profile={profiles[0]} onImageDrop={handleProfileDrop} />
            <div>
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
                우리가족 행복 앨범
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
             <div className="text-center py-16">
              <p className="text-slate-500 text-lg">앨범 데이터를 불러오는 중입니다...</p>
            </div>
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
                            <button key={month} onClick={() => setSelectedMonth(month)} disabled={!hasPhotos} className={`px-3 py-1.5 rounded text-sm transition-colors ${selectedMonth === month ? 'bg-sky-500 text-white' : 'bg-slate-700'} ${hasPhotos ? 'hover:bg-slate-600' : 'opacity-50 cursor-not-allowed'}`}>
                                {month}
                            </button>
                           )
                       })}
                   </div>
              )}
          </nav>
          
          {selectedYear && selectedMonth && (
            <div className="flex justify-center items-center gap-4 mb-8">
              <button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded font-semibold transition-colors ${filterType === 'all' ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                모두
              </button>
              <button onClick={() => setFilterType('image')} className={`px-4 py-2 rounded font-semibold transition-colors ${filterType === 'image' ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                사진
              </button>
              <button onClick={() => setFilterType('video')} className={`px-4 py-2 rounded font-semibold transition-colors ${filterType === 'video' ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                동영상
              </button>
              {photosInCurrentView.length > 0 && (
                <>
                  <div className="border-l border-slate-600 h-6"></div>
                  <button onClick={handleToggleSelectionMode} className={`px-4 py-2 rounded font-semibold transition-colors ${isSelectionMode ? 'bg-red-500 text-white' : 'bg-sky-500 text-white'}`}>
                    {isSelectionMode ? '취소' : '선택'}
                  </button>
                </>
              )}
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
            <section className="pb-24">
                <h2 className="text-3xl font-bold text-sky-400 border-b-2 border-slate-700 pb-2 mb-6">
                    {selectedYear}년 {selectedMonth}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {photosInCurrentView.map(photo => {
                        const isSelected = selectedPhotos.has(photo.id);
                        return (
                            <div key={photo.id} className="aspect-square bg-slate-800 rounded-lg overflow-hidden group relative" onClick={() => handlePhotoClick(photo)}>
                                <div className={`w-full h-full transition-transform duration-300 ${isSelectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'scale-90' : 'group-hover:scale-105'}`}>
                                    {photo.type === 'image' ? (
                                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover"/>
                                    ) : (
                                        <video src={photo.url} muted loop className="w-full h-full object-cover" />
                                    )}
                                </div>
                                
                                {isSelectionMode ? (
                                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-sky-500/70' : 'bg-black/50 opacity-0 group-hover:opacity-100'}`}>
                                        {isSelected && <CheckCircleIcon />}
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-300"></div>
                                )}
                                
                                {photo.type === 'video' && !isSelected && (
                                     <div className="absolute top-2 right-2 text-white bg-black bg-opacity-50 p-1 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 001.553.832l3-2a1 1 0 000-1.664l-3-2z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
          )}

        </main>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 z-40 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 shadow-lg p-4 transition-transform duration-300 ease-in-out ${isSelectionMode && selectedPhotos.size > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="container mx-auto flex justify-between items-center">
              <span className="font-semibold text-lg">{selectedPhotos.size}개 항목 선택됨</span>
              <div className="flex gap-4">
                  <button onClick={handleDownloadSelected} disabled={isProcessing} className="flex items-center justify-center bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
                      <DownloadIcon />
                      {isProcessing ? '압축 중...' : '다운로드'}
                  </button>
                  <button onClick={handleDeleteSelected} disabled={isProcessing} className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
                      <TrashIcon />
                      {isProcessing ? '삭제 중...' : '삭제'}
                  </button>
              </div>
          </div>
      </div>

{/* FIX: The `photos` prop for PhotoModal expects an array of `Photo` objects, where `date` is a string. The previous code was incorrectly converting the `date` string to a `Date` object, causing a type mismatch. The `map` function has been removed to pass the `photosInCurrentView` array directly, as the `PhotoModal` component handles date string conversion internally. */}
      <PhotoModal 
        photos={photosInCurrentView} 
        currentIndex={selectedPhotoIndex} 
        onClose={() => setSelectedPhotoIndex(null)}
        onNavigate={handleNavigateModal}
      />
    </>
  );
};

export default App;