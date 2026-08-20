import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Smartphone, Lock, User, Mail, Gift, ShieldCheck } from 'lucide-react';
import { useUser } from '../context/UserContext';
import {
    extractReferralCode,
    clearPendingReferralCode,
} from '../../shared/utils/referral';

const inputClass =
    'w-full bg-white text-[#462211] font-medium pl-10 pr-3.5 py-2 rounded-xl border border-[#E5E7EB] focus:border-[#462211]/40 focus:outline-none transition-all placeholder:text-[#C4B5A8] text-[12.5px]';

const Register = () => {
    const navigate = useNavigate();
    const { register, sendRegisterOtp } = useUser();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        referral: '',
        phone: '',
    });
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    const [referrerName, setReferrerName] = useState('');
    const [checkingReferral, setCheckingReferral] = useState(false);
    const [referralCode, setReferralCode] = useState('');

    const lookupReferrer = async (code) => {
        if (!code || code.length < 4) {
            setReferrerName('');
            return;
        }
        setCheckingReferral(true);
        try {
            const res = await fetch(`/api/public/referrer/${code}`);
            const data = await res.json();
            if (data.success && data.name) {
                setReferrerName(data.name);
            } else {
                setReferrerName('');
            }
        } catch {
            setReferrerName('');
        } finally {
            setCheckingReferral(false);
        }
    };

    const applyReferralInput = (rawValue, { showCode = false } = {}) => {
        const raw = String(rawValue || '');
        if (!raw.trim()) {
            setFormData((prev) => ({ ...prev, referral: '' }));
            setReferralCode('');
            setReferrerName('');
            return;
        }

        const cleaned = extractReferralCode(raw);
        setFormData((prev) => ({
            ...prev,
            referral: cleaned && (showCode || raw.includes('://') || raw.includes('play.google'))
                ? cleaned
                : raw,
        }));

        if (cleaned) {
            setReferralCode(cleaned);
            lookupReferrer(cleaned);
        } else {
            setReferralCode('');
            setReferrerName('');
        }
    };

    const handleReferralChange = (val) => {
        applyReferralInput(val);
    };

    const handleReferralPaste = (e) => {
        const pasted = e.clipboardData?.getData('text') || '';
        if (!pasted.trim()) return;
        e.preventDefault();
        applyReferralInput(pasted.trim(), { showCode: true });
    };

    const handleReferralBlur = () => {
        const cleaned = extractReferralCode(formData.referral);
        if (cleaned) {
            setReferralCode(cleaned);
            setFormData((prev) => ({ ...prev, referral: cleaned }));
            lookupReferrer(cleaned);
        }
    };

    useEffect(() => {
        clearPendingReferralCode();
        setFormData((prev) => ({ ...prev, referral: '' }));
        setReferralCode('');
        setReferrerName('');
    }, []);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim()) {
            setError('Please enter your full name');
            return;
        }

        const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
        const emailParts = formData.email.split('@');
        const localPart = emailParts[0]?.toLowerCase();
        const domainPart = emailParts[1]?.toLowerCase();
        const domainWithoutTld = domainPart?.split('.')[0];

        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address (e.g. name@gmail.com)');
            return;
        }
        if (localPart && domainWithoutTld && localPart === domainWithoutTld) {
            setError('Please use a real email address (e.g. name@gmail.com)');
            return;
        }

        if (!/^[6-9]\d{9}$/.test(formData.phone) && formData.phone !== '9999999999') {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }

        setLoading(true);
        const result = await sendRegisterOtp(formData.phone, formData.email);
        setLoading(false);
        if (result.success) {
            setStep(2);
            setResendCooldown(30);
        } else {
            setError(result.error);
        }
    };

    const handleResendOtp = async () => {
        setError('');
        setLoading(true);
        const result = await sendRegisterOtp(formData.phone, formData.email);
        setLoading(false);
        if (result.success) {
            setResendCooldown(30);
        } else {
            setError(result.error);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        if (otp.length < 6) return;

        setLoading(true);
        const resolvedCode =
            referralCode ||
            extractReferralCode(formData.referral) ||
            '';
        const result = await register({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            referralCode: resolvedCode,
            otp: otp,
        });
        setLoading(false);

        if (result.success) {
            clearPendingReferralCode();
            navigate('/user/home');
        } else {
            setError(result.error || 'Registration failed. Please try again.');
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
                <form onSubmit={handleSendOTP} className="space-y-2.5">
                    <div className="space-y-2">
                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#7A5648] ml-0.5">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89890]" size={18} />
                                <input
                                    type="text"
                                    placeholder="Enter full name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#7A5648] ml-0.5">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89890]" size={18} />
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#7A5648] ml-0.5">Referral (Optional)</label>
                            <div className="relative">
                                <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89890]" size={18} />
                                <input
                                    type="text"
                                    inputMode="text"
                                    autoCapitalize="characters"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    placeholder="Paste Play Store invite link"
                                    value={formData.referral}
                                    onChange={(e) => handleReferralChange(e.target.value)}
                                    onPaste={handleReferralPaste}
                                    onBlur={handleReferralBlur}
                                    className={`${inputClass} uppercase tracking-wide`}
                                />
                            </div>
                            {checkingReferral && (
                                <div className="text-[10px] text-[#A89890] ml-1 mt-1 animate-pulse">Verifying referral code...</div>
                            )}
                            {referralCode && referrerName && (
                                <div className="mt-1.5 px-3 py-2 bg-[#E8F5EE] rounded-xl border border-[#C6E7D4] flex items-center gap-2 text-emerald-700 text-[10px] font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Code {referralCode} · Referred By: {referrerName}
                                </div>
                            )}
                            {referralCode && !referrerName && !checkingReferral && (
                                <div className="text-[10px] text-[#7A5648] ml-1 mt-1">Referral code: {referralCode}</div>
                            )}
                            {formData.referral && !referralCode && !checkingReferral && (
                                <div className="text-[10px] text-rose-500 ml-1 mt-1">
                                    Invalid link. Paste the Play Store invite link from Marketing.
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10.5px] font-medium text-[#7A5648] ml-0.5">Mobile Number</label>
                            <div className="relative">
                                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A89890]" size={16} />
                                <input
                                    type="tel"
                                    placeholder="10-digit mobile"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#462211] hover:bg-[#5a2d1a] disabled:opacity-50 text-white py-2.5 rounded-xl font-medium text-[13px] transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-1"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign Up'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4 animate-in slide-in-from-right duration-500">
                    <div className="text-center mb-2">
                        <div className="w-12 h-12 bg-[#F3E8E0] rounded-full flex items-center justify-center mx-auto mb-2 border border-[#EDE4DC]">
                            <ShieldCheck size={26} className="text-[#462211]" />
                        </div>
                        <h3 className="text-[16px] font-medium text-[#462211]">Verify OTP</h3>
                        <p className="text-[11px] text-[#7A5648] mt-1">Enter the 6-digit code sent to your phone</p>
                    </div>

                    <div className="relative max-w-[220px] mx-auto">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89890]" size={18} />
                        <input
                            type="text"
                            placeholder="000000"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className={`${inputClass} text-center tracking-[0.5em] text-[18px] placeholder:tracking-normal`}
                            required
                        />
                    </div>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            className="text-[11px] font-medium text-[#462211] hover:underline disabled:opacity-50"
                            disabled={loading || resendCooldown > 0}
                        >
                            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || otp.length < 6}
                        className="w-full bg-[#462211] hover:bg-[#5a2d1a] disabled:opacity-50 text-white py-3.5 rounded-xl font-medium text-[14px] transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Register'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default Register;
