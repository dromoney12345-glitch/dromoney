import React, { useState, useEffect } from 'react';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { useUser } from '../context/UserContext';

const PullToRefreshWrapper = ({ children }) => {
    const { refreshUserProfile } = useUser();
    const [isMobileApp, setIsMobileApp] = useState(false);

    useEffect(() => {
        // Detect if it is the mobile app or mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.flutter_inappwebview;
        setIsMobileApp(isMobile);
    }, []);

    const handleRefresh = async () => {
        if (refreshUserProfile) {
            await refreshUserProfile();
        }
        await new Promise(resolve => setTimeout(resolve, 800)); // slight UX delay
    };

    if (!isMobileApp) {
        return (
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative h-full">
                <div className="min-h-full w-full bg-slate-50 flex flex-col">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <PullToRefresh 
            onRefresh={handleRefresh} 
            pullingContent={<div className="p-4 text-center text-slate-400 text-sm">Pull down to refresh...</div>}
            refreshingContent={<div className="p-4 text-center text-blue-500 text-sm flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>Refreshing...</div>}
        >
            <div className="min-h-full w-full bg-slate-50 flex flex-col relative z-0">
                {children}
            </div>
        </PullToRefresh>
    );
};

export default PullToRefreshWrapper;
