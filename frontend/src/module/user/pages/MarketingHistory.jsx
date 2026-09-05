import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';
import {
    Users, ChevronLeft, Calendar,
    CheckCircle2, DollarSign, Clock, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const statusLabel = (item) => {
    const status = String(item.status || '');
    const milestone = String(item.milestone || '');
    if (status === 'Completed' || status === 'Settled') return 'Settled';
    if (status === 'Failed' || milestone === 'removed') return 'Removed';
    if (status === 'Waiting KYC' || milestone === 'waiting_kyc') return 'Registered';
    if (milestone === 'card_active') return 'To Virtual';
    if (status === 'Pending' || milestone === 'card_pending' || milestone === 'registered') return 'In Pending';
    return status || 'Pending';
};

const MarketingHistory = () => {
    const navigate = useNavigate();
    const { userData } = useUser();
    const [referrals, setReferrals] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReferralHistory = async () => {
            try {
                const res = await api.get('/user/data/referrals');
                const rows = Array.isArray(res?.data) ? res.data : [];
                const mapped = rows.map((item) => {
                    const dateObj = new Date(item.createdAt || Date.now());
                    const dateFormatted = Number.isNaN(dateObj.getTime())
                        ? ''
                        : dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    const timeFormatted = Number.isNaN(dateObj.getTime())
                        ? ''
                        : dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    const name =
                        item.name ||
                        item.referredUser?.name ||
                        item.referredTo ||
                        'Referred User';
                    return {
                        id: String(item._id || item.id || name + dateFormatted),
                        name,
                        amount: Number(item.amount) || 0,
                        date: dateFormatted,
                        time: timeFormatted,
                        status: statusLabel(item),
                    };
                });

                let list = mapped;
                if (list.length === 0) {
                    const walletTx = (userData?.wallet?.transactions || []).filter((t) =>
                        /invite|referral|refer/i.test(`${t.source || ''} ${t.title || ''}`)
                    );
                    list = walletTx.map((t, idx) => {
                        const dateObj = new Date(t.date || t.createdAt || Date.now());
                        return {
                            id: String(t.id || t._id || `tx-${idx}`),
                            name: t.title || t.source || 'Invite earning',
                            amount: Number(t.amount) || 0,
                            date: dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                            time: dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                            status: t.type === 'debit' ? 'Removed' : 'Credited',
                        };
                    });
                }

                setReferrals(list);
                const apiRevenue = Number(res?.totalRevenue);
                setTotalRevenue(
                    Number.isFinite(apiRevenue) && apiRevenue > 0
                        ? apiRevenue
                        : list.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
                );
            } catch (err) {
                console.error('Failed to fetch referrals list', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReferralHistory();
    }, [userData?.wallet?.transactions]);

    const currentMonthYear = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    return (
        <div className="flex flex-col min-h-full bg-[#FCF8F5] font-poppins pb-8">
            <div className="px-4 pt-4 pb-3 bg-white border-b border-[#EDE4DC] flex items-center justify-between sticky top-0 z-30">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 bg-[#FFF5F0] rounded-xl border border-[#EDE4DC] flex items-center justify-center text-[#462211] active:scale-95"
                >
                    <ChevronLeft size={22} />
                </button>
                <div className="text-center">
                    <h2 className="text-[16px] font-semibold text-[#462211] tracking-tight">Referral History</h2>
                    <p className="text-[9px] font-semibold text-[#B3591C] uppercase tracking-widest mt-0.5">Track your earnings</p>
                </div>
                <div className="w-10 h-10" />
            </div>

            <div className="px-4 pt-4 space-y-4">
                <div className="flex gap-3">
                    <div className="flex-1 bg-white border border-[#EDE4DC] rounded-2xl px-4 py-3.5">
                        <span className="text-[9px] font-semibold text-[#9A8478] uppercase tracking-widest leading-none">Success</span>
                        <p className="text-xl font-semibold text-[#462211] mt-1.5">{referrals.length} Users</p>
                    </div>
                    <div className="flex-1 bg-white border border-[#EDE4DC] rounded-2xl px-4 py-3.5">
                        <span className="text-[9px] font-semibold text-[#9A8478] uppercase tracking-widest leading-none">Revenue</span>
                        <p className="text-xl font-semibold text-emerald-600 mt-1.5">₹{totalRevenue}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between px-1">
                    <h4 className="text-[11px] font-semibold text-[#462211] uppercase tracking-widest">Recent Activity</h4>
                    <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-[#9A8478]" />
                        <span className="text-[10px] font-medium text-[#9A8478]">{currentMonthYear}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-10">
                            <p className="text-[11px] font-semibold text-[#9A8478] uppercase tracking-widest">Loading transactions...</p>
                        </div>
                    ) : referrals.length === 0 ? (
                        <div className="text-center py-10 px-5 bg-white rounded-2xl border border-[#EDE4DC]">
                            <p className="text-[11px] font-semibold text-[#462211] uppercase tracking-widest mb-1">No referrals yet</p>
                            <p className="text-[10px] font-medium text-[#7A5648]">
                                Share your Play Store invite link — ₹200 goes to Pending when they register, then to Virtual when they create a Virtual Account.
                            </p>
                        </div>
                    ) : (
                        referrals.map((ref) => (
                            <div key={ref.id} className="bg-white rounded-2xl p-4 flex items-center justify-between border border-[#EDE4DC]">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-11 h-11 bg-[#FFF5F0] rounded-xl flex items-center justify-center border border-[#EDE4DC] shrink-0">
                                        <Users size={18} className="text-[#462211]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold text-[#462211] flex items-center gap-1.5 truncate">
                                            {ref.name}
                                            <ArrowUpRight size={12} className="text-[#C4B5A8] shrink-0" />
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Clock size={10} className="text-[#C4B5A8]" />
                                            <p className="text-[10px] font-medium text-[#9A8478]">
                                                {ref.date}{ref.time ? ` • ${ref.time}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 pl-2">
                                    <p className="text-[15px] font-semibold text-emerald-600">+₹{ref.amount}</p>
                                    <p className="text-[9px] font-semibold text-[#B3591C] uppercase tracking-widest mt-0.5">{ref.status}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="py-6 text-center opacity-50">
                    <CheckCircle2 size={28} className="text-[#C4B5A8] mx-auto mb-2" />
                    <p className="text-[10px] font-medium text-[#9A8478] uppercase tracking-widest">End of transaction list</p>
                </div>
            </div>
        </div>
    );
};

export default MarketingHistory;
