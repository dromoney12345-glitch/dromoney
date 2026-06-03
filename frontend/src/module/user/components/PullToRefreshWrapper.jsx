import React from 'react';

const PullToRefreshWrapper = ({ children, onRefresh }) => {
    // Pull to refresh feature removed as per requirement
    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
            <div className="min-h-full w-full bg-slate-50 flex flex-col">
                {children}
            </div>
        </div>
    );
};

export default PullToRefreshWrapper;
