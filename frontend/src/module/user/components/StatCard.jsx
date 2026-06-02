import React from 'react';
import { IndianRupee, CreditCard } from 'lucide-react';

const StatCard = ({ title, value, type = 'light' }) => {
    const isDark = type === 'dark';
    
    return (
        <div className={`rounded-2xl p-4 shadow-sm relative overflow-hidden group transition-all duration-300 ${
            isDark 
            ? 'bg-sky-600 text-white shadow-sky-200' 
            : 'bg-white border border-sky-100 text-sky-900 group-hover:border-sky-300'
        }`}>
            <div className="relative z-10">
                <p className={`text-[10px] font-medium uppercase tracking-widest mb-1 ${isDark ? 'text-sky-100' : 'text-sky-500'}`}>
                    {title}
                </p>
                <h2 className="text-2xl font-medium leading-none">₹{value}</h2>
            </div>
            
            <div className={`absolute right-0 bottom-0 opacity-10 translate-x-2 translate-y-2 transition-transform group-hover:scale-110 ${
                isDark ? 'text-white' : 'text-sky-900'
            }`}>
                {title.toLowerCase().includes('wealth') ? <CreditCard size={64} /> : <IndianRupee size={64} />}
            </div>
        </div>
    );
};

export default StatCard;
