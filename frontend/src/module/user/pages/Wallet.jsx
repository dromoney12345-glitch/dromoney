import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { 
    CreditCard, Wallet as WalletIcon, IndianRupee, ArrowUpRight, 
    ArrowDownLeft, History, Filter, AlertCircle, Sparkles, Coins, 
    TrendingUp, ChevronRight, CheckCircle2, Share2, Info, ArrowRightLeft, X, Building, Clock, Loader2, ShieldCheck
} from 'lucide-react';
import UnlockModal from '../components/UnlockModal';
import api from '../../shared/services/api';

const Wallet = () => {
    const navigate = useNavigate();
    const { userData, requestWithdrawal, addNotification, refreshUserProfile } = useUser();
    const { wallet, coins, name, isPaid } = userData;
    const [activeTab, setActiveTab] = useState('cash'); // 'cash' or 'coins'
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
        bankName: ''
    });

    const [pendingWithdrawal, setPendingWithdrawal] = useState(null);
    const [recentWithdrawal, setRecentWithdrawal] = useState(null);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [bankErrors, setBankErrors] = useState({});

    const [showLimitsModal, setShowLimitsModal] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);

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
            }
        } catch (err) {
            console.error("Failed to load wallet status:", err);
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
    }, []);

    // Listen to real-time status updates from UserContext socket events
    useEffect(() => {
        const handleStatusUpdate = (e) => {
            const data = e.detail;
            fetchWalletStatus();
            refreshUserProfile();
            
            // Show a custom popup modal or beautiful top toast!
            if (data.status === 'Approved') {
                showToast("Your withdrawal request has been approved by admin! Wallet updated.", "success");
            } else if (data.status === 'Rejected') {
                showToast("Your withdrawal request was rejected by admin.", "error");
            }
        };

        window.addEventListener('withdrawal_status_updated', handleStatusUpdate);
        return () => {
            window.removeEventListener('withdrawal_status_updated', handleStatusUpdate);
        };
    }, []);

    const handleWithdraw = async () => {
        if (!isPaid) {
            setIsUnlockOpen(true);
            return;
        }

        // Enforce cooldown check
        if (cooldownRemaining > 0) {
            showToast("You can only withdraw once every 24 hours.", "warning");
            return;
        }

        // Enforce pending check
        if (pendingWithdrawal) {
            showToast("You already have a pending withdrawal request.", "warning");
            return;
        }

        const val = parseFloat(amount);
        if (isNaN(val) || val < minWithdrawal) {
            addNotification("Invalid Amount", `Minimum withdrawal is ₹${minWithdrawal}.`, "warning");
            showToast(`Minimum withdrawal is ₹${minWithdrawal}.`, "warning");
            return;
        }

        // Add ₹5 transition fee
        const totalDeduction = val + 5;

        if (totalDeduction > wallet.balance) {
            addNotification(
                "Insufficient Balance", 
                `You need ₹${totalDeduction} (₹${val} amount + ₹5 fee) to complete this transaction.`, 
                "warning"
            );
            showToast(`Insufficient Balance: You need ₹${totalDeduction} to complete this transaction.`, "warning");
            return;
        }

        // Open Bank Details Modal
        setIsBankModalOpen(true);
    };

    const submitWithdrawal = async () => {
        // Field-level validation
        const errors = {};

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

        if (Object.keys(errors).length > 0) {
            setBankErrors(errors);
            return;
        }

        setBankErrors({});
        setIsSubmitting(true);
        try {
            const val = parseFloat(amount);
            const res = await requestWithdrawal(val, bankDetails);
            if (res.success) {
                // Close bank modal & reset form FIRST
                setIsBankModalOpen(false);
                setAmount('');
                setBankDetails({ accountNumber: '', ifscCode: '', holderName: '', bankName: '' });
                setBankErrors({});
                setIsSubmitting(false);
                // Show success popup immediately
                setIsSuccessModalOpen(true);
                addNotification("Request Sent", "Withdrawal request submitted! Waiting for admin approval.", "success");
                showToast("Withdrawal request submitted! Waiting for admin approval.", "success");
                // Refresh profile silently in background (no await so it doesn't block UI)
                refreshUserProfile();
                // Fetch latest wallet/withdrawal status to immediately show the green pending banner
                fetchWalletStatus();
            } else {
                addNotification("Withdrawal Denied", res.message || "Request failed. Try again.", "error");
                showToast(res.message || "Request failed. Try again.", "error");
                setIsSubmitting(false);
            }
        } catch (err) {
            addNotification("Error", "Something went wrong. Please try again.", "error");
            showToast("Something went wrong. Please try again.", "error");
            setIsSubmitting(false);
        }
    };

    const filteredTransactions = activeTab === 'cash' 
        ? (wallet.transactions || []).filter(tx => {
            if (filter === 'Earning') return tx.type === 'credit';
            if (filter === 'Payout') return tx.type === 'withdrawal' || tx.type === 'debit';
            return true;
        })
        : (coins.history || []).filter(tx => {
            if (filter === 'Earning') return tx.type === 'credit';
            if (filter === 'Payout') return tx.type === 'debit';
            return true;
        });

    return (
        <div className="flex flex-col gap-2.5 p-3 animate-in fade-in duration-700 bg-[#f8fafc] font-['Poppins']">
            <UnlockModal isOpen={isUnlockOpen} onClose={() => setIsUnlockOpen(false)} />

            {/* Green Card: Waiting for Admin Confirmation */}
            {pendingWithdrawal && (
                <div className="bg-emerald-50 border border-emerald-100/80 rounded-xl p-3 flex items-center justify-between shadow-sm animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
                            <Clock size={16} className="animate-spin" />
                        </div>
                        <div>
                            <h4 className="text-[10px] text-emerald-900 uppercase tracking-tight leading-none mb-1">waiting for the admin confirmation..</h4>
                            <p className="text-[9px] font-medium text-emerald-600/70">Your withdrawal request of ₹{pendingWithdrawal.amount} is pending review.</p>
                        </div>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[8px] uppercase tracking-wider px-2 py-1 rounded-md shrink-0">
                        Pending
                    </span>
                </div>
            )}

            {/* --- Compact Switcher --- */}
            <div className="flex bg-slate-200/50 p-1 rounded-lg border border-slate-200/50">
                <button 
                    onClick={() => { setActiveTab('cash'); setFilter('All'); }}
                    className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-all ${activeTab === 'cash' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 font-medium'}`}
                >
                    <IndianRupee size={14} />
                    <span className="text-[9px] uppercase font-medium tracking-wider">Cash</span>
                </button>
                <button 
                    onClick={() => { setActiveTab('coins'); setFilter('All'); }}
                    className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-all ${activeTab === 'coins' ? 'bg-white text-amber-500 shadow-sm' : 'text-slate-500 font-medium'}`}
                >
                    <Coins size={14} />
                    <span className="text-[9px] uppercase font-medium tracking-wider">Coins</span>
                </button>
            </div>

            {/* --- My Cards Heading --- */}
            <div className="flex items-center justify-between px-1 mt-0.5">
                <h2 className="text-[15px] font-medium text-slate-800 tracking-tight">My Cards</h2>
                <div className="flex gap-1 opacity-30">
                    <div className="w-1 h-1 bg-slate-900 rounded-full"></div>
                    <div className="w-1 h-1 bg-slate-900 rounded-full"></div>
                    <div className="w-1 h-1 bg-slate-900 rounded-full"></div>
                </div>
            </div>

            <div className="relative rounded-xl p-4.5 shadow-lg overflow-hidden group bg-gradient-to-br from-[#0f1d3a] via-[#1a2c52] to-[#0f1d3a] transition-all duration-500">
                <div className="absolute top-0 right-0 w-[150%] h-[150%] border-[25px] border-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col justify-between h-[145px]">
                    <div className="flex justify-between items-start">
                        <span className="text-[8px] font-medium text-white/40 uppercase tracking-[0.2em]">{activeTab === 'cash' ? 'Cash Account' : 'Coin Assets'}</span>
                        <div className="flex relative items-center">
                            <div className="w-5.5 h-5.5 bg-white/20 rounded-full"></div>
                            <div className="w-5.5 h-5.5 bg-white/40 rounded-full -ml-2.5"></div>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2.5 text-white/80 font-mono tracking-[0.1em] text-[13px]">
                             <span>••••</span> <span>••••</span> <span>••••</span> <span>5222</span>
                        </div>
                        <h2 className="text-2xl font-medium text-white tracking-tight flex items-center gap-1">
                            {activeTab === 'cash' ? <IndianRupee size={18} className="opacity-80" /> : <Coins size={18} className="opacity-80" />}
                            {activeTab === 'cash' ? Number(wallet.balance).toFixed(2) : coins.total.toLocaleString()}
                        </h2>
                    </div>

                    <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <p className="text-[6.5px] font-medium text-white/30 uppercase tracking-widest mb-0.5">Card Holder</p>
                            <p className="text-[10px] font-medium text-white uppercase tracking-wider">{name || 'USER'}</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <p className="text-[6.5px] font-medium text-white/30 uppercase tracking-widest mb-0.5">Expires</p>
                            <p className="text-[10px] font-medium text-white uppercase tracking-wider">07/27</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Refer & Earn Promo --- */}
            <div 
                onClick={() => navigate('/user/marketing')}
                className="bg-emerald-50 border border-emerald-100 rounded-lg p-3.5 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <Share2 size={20} />
                    </div>
                    <div>
                        <h4 className="text-[12px] text-emerald-900 uppercase tracking-tight leading-none mb-1">Refer & Earn</h4>
                        <p className="text-[9px] font-medium text-emerald-600/70">Get ₹200 for every friend!</p>
                    </div>
                </div>
                <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-widest">
                    Invite
                </div>
            </div>

            {/* --- Withdrawal Section --- */}
            {activeTab === 'cash' && (
                <div id="withdraw-section" className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                    {/* Header with Fee Information */}
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
                        <h3 className="text-[11px] text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <ArrowRightLeft size={14} className="text-blue-500" />
                            Withdraw Cash
                        </h3>
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full text-[8.5px] uppercase tracking-wider">
                            ₹5 Fee Added
                        </span>
                    </div>

                    {/* Dynamic Fee & Deduction Previewer */}
                    {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1.5 animate-in slide-in-from-top-1 duration-300">
                            <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                                <span>Requested Amount:</span>
                                <span className="text-slate-800">₹{parseFloat(amount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                                <span>Transaction Fee:</span>
                                <span className="text-amber-600">+ ₹5.00</span>
                            </div>
                            <div className="border-t border-slate-200/60 pt-1.5 flex justify-between items-center text-[11px] text-slate-800">
                                <span>Total Deducted from Wallet:</span>
                                <span className="text-blue-600">₹{(parseFloat(amount) + 5).toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={`Amount (Min. ₹${minWithdrawal})`}
                            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2.5 px-3.5 text-[13px] font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 transition-all"
                        />


                        
                        {/* 24-Hour Policy Alert Line (Highly Dynamic & Localized) */}
                        <div className={`p-2.5 rounded-lg flex items-start gap-2.5 transition-all duration-300 ${
                            pendingWithdrawal ? 'bg-amber-50 border border-amber-100' :
                            cooldownRemaining > 0 ? 'bg-rose-50 border border-rose-100' :
                            'bg-amber-50/50 border border-amber-100/70'
                        }`}>
                            {pendingWithdrawal ? (
                                <Clock size={13} className="text-amber-500 shrink-0 mt-0.5 animate-spin" />
                            ) : cooldownRemaining > 0 ? (
                                <AlertCircle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                            ) : (
                                <Info size={13} className="text-amber-500 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <p className={`text-[9px] font-medium leading-normal ${
                                    pendingWithdrawal ? 'text-amber-800' :
                                    cooldownRemaining > 0 ? 'text-rose-800' :
                                    'text-amber-800'
                                }`}>
                                    {pendingWithdrawal ? (
                                        <>
                                            आपकी एक निकासी (withdraw) अभी Pending है। कृपया Admin के approval का इंतज़ार करें।
                                        </>
                                    ) : cooldownRemaining > 0 ? (
                                        <>
                                            निकासी सीमा: आप 24 घंटे में केवल एक बार ही निकासी (withdraw) कर सकते हैं। अगला withdrawal {Math.floor(cooldownRemaining / (1000 * 60 * 60))}h {Math.floor((cooldownRemaining % (1000 * 60 * 60)) / (1000 * 60))}m {Math.floor((cooldownRemaining % (1000 * 60)) / 1000)}s बाद कर सकते हैं।
                                        </>
                                    ) : (
                                        "नोट: आप 24 घंटे में केवल एक बार ही निकासी (withdraw) कर सकते हैं।"
                                    )}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleWithdraw}
                            disabled={!!pendingWithdrawal || cooldownRemaining > 0}
                            className={`w-full py-3.5 rounded-lg text-[10px] uppercase tracking-widest transition-all
                                ${pendingWithdrawal 
                                    ? 'bg-amber-50 text-amber-400 border border-amber-100 cursor-not-allowed'
                                    : cooldownRemaining > 0
                                    ? 'bg-rose-50 text-rose-400 border border-rose-100 cursor-not-allowed'
                                    : (!isPaid) || (amount >= minWithdrawal && (Number(amount) + 5) <= wallet.balance)
                                    ? 'bg-[#1a233b] hover:bg-black text-white shadow-md active:scale-95 cursor-pointer'
                                    : 'bg-slate-50 text-slate-300 pointer-events-none border border-slate-100'}`}
                        >
                            {pendingWithdrawal 
                                ? 'Withdrawal Pending Approval' 
                                : cooldownRemaining > 0 
                                ? 'Withdrawal Locked (24h Cooldown)' 
                                : isPaid 
                                ? 'Withdraw Now' 
                                : 'Unlock to Withdraw'}
                        </button>
                    </div>
                </div>
            )}

            {/* --- Wallet Actions --- */}
            <div className="px-1 mt-1">
                <h3 className="text-[13px] font-medium text-slate-400 uppercase tracking-widest">Settings</h3>
            </div>
            
            <div className="flex flex-col gap-2">
                {[
                    { id: 'refer', title: 'Referral Rewards', subtitle: 'Earn commission', icon: <Share2 size={16} className="text-emerald-500" /> },
                    { id: 'limits', title: 'Transfer Limits', subtitle: `Min ₹${minWithdrawal} · Daily cap`, icon: <Filter size={16} className="text-indigo-500" />, check: true },
                    { id: 'security', title: 'Security', subtitle: 'Encrypted & protected', icon: <AlertCircle size={16} className="text-sky-500" />, check: true },
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
                        <History size={14} className="text-blue-500" /> History
                    </h3>
                    <div className="flex bg-slate-200/50 p-0.5 rounded-md border border-slate-200/50">
                        {['All', activeTab === 'cash' ? 'In' : 'Tasks', activeTab === 'cash' ? 'Out' : 'Spent'].map((tab, idx) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(['All', 'Earning', 'Payout'][idx])}
                                className={`px-2.5 py-1 rounded-[4px] text-[8px] font-medium uppercase tracking-wider transition-all ${filter === ['All', 'Earning', 'Payout'][idx] ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2 pb-24">
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center py-10 bg-white border border-slate-100 border-dashed rounded-lg">
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">No Records</p>
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
                                        {tx.type === 'credit' ? '+' : '-'}{activeTab === 'cash' ? '₹' : ''}{Number(tx.amount).toFixed(2)}
                                    </p>
                                    {activeTab === 'cash' && (
                                        <span className={`text-[7px] font-medium px-1 py-0.5 rounded tracking-widest uppercase inline-block mt-1 ${tx.status === 'Success' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {tx.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Bank Details Modal */}
            {isBankModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Building size={16} className="text-blue-500" /> Bank Details
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
                                    className={`w-full bg-slate-50 border rounded-lg py-3 px-3.5 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none transition-all ${bankErrors.holderName ? 'border-rose-400 focus:border-rose-500' : 'border-slate-100 focus:border-blue-500'}`}
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
                                    className={`w-full bg-slate-50 border rounded-lg py-3 px-3.5 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none transition-all ${bankErrors.bankName ? 'border-rose-400 focus:border-rose-500' : 'border-slate-100 focus:border-blue-500'}`}
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
                                    className={`w-full bg-slate-50 border rounded-lg py-3 px-3.5 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none transition-all ${bankErrors.accountNumber ? 'border-rose-400 focus:border-rose-500' : 'border-slate-100 focus:border-blue-500'}`}
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
                                    className={`w-full bg-slate-50 border rounded-lg py-3 px-3.5 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none transition-all uppercase ${bankErrors.ifscCode ? 'border-rose-400 focus:border-rose-500' : 'border-slate-100 focus:border-blue-500'}`}
                                />
                                {bankErrors.ifscCode && (
                                    <p className="text-[10px] text-rose-500 mt-1 ml-1 flex items-center gap-1">
                                        <AlertCircle size={10} /> {bankErrors.ifscCode}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-5 pt-2 bg-slate-50/50 border-t border-slate-100">
                            <button
                                onClick={submitWithdrawal}
                                disabled={isSubmitting}
                                className={`w-full py-3.5 rounded-lg text-[11px] uppercase tracking-widest transition-all flex justify-center items-center gap-2 ${
                                    isSubmitting
                                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                        : 'bg-[#1a233b] hover:bg-black text-white shadow-md active:scale-95 cursor-pointer'
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
                                        Confirm Withdrawal
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

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-left mb-3">
                                <p className="text-[10.5px] font-semibold text-slate-600 leading-relaxed">
                                    आपका withdrawal request सफलतापूर्वक submit हो गया है।
                                    Admin के approve करने के बाद amount आपके bank account में transfer किया जाएगा।
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
                                    <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[8px] text-blue-600">2</span>
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
                                className="w-full py-3.5 rounded-xl text-[11px] uppercase tracking-widest bg-gradient-to-r from-[#1a233b] to-[#2a3a5c] hover:from-black hover:to-slate-800 text-white shadow-lg active:scale-95 transition-all cursor-pointer"
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
                        <div className="bg-indigo-600 px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Filter size={16} className="text-white" />
                                <h3 className="text-white text-[13px] uppercase tracking-widest">Transfer Limits</h3>
                            </div>
                            <button onClick={() => setShowLimitsModal(false)} className="text-white/60 hover:text-white transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] text-indigo-400 uppercase tracking-widest mb-1">Minimum Withdrawal</p>
                                    <p className="text-[20px] text-indigo-700">₹{minWithdrawal}</p>
                                </div>
                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                    <Filter size={18} className="text-indigo-500" />
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2.5">
                                {[
                                    { label: 'Daily Withdrawals', value: '1 per 24 hours' },
                                    { label: 'Transaction Fee', value: '₹5 per withdrawal' },
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
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] uppercase tracking-widest transition-all cursor-pointer"
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
                        <div className="bg-sky-600 px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <AlertCircle size={16} className="text-white" />
                                <h3 className="text-white text-[13px] uppercase tracking-widest">Security</h3>
                            </div>
                            <button onClick={() => setShowSecurityModal(false)} className="text-white/60 hover:text-white transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={20} className="text-sky-500" />
                                </div>
                                <div>
                                    <p className="text-[12px] text-sky-700">Your account is secured</p>
                                    <p className="text-[9px] text-sky-400 uppercase tracking-widest mt-0.5">End-to-end encrypted</p>
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
                                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[11px] uppercase tracking-widest transition-all cursor-pointer"
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
