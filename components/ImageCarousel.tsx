import React, { useState } from 'react';

interface ImageCarouselProps {
    mainImage: string;
    images?: string[];
    title: string;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ mainImage, images = [], title }) => {
    const allImages = [mainImage, ...images];
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextImage = () => setCurrentIndex((prev) => (prev + 1) % allImages.length);
    const prevImage = () => setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);

    if (allImages.length === 0) return null;

    return (
        <div className="relative w-full h-96 bg-brand-black/5 rounded-2xl overflow-hidden group">
            <img
                src={allImages[currentIndex] || mainImage}
                alt={`${title} - View ${currentIndex + 1}`}
                className="w-full h-full object-cover transition-all duration-500"
            />

            {/* Controls */}
            {allImages.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); prevImage(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-brand-black p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); nextImage(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-brand-black p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                        {allImages.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default ImageCarousel;
