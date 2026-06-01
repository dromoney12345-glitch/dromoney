import React from 'react';
import { ChevronRight } from 'lucide-react';

const PageHeader = ({ title, subtitle, action }) => (
    <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-2xl font-medium text-slate-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-slate-400 font-medium mt-0.5">{subtitle}</p>}
        </div>
        {action && (
            <button
                onClick={action.onClick}
                className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-medium text-[12px] uppercase tracking-widest px-5 py-2.5 rounded-xl shadow-lg shadow-sky-100 transition-all active:scale-95"
            >
                {action.icon && <action.icon size={16} />}
                {action.label}
            </button>
        )}
    </div>
);

export default PageHeader;
