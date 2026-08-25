import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, UserPlus, LogIn } from 'lucide-react';
import logoImg from '../../../assets/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png';
import AuthHeroBanner from '../components/AuthHeroBanner';

const AuthLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isRegister = location.pathname.includes('register');
    const hideAuthTabs = location.pathname.includes('kyc') || location.pathname.includes('pending');

    return (
        <div className="min-h-screen bg-[#FCF8F5] font-poppins flex flex-col relative overflow-x-hidden overflow-y-auto">
            {/* Wavy bottom accents */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-36 overflow-hidden">
                <div className="absolute -bottom-10 left-[-12%] w-[75%] h-28 bg-[#F3E8E0] rounded-[50%] opacity-90" />
                <div className="absolute -bottom-14 right-[-8%] w-[60%] h-32 bg-[#EDE4DC] rounded-[50%] opacity-80" />
            </div>

            <button
                type="button"
                onClick={() => navigate(-1)}
                className="absolute top-4 left-4 z-20 w-9 h-9 flex items-center justify-center text-[#462211] active:scale-90"
                aria-label="Go back"
            >
                <ChevronLeft size={24} strokeWidth={2.2} />
            </button>

            <div className="relative z-10 flex flex-col flex-1 px-4 pt-8 pb-4 max-w-md mx-auto w-full">
                <div className="flex flex-col items-center mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8C4A0] to-[#C4956A] flex items-center justify-center shadow-sm border border-[#EDE4DC] overflow-hidden shrink-0">
                            <img src={logoImg} alt="" className="w-7 h-7 object-contain" />
                        </div>
                        <span className="text-[20px] font-semibold text-[#462211] tracking-tight leading-none">
                            Dromoney
                        </span>
                    </div>
                    <p className="text-[9px] text-[#7A5648] mt-1 tracking-wide">— From Jangu Group —</p>
                </div>

                <AuthHeroBanner />

                <div className="text-center mb-2.5 px-2">
                    <h2 className="text-[15px] font-semibold text-[#462211] leading-snug">
                        Welcome to Dromoney
                    </h2>
                    <p className="text-[11px] text-[#7A5648] mt-0.5 leading-relaxed">
                        Learn, earn and unlock opportunities
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(70,34,17,0.08)] border border-[#EDE4DC]/60 p-3.5 flex-1">
                    {!hideAuthTabs && (
                        <div className="flex border-b border-[#EDE4DC] mb-4">
                            <Link
                                to={`/user/auth/register${location.search || ''}`}
                                className={`flex-1 flex items-center justify-center gap-1.5 pb-3 text-[13px] font-medium transition-colors ${
                                    isRegister
                                        ? 'text-[#462211] border-b-2 border-[#462211]'
                                        : 'text-[#A89890] border-b-2 border-transparent'
                                }`}
                            >
                                <UserPlus size={15} />
                                Sign Up
                            </Link>
                            <Link
                                to={`/user/auth/login${location.search || ''}`}
                                className={`flex-1 flex items-center justify-center gap-1.5 pb-3 text-[13px] font-medium transition-colors ${
                                    !isRegister
                                        ? 'text-[#462211] border-b-2 border-[#462211]'
                                        : 'text-[#A89890] border-b-2 border-transparent'
                                }`}
                            >
                                <LogIn size={15} />
                                Login
                            </Link>
                        </div>
                    )}

                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
