import React from 'react';
import { useUser } from '../context/UserContext';
import { 
    ArrowLeft, 
    Bell, 
    Search, 
    Wallet, 
    ArrowUpRight, 
    ArrowDownLeft, 
    RefreshCcw, 
    History as HistoryIcon,
    MoreHorizontal,
    ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const History = () => {
    const { userData } = useUser();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col relative overflow-hidden font-poppins">
            {/* --- Premium Background Decorative Elements --- */}
            <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[30%] bg-emerald-100/30 blur-[100px] rounded-full"></div>
            <div className="absolute top-[15%] right-[-5%] w-[40%] h-[30%] bg-sky-100/30 blur-[100px] rounded-full"></div>

            <div className="relative z-10 bg-white px-4 py-2.5 flex items-center gap-3 sticky top-0 z-40 border-b border-[#EDE4DC]">
                <button onClick={() => navigate(-1)} className="text-[#462211] active:scale-95 transition-all">
                    <ChevronLeft size={22} strokeWidth={2.2} />
                </button>
                <h1 className="text-[17px] font-semibold text-[#462211] tracking-tight">History</h1>
            </div>

            <div className="relative z-10 p-4 flex flex-col gap-6">
                
                {/* --- Debit Card Styled Wallet Section --- */}
                <div className="relative group perspective-1000">
                    <div className="bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] aspect-[1.6/1] rounded-2xl p-6 shadow-2xl relative overflow-hidden border border-white/10">
                        {/* Holographic Overlays */}
                        <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[100%] bg-blue-500/10 blur-[80px] rounded-full rotate-45"></div>
                        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[80%] bg-emerald-500/10 blur-[80px] rounded-full -rotate-12"></div>
                        
                        {/* Card Content */}
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            {/* Top: Chip & Label */}
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-3">
                                    <div className="w-10 h-8 bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500 rounded-md relative overflow-hidden shadow-inner border border-yellow-600/20">
                                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                                            {[...Array(9)].map((_, i) => <div key={i} className="border border-black/20"></div>)}
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-normal text-white/40 uppercase tracking-[0.2em]">Platinum Member</span>
                                </div>
                                <div className="text-right">
                                    <h3 className="font-medium text-[14px] italic tracking-widest">
                                        <span className="text-[#8B4513]">DRO</span>
                                        <span className="text-white">MONEY</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Middle: Balance */}
                            <div className="mt-2">
                                <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Wallet Balance</p>
                                <h3 className="text-white text-3xl font-medium tracking-tight">
                                    ₹{Number(userData?.wallet?.balance || 0).toFixed(2)}
                                </h3>
                            </div>

                            {/* Bottom: Card Number & User */}
                            <div className="flex justify-between items-end mt-4">
                                <div className="flex flex-col gap-1">
                                    <p className="text-white/60 text-[13px] tracking-[0.25em] font-mono">**** **** **** 88{userData?.id?.slice(-2) || '42'}</p>
                                    <p className="text-white/80 text-[11px] font-normal uppercase tracking-wider mt-1">{userData?.name || 'User Name'}</p>
                                </div>
                                <div className="flex gap-1.5 opacity-60">
                                    <div className="w-6 h-6 rounded-full bg-rose-500/40 blur-[1px]"></div>
                                    <div className="w-6 h-6 rounded-full bg-amber-500/40 blur-[1px] -ml-3"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Action Overlay Row (Floating slightly below) */}
                    <div className="absolute bottom-[-24px] left-4 right-4 bg-white shadow-xl p-3 flex justify-between items-center border border-slate-100 rounded-xl">
                        {[
                            { icon: ArrowUpRight, label: 'Send', color: 'text-blue-500 bg-blue-50' },
                            { icon: ArrowDownLeft, label: 'Receive', color: 'text-emerald-500 bg-emerald-50' },
                            { icon: RefreshCcw, label: 'Swap', color: 'text-purple-500 bg-purple-50' },
                            { icon: HistoryIcon, label: 'More', color: 'text-slate-500 bg-slate-50' }
                        ].map((action, i) => (
                            <div key={i} className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition-transform px-3 border-r last:border-r-0 border-slate-100">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${action.color}`}>
                                    <action.icon size={16} />
                                </div>
                                <span className="text-[9px] font-normal text-slate-500">{action.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8"></div>

                {/* --- Recent Activity Section --- */}
                <div className="flex flex-col gap-3 mt-1">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[14px] font-medium text-slate-800 uppercase tracking-wider">Recent Activity</h3>
                        <button className="text-[11px] font-normal text-blue-600 hover:underline">See all</button>
                    </div>

                    <div className="flex flex-col">
                        {(!userData?.wallet?.transactions || userData?.wallet?.transactions.length === 0) ? (
                            <div className="bg-white/60 backdrop-blur-sm border border-slate-100 p-8 text-center shadow-sm">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                                    <HistoryIcon className="text-slate-300" size={24} />
                                </div>
                                <h3 className="text-slate-500 font-medium text-sm">No activity yet</h3>
                                <p className="text-[11px] text-slate-400 mt-1">Transactions will appear here.</p>
                            </div>
                        ) : (
                            userData.wallet.transactions.map((item, index) => (
                                <div 
                                    key={item._id || index} 
                                    className="bg-white p-3.5 flex items-center justify-between shadow-sm border-b border-slate-100 last:border-b-0 group hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${item.type === 'credit' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                            {item.type === 'credit' ? (
                                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                                    <ArrowDownLeft size={12} />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white">
                                                    <ArrowUpRight size={12} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-[13px] font-medium text-slate-800">{item.source || 'Transaction'}</h4>
                                            <p className="text-[10px] font-normal text-slate-400 mt-0.5">
                                                {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Just now'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className={`text-[14px] font-medium ${item.type === 'credit' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {item.type === 'credit' ? '+' : '-'}₹{Number(item.amount).toFixed(2)}
                                        </p>
                                        <MoreHorizontal size={12} className="text-slate-300 ml-auto mt-0.5" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="h-20"></div>
            </div>
        </div>
    );
};

export default History;
