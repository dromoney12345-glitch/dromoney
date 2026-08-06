import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';
import { 
    Users, ChevronLeft, Calendar, 
    CheckCircle2, DollarSign, Clock, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MarketingHistory = () => {
    const navigate = useNavigate();
    const { userData } = useUser();
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReferralHistory = async () => {
            try {
                const res = await api.get('/user/data/referrals');
                if (res.success && res.data) {
                    const mapped = res.data.map(item => {
                        const dateObj = new Date(item.createdAt);
                        const dateFormatted = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                        const timeFormatted = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                        return {
                            id: item._id,
                            name: item.referredUser?.name || 'Referred User',
                            phone: item.referredUser?.phone ? `${item.referredUser.phone.substring(0, 5)}XXXXX` : 'N/A',
                            amount: item.amount,
                            date: dateFormatted,
                            time: timeFormatted,
                            status: item.status === 'Completed' ? 'Settled' : item.status
                        };
                    });
                    setReferrals(mapped);
                }
            } catch (err) {
                console.error("Failed to fetch referrals list", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReferralHistory();
    }, []);

    const totalRevenue = referrals.reduce((acc, curr) => acc + curr.amount, 0);
    const currentMonthYear = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    return (
        <div className="flex flex-col min-h-screen bg-white animate-in slide-in-from-right duration-500 pb-20">
            {/* Header */}
            <div className="px-6 pt-10 pb-6 bg-gradient-to-b from-slate-50 to-white flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
                <button 
                    onClick={() => navigate(-1)}
                    className="w-11 h-11 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all"
                >
                    <ChevronLeft size={22} />
                </button>
                <div className="text-center">
                   <h2 className="text-lg font-medium text-slate-900 tracking-tight">Referral History</h2>
                   <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">Track your earnings</p>
                </div>
                <div className="w-11 h-11"></div>
            </div>

            <div className="px-6 pt-4 space-y-6">
                {/* Stats Summary Bubble */}
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="bg-sky-50 border border-sky-100 rounded-3xl px-6 py-4 flex flex-col min-w-[140px]">
                        <span className="text-[9px] font-medium text-sky-400 uppercase tracking-widest leading-none mb-2">Success</span>
                        <span className="text-xl font-medium text-sky-600 italic leading-none">{referrals.length} Users</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-3xl px-6 py-4 flex flex-col min-w-[140px]">
                        <span className="text-[9px] font-medium text-emerald-400 uppercase tracking-widest leading-none mb-2">Revenue</span>
                        <span className="text-xl font-medium text-emerald-600 italic leading-none">₹{totalRevenue}</span>
                    </div>
                </div>

                {/* List Header */}
                <div className="flex items-center justify-between px-1 mt-2">
                    <h4 className="text-[11px] font-medium text-slate-900 uppercase tracking-[0.2em] italic">Recent Activity</h4>
                    <div className="flex items-center gap-1">
                       <Calendar size={12} className="text-slate-300" />
                       <span className="text-[10px] font-medium text-slate-400">{currentMonthYear}</span>
                    </div>
                </div>

                {/* The List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-10">
                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Loading transactions...</p>
                        </div>
                    ) : referrals.length === 0 ? (
                        <div className="text-center py-10 px-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-1">No referrals yet</p>
                            <p className="text-[10px] font-semibold text-slate-400">Share your link — earn ₹200 when they complete KYC and buy ₹499.</p>
                        </div>
                    ) : (
                        referrals.map((ref) => (
                            <div key={ref.id} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
                                 <div className="bg-slate-50/50 rounded-[2rem] p-5 flex items-center justify-between border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all group overflow-hidden">
                                     {/* Background Decoration */}
                                     <div className="absolute right-0 top-0 text-slate-100/50 group-hover:text-emerald-100/40 transition-colors">
                                         <DollarSign size={80} strokeWidth={3} />
                                     </div>
                                     
                                     <div className="flex items-center gap-4 relative z-10">
                                         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:border-sky-200 transition-colors">
                                             <Users size={22} className="text-slate-400 group-hover:text-sky-500 transition-colors" />
                                         </div>
                                         <div>
                                             <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                                                 {ref.name}
                                                 <ArrowUpRight size={12} className="text-slate-300" />
                                             </p>
                                             <div className="flex items-center gap-2 mt-1">
                                                 <Clock size={10} className="text-slate-300" />
                                                 <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">{ref.date} • {ref.time}</p>
                                             </div>
                                         </div>
                                     </div>

                                     <div className="text-right relative z-10">
                                         <p className="text-base font-medium text-emerald-500 italic">+₹{ref.amount}</p>
                                         <div className="flex items-center justify-end gap-1.5 mt-1">
                                             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200"></div>
                                             <p className="text-[9px] font-medium text-slate-800 uppercase tracking-widest">{ref.status}</p>
                                         </div>
                                     </div>
                                 </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Empty Space Footer */}
                <div className="py-8 text-center opacity-40">
                    <CheckCircle2 size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">End of transaction list</p>
                </div>
            </div>
        </div>
    );
};

export default MarketingHistory;
