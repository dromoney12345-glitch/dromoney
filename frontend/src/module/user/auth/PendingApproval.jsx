import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, ShieldCheck, XCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { useUser } from '../context/UserContext';

const PendingApproval = () => {
    const navigate = useNavigate();
    const { userData, refreshUserProfile, loading: userLoading } = useUser();
    const status = (userData?.kycStatus || 'pending').toLowerCase();

    useEffect(() => {
        if (userLoading) return;
        if (status === 'approved' || status === 'verified') {
            setTimeout(() => {
                navigate('/user/income');
            }, 3000);
        } else if (status === 'not started') {
            navigate('/user/auth/kyc');
        }
    }, [status, navigate, userLoading]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (status === 'pending') refreshUserProfile();
        }, 10000); // Check every 10s
        return () => clearInterval(interval);
    }, [status, refreshUserProfile]);

    if (userLoading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Clock className="animate-spin text-amber-500 w-8 h-8" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden font-poppins">
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@100;400;700;900&display=swap');
                    .font-poppins { font-family: 'Poppins', sans-serif !important; }
                `}
            </style>

            {/* Subtle Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-amber-100 rounded-full blur-[100px] opacity-40"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-100 rounded-full blur-[100px] opacity-40"></div>
            </div>

            {/* Top Navigation */}
            <div className="absolute top-6 left-6 z-50">
                <button 
                    onClick={() => navigate('/user/home')} 
                    className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 shadow-sm transition-all"
                >
                    <ArrowLeft size={18} />
                </button>
            </div>

            <div className="w-full max-w-[400px] flex flex-col items-center text-center relative z-10">
                <div className="relative mb-10 group">
                    <div className={`w-24 h-24 bg-white shadow-xl rounded-[32px] flex items-center justify-center z-10 relative border border-slate-100 transition-transform group-hover:scale-105 duration-500`}>
                        {status === 'pending' ? (
                            <div className="relative flex items-center justify-center">
                                <Clock size={40} className="text-amber-500" />
                                <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full animate-ping"></div>
                            </div>
                        ) : status === 'rejected' ? (
                            <XCircle size={48} className="text-rose-500" />
                        ) : (
                             <CheckCircle2 size={48} className="text-emerald-500 drop-shadow-[0_10px_20px_rgba(16,185,129,0.3)]" />
                        )}
                    </div>
                    {/* Floating badge */}
                    <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-2xl shadow-lg border border-slate-50 z-20">
                        <ShieldCheck size={20} className={status === 'verified' || status === 'approved' ? 'text-emerald-500' : 'text-slate-300'} />
                    </div>
                </div>

                <h1 className="text-2xl font-medium text-slate-900 mb-2 tracking-tight">
                    {status === 'pending' ? 'Verification Pending' : status === 'rejected' ? 'Verification Failed' : 'Account Verified'}
                </h1>
                
                <p className="text-slate-500 text-[13px] mb-12 max-w-[280px] leading-relaxed font-medium">
                    {status === 'pending' 
                        ? "Our admin team is currently reviewing your documents. This process usually takes 2-4 hours."
                        : status === 'rejected'
                        ? `Reason: ${userData?.kycRejectionReason || "Documents were not clear or mismatched."}`
                        : "Success! Your documents are verified. You now have full access to all platform features."}
                </p>

                {status === 'pending' ? (
                    <div className="w-full space-y-4">
                        <div className="w-full bg-slate-50 border border-slate-200 text-slate-400 font-medium uppercase text-[11px] tracking-[0.2em] py-4.5 rounded-2xl shadow-inner">
                            Awaiting Admin Review
                        </div>
                        <div className="flex items-center justify-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                            <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></div>
                            Processing Live Queue
                        </div>
                    </div>
                ) : status === 'rejected' ? (
                    <button 
                        onClick={() => navigate('/user/auth/kyc')}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium uppercase text-[12px] tracking-[0.2em] py-4.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                    >
                        Try Resubmitting <ChevronRight size={16} />
                    </button>
                ) : (
                    <button 
                        onClick={() => navigate('/user/home')}
                        className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-medium uppercase text-[12px] tracking-[0.2em] py-4.5 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95"
                    >
                        Go to Dashboard
                    </button>
                )}
            </div>
        </div>
    );
};

export default PendingApproval;
