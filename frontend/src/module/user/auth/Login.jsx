import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Smartphone, Lock } from 'lucide-react';
import { useUser } from '../context/UserContext';

const inputClass =
    'w-full bg-white text-[#462211] font-medium pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#462211]/40 focus:outline-none transition-all placeholder:text-[#C4B5A8] text-[13px]';

const Login = () => {
    const navigate = useNavigate();
    const { sendLoginOtp, verifyLoginOtp, isAuthenticated, loading: contextLoading } = useUser();

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [agreeAll, setAgreeAll] = useState(false);

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

    if (isAuthenticated || contextLoading) {
        return (
            <div className="min-h-[200px] flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-[#F3E8E0] border-t-[#462211] rounded-full animate-spin" />
            </div>
        );
    }

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');

        if (!/^[6-9]\d{9}$/.test(phone) && phone !== '9999999999') {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }

        if (!agreeAll) {
            setError('Please agree to all the mandatory legal policies before logging in.');
            return;
        }

        setLoading(true);
        const result = await sendLoginOtp(phone);
        setLoading(false);
        if (result.success) {
            setStep(2);
            setResendCooldown(30);
        } else {
            const errMsg = (typeof result.error === 'object' ? result.error.message : result.error) || '';
            if (errMsg.toLowerCase().includes('no account') || errMsg.toLowerCase().includes('not found')) {
                setError('No account found with this number. Please Sign Up first.');
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
        <div className="animate-in fade-in duration-500">
            {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-center">
                    <p className="text-rose-600 text-[11px] font-medium">
                        {typeof error === 'object' ? error.message : error}
                    </p>
                </div>
            )}

            {step === 1 ? (
                <form onSubmit={handleSendOtp} className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10.5px] font-medium text-[#7A5648] ml-0.5">Mobile Number</label>
                        <div className="relative">
                            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A89890]" size={16} />
                            <input
                                type="tel"
                                placeholder="Enter mobile number"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                className={inputClass}
                                required
                                maxLength={10}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 pt-0.5">
                        <label className="flex items-start gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={agreeAll}
                                onChange={(e) => setAgreeAll(e.target.checked)}
                                className="mt-0.5 w-3.5 h-3.5 rounded border-[#D1D5DB] accent-[#462211] cursor-pointer"
                            />
                            <span className="text-[10px] text-[#7A5648] leading-tight group-hover:text-[#462211] transition-colors">
                                I agree to the{' '}
                                <Link to="/user/info/privacy" className="text-[#462211] underline" target="_blank">Privacy Policy</Link>,{' '}
                                <Link to="/user/info/terms" className="text-[#462211] underline" target="_blank">Terms & Conditions</Link>,{' '}
                                <Link to="/user/info/guidelines" className="text-[#462211] underline" target="_blank">Community Guidelines</Link>{' '}
                                and <Link to="/user/info/refund-policy" className="text-[#462211] underline" target="_blank">No Refund Policy</Link>.
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={phone.length < 10 || !agreeAll || loading}
                        className="w-full bg-[#462211] hover:bg-[#5a2d1a] disabled:opacity-50 disabled:pointer-events-none text-white py-2.5 rounded-xl font-medium text-[13px] transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-1"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Login'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in slide-in-from-right duration-500">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-[11px] font-medium text-[#7A5648]">Verification OTP</label>
                            <button type="button" onClick={() => setStep(1)} className="text-[10px] font-medium text-[#462211]">
                                Change number
                            </button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89890]" size={18} />
                            <input
                                type="text"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                className={`${inputClass} text-center tracking-[0.5em] text-[18px] placeholder:tracking-normal`}
                                required
                                maxLength={6}
                            />
                        </div>
                        <div className="text-center mt-2">
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                className="text-[11px] font-medium text-[#462211] hover:underline disabled:opacity-50"
                                disabled={loading || resendCooldown > 0}
                            >
                                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={otp.length !== 6 || loading}
                        className="w-full bg-[#462211] hover:bg-[#5a2d1a] disabled:opacity-50 text-white py-3.5 rounded-xl font-medium text-[14px] transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify Account'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default Login;
