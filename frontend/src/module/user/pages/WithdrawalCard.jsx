import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Info } from 'lucide-react';
import { useUser } from '../context/UserContext';
import PaymentModal from '../components/PaymentModal';
import api from '../../shared/services/api';

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const WithdrawalCard = () => {
    const navigate = useNavigate();
    const { userData, refreshUserProfile } = useUser();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [payOpen, setPayOpen] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get('/user/data/withdrawal-card');
                if (res.success) setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="min-h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" />
            </div>
        );
    }

    const preview = data?.preview || {};
    const quote = data?.quote || { amount: 499, note: '' };
    const card = data?.card || userData?.withdrawalCard || {};
    const alreadyActive = card.status === 'active';
    const expired = card.status === 'expired';
    const isRenewal = quote.isRenewal || expired;

    return (
        <div className="min-h-full bg-[#FCF8F5] font-poppins p-4 pb-10">
            <button type="button" onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center mb-3">
                <ChevronLeft size={22} />
            </button>
            <h1 className="text-[18px] font-semibold text-[#462211]">
                {expired ? 'Renew Withdrawal Card' : 'Create Withdrawal Card'}
            </h1>
            <p className="text-[12px] text-[#7A5648] mt-1">{quote.note}</p>

            {alreadyActive ? (
                <div className="mt-5 bg-white border border-[#EDE4DC] rounded-2xl p-4">
                    <p className="text-[11px] uppercase tracking-widest text-emerald-600">Active</p>
                    <p className="text-[#462211] mt-2">{card.holderName}</p>
                    <p className="text-[#7A5648] text-[13px]">{card.phone}</p>
                    <p className="text-[12px] text-slate-400 mt-3">Expiry: {formatDate(card.expiresAt)}</p>
                    {Number(card.lockedReserve) > 0 && (
                        <div className="mt-3 bg-[#FFF5F0] rounded-xl p-3 flex items-start gap-2">
                            <Info size={14} className="text-[#462211] shrink-0 mt-0.5" />
                            <p className="text-[11px] text-[#7A5648] leading-snug">
                                ₹{Number(card.lockedReserve).toFixed(0)} is reserved in your Virtual Wallet for card renewal and cannot be withdrawn.
                            </p>
                        </div>
                    )}
                    <button type="button" onClick={() => navigate('/user/wallet')} className="mt-4 w-full bg-[#462211] text-white py-3 rounded-xl text-[12px] uppercase tracking-widest">
                        Open Wallet
                    </button>
                </div>
            ) : (
                <>
                    <div className="mt-5 bg-white border border-[#EDE4DC] rounded-2xl p-4 space-y-3">
                        {[
                            ['Name', preview.name || userData.name],
                            ['Number', preview.phone || userData.phone],
                            ["Today's Date", formatDate(preview.issuedAt || new Date())],
                            ['Expiry Date', formatDate(preview.expiresAt)],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <p className="text-[9px] uppercase tracking-widest text-slate-400">{label}</p>
                                <p className="text-[14px] text-[#462211] mt-0.5">{value || '—'}</p>
                            </div>
                        ))}
                    </div>

                    {isRenewal && quote.displayAmount > quote.amount && (
                        <div className="mt-4 bg-[#FFF5F0] rounded-2xl p-4 border border-[#EDE4DC]">
                            <p className="text-[12px] text-[#7A5648]">Renewal price</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-[14px] text-slate-400 line-through">₹{quote.displayAmount}</span>
                                <span className="text-[22px] font-semibold text-[#462211]">₹{quote.amount}</span>
                            </div>
                            {quote.reserveApplied > 0 && (
                                <p className="text-[11px] text-emerald-700 mt-1">₹{quote.reserveApplied} applied from your wallet reserve</p>
                            )}
                        </div>
                    )}

                    {!isRenewal && quote.credit > 0 && (
                        <div className="mt-4 bg-[#EEF7EE] rounded-2xl p-4 border border-emerald-100">
                            <p className="text-[12px] font-medium text-emerald-800">Early bonus</p>
                            <p className="text-[11px] text-emerald-700 mt-1 leading-snug">
                                Pay within 3 days of KYC — ₹{quote.credit} will be credited to Virtual Wallet (reserved, non-withdrawable).
                            </p>
                        </div>
                    )}

                    <p className="text-[12px] text-[#7A5648] mt-4">
                        Payable: {isRenewal && quote.displayAmount > quote.amount ? (
                            <><span className="line-through mr-1">₹{quote.displayAmount}</span>₹{quote.amount}</>
                        ) : (
                            <>₹{quote.amount}</>
                        )}
                    </p>
                    <button
                        type="button"
                        onClick={() => setPayOpen(true)}
                        className="mt-3 w-full bg-[#462211] text-white py-3.5 rounded-xl text-[12px] font-medium uppercase tracking-widest"
                    >
                        Next · Pay ₹{quote.amount}
                    </button>
                </>
            )}

            {payOpen && (
                <PaymentModal
                    isOpen
                    onClose={() => setPayOpen(false)}
                    plan={expired ? 'Withdrawal Card Renew' : 'Withdrawal Card'}
                    amount={quote.amount}
                    type="PLATFORM_UNLOCK"
                    onSuccess={async () => {
                        setPayOpen(false);
                        await refreshUserProfile?.();
                        navigate('/user/wallet');
                    }}
                />
            )}
        </div>
    );
};

export default WithdrawalCard;
