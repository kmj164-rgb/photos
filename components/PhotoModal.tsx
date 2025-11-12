import React, { useEffect } from 'react';
import type { Photo } from '../types';

interface PhotoModalProps {
  photos: Photo[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({ photos, currentIndex, onClose, onNavigate }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight' && currentIndex !== null && currentIndex < photos.length - 1) {
        onNavigate(currentIndex + 1);
      } else if (event.key === 'ArrowLeft' && currentIndex !== null && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, photos.length, onClose, onNavigate]);

  if (currentIndex === null) return null;

  const photo = photos[currentIndex];
  const isVideo = photo.type === 'video';

  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < photos.length - 1;

  const handleDownload = () => {
    if (!photo) return;

    const link = document.createElement('a');
    link.href = photo.url;
    link.download = photo.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-800 p-4 rounded-lg w-full h-full max-w-7xl max-h-[95vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-5 -right-5 bg-sky-500 text-white rounded-full h-12 w-12 flex items-center justify-center text-3xl font-bold hover:bg-sky-600 transition-colors z-20"
          aria-label="Close"
        >
          &times;
        </button>

        <button
          onClick={handleDownload}
          className="absolute top-4 right-4 bg-slate-700/80 text-white rounded-full p-3 hover:bg-slate-600 transition-colors z-20"
          aria-label="다운로드"
          title="다운로드"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        
        <div className="w-full h-full flex items-center justify-center">
          {isVideo ? (
            <video
              src={photo.url}
              controls
              autoPlay
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <img
              src={photo.url}
              alt={photo.name}
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-slate-300 bg-black bg-opacity-50 px-4 py-2 rounded-lg">
          <p className="font-semibold">{photo.name}</p>
          <p className="text-sm text-slate-400">{new Date(photo.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {canNavigatePrev && (
          <button onClick={() => onNavigate(currentIndex - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 p-3 rounded-full hover:bg-opacity-75 transition-all text-4xl z-10" aria-label="Previous photo">
            &#8249;
          </button>
        )}
        {canNavigateNext && (
          <button onClick={() => onNavigate(currentIndex + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 p-3 rounded-full hover:bg-opacity-75 transition-all text-4xl z-10" aria-label="Next photo">
            &#8250;
          </button>
        )}
      </div>
    </div>
  );
};

export default PhotoModal;
