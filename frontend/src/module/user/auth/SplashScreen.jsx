import React, { useEffect, useState } from 'react';
import logoImg from '../../../assets/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png';

const SplashScreen = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 800); // Allow fade out animation to finish
        }, 3000); // Show for 3 seconds

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#060b1a] transition-all duration-1000 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@100;400;700;900&display=swap');
                    
                    @keyframes logo-pop {
                        0% { transform: scale(0); opacity: 0; }
                        70% { transform: scale(1.15); opacity: 1; }
                        85% { transform: scale(0.95); }
                        100% { transform: scale(1); }
                    }
                    @keyframes pulse-glow {
                        0% { box-shadow: 0 0 0px rgba(245, 158, 11, 0); }
                        50% { box-shadow: 0 0 40px rgba(245, 158, 11, 0.2); }
                        100% { box-shadow: 0 0 0px rgba(245, 158, 11, 0); }
                    }
                    @keyframes text-reveal {
                        0% { opacity: 0; transform: translateY(20px); filter: blur(10px); }
                        100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                    }
                    @keyframes shimmer {
                        0% { background-position: -200% center; }
                        100% { background-position: 200% center; }
                    }
                    .animate-logo-pop {
                        animation: logo-pop 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    }
                    .animate-text-reveal {
                        animation: text-reveal 1s ease-out 0.5s forwards;
                        opacity: 0;
                    }
                    .premium-text {
                        font-family: 'Poppins', sans-serif !important;
                        background: linear-gradient(135deg, #fff 0%, #f59e0b 50%, #fff 100%);
                        background-size: 200% auto;
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        animation: shimmer 4s infinite linear;
                        text-shadow: 0 10px 30px rgba(245, 158, 11, 0.2);
                    }
                    .dro-text {
                        font-family: 'Poppins', sans-serif !important;
                        color: #f59e0b;
                        text-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
                    }
                `}
            </style>
            
            <div className="relative flex flex-col items-center gap-8">
                {/* Immersive Background Glows */}
                <div className="absolute inset-0 -m-32 bg-amber-500/10 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute inset-0 -m-16 bg-blue-600/5 blur-[80px] rounded-full animate-pulse delay-1000"></div>

                {/* Logo with Pop Animation */}
                <div className="relative z-10 animate-logo-pop">
                    <div className="p-1 rounded-full bg-gradient-to-tr from-amber-500/20 to-transparent backdrop-blur-sm">
                        <img src={logoImg} alt="Dromoney" className="w-36 h-36 object-contain" />
                    </div>
                </div>

                {/* Brand Identity */}
                <div className="relative z-10 text-center animate-text-reveal">
                    <h2 className="text-[42px] font-medium tracking-[-0.02em] flex items-center justify-center">
                        <span className="dro-text">DRO</span>
                        <span className="premium-text ml-1">MONEY</span>
                    </h2>
                    <div className="flex items-center justify-center gap-4 mt-2">
                        <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-amber-500/50"></div>
                        <p className="text-white/50 text-[10px] font-medium uppercase tracking-[0.5em] whitespace-nowrap">The Future of Earning</p>
                        <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-amber-500/50"></div>
                    </div>
                </div>

                {/* Loading State */}
                <div className="mt-8 flex flex-col items-center gap-3 animate-text-reveal" style={{ animationDelay: '1s' }}>
                    <div className="w-56 h-[3px] bg-white/5 rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0 w-full animate-[shimmer_2s_infinite_linear]"></div>
                    </div>
                    <span className="text-[8px] font-medium text-amber-500/40 uppercase tracking-widest">Initialising Secure Session</span>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
