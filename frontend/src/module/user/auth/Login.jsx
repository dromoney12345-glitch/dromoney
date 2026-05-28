import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowRight, Smartphone, Lock, ShieldCheck, BookOpen, AlertTriangle, ShieldAlert, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import logoImg from '../../../assets/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png';

const Login = () => {
    const navigate = useNavigate();
    const { sendLoginOtp, verifyLoginOtp, isAuthenticated, loading: contextLoading } = useUser();
    
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    // Checkbox for mandatory policies
    const [agreeAll, setAgreeAll] = useState(false);

    // Redirect to home if user is already logged in — early return prevents flash
    useEffect(() => {
        if (isAuthenticated && !contextLoading) {
            navigate('/user/home', { replace: true });
        }
    }, [isAuthenticated, contextLoading, navigate]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    // While auth state is being determined, show nothing (prevents login flash)
    if (isAuthenticated || contextLoading) {
        return (
            <div className="min-h-screen bg-[#0f1d3a] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white/10 border-t-white/60 rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');

        // 1. Validate phone number format (Indian 10-digit)
        if (!/^[6-9]\d{9}$/.test(phone) && phone !== '9999999999') {
            setError('Number is wrong');
            return;
        }

        // 2. Validate checkbox is accepted
        if (!agreeAll) {
            setError('Please agree to all the mandatory legal policies before logging in.');
            return;
        }

        setLoading(true);
        const result = await sendLoginOtp(phone);
        setLoading(false);
        if (result.success) {
            setStep(2);
        } else {
            // Check if error represents non-existent account or other errors
            const errMsg = (typeof result.error === 'object' ? result.error.message : result.error) || '';
            if (errMsg.toLowerCase().includes('no account') || errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('number')) {
                setError('Number is wrong');
            } else {
                setError(errMsg);
            }
        }
    };

    const handleResendOtp = async () => {
        setError('');
        setLoading(true);
        const result = await sendLoginOtp(phone);
        setLoading(false);
        if (result.success) {
            setResendCooldown(30);
        } else {
            setError(result.error);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');

        if (otp.length !== 6) {
            setError('OTP must be exactly 6 digits.');
            return;
        }

        setLoading(true);
        const result = await verifyLoginOtp(phone, otp);
        setLoading(false);
        if (result.success) {
            navigate('/user/home');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white animate-in fade-in duration-700 overflow-y-auto scrollbar-hide">
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap');
                    body { font-family: 'Roboto', sans-serif; }
                `}
            </style>

            {/* ── Extreme Compact Curved Header ── */}
            <div className="bg-[#0f1d3a] pt-4 pb-8 px-8 rounded-br-[80px] relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <img src={logoImg} alt="Dromoney" className="w-10 h-10 object-contain" />
                        <span className="text-[20px] font-black tracking-[0.1em] uppercase">
                            <span className="text-[#8B4513]">DRO</span>
                            <span className="text-white">MONEY</span>
                        </span>
                    </div>

                    <div className="mt-0">
                        <p className="text-white/60 text-[11px] font-normal mb-0 tracking-wide uppercase">Welcome Back!</p>
                        <h1 className="text-[30px] font-medium text-white tracking-tight leading-none">Sign In</h1>
                    </div>
                </div>
            </div>

            {/* ── Login Form Section ── */}
            <div className="flex-1 px-8 pt-6 pb-4 flex flex-col justify-start">
                <div className="w-full max-w-sm mx-auto">
                    {error && (
                        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                            <p className="text-rose-500 text-[11px] font-medium">
                                {typeof error === 'object' ? error.message : error}
                            </p>
                        </div>
                    )}

                    {step === 1 ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                <div className="relative group">
                                    <input
                                        type="tel"
                                        placeholder="Enter mobile number"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-slate-50 text-[#0f1d3a] font-medium px-6 py-3.5 rounded-full border border-slate-100 focus:bg-white focus:border-[#0f1d3a]/20 transition-all placeholder:text-slate-300 text-[14px]"
                                        required
                                        maxLength={10}
                                    />
                                    <Smartphone className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                </div>
                            </div>

                            {/* ── Consent & Policy Checkboxes ── */}
                            <div className="space-y-2 py-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Consent & Agreements</span>
                                
                                <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/80">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={agreeAll}
                                            onChange={(e) => setAgreeAll(e.target.checked)}
                                            className="mt-0.5 w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500/20 accent-[#0f1d3a] cursor-pointer"
                                        />
                                        <span className="text-[11.5px] font-semibold text-slate-600 group-hover:text-slate-800 transition-colors leading-relaxed">
                                            I agree to the <Link to="/user/info/privacy" className="text-[#0f1d3a] font-bold hover:underline" target="_blank">Privacy Policy</Link>, 
                                            <Link to="/user/info/terms" className="text-[#0f1d3a] font-bold hover:underline mx-1" target="_blank">Terms & Conditions</Link>, 
                                            <Link to="/user/info/guidelines" className="text-[#0f1d3a] font-bold hover:underline mx-1" target="_blank">Community Guidelines</Link> 
                                            and <Link to="/user/info/refund-policy" className="text-[#0f1d3a] font-bold hover:underline ml-1" target="_blank">No Refund Policy</Link>.
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={phone.length < 10 || !agreeAll || loading}
                                className="w-full bg-[#0f1d3a] hover:bg-[#1a2c52] disabled:opacity-50 disabled:pointer-events-none text-white py-4 rounded-full font-bold text-[14px] transition-all shadow-xl shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
                            </button>

                            <div className="text-center mt-3">
                                <p className="text-[11px] font-normal text-slate-400 uppercase tracking-widest">
                                    Don't Have An Account? <Link to="/user/auth/register" className="text-[#0f1d3a] font-bold underline decoration-sky-500/20 underline-offset-4 ml-1">Sign Up</Link>
                                </p>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in slide-in-from-right duration-500">
                            <div className="space-y-1">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Verification</label>
                                    <button type="button" onClick={() => setStep(1)} className="text-[10px] font-bold text-sky-600 uppercase">Change</button>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-slate-50 text-[#0f1d3a] font-medium px-6 py-3.5 rounded-full border border-slate-100 focus:bg-white focus:border-[#0f1d3a]/20 transition-all text-center tracking-[0.8em] text-[18px] placeholder:text-slate-300 placeholder:tracking-normal"
                                        required
                                        maxLength={6}
                                    />
                                    <Lock className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                </div>
                                <div className="text-center mt-2">
                                    <button 
                                        type="button" 
                                        onClick={handleResendOtp}
                                        className="text-[11px] font-bold text-[#0f1d3a] hover:underline disabled:opacity-50"
                                        disabled={loading || resendCooldown > 0}
                                    >
                                        {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={otp.length !== 6 || loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-full font-bold text-[14px] transition-all shadow-xl shadow-emerald-50 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify Account'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
