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
        'not started': 'bg-slate-100 text-slate-500'
    };
    const cls = styles[status?.toLowerCase()] || 'bg-slate-100 text-slate-500';
    
    return (
        <span className={`inline-flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-lg min-w-[85px] text-center ${cls}`}>
            {status}
        </span>
    );
};

export default StatusBadge;
