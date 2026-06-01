import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Mail, Lock, Eye, EyeOff, LogIn, 
    ArrowRight
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import logo from '../../../assets/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png';

const AdminLogin = () => {
    const navigate = useNavigate();
    const { adminLogin } = useAdmin();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await adminLogin(email, password);
        setLoading(false);
        if (result.success) {
            navigate('/admin/dashboard');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#050b1a] p-4 relative overflow-hidden" style={{ fontFamily: "'Roboto', sans-serif" }}>
            {/* Google Fonts Import */}
            <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap');`}
            </style>

            {/* Background Atmosphere */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]"></div>
            </div>

            <div className="w-full max-w-[800px] min-h-[500px] bg-white rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col md:flex-row transition-all duration-500 relative z-10">
                
                {/* ── Left Section: Welcome ── */}
                <div className="flex-1 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] relative overflow-hidden flex flex-col justify-center px-10 py-12 text-white">
                    {/* Dynamic Background Elements */}
                    <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[80px] animate-pulse"></div>
                    <div className="absolute bottom-[-5%] left-[-5%] w-[250px] h-[250px] bg-sky-500/20 rounded-full blur-[60px]"></div>
                    
                    {/* Glassmorphic Spheres */}
                    <div className="absolute top-[15%] left-[-20px] w-44 h-44 bg-gradient-to-br from-white/10 to-transparent rounded-full backdrop-blur-[2px] border border-white/10 shadow-2xl"></div>
                    <div className="absolute bottom-[20%] right-[-30px] w-32 h-32 bg-gradient-to-tr from-indigo-500/30 to-transparent rounded-full backdrop-blur-[1px] border border-white/5 shadow-xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/5 rounded-full pointer-events-none opacity-20"></div>

                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-700">
                            <div className="p-1.5 bg-white/5 rounded-xl backdrop-blur-md border border-white/10">
                                <img src={logo} alt="Dromoney" className="w-10 h-10 object-contain brightness-0 invert" />
                            </div>
                            <span className="text-xl font-medium tracking-tighter uppercase text-white/90">Dromoney</span>
                        </div>
                        
                        <div className="space-y-1">
                            <h1 className="text-5xl font-medium tracking-tight leading-none text-white animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">WELCOME</h1>
                            <p className="text-base font-bold text-indigo-400 uppercase tracking-[0.3em] pl-1 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">Admin Gateway</p>
                        </div>
                        
                        <p className="text-[13px] text-slate-400 max-w-[280px] leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                            Secure institutional access to the Dromoney financial core.
                        </p>

                        <div className="pt-6 animate-in fade-in duration-1000 delay-500">
                             <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-[10px] font-bold text-slate-300 uppercase tracking-normal">
                                <CheckCircle2 size={12} className="text-emerald-500" /> System Status: Online
                             </div>
                        </div>
                    </div>
                </div>

                {/* ── Right Section: Sign In Form ── */}
                <div className="flex-1 bg-white p-10 py-12 flex flex-col justify-center relative">
                    <div className="max-w-[300px] w-full mx-auto space-y-8">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-medium text-slate-900 tracking-tight">Sign in</h2>
                            <p className="text-xs text-slate-400 font-medium">Enter your authorized credentials.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
                            {/* Dummy inputs to prevent browser autofill/autocomplete */}
                            <input type="text" name="prevent_autofill_email" style={{ display: 'none' }} tabIndex="-1" autoComplete="new-password" />
                            <input type="password" name="prevent_autofill_pass" style={{ display: 'none' }} tabIndex="-1" autoComplete="new-password" />

                            <div className="space-y-6">
                                {/* Email Field */}
                                <div className="relative group">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors duration-300">
                                        <Mail size={20} />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Authorized Email Address"
                                        className="w-full bg-transparent border-b-2 border-slate-100 py-4 pl-10 text-[15px] font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-600 transition-all duration-300"
                                        required
                                        autoComplete="new-password"
                                    />
                                </div>

                                {/* Password Field */}
                                <div className="relative group">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors duration-300">
                                        <Lock size={20} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Secure Password"
                                        className="w-full bg-transparent border-b-2 border-slate-100 py-4 pl-10 pr-20 text-[15px] font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-600 transition-all duration-300"
                                        required
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 uppercase tracking-normal transition-all px-2 py-1 rounded-md hover:bg-indigo-50"
                                    >
                                        {showPassword ? 'HIDE' : 'SHOW'}
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me Only */}
                            <div className="flex items-center">
                                <label className="flex items-center gap-2 text-[12px] font-bold text-slate-400 cursor-pointer group hover:text-slate-600 transition-colors">
                                    <input type="checkbox" className="w-4 h-4 rounded border-slate-200 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 transition-all" />
                                    Keep me signed in
                                </label>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-4 pt-6">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#0f172a] hover:bg-slate-800 text-white py-3.5 rounded-xl text-[14px] font-bold transition-all active:scale-[0.98] shadow-lg shadow-slate-200 flex items-center justify-center gap-2 group"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Sign in
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                                
                                <div className="relative flex items-center justify-center py-2">
                                    <div className="w-full h-px bg-slate-100"></div>
                                    <span className="absolute bg-white px-4 text-[10px] font-medium text-slate-300 uppercase tracking-normal">secure gateway</span>
                                </div>

                                <button
                                    type="button"
                                    className="w-full bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600 py-3.5 rounded-xl text-[13px] font-bold transition-all active:scale-[0.98]"
                                >
                                    Institutional Login
                                </button>
                            </div>

                            {error && (
                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl animate-in fade-in slide-in-from-top-1">
                                    <p className="text-center text-[12px] font-bold text-rose-500">{error}</p>
                                </div>
                            )}
                        </form>
                    </div>

                    <p className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] font-medium text-slate-200 uppercase tracking-[0.4em] whitespace-nowrap">
                        © 2026 DROMONEY INTEL SYSTEMS
                    </p>
                </div>
            </div>
        </div>
    );
};

// Supporting Icons
const CheckCircle2 = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

export default AdminLogin;
