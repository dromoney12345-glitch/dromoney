import React, { useState, useEffect } from 'react';
import { Lock, X, ChevronRight, Sparkles } from 'lucide-react';
import { useUser } from '../context/UserContext';
import PaymentModal from './PaymentModal';

const UnlockModal = ({ isOpen, onClose }) => {
    const { refreshUserProfile } = useUser();
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleUnlockClick = () => {
        setIsPaymentOpen(true);
    };

    const handlePaymentSuccess = async () => {
        await refreshUserProfile();
        setIsPaymentOpen(false);
        onClose();
    };

    if (isPaymentOpen) {
        return (
            <PaymentModal 
                isOpen={true} 
                onClose={() => setIsPaymentOpen(false)}
                plan="Virtual Account"
                onSuccess={handlePaymentSuccess}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* --- Backdrop --- */}
            <div 
                onClick={onClose}
                className="absolute inset-0 bg-slate-900 animate-in fade-in duration-500"
            ></div>

            {/* --- Modal Content --- */}
            <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300 overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-sky-50 rounded-full"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-sky-500 rounded-3xl flex items-center justify-center shadow-xl shadow-sky-200 mb-6 group">
                        <Lock className="text-white group-hover:scale-110 transition-transform" size={40} />
                    </div>

                    <h2 className="text-2xl font-medium text-slate-900 mb-2 leading-tight">
                        Virtual Account <span className="text-sky-500">Locked</span>
                    </h2>
                    <p className="text-sm font-medium text-slate-400 mb-8 leading-relaxed px-4">
                        Create your Virtual Account for ₹499 to withdraw earnings to UPI or bank.
                    </p>

                    <div className="space-y-3 w-full">
                        <button 
                            onClick={handleUnlockClick}
                            className="w-full bg-sky-600 hover:bg-sky-700 active:scale-95 text-white py-5 rounded-2xl text-xs font-medium shadow-lg shadow-sky-200 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                        >
                            Create Virtual Account <ChevronRight size={18} />
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full text-slate-400 font-medium text-[10px] uppercase py-2 hover:text-slate-800 transition-colors tracking-widest"
                        >
                            Maybe Later
                        </button>
                    </div>

                    <div className="mt-8 flex items-center gap-2 opacity-30 group cursor-default">
                        <Sparkles size={14} className="text-sky-500 group-hover:animate-spin" />
                        <span className="text-[10px] font-medium uppercase tracking-widest">Powered by AffiliateEarn</span>
                    </div>

                    <button 
                        onClick={onClose}
                        className="absolute -top-4 -right-4 p-2 text-slate-300 hover:text-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnlockModal;
