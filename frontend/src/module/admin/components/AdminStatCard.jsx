import React from 'react';

const AdminStatCard = ({ label, value, change, icon: Icon, color = 'bg-sky-500' }) => (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center shrink-0 shadow-lg`}>
            <Icon size={20} className="text-white" />
        </div>
        <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal leading-none mb-1">{label}</p>
            <p className="text-lg font-medium text-slate-900 leading-tight">{value}</p>
            {change && <p className="text-[9px] font-medium text-slate-400 mt-0.5">{change}</p>}
        </div>
    </div>
);

export default AdminStatCard;
