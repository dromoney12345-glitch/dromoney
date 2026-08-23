import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { 
    ChevronLeft, Wallet as WalletIcon, IndianRupee, ArrowUpRight, 
    ArrowDownLeft, History, Filter, AlertCircle, 
    ChevronRight, CheckCircle2, Info, X, Building, Clock, Loader2, ShieldCheck, Users, FileText
} from 'lucide-react';
import UnlockModal from '../components/UnlockModal';
import api from '../../shared/services/api';

const Wallet = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userData, requestWithdrawal, addNotification, refreshUserProfile } = useUser();
    const { wallet, name, isPaid, withdrawalCard } = userData;
    const pendingAmt = Number(wallet?.pendingBalance || 0);
    const virtualAmt = Number(wallet?.virtualBalance || 0);
    const virtualUnlocked = !!isPaid && withdrawalCard?.status === 'active';
    const VIRTUAL_ACCOUNT_PATH = '/user/virtual-account';
    const [pane, setPane] = useState(location.state?.pane === 'pending' ? 'pending' : (location.state?.pane === 'virtual' && virtualUnlocked ? 'virtual' : 'pending'));
    const [pendingFilter, setPendingFilter] = useState('All');
    const [activeTab, setActiveTab] = useState('cash');
    const [amount, setAmount] = useState('');
    const [isUnlockOpen, setIsUnlockOpen] = useState(false);
    const [filter, setFilter] = useState('All'); // 'All', 'Earning', 'Payout'
    const [minWithdrawal, setMinWithdrawal] = useState(100);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState(null); // { message: '', type: 'error'|'success'|'warning' }
    const [bankDetails, setBankDetails] = useState({
        accountNumber: '',
        ifscCode: '',
        holderName: '',
        bankName: '',
        upiId: ''
    });
    const [paymentMethod, setPaymentMethod] = useState('UPI');

    const [pendingWithdrawal, setPendingWithdrawal] = useState(null);
    const [recentWithdrawal, setRecentWithdrawal] = useState(null);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [bankErrors, setBankErrors] = useState({});

    const [showLimitsModal, setShowLimitsModal] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [walletMeta, setWalletMeta] = useState({ withdrawable: 0, lockedReserve: 0 });
    const [referrals, setReferrals] = useState([]);

    const lockedReserve = Number(walletMeta.lockedReserve || withdrawalCard?.lockedReserve || 0);
    const withdrawableAmt = Number(walletMeta.withdrawable || 0);
    const withdrawalFee = Number(walletMeta.withdrawalFee || 0);
    const [withdrawQuote, setWithdrawQuote] = useState(null);

    const handleSettingClick = (id) => {
        if (id === 'withdraw') {
            // Scroll to withdraw section smoothly
            document.getElementById('withdraw-section')?.scrollIntoView({ behavior: 'smooth' });
        } else if (id === 'refer') {
            navigate('/user/marketing', { state: { showReferral: true } });
        } else if (id === 'limits') {
            setShowLimitsModal(true);
        } else if (id === 'security') {
            setShowSecurityModal(true);
        }
    };

    const showToast = (message, type = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchWalletStatus = async () => {
        try {
            const res = await api.get('/user/wallet/balance');
            if (res.success) {
                setPendingWithdrawal(res.pendingWithdrawal || null);
                setRecentWithdrawal(res.recentWithdrawal || null);
                setWalletMeta({
                    withdrawable: Number(res.withdrawable ?? 0),
                    lockedReserve: Number(res.lockedReserve ?? 0),
                    withdrawalFee: Number(res.withdrawalFee ?? 0),
                    minWithdrawal: Number(res.minWithdrawal ?? minWithdrawal),
                });
                if (res.minWithdrawal) setMinWithdrawal(Number(res.minWithdrawal));
            }
        } catch (err) {
            console.error("Failed to load wallet status:", err);
        }
    };

    const fetchReferrals = async () => {
        try {
            const res = await api.get('/user/data/referrals');
            if (res.success) setReferrals(res.data || []);
        } catch (err) {
            console.error('Failed to load referrals:', err);
        }
    };

    // Cooldown countdown timer
    useEffect(() => {
        if (!recentWithdrawal) {
            setCooldownRemaining(0);
            return;
        }

        const updateCooldown = () => {
            const twentyFourHoursMs = 24 * 60 * 60 * 1000;
            const unlockTime = new Date(recentWithdrawal.createdAt).getTime() + twentyFourHoursMs;
            const ms = unlockTime - Date.now();
            if (ms <= 0) {
                setCooldownRemaining(0);
            } else {
                setCooldownRemaining(ms);
            }
        };

        updateCooldown();
        const interval = setInterval(updateCooldown, 1000);
        return () => clearInterval(interval);
    }, [recentWithdrawal]);

    // Fetch dynamic minWithdrawal from settings & wallet status
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/public/settings');
                if (res.success && res.data) {
                    setMinWithdrawal(Number(res.data.minWithdrawal) || 100);
                }
            } catch (err) {
                console.error("Failed to load wallet settings:", err);
            } finally {
                setLoadingSettings(false);
            }
        };
        fetchSettings();
        fetchWalletStatus();
        fetchReferrals();
    }, []);

    useEffect(() => {
        const val = parseFloat(amount);
        if (!amount || isNaN(val) || val <= 0) {
            setWithdrawQuote(null);
            return undefined;
        }
        const t = setTimeout(async () => {
            try {
                const res = await api.get(`/user/wallet/withdraw-quote?amount=${encodeURIComponent(val)}`);
                if (res.success) setWithdrawQuote(res.data);
            } catch (err) {
                console.error('Failed to load withdraw quote', err);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [amount]);

    const goToVirtual = () => {
        if (virtualUnlocked) setPane('virtual');
        else navigate(VIRTUAL_ACCOUNT_PATH);
    };

    useEffect(() => {
        const requested = location.state?.pane;
        if (requested === 'pending') {
            setPane('pending');
            return;
        }
        if (requested === 'virtual') {
            if (virtualUnlocked) setPane('virtual');
            else navigate(VIRTUAL_ACCOUNT_PATH, { replace: true });
        }
    }, [location.state, virtualUnlocked, navigate]);

    // Listen to real-time status updates from UserContext socket events
    useEffect(() => {
        const handleStatusUpdate = (e) => {
            const data = e.detail;
            fetchWalletStatus();
            refreshUserProfile();
            
            // Show a custom popup modal or beautiful top toast!
            if (data.status === 'Approved') {
                showToast("Your redeem request has been approved by admin! Wallet updated.", "success");
            } else if (data.status === 'Rejected') {
                showToast("Your redeem request was rejected by admin.", "error");
            }
        };

        window.addEventListener('withdrawal_status_updated', handleStatusUpdate);
        return () => {
            window.removeEventListener('withdrawal_status_updated', handleStatusUpdate);
        };
    }, []);

    const handleWithdraw = async () => {
        if (!virtualUnlocked) {
            navigate(VIRTUAL_ACCOUNT_PATH);
            return;
        }

        // Enforce cooldown check
        if (cooldownRemaining > 0) {
            showToast("You can only redeem once every 24 hours.", "warning");
            return;
        }

        // Enforce pending check
        if (pendingWithdrawal) {
            showToast("You already have a pending redeem request.", "warning");
            return;
        }

        const val = parseFloat(amount);
        if (isNaN(val) || val < minWithdrawal) {
            addNotification("Invalid Amount", `Minimum redeem is ₹${minWithdrawal}.`, "warning");
            showToast(`Minimum redeem is ₹${minWithdrawal}.`, "warning");
            return;
        }

        if (!withdrawQuote?.sufficient) {
            addNotification(
                "Insufficient Balance",
                withdrawQuote?.shortfall > 0
                    ? `Need ₹${withdrawQuote.totalDeduction} (amount + ₹${withdrawQuote.fee} fee).`
                    : `Minimum redeem is ₹${withdrawQuote?.minWithdrawal || minWithdrawal}.`,
                "warning"
            );
            showToast(`Wait for quote or check amount. Total needed: ₹${withdrawQuote?.totalDeduction || ''}`, "warning");
            return;
        }

        if (paymentMethod === 'UPI') {
            const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
            if (!bankDetails.upiId) {
                showToast('UPI ID is required.', 'error');
                return;
            } else if (!upiRegex.test(bankDetails.upiId)) {
                showToast('Enter a valid UPI ID (e.g. example@ybl).', 'error');
                return;
            }
            // Directly submit for UPI
            submitWithdrawal();
        } else {
            // Open Bank Details Modal for Bank Transfer
            setIsBankModalOpen(true);
        }
    };

    const submitWithdrawal = async () => {
        // Field-level validation
        const errors = {};

        if (paymentMethod === 'Bank Transfer') {
            if (!bankDetails.holderName.trim()) {
                errors.holderName = 'Account holder name is required.';
            } else if (/\d/.test(bankDetails.holderName)) {
                errors.holderName = 'Name cannot contain numbers.';
            } else if (bankDetails.holderName.trim().length < 3) {
                errors.holderName = 'Name must be at least 3 characters.';
            }

            if (!bankDetails.bankName.trim()) {
                errors.bankName = 'Bank name is required.';
            }

            if (!bankDetails.accountNumber) {
                errors.accountNumber = 'Account number is required.';
            } else if (bankDetails.accountNumber.length !== 16) {
                errors.accountNumber = 'Account number must be exactly 16 digits.';
            }

            const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            if (!bankDetails.ifscCode) {
                errors.ifscCode = 'IFSC code is required.';
            } else if (!ifscRegex.test(bankDetails.ifscCode)) {
                errors.ifscCode = 'Enter a valid IFSC code (e.g. SBIN0001234).';
            }
        }

        if (Object.keys(errors).length > 0) {
            setBankErrors(errors);
            return;
        }

        setBankErrors({});
        setIsSubmitting(true);
        try {
            const val = parseFloat(amount);
            const res = await requestWithdrawal(val, bankDetails, paymentMethod);
            if (res.success) {
                // Close bank modal & reset form FIRST
                setIsBankModalOpen(false);
                setAmount('');
                setBankDetails({ accountNumber: '', ifscCode: '', holderName: '', bankName: '', upiId: '' });
                setBankErrors({});
                setIsSubmitting(false);
                // Show success popup immediately
                setIsSuccessModalOpen(true);
                addNotification("Request Sent", "Redeem request submitted! Waiting for admin approval.", "success");
                showToast("Redeem request submitted! Waiting for admin approval.", "success");
                // Refresh profile silently in background (no await so it doesn't block UI)
                refreshUserProfile();
                // Fetch latest wallet/withdrawal status to immediately show the green pending banner
                fetchWalletStatus();
            } else {
                addNotification("Redeem Denied", res.message || "Request failed. Try again.", "error");
                showToast(res.message || "Request failed. Try again.", "error");
                setIsSubmitting(false);
            }
        } catch (err) {
            addNotification("Error", "Something went wrong. Please try again.", "error");
            showToast("Something went wrong. Please try again.", "error");
            setIsSubmitting(false);
        }
    };

    const filteredTransactions = (wallet.transactions || []).filter(tx => {
        if (filter === 'Earning') return tx.type === 'credit';
        if (filter === 'Payout') return tx.type === 'withdrawal' || tx.type === 'debit';
        return true;
    });

    const pendingFilteredTransactions = (wallet.transactions || []).filter((tx) => {
        const t = `${tx.source || ''} ${tx.title || ''}`.toLowerCase();
        if (pendingFilter === 'Invite Earnings') return /invite|referral|refer/.test(t);
        if (pendingFilter === 'Task Earnings') return /task/.test(t);
        if (pendingFilter === 'Transferred') return /released to virtual|transfer to virtual|invite released/.test(t);
        return true;
    });

    const inviteStatusLabel = (ref) => {
        if (ref.status === 'Completed') return { text: 'Released to Virtual', cls: 'text-emerald-700 bg-emerald-50' };
        if (ref.status === 'Failed') return { text: 'Removed', cls: 'text-red-700 bg-red-50' };
        if (ref.milestone === 'card_active') return { text: 'Card active — releasing', cls: 'text-emerald-700 bg-emerald-50' };
        if (ref.milestone === 'day14') return { text: '14-day warning', cls: 'text-red-700 bg-red-50' };
        if (ref.milestone === 'day7') return { text: '7-day penalty zone', cls: 'text-amber-700 bg-amber-50' };
        if (ref.milestone === 'day3_bonus') return { text: `${ref.daysLeft} days left · bonus window`, cls: 'text-[#462211] bg-[#FFF5F0]' };
        if (ref.milestone === 'card_pending') return { text: `${ref.daysLeft} days left for Virtual Account`, cls: 'text-[#462211] bg-[#FFF5F0]' };
        return { text: 'Waiting for KYC', cls: 'text-slate-600 bg-slate-100' };
    };

    const pendingTabs = ['All', 'Invite Earnings', 'Task Earnings', 'Transferred'];

    return (
        <div className="flex flex-col gap-2.5 p-3 animate-in fade-in duration-700 bg-[#FCF8F5] font-poppins">
            <UnlockModal isOpen={isUnlockOpen} onClose={() => setIsUnlockOpen(false)} />

            {(pane !== 'virtual' || !virtualUnlocked) ? (
                <>
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="w-8 h-8 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center text-[#462211] active:scale-95 shadow-sm shrink-0"
                            >
                                <ChevronLeft size={18} strokeWidth={2.5} />
                            </button>
                            <h1 className="text-[16px] font-semibold text-[#462211]">Pending Wallet</h1>
                        </div>
                        <button
                            type="button"
                            onClick={goToVirtual}
                            className="bg-white border border-[#EDE4DC] text-[#462211] px-2.5 py-1.5 rounded-full text-[10px] font-medium flex items-center gap-1.5 shrink-0"
                        >
                            <WalletIcon size={13} /> Virtual Account
                        </button>
                    </div>

                    <div className="bg-[#FFF5F0] rounded-2xl p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[12px] text-[#462211]">Wallet Balance</p>
                                <p className="text-[28px] font-medium text-[#462211] leading-tight mt-1">
                                    ₹ {pendingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="w-11 h-11 rounded-full bg-[#F3E8E0] text-[#462211] flex items-center justify-center">
                                <WalletIcon size={18} />
                            </div>
                        </div>
                        <div className="border-t border-[#E8D5C8] mt-3 pt-3">
                            <p className="text-[11px] text-[#7A5648] leading-snug">
                                This is your pending balance. Amount from invites, tasks, ads or other earnings will be transferred to your Virtual Account after it is created.
                            </p>
                        </div>
                    </div>

                    <div className="bg-[#FFF5F0] rounded-2xl p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Info size={14} className="text-[#462211]" />
                            <h3 className="text-[13px] font-medium text-[#462211]">Important Information</h3>
                        </div>
                        <ul className="space-y-1.5 text-[12px] text-[#462211] leading-snug list-disc pl-4">
                            <li>Pending Wallet stays open for life — you can view it anytime.</li>
                            <li>Invite ₹200 is added to Pending when the invited user completes KYC.</li>
                            <li>That ₹200 moves to Virtual Account only when they create a Virtual Account.</li>
                            <li>Virtual Account opens only after you create it. Then you can withdraw.</li>
                            <li>If they stay inactive for 28 days without a Virtual Account, the invite and ₹200 can be removed.</li>
                        </ul>
                    </div>

                    {referrals.length > 0 && (
                        <>
                            <h3 className="text-[13px] font-medium text-[#462211] px-0.5">Your Invites</h3>
                            <div className="bg-white rounded-2xl overflow-hidden divide-y divide-slate-50">
                                {referrals.map((ref) => {
                                    const badge = inviteStatusLabel(ref);
                                    return (
                                        <div key={ref._id} className="px-3 py-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-medium text-[#462211] truncate">{ref.name}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">₹{ref.amount} · {ref.status}</p>
                                                </div>
                                                <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
                                                    {badge.text}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    <h3 className="text-[13px] font-medium text-[#462211] px-0.5">Settings</h3>
                    <div className="bg-white rounded-2xl overflow-hidden">
                        {[
                            { id: 'refer', title: 'Invite Reward', subtitle: 'Earn commission on every invite', icon: <Users size={16} className="text-[#462211]" /> },
                            { id: 'limits', title: 'Transfer Limits', subtitle: 'Check daily and minimum limits', icon: <Filter size={16} className="text-[#462211]" /> },
                            { id: 'security', title: 'Security', subtitle: 'Keep your account safe and secure', icon: <ShieldCheck size={16} className="text-[#462211]" /> },
                        ].map((item, idx) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSettingClick(item.id)}
                                className={`w-full px-3 py-3 flex items-center justify-between text-left ${idx < 2 ? 'border-b border-slate-100' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-[#FFF5F0] flex items-center justify-center">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-medium text-[#462211] leading-tight">{item.title}</h4>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{item.subtitle}</p>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-300" />
                            </button>
                        ))}
                    </div>

                    <h3 className="text-[13px] font-medium text-[#462211] px-0.5">History</h3>
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                        {pendingTabs.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setPendingFilter(tab)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap ${
                                    pendingFilter === tab
                                        ? 'bg-[#FFF5F0] text-[#462211] border border-[#462211]/30'
                                        : 'bg-white text-slate-500 border border-transparent'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="bg-white rounded-2xl min-h-[180px] flex flex-col pb-8">
                        {pendingFilteredTransactions.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-12">
                                <div className="w-16 h-16 rounded-full bg-[#FFF5F0] text-[#462211] flex items-center justify-center mb-3">
                                    <FileText size={26} />
                                </div>
                                <p className="text-[14px] font-medium text-[#462211]">No Records Found</p>
                                <p className="text-[12px] text-slate-400 mt-0.5">No transactions yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {pendingFilteredTransactions.map((tx, index) => (
                                    <div key={tx.id || index} className="px-3 py-3 flex items-center justify-between">
                                        <div className="min-w-0">
                                            <h4 className="text-[12px] font-medium text-[#462211] truncate">{tx.title || tx.source}</h4>
                                            <p className="text-[9px] text-slate-400 mt-0.5">
                                                {tx.date ? new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Just now'}
                                            </p>
                                        </div>
                                        <p className={`text-[13px] font-medium shrink-0 ${tx.type === 'credit' ? 'text-emerald-600' : 'text-[#462211]'}`}>
                                            {tx.type === 'credit' ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="w-8 h-8 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center text-[#462211] active:scale-95 shadow-sm shrink-0"
                    >
                        <ChevronLeft size={18} strokeWidth={2.5} />
                    </button>
                    <h1 className="text-[16px] font-semibold text-[#462211]">Virtual Account</h1>
                </div>
                <button
                    type="button"
                    onClick={() => setPane('pending')}
                    className="bg-white border border-[#EDE4DC] text-[#462211] px-2.5 py-1.5 rounded-full text-[10px] font-medium flex items-center gap-1.5 shrink-0"
                >
                    <Clock size={13} /> Pending Wallet
                </button>
            </div>

            <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3.5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#FFF5F0] rounded-xl p-3">
                        <p className="text-[9px] uppercase tracking-widest text-[#462211]">Virtual Account</p>
                        <p className="text-lg font-medium text-[#462211] mt-1">₹{virtualAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{virtualUnlocked ? 'Total balance' : 'Locked'}</p>
                    </div>
                    <button type="button" onClick={() => setPane('pending')} className="bg-[#FFF5F0] rounded-xl p-3 text-left">
                        <p className="text-[9px] uppercase tracking-widest text-[#462211]">Pending Wallet</p>
                        <p className="text-lg font-medium text-[#462211] mt-1">₹{pendingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Tap to view</p>
                    </button>
                </div>
                {virtualUnlocked && lockedReserve > 0 && (
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#F3E8E0]">
                        <div className="rounded-xl p-2.5 bg-[#FCF8F5]">
                            <p className="text-[9px] text-[#7A5648]">Withdrawable</p>
                            <p className="text-[15px] font-medium text-emerald-700 mt-0.5">₹{withdrawableAmt.toFixed(2)}</p>
                        </div>
                        <div className="rounded-xl p-2.5 bg-[#FCF8F5]">
                            <p className="text-[9px] text-[#7A5648]">Reserved</p>
                            <p className="text-[15px] font-medium text-[#462211] mt-0.5">₹{lockedReserve.toFixed(2)}</p>
                        </div>
                    </div>
                )}
                {!virtualUnlocked && (
                    <button
                        type="button"
                        onClick={() => navigate(VIRTUAL_ACCOUNT_PATH)}
                        className="mt-3 w-full bg-[#462211] text-white py-2.5 rounded-xl text-[11px] font-medium uppercase tracking-widest"
                    >
                        Create Virtual Account
                    </button>
                )}
            </div>

            {/* Green Card: Waiting for Admin Confirmation */}
            {pendingWithdrawal && (
                <div className="bg-emerald-50 border border-emerald-100/80 rounded-xl p-3 flex items-center justify-between shadow-sm animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
                            <Clock size={16} className="animate-spin" />
                        </div>
                        <div>
                            <h4 className="text-[10px] text-emerald-900 uppercase tracking-tight leading-none mb-1">waiting for the admin confirmation..</h4>
                            <p className="text-[9px] font-medium text-emerald-600/70">Your redeem request of ₹{pendingWithdrawal.amount} is pending review.</p>
                        </div>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[8px] uppercase tracking-wider px-2 py-1 rounded-md shrink-0">
                        Pending
                    </span>
                </div>
            )}

            

            {/* --- My Cards Heading --- */}
            <div className="flex items-center justify-between px-1 mt-0.5">
                <h2 className="text-[15px] font-medium text-slate-800 tracking-tight">My Account</h2>
            </div>

            <div className="relative rounded-2xl p-4 shadow-lg overflow-hidden bg-gradient-to-br from-[#6B2A12] via-[#8B3A18] to-[#4A1C0C]">
                <div className="absolute right-[-10px] bottom-[-20px] text-white/10 text-[120px] font-medium leading-none pointer-events-none">D</div>

                <div className="relative z-10 flex flex-col justify-between h-[158px]">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[11px] font-medium text-white tracking-[0.18em]">DROMONEY</p>
                            <p className="text-[8px] text-white/70 tracking-[0.16em] mt-0.5">VIRTUAL ACCOUNT</p>
                        </div>
                        <p className="text-[8px] text-white/70 tracking-[0.14em]">VIRTUAL ACCOUNT</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-9 h-7 rounded-md bg-gradient-to-br from-amber-200 to-amber-500 border border-amber-100/40" />
                        <div className="flex items-center gap-2 text-white/90 font-mono tracking-[0.12em] text-[13px]">
                            <span>****</span><span>****</span><span>****</span>
                            <span>{String(userData?.phone || '').replace(/\D/g, '').slice(-4) || '••••'}</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[8px] text-white/55">Wallet Balance</p>
                            <p className="text-[20px] font-medium text-white tracking-tight">
                                {`₹ ${Number(wallet.balance).toFixed(2)}`}
                            </p>
                            <p className="text-[10px] font-medium text-white/90 uppercase tracking-wider mt-0.5">{name || 'USER'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] text-white/55 tracking-widest">VALID THRU</p>
                            <p className="text-[11px] font-medium text-white">
                                {withdrawalCard?.expiresAt
                                    ? `${String(new Date(withdrawalCard.expiresAt).getMonth() + 1).padStart(2, '0')}/${String(new Date(withdrawalCard.expiresAt).getFullYear()).slice(-2)}`
                                    : '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Refer & Earn Promo --- */}
            <div
                onClick={() => navigate('/user/marketing')}
                className="bg-white rounded-xl p-3.5 flex items-center justify-between cursor-pointer active:scale-[0.99] shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#462211] rounded-full flex items-center justify-center text-white shrink-0">
                        <Users size={18} />
                    </div>
                    <div>
                        <h4 className="text-[13px] font-medium text-slate-800 leading-none mb-1">Invite & Earn</h4>
                        <p className="text-[10px] font-medium text-slate-400">Invite your friends and earn rewards</p>
                    </div>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
            </div>

            {/* --- Withdrawal Section --- */}
            <div id="withdraw-section" className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                    {/* Header with Fee Information */}
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
                        <h3 className="text-[13px] font-medium text-slate-800 flex items-center gap-1.5">
                            Redeem Cash
                        </h3>
                        <span className="text-[11px] font-medium text-[#462211]">
                            ₹{withdrawalFee || withdrawQuote?.fee || 0} Fee Added
                        </span>
                    </div>

                    {/* Dynamic Fee & Deduction Previewer */}
                    {withdrawQuote && withdrawQuote.amount > 0 && (
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1.5 animate-in slide-in-from-top-1 duration-300">
                            <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                                <span>Requested Amount:</span>
                                <span className="text-slate-800">₹{Number(withdrawQuote.amount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                                <span>Transaction Fee:</span>
                                <span className="text-amber-600">+ ₹{Number(withdrawQuote.fee).toFixed(2)}</span>
                            </div>
                            <div className="border-t border-slate-200/60 pt-1.5 flex justify-between items-center text-[11px] text-slate-800">
                                <span>Total Deducted from Wallet:</span>
                                <span className="text-[#462211]">₹{Number(withdrawQuote.totalDeduction).toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                        {/* Payment Method Toggle */}
                        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                            <button
                                onClick={() => setPaymentMethod('UPI')}
                                className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${paymentMethod === 'UPI' ? 'bg-white text-[#462211] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                UPI Transfer
                            </button>
                            <button
                                onClick={() => setPaymentMethod('Bank Transfer')}
                                className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${paymentMethod === 'Bank Transfer' ? 'bg-white text-[#462211] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Bank Transfer
                            </button>
                        </div>

                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={`Amount (Min. ₹${minWithdrawal})`}
                            className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3.5 text-[13px] font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#462211] transition-all"
                        />

                        {paymentMethod === 'UPI' && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                <input
                                    type="text"
                                    value={bankDetails.upiId}
                                    onChange={(e) => setBankDetails({...bankDetails, upiId: e.target.value})}
                                    placeholder="Enter your UPI ID (e.g. name@ybl)"
                                    className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3.5 text-[13px] font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#462211] transition-all"
                                />
                            </div>
                        )}


                        
                        {/* 24-Hour Policy Alert Line (Highly Dynamic & Localized) */}
                        <div className={`p-2.5 rounded-lg flex items-start gap-2.5 transition-all duration-300 ${
                            pendingWithdrawal ? 'bg-amber-50 border border-amber-100' :
                            cooldownRemaining > 0 ? 'bg-orange-50 border border-orange-100' :
                            'bg-orange-50 border border-orange-100'
                        }`}>
                            {pendingWithdrawal ? (
                                <Clock size={13} className="text-amber-500 shrink-0 mt-0.5 animate-spin" />
                            ) : cooldownRemaining > 0 ? (
                                <AlertCircle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                            ) : (
                                <Info size={13} className="text-[#462211] shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <p className={`text-[9px] font-medium leading-normal ${
                                    pendingWithdrawal ? 'text-amber-800' :
                                    cooldownRemaining > 0 ? 'text-[#8B3A12]' :
                                    'text-[#8B3A12]'
                                }`}>
                                    {pendingWithdrawal ? (
                                        <>
                                            You have a withdrawal (redeem) request pending. Please wait for admin approval.
                                        </>
                                    ) : cooldownRemaining > 0 ? (
                                        <>
                                            Withdrawal limit: You can redeem only once every 24 hours. Next redeem available in {Math.floor(cooldownRemaining / (1000 * 60 * 60))}h {Math.floor((cooldownRemaining % (1000 * 60 * 60)) / (1000 * 60))}m {Math.floor((cooldownRemaining % (1000 * 60)) / 1000)}s.
                                        </>
                                    ) : (
                                        "Note: You can redeem only once every 24 hours."
                                    )}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleWithdraw}
                            disabled={!!pendingWithdrawal || cooldownRemaining > 0 || isSubmitting}
                            className={`w-full py-3.5 rounded-lg text-[10px] uppercase tracking-widest transition-all
                                ${pendingWithdrawal 
                                    ? 'bg-amber-50 text-amber-400 border border-amber-100 cursor-not-allowed'
                                    : cooldownRemaining > 0
                                    ? 'bg-rose-50 text-rose-400 border border-rose-100 cursor-not-allowed'
                                    : (!isPaid) || (withdrawQuote?.sufficient)
                                    ? 'bg-[#462211] text-white shadow-md active:scale-95 cursor-pointer'
                                    : 'bg-slate-200 text-white pointer-events-none'}`}
                        >
                            {isSubmitting ? 'PROCESSING...' : (pendingWithdrawal 
                                ? 'Redeem Pending Approval' 
                                : cooldownRemaining > 0 
                                ? 'Redeem Locked (24h Cooldown)' 
                                : isPaid 
                                ? 'Redeem Now' 
                                : 'Unlock to Redeem')}
                        </button>
                    </div>
                </div>

            {/* --- Wallet Actions --- */}
            <div className="px-1 mt-1">
                <h3 className="text-[13px] font-medium text-slate-800">Settings</h3>
            </div>
            
            <div className="flex flex-col gap-2">
                {[
                    { id: 'refer', title: 'Invite Reward', subtitle: 'Earn commission', icon: <Users size={16} className="text-[#462211]" /> },
                    { id: 'limits', title: 'Transfer Limits', subtitle: `Min ₹${minWithdrawal} · Daily cap`, icon: <Filter size={16} className="text-[#462211]" />, check: true },
                    { id: 'security', title: 'Security', subtitle: 'Encrypted & protected', icon: <ShieldCheck size={16} className="text-[#462211]" />, check: true },
                ].map((item) => (
                    <div
                        key={item.id}
                        onClick={() => handleSettingClick(item.id)}
                        className="bg-white border border-slate-100 rounded-lg p-2.5 flex items-center justify-between shadow-sm active:bg-slate-50 transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-50 rounded-md flex items-center justify-center">
                                {item.icon}
                            </div>
                            <div>
                                <h4 className="text-[12px] text-slate-800 leading-tight">{item.title}</h4>
                                <p className="text-[9px] text-slate-400">{item.subtitle}</p>
                            </div>
                        </div>
                        {item.check ? (
                            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                                <CheckCircle2 size={11} className="text-white" />
                            </div>
                        ) : (
                            <ChevronRight size={14} className="text-slate-300" />
                        )}
                    </div>
                ))}
            </div>

            {/* --- Info Note --- */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex gap-2.5 items-start">
                 <AlertCircle size={14} className="text-slate-400 shrink-0 mt-0.5" />
                 <p className="text-[8.5px] font-medium text-slate-500 leading-relaxed">
                    Domestic transfers use UPI/Bank. Global payouts take 3-5 days.
                 </p>
            </div>

            {/* --- Transactions --- */}
            <div className="mt-1">
                <div className="flex items-center justify-between mb-2.5 px-1">
                    <h3 className="text-[12px] font-medium text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <History size={14} className="text-[#462211]" /> History
                    </h3>
                    <div className="flex bg-slate-200/50 p-0.5 rounded-md border border-slate-200/50">
                        {['All', 'In', 'Out'].map((tab, idx) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(['All', 'Earning', 'Payout'][idx])}
                                className={`px-2.5 py-1 rounded-[4px] text-[8px] font-medium uppercase tracking-wider transition-all ${filter === ['All', 'Earning', 'Payout'][idx] ? 'bg-white text-[#462211] shadow-xs' : 'text-slate-400'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2 pb-24">
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center py-10 bg-white border border-slate-100 rounded-xl">
                            <div className="w-12 h-12 rounded-full bg-[#FFF5F0] text-[#462211] flex items-center justify-center mx-auto mb-2">
                                <FileText size={20} />
                            </div>
                            <p className="text-[12px] font-medium text-slate-400">No Records Found</p>
                        </div>
                    ) : (
                        filteredTransactions.map((tx, index) => (
                            <div key={tx.id || index} className="bg-white border border-slate-100 rounded-lg p-3 flex items-center justify-between transition-all active:bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-md flex items-center justify-center border ${tx.type === 'credit' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                                        {tx.type === 'credit' ? <ArrowDownLeft size={16} strokeWidth={3} /> : <ArrowUpRight size={16} strokeWidth={3} />}
                                    </div>
                                    <div>
                                        <h4 className="text-[11.5px] font-medium text-slate-800 leading-tight">{tx.title || tx.source}</h4>
                                        <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider">
                                            {tx.date ? new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Just now'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-[13px] font-medium tracking-tighter ${tx.type === 'credit' ? 'text-emerald-500' : 'text-slate-900'}`}>
                                        {tx.type === 'credit' ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                                    </p>
                                    <span className={`text-[7px] font-medium px-1 py-0.5 rounded tracking-widest uppercase inline-block mt-1 ${tx.status === 'Success' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {tx.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
                </>
            )}

            {/* Bank Details Modal */}
            {isBankModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Building size={16} className="text-[#462211]" /> Bank Details
                                </h3>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Please provide accurate information</p>
                            </div>
                            <button 
                                onClick={() => { setIsBankModalOpen(false); setBankErrors({}); }}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="p-5 flex flex-col gap-3.5 bg-white">
                            <div className="space-y-3.5 animate-in fade-in duration-300">
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Account Holder Name</label>
                                <input
                                    type="text"
                                    value={bankDetails.holderName}
                                    onChange={(e) => {
                                        // Block digits from being typed
                                        const val = e.target.value.replace(/[0-9]/g, '');
                                        setBankDetails({...bankDetails, holderName: val});
                                        if (bankErrors.holderName) setBankErrors({...bankErrors, holderName: ''});
                                    }}
                                    placeholder="Enter full name (letters only)"
                                    className={`w-full bg-slate-50 border rounded-lg py-3 px-3.5 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none transition-all ${bankErrors.holderName ? 'border-rose-400 focus:border-rose-500' : 'border-slate-100 focus:border-[#462211]'}`}
                                />
                                {bankErrors.holderName && (
                                    <p className="text-[10px] text-rose-500 mt-1 ml-1 flex items-center gap-1">
                                        <AlertCircle size={10} /> {bankErrors.holderName}
                                    </p>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Bank Name</label>
                                <input
                                    type="text"
                                    value={bankDetails.bankName}
                                    onChange={(e) => {
                                        setBankDetails({...bankDetails, bankName: e.target.value});
                                        if (bankErrors.bankName) setBankErrors({...bankErrors, bankName: ''});
                                    }}
                                    placeholder="e.g. State Bank of India"
                                    className={`w-full bg-slate-50 border rounded-lg py-3 px-3.5 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none transition-all ${bankErrors.bankName ? 'border-rose-400 focus:border-rose-500' : 'border-slate-100 focus:border-[#462211]'}`}
                                />
                                {bankErrors.bankName && (
                                    <p className="text-[10px] text-rose-500 mt-1 ml-1 flex items-center gap-1">
                                        <AlertCircle size={10} /> {bankErrors.bankName}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Account Number</label>
                                <input
                                    type="text"
                                    value={bankDetails.accountNumber}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                                        setBankDetails({...bankDetails, accountNumber: val});
                                        if (bankErrors.accountNumber) setBankErrors({...bankErrors, accountNumber: ''});
                                    }}
                                    placeholder="Enter 16-digit account number"
                                    className={`w-full bg-slate-50 border rounded-lg py-3 px-3.5 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none transition-all ${bankErrors.accountNumber ? 'border-rose-400 focus:border-rose-500' : 'border-slate-100 focus:border-[#462211]'}`}
                                />
                                {bankErrors.accountNumber && (
                                    <p className="text-[10px] text-rose-500 mt-1 ml-1 flex items-center gap-1">
                                        <AlertCircle size={10} /> {bankErrors.accountNumber}
                                    </p>
                                )}
                                {bankDetails.accountNumber && !bankErrors.accountNumber && (
                                    <p className="text-[10px] text-slate-400 mt-1 ml-1">{bankDetails.accountNumber.length}/16 digits</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 ml-1">IFSC Code</label>
                                <input
                                    type="text"
                                    value={bankDetails.ifscCode}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                                        setBankDetails({...bankDetails, ifscCode: val});
                                        if (bankErrors.ifscCode) setBankErrors({...bankErrors, ifscCode: ''});
                                    }}
                                    placeholder="e.g. SBIN0001234"
                                    className={`w-full bg-slate-50 border rounded-lg py-3 px-3.5 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none transition-all uppercase ${bankErrors.ifscCode ? 'border-rose-400 focus:border-rose-500' : 'border-slate-100 focus:border-[#462211]'}`}
                                />
                                {bankErrors.ifscCode && (
                                    <p className="text-[10px] text-rose-500 mt-1 ml-1 flex items-center gap-1">
                                        <AlertCircle size={10} /> {bankErrors.ifscCode}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                        
                    <div className="p-5 pt-2 bg-slate-50/50 border-t border-slate-100">
                            <button
                                onClick={submitWithdrawal}
                                disabled={isSubmitting}
                                className={`w-full py-3.5 rounded-lg text-[11px] uppercase tracking-widest transition-all flex justify-center items-center gap-2 ${
                                    isSubmitting
                                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                        : 'bg-[#462211] text-white shadow-md active:scale-95 cursor-pointer'
                                }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        Submitting Request...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={15} />
                                        Confirm Redeem
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success / Waiting for Approval Modal */}
            {isSuccessModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 text-center">
                        
                        {/* Top gradient bar */}
                        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />

                        <div className="pt-7 pb-5 px-6">
                            {/* Animated pulsing clock icon */}
                            <div className="relative mx-auto w-20 h-20 mb-5">
                                <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-30" />
                                <div className="relative w-20 h-20 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-full flex items-center justify-center shadow-lg">
                                    <Clock size={34} className="text-amber-500" />
                                </div>
                            </div>

                            <h3 className="text-[16px] text-slate-800 tracking-tight mb-1">Request Submitted! 🎉</h3>
                            <p className="text-[13px] font-medium text-amber-600 mb-3 tracking-wide">Waiting for Admin Approval</p>

                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3.5 text-left mb-3">
                                <p className="text-[10.5px] font-semibold text-slate-600 leading-relaxed">
                                    Your redeem request has been submitted successfully.
                                    The amount will be transferred to your bank account after admin approval.
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-left">
                                <p className="text-[9.5px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">What happens next?</p>
                                <div className="flex items-start gap-2 mb-1.5">
                                    <div className="w-4 h-4 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[8px] text-amber-600">1</span>
                                    </div>
                                    <p className="text-[9.5px] font-medium text-slate-500">Admin reviews your request</p>
                                </div>
                                <div className="flex items-start gap-2 mb-1.5">
                                    <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[8px] text-[#462211]">2</span>
                                    </div>
                                    <p className="text-[9.5px] font-medium text-slate-500">Amount deducted after approval</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[8px] text-emerald-600">3</span>
                                    </div>
                                    <p className="text-[9.5px] font-medium text-slate-500">Transfer to your bank account</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-emerald-50 border-t border-emerald-100 px-4 py-2.5 flex items-center justify-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <span className="text-[9px] font-medium text-emerald-600 uppercase tracking-widest">You will be notified upon approval</span>
                        </div>

                        <div className="p-4">
                            <button
                                onClick={() => setIsSuccessModalOpen(false)}
                                className="w-full py-3.5 rounded-xl text-[11px] uppercase tracking-widest bg-[#462211] text-white shadow-lg active:scale-95 transition-all cursor-pointer"
                            >
                                Got It, Thanks!
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Beautiful Floating Toast at the Top */}
            {toast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-11/12 max-w-xs bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        toast.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
                        toast.type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-500'
                    }`}>
                        {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-[11px] text-slate-800 uppercase tracking-wider">
                            {toast.type === 'success' ? 'Success' : toast.type === 'warning' ? 'Warning' : 'Error'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">{toast.message}</p>
                    </div>
                    <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Transfer Limits Modal */}
            {showLimitsModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-[#462211] px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Filter size={16} className="text-white" />
                                <h3 className="text-white text-[13px] uppercase tracking-widest">Transfer Limits</h3>
                            </div>
                            <button onClick={() => setShowLimitsModal(false)} className="text-white/60 hover:text-white transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="bg-[#FFF5F0] border border-[#EDE4DC] rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] text-[#7A5648] uppercase tracking-widest mb-1">Minimum Withdrawal</p>
                                    <p className="text-[20px] text-[#462211]">₹{minWithdrawal}</p>
                                </div>
                                <div className="w-10 h-10 bg-[#F3E8E0] rounded-xl flex items-center justify-center">
                                    <Filter size={18} className="text-[#462211]" />
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2.5">
                                {[
                                    { label: 'Daily Withdrawals', value: '1 per 24 hours' },
                                    { label: 'Transaction Fee', value: `₹${withdrawalFee || 0} per withdrawal` },
                                    { label: 'Processing Time', value: '1–3 business days' },
                                    { label: 'Payment Method', value: 'Bank Transfer only' },
                                ].map((row, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400">{row.label}</span>
                                        <span className="text-[11px] text-slate-700">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowLimitsModal(false)}
                                className="w-full py-3 bg-[#462211] text-white rounded-xl text-[11px] uppercase tracking-widest transition-all cursor-pointer"
                            >
                                Got It
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Security Modal */}
            {showSecurityModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-[#462211] px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <AlertCircle size={16} className="text-white" />
                                <h3 className="text-white text-[13px] uppercase tracking-widest">Security</h3>
                            </div>
                            <button onClick={() => setShowSecurityModal(false)} className="text-white/60 hover:text-white transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="bg-[#FFF5F0] border border-[#EDE4DC] rounded-xl p-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#F3E8E0] rounded-xl flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={20} className="text-[#462211]" />
                                </div>
                                <div>
                                    <p className="text-[12px] text-[#462211]">Your account is secured</p>
                                    <p className="text-[9px] text-[#7A5648] uppercase tracking-widest mt-0.5">End-to-end encrypted</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2.5">
                                {[
                                    { label: 'Data Encryption', value: 'AES-256' },
                                    { label: 'Bank Details', value: 'Stored securely' },
                                    { label: 'Transactions', value: 'SSL protected' },
                                    { label: 'Withdrawals', value: 'Admin verified' },
                                ].map((row, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400">{row.label}</span>
                                        <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                                            <CheckCircle2 size={10} /> {row.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowSecurityModal(false)}
                                className="w-full py-3 bg-[#462211] text-white rounded-xl text-[11px] uppercase tracking-widest transition-all cursor-pointer"
                            >
                                Got It
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Wallet;
