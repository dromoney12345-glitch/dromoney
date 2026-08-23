import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import logo from '../../../assets/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png';

const AdminLogin = () => {
    const navigate = useNavigate();
    const { adminLogin } = useAdmin();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rememberMe) {
            setError('Please keep “Keep me signed in” ticked so you stay logged in on this device.');
            return;
        }
        setError('');
        setLoading(true);
        const result = await adminLogin(email, password, rememberMe);
        setLoading(false);
        if (result.success) {
            navigate('/admin/dashboard');
        } else {
            setError(result.error);
        }
    };

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(165deg, #FFF9F3 0%, #FCF8F5 42%, #F3E8E0 100%)', fontFamily: "'Poppins', sans-serif" }}
        >
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#E8C4A0]/40 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-28 -right-20 w-96 h-96 rounded-full bg-[#D4A574]/25 blur-3xl pointer-events-none" />

            <div className="w-full max-w-[880px] bg-white/90 backdrop-blur-sm rounded-[28px] overflow-hidden shadow-[0_24px_80px_rgba(70,34,17,0.14)] border border-[#EDE4DC] flex flex-col md:flex-row relative z-10">
                <div className="flex-1 bg-gradient-to-br from-[#5D2E17] via-[#462211] to-[#3A1C0E] relative overflow-hidden flex flex-col justify-center px-10 py-12 text-white">
                    <div className="absolute top-[-20%] right-[-15%] w-64 h-64 rounded-full bg-[#E8C4A0]/15 blur-2xl" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 rounded-full bg-white/10 blur-2xl" />

                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#FFF9F3] flex items-center justify-center shadow-inner">
                                <img src={logo} alt="Dromoney" className="w-9 h-9 object-contain" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold tracking-wide uppercase leading-none">Dromoney</p>
                                <p className="text-[10px] text-[#E8C4A0] uppercase tracking-[0.22em] mt-1">Admin Panel</p>
                            </div>
                        </div>

                        <div>
                            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-none">Welcome</h1>
                            <p className="text-sm text-[#E8C4A0] uppercase tracking-[0.28em] mt-3">Secure access</p>
                        </div>

                        <p className="text-[13px] text-white/70 max-w-[280px] leading-relaxed">
                            Sign in to manage users, KYC, wallets, tasks, and Future Fund — same cream look as the live app.
                        </p>

                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-medium uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            System online
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-[#FFFCF9] p-8 md:p-10 flex flex-col justify-center relative">
                    <div className="max-w-[340px] w-full mx-auto">
                        <div className="mb-8">
                            <h2 className="text-2xl font-semibold text-[#462211] tracking-tight">Sign in</h2>
                            <p className="text-[13px] text-[#7A5648] mt-1">Enter your admin email and password.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                            <div>
                                <label className="text-[11px] font-medium uppercase tracking-wide text-[#7A5648] ml-1">Email</label>
                                <div className="relative mt-1.5">
                                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4A99A]" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@dromoney.com"
                                        className="w-full bg-white border border-[#EDE4DC] rounded-xl py-3 pl-10 pr-3 text-[14px] text-[#462211] placeholder:text-[#C4B5A8] outline-none focus:border-[#462211] focus:ring-2 focus:ring-[#E8C4A0]/50"
                                        required
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-medium uppercase tracking-wide text-[#7A5648] ml-1">Password</label>
                                <div className="relative mt-1.5">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4A99A]" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-white border border-[#EDE4DC] rounded-xl py-3 pl-10 pr-16 text-[14px] text-[#462211] placeholder:text-[#C4B5A8] outline-none focus:border-[#462211] focus:ring-2 focus:ring-[#E8C4A0]/50"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wide text-[#B3591C]"
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>

                            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#FCF8F5] border-2 border-[#462211]/25 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => {
                                        setRememberMe(e.target.checked);
                                        if (e.target.checked) setError('');
                                    }}
                                    className="mt-0.5 w-4 h-4 rounded accent-[#462211] shrink-0"
                                    required
                                />
                                <span>
                                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#462211]">
                                        <ShieldCheck size={14} />
                                        Keep me signed in
                                        <span className="text-[9px] uppercase tracking-wide bg-[#462211] text-white px-1.5 py-0.5 rounded">Required</span>
                                    </span>
                                    <span className="block text-[11px] text-[#7A5648] mt-0.5 leading-snug">
                                        Stay logged in on this device. Unticking this will block sign-in.
                                    </span>
                                </span>
                            </label>

                            {error && (
                                <p className="text-[12px] font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#462211] hover:bg-[#5D2E17] text-white py-3.5 rounded-xl text-[14px] font-semibold transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Sign in
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <p className="text-center text-[10px] font-medium text-[#C4A99A] uppercase tracking-[0.18em] mt-10">
                        © 2026 Dromoney
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
