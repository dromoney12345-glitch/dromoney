import React from 'react';

const AdminStatCard = ({ label, value, change, icon: Icon, color = 'bg-sky-500' }) => (
    <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm flex items-center gap-3">
        <div className={`w-8 h-8 ${color} rounded-md flex items-center justify-center shrink-0`}>
            <Icon size={16} className="text-white" />
        </div>
        <div>
            <p className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-[15px] font-bold text-slate-800 leading-none">{value}</p>
            {change && <p className="text-[8.5px] font-medium text-slate-400 mt-1">{change}</p>}
        </div>
    </div>
);

export default AdminStatCard;
