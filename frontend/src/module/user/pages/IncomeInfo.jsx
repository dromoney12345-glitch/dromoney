import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, Share2, CheckSquare, TrendingUp, Trophy, 
    Sparkles, IndianRupee, Zap, ShieldCheck, Clock,
    ArrowRight, Info, HelpCircle
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';
import PaymentModal from '../components/PaymentModal';

const IncomeInfo = () => {
    const navigate = useNavigate();
    const { userData, addNotification, refreshUserProfile } = useUser();
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, plan: '', amount: 0 });

    // --- Dynamic Content State ---
    const [sections, setSections] = useState({
        menu_layout_refer: { headline: 'EARN ₹200 REWARD', steps: [] },
        menu_layout_tasks: { headline: 'COLLECT REWARD COINS', steps: [] },
        menu_layout_fund: { headline: 'PASSIVE INCOME SECURITY', steps: [] },
        menu_layout_events: { headline: 'WIN BIG PRIZES', steps: [] }
    });

    const fetchSections = async () => {
        const keys = ['menu_layout_refer', 'menu_layout_tasks', 'menu_layout_fund', 'menu_layout_events'];
        try {
            const res = await api.get(`/public/content/bulk?keys=${keys.join(',')}`);
            if (res.success && res.data) {
                const updated = {};
                keys.forEach(key => {
                    const item = res.data[key];
                    if (item && item.data) {
                        updated[key] = {
                            title: item.title,
                            headline: item.data.headline,
                            steps: item.data.steps || []
                        };
                    }
                });
                setSections(prev => ({ ...prev, ...updated }));
            }
        } catch (err) {
            console.error("Error fetching info sections:", err);
        }
    };

    useEffect(() => {
        fetchSections();
        const hash = window.location.hash;
        if (hash) {
            const element = document.querySelector(hash);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 500);
            }
        }
    }, [window.location.hash]);

    const handleProtectedAction = (path) => {
        const kycStr = (userData?.kycStatus || 'Not Started').toLowerCase();
        
        if (kycStr !== 'verified' && kycStr !== 'approved') {
            if (kycStr === 'pending' || kycStr === 'rejected') {
                navigate('/user/auth/pending');
            } else {
                navigate('/user/auth/kyc');
            }
            return;
        }

        if (!userData.isPaid) {
            addNotification("Access Denied", "Please firstly take the 499 plan then access will be granted.", "error");
            setPaymentModal({ isOpen: true, plan: 'Lifetime Access Plan', amount: 499 });
            return;
        }
        if (path === '/user/marketing') {
            navigate(path, { state: { showReferral: true } });
        } else {
            navigate(path);
        }
    };

    const onPaymentSuccess = async () => {
        await refreshUserProfile();
        setPaymentModal({ ...paymentModal, isOpen: false });
        addNotification("Success!", "Lifetime Access Activated.", "success");
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F0FDF4] animate-in fade-in duration-700 pb-6">
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;700;900&display=swap');
                    body { font-family: 'Poppins', sans-serif !important; }
                `}
            </style>

            {/* --- Premium Boutique Header --- */}
            <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-emerald-100/50 px-6 py-4 flex items-center gap-4">
                <button 
                    onClick={() => navigate(-1)} 
                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-800 active:scale-90 transition-all border border-emerald-100 shadow-sm"
                >
                    <ChevronLeft size={22} />
                </button>
                <div>
                    <h1 className="text-[17px] font-medium text-slate-900 tracking-tight leading-none uppercase">Information Center</h1>
                    <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-widest mt-1">Earning Guide & Mastery</p>
                </div>
            </div>

            <div className="px-4 py-4 space-y-5">
                
                {/* 1. REFERRAL SYSTEM - Emerald Theme */}
                <section id="refer" className="scroll-mt-24">
                    <div className="bg-white rounded-2xl p-6 shadow-xl shadow-indigo-900/5 relative overflow-hidden group border border-slate-100">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#E2D4FD]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-colors duration-700"></div>
                        
                        <div className="flex items-start justify-between mb-6 relative z-10">
                            <div>
                                <h3 className="text-[20px] font-medium text-slate-900 tracking-tight leading-none mb-2 uppercase">Referral System</h3>
                                <span className="inline-block px-3 py-1 bg-[#E2D4FD]/40 text-[#6610F2] text-[8px] font-medium uppercase tracking-widest rounded-lg border border-[#D4B8F9]/30">
                                    {sections.menu_layout_refer.headline || 'EARN ₹200 REWARD'}
                                </span>
                            </div>
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-[#6610F2] shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                                <Share2 size={24} strokeWidth={2.5} />
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="space-y-3">
                                {(sections.menu_layout_refer.steps.length > 0 ? sections.menu_layout_refer.steps : [
                                    { title: "Share Your Link", desc: "Share your link with friends to start earning." },
                                    { title: "Earn ₹200 Instant", desc: "Get ₹200 instant reward for every registration." },
                                    { title: "Direct Wallet Credit", desc: "Rewards credited directly to your wallet." }
                                ]).slice(0, 3).map((step, i) => (
                                    <div key={i} className="flex gap-4 group/step items-center">
                                        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-[#6610F2] font-medium text-[11px] border border-slate-100 shrink-0 group-hover/step:bg-[#6610F2] group-hover/step:text-white transition-all duration-300 shadow-sm">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-[14px] font-medium text-slate-800 leading-none mb-1 uppercase tracking-tight">{step.title}</h4>
                                            <p className="text-[11px] font-medium text-slate-500 leading-tight italic">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <button 
                                onClick={() => handleProtectedAction('/user/marketing')}
                                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-xl text-[10px] font-medium uppercase tracking-[0.2em] shadow-lg shadow-indigo-900/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                Get Referral Link <ArrowRight size={14} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* 2. DAILY TASKS - Emerald Theme */}
                <section id="task" className="scroll-mt-24">
                    <div className="bg-white rounded-2xl p-6 shadow-xl shadow-amber-900/5 relative overflow-hidden group border border-slate-100">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#FDF2D0]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="flex items-start justify-between mb-6 relative z-10">
                            <div>
                                <h3 className="text-[20px] font-medium text-slate-900 tracking-tight leading-none mb-2 uppercase">Daily Tasks</h3>
                                <span className="inline-block px-3 py-1 bg-[#FDF2D0]/40 text-[#856404] text-[8px] font-medium uppercase tracking-widest rounded-lg border border-[#F9E9B8]/30">
                                    {sections.menu_layout_tasks.headline || 'COLLECT REWARD COINS'}
                                </span>
                            </div>
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-[#856404] shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                                <CheckSquare size={24} strokeWidth={2.5} />
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="space-y-3">
                                {(sections.menu_layout_tasks.steps.length > 0 ? sections.menu_layout_tasks.steps : [
                                    { title: "Complete Tasks", desc: "Complete daily simple tasks to earn reward coins." },
                                    { title: "Redeem for Cash", desc: "Convert your earned coins into real cash balance." },
                                    { title: "12X Booster Benefit", desc: "Activate Booster to multiply your earnings up to 300%." }
                                ]).slice(0, 3).map((step, i) => (
                                    <div key={i} className="flex gap-4 group/step items-center">
                                        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-[#856404] font-medium text-[11px] border border-slate-100 shrink-0 group-hover/step:bg-[#856404] group-hover/step:text-white transition-all duration-300 shadow-sm">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-[14px] font-medium text-slate-800 leading-none mb-1 uppercase tracking-tight">{step.title}</h4>
                                            <p className="text-[11px] font-medium text-slate-500 leading-tight italic">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <button 
                                onClick={() => handleProtectedAction('/user/earn')}
                                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-4 rounded-xl text-[10px] font-medium uppercase tracking-[0.2em] shadow-lg shadow-amber-900/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                View Tasks <Zap size={14} fill="currentColor" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* 3. FUTURE FUND */}
                <section id="fund" className="scroll-mt-24">
                    <div className="bg-white rounded-2xl p-6 shadow-xl shadow-indigo-900/5 relative overflow-hidden group border border-slate-100">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#CFE2FD]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="flex items-start justify-between mb-6 relative z-10">
                            <div>
                                <h3 className="text-[20px] font-medium text-slate-900 tracking-tight leading-none mb-2 uppercase">Future Fund</h3>
                                <span className="inline-block px-3 py-1 bg-[#CFE2FD]/40 text-[#084298] text-[8px] font-medium uppercase tracking-widest rounded-lg border border-[#B8D5F9]/30">
                                    {sections.menu_layout_fund.headline || 'PASSIVE INCOME SECURITY'}
                                </span>
                            </div>
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-[#084298] shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                                <TrendingUp size={24} strokeWidth={2.5} />
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="space-y-3">
                                {(sections.menu_layout_fund.steps.length > 0 ? sections.menu_layout_fund.steps : [
                                    { title: "Platform Stake", desc: "Get a permanent share in platform profits." },
                                    { title: "Monthly Payouts", desc: "Passive income auto-credited every month." },
                                    { title: "Growth Scalability", desc: "Income scales with ecosystem expansion." }
                                ]).slice(0, 3).map((step, i) => (
                                    <div key={i} className="flex gap-4 group/step items-center">
                                        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-[#084298] font-medium text-[11px] border border-slate-100 shrink-0 group-hover/step:bg-[#084298] group-hover/step:text-white transition-all duration-300 shadow-sm">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-[14px] font-medium text-slate-800 leading-none mb-1 uppercase tracking-tight">{step.title}</h4>
                                            <p className="text-[11px] font-medium text-slate-500 leading-tight italic">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <button 
                                onClick={() => handleProtectedAction('/user/future-fund')}
                                className="w-full mt-2 bg-slate-900 hover:bg-black text-white font-medium py-4 rounded-xl text-[10px] font-medium uppercase tracking-[0.2em] shadow-lg shadow-indigo-900/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                Check Eligibility <ShieldCheck size={14} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Footer Insight */}
                <div className="text-center pt-2 pb-2">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100 mb-4">
                        <Info size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Knowledge is Wealth</span>
                    </div>
                    <p className="text-[9px] font-medium text-slate-300 uppercase tracking-[0.3em] leading-none">Powered by Dromoney Intelligence</p>
                </div>
            </div>

            {/* Payment Integration */}
            <PaymentModal 
                isOpen={paymentModal.isOpen}
                onClose={() => setPaymentModal({ ...paymentModal, isOpen: false })}
                plan={paymentModal.plan}
                amount={paymentModal.amount}
                onSuccess={onPaymentSuccess}
            />
        </div>
    );
};

export default IncomeInfo;
