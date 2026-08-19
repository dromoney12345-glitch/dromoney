import React, { useState, useEffect } from 'react';
import { X, Users, IndianRupee, Loader2 } from 'lucide-react';
import api from '../../shared/services/api';

const ReferralsModal = ({ isOpen, onClose, referralCount = 0 }) => {
    const [referralsList, setReferralsList] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) fetchReferrals();
    }, [isOpen]);

    const fetchReferrals = async () => {
        setLoading(true);
        try {
            const res = await api.get('/user/data/referrals');
            if (res.success) {
                setReferralsList(Array.isArray(res.data) ? res.data : []);
            }
        } catch (err) {
            console.error('Failed to fetch referrals:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const totalCount = referralsList.length || referralCount || 0;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/45 p-4"
            onClick={onClose}
        >
            <div
                className="relative bg-white w-full max-w-[360px] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden"
                style={{ maxHeight: 'min(80dvh, 520px)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-3.5 py-2.5 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 bg-sky-50 text-sky-500 rounded-lg flex items-center justify-center border border-sky-100 shrink-0">
                            <Users size={16} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-medium text-slate-800 text-[14px] tracking-tight leading-tight">
                                My Referrals
                            </h3>
                            <p className="text-[8px] uppercase tracking-widest text-sky-500 font-medium mt-0.5">
                                {totalCount} Successful Invite{totalCount === 1 ? '' : 's'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 bg-slate-50 rounded-full text-slate-400 active:scale-95 border border-slate-100 shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* List — only as tall as content, scrolls if many */}
                <div className="overflow-y-auto overscroll-contain px-3 py-2.5 min-h-0">
                    {loading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 size={18} className="animate-spin text-sky-500" />
                        </div>
                    ) : referralsList.length === 0 ? (
                        <div className="text-center py-6 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                            No successful invites yet.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {referralsList.map((refData, i) => {
                                const friendName = refData.referredUser?.name || 'Unknown User';
                                const bonus = refData.amount || 200;
                                return (
                                    <div
                                        key={refData._id || i}
                                        className="bg-slate-50/80 px-2.5 py-2 rounded-xl border border-slate-100 flex justify-between items-center gap-2"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-[11px] uppercase shrink-0 ${
                                                    i % 2 === 0
                                                        ? 'bg-sky-50 text-sky-600'
                                                        : 'bg-indigo-50 text-indigo-600'
                                                }`}
                                            >
                                                {friendName.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-[12px] font-medium text-slate-800 truncate leading-tight">
                                                    {friendName}
                                                </h4>
                                                <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                                                    {formatDate(refData.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md inline-flex items-center gap-0.5 border border-emerald-100 shrink-0">
                                            +<IndianRupee size={9} />
                                            {bonus}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="px-3 pt-2 border-t border-slate-100 shrink-0"
                    style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))' }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 bg-slate-900 text-white font-medium text-[10px] uppercase tracking-[0.15em] rounded-xl active:scale-[0.98] transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReferralsModal;
