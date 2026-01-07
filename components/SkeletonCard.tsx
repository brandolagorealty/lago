
import React from 'react';

const SkeletonCard: React.FC = () => {
    return (
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 h-full flex flex-col animate-pulse">
            {/* Image Skeleton */}
            <div className="relative h-64 w-full bg-slate-200"></div>

            <div className="p-6 flex flex-col flex-grow">
                {/* Price & Title */}
                <div className="flex justify-between items-start mb-4">
                    <div className="h-8 bg-slate-200 rounded w-1/3"></div>
                </div>

                <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>

                {/* Location */}
                <div className="flex items-center gap-1 mb-6">
                    <div className="w-4 h-4 bg-slate-200 rounded-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </div>

                {/* Specs */}
                <div className="flex items-center gap-4 text-slate-500 text-sm mb-6 border-y border-slate-100 py-4">
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-slate-200 rounded-full"></div>
                        <div className="w-8 h-4 bg-slate-200 rounded"></div>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-slate-200 rounded-full"></div>
                        <div className="w-8 h-4 bg-slate-200 rounded"></div>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-slate-200 rounded-full"></div>
                        <div className="w-8 h-4 bg-slate-200 rounded"></div>
                    </div>
                </div>

                {/* Button */}
                <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-10 bg-slate-200 rounded-full w-24"></div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonCard;
