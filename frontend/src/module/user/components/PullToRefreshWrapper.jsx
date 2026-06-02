import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const PullToRefreshWrapper = ({ children, onRefresh }) => {
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleTouchStart = (e) => {
            if (container.scrollTop === 0) {
                setStartY(e.touches[0].clientY);
                setIsPulling(true);
            }
        };

        const handleTouchMove = (e) => {
            if (!isPulling || isRefreshing) return;
            const y = e.touches[0].clientY;
            
            // Only pull if scrolling down and at the top
            if (y > startY && container.scrollTop <= 0) {
                // Prevent default to stop normal scrolling while pulling
                if (e.cancelable) e.preventDefault();
                setCurrentY(y);
            }
        };

        const handleTouchEnd = async () => {
            if (!isPulling) return;
            
            const distance = currentY - startY;
            if (distance > 100 && !isRefreshing) {
                setIsRefreshing(true);
                if (onRefresh) {
                    await onRefresh();
                } else {
                    window.location.reload();
                }
            } else {
                setStartY(0);
                setCurrentY(0);
                setIsPulling(false);
            }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [startY, currentY, isPulling, isRefreshing, onRefresh]);

    const pullDistance = Math.min(Math.max(currentY - startY, 0), 120);

    return (
        <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden relative"
        >
            <div 
                className="absolute top-0 left-0 w-full flex justify-center items-center overflow-hidden transition-all duration-200 z-50 pointer-events-none"
                style={{ height: `${pullDistance}px`, opacity: pullDistance / 100 }}
            >
                {pullDistance > 10 && (
                    <div className="bg-white rounded-full p-2 shadow-md">
                        <Loader2 
                            className={`w-6 h-6 text-sky-500 ${pullDistance > 80 || isRefreshing ? 'animate-spin' : ''}`} 
                            style={!isRefreshing ? { transform: `rotate(${pullDistance * 3}deg)` } : {}} 
                        />
                    </div>
                )}
            </div>
            
            <div 
                style={{ 
                    transform: `translateY(${isRefreshing ? 60 : pullDistance * 0.4}px)`, 
                    transition: isPulling ? 'none' : 'transform 0.3s ease-out' 
                }} 
                className="min-h-full w-full bg-slate-50 flex flex-col"
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefreshWrapper;
