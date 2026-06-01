import React from 'react';

const StatusBadge = ({ status }) => {
    const styles = {
        active: 'bg-emerald-50 text-emerald-600',
        approved: 'bg-emerald-50 text-emerald-600',
        success: 'bg-emerald-50 text-emerald-600',
        pending: 'bg-amber-50 text-amber-600',
        blocked: 'bg-rose-50 text-rose-600',
        rejected: 'bg-rose-50 text-rose-600',
        failed: 'bg-rose-50 text-rose-600',
        inactive: 'bg-slate-100 text-slate-400',
    };
    const cls = styles[status?.toLowerCase()] || 'bg-slate-100 text-slate-500';
    return (
        <span className={`text-[9px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-lg ${cls}`}>
            {status}
        </span>
    );
};

export default StatusBadge;
