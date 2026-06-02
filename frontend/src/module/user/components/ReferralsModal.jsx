import React, { useState, useEffect } from 'react';
import { X, Users, IndianRupee, Loader2 } from 'lucide-react';
import api from '../../shared/services/api';

const ReferralsModal = ({ isOpen, onClose, referralCount = 0 }) => {
    const [referralsList, setReferralsList] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchReferrals();
        }
    }, [isOpen]);

    const fetchReferrals = async () => {
        setLoading(true);
        try {
            const res = await api.get('/user/data/referrals');
            if (res.success) {
                setReferralsList(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch referrals:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const formatDate = (dateString) => {
        const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
            
            <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[85vh] flex flex-col">
                
                <div className="p-5 bg-white border-b border-slate-100 flex justify-between items-center z-10 sticky top-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-50 text-sky-500 rounded-xl flex items-center justify-center border border-sky-100/50">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-800 text-[16px] tracking-tight">My Referrals</h3>
                            <p className="text-[9px] uppercase tracking-widest text-sky-500 font-medium">{referralsList.length || referralCount} Successful Invites</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-95 transition-all outline-none border border-slate-100">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto bg-slate-50/80">
                    <div className="flex flex-col gap-3">
                        {loading ? (
                            <div className="flex justify-center p-6"><Loader2 className="animate-spin text-sky-500" /></div>
                        ) : referralsList.length === 0 ? (
                            <div className="text-center p-6 text-[11px] font-medium text-slate-400 uppercase tracking-widest">No successful invites yet.</div>
                        ) : (
                            referralsList.map((refData, i) => {
                                const friendName = refData.referredUser?.name || 'Unknown User';
                                const dateStr = formatDate(refData.createdAt);
                                const bonus = refData.amount || 200;
                                return (
                                    <div key={refData._id || i} style={{ animationDelay: `${i * 50}ms` }} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex justify-between items-center animate-in slide-in-from-bottom-4 duration-500 fill-mode-both">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-medium text-sm uppercase ${i % 2 === 0 ? 'bg-sky-50 text-sky-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {friendName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="text-[13px] font-medium text-slate-800">{friendName}</h4>
                                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">{dateStr}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg flex items-center gap-0.5 border border-emerald-100/50">
                                                +<IndianRupee size={10} />{bonus}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="p-5 bg-white border-t border-slate-100 sticky bottom-0">
                    <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white font-medium text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-slate-200">
                        Close List
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReferralsModal;
