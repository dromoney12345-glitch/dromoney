import React, { useEffect, useState } from 'react';
import logoImg from '../../../assets/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png';

const SplashScreen = ({ onComplete }) => {
    const [phase, setPhase] = useState('enter');

    useEffect(() => {
        const holdTimer = setTimeout(() => setPhase('exit'), 2800);
        const exitTimer = setTimeout(onComplete, 3400);

        return () => {
            clearTimeout(holdTimer);
            clearTimeout(exitTimer);
        };
    }, [onComplete]);

    return (
        <div
            className={`fixed inset-0 z-[9999] font-poppins flex flex-col splash-root ${
                phase === 'exit' ? 'splash-exit' : 'splash-enter'
            }`}
        >
            <style>{`
                .splash-root {
                    background: #FFFFFF;
                }
                .splash-enter {
                    animation: splashBgIn 0.6s ease-out forwards;
                }
                .splash-exit {
                    animation: splashBgOut 0.6s ease-in forwards;
                }
                @keyframes splashBgIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes splashBgOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                .splash-logo-wrap {
                    animation: logoReveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
                }
                @keyframes logoReveal {
                    0% {
                        opacity: 0;
                        transform: scale(0.88);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .splash-logo-pulse {
                    animation: logoPulse 2.4s ease-in-out 1s infinite;
                }
                @keyframes logoPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }
                .splash-icon-box {
                    width: 120px;
                    height: 120px;
                    border-radius: 28px;
                    background: radial-gradient(
                        ellipse 90% 85% at 50% 38%,
                        #FFF9F3 0%,
                        #F5E4D0 42%,
                        #E2C4A4 100%
                    );
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow:
                        0 8px 22px rgba(70, 34, 17, 0.1),
                        inset 0 3px 8px rgba(255, 255, 255, 0.75),
                        inset 0 -5px 12px rgba(160, 100, 60, 0.12);
                }
                .splash-logo-img {
                    width: 74px;
                    height: 74px;
                    object-fit: contain;
                    filter: drop-shadow(0 2px 5px rgba(70, 34, 17, 0.18));
                    user-select: none;
                    pointer-events: none;
                }
                .splash-footer {
                    animation: footerReveal 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both;
                }
                @keyframes footerReveal {
                    0% {
                        opacity: 0;
                        transform: translateY(18px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .splash-exit .splash-logo-wrap,
                .splash-exit .splash-footer {
                    animation: splashFadeOut 0.5s ease-in forwards;
                }
                @keyframes splashFadeOut {
                    to {
                        opacity: 0;
                        transform: scale(0.96);
                    }
                }
            `}</style>

            <div className="flex-1 flex items-center justify-center px-6">
                <div className={`splash-logo-wrap ${phase !== 'exit' ? 'splash-logo-pulse' : ''}`}>
                    <div className="splash-icon-box">
                        <img
                            src={logoImg}
                            alt="Dromoney"
                            className="splash-logo-img"
                            draggable={false}
                        />
                    </div>
                </div>
            </div>

            <div className="splash-footer pb-12 text-center">
                <p className="text-[13px] text-[#9A8478] font-normal leading-none tracking-wide">From</p>
                <p className="text-[19px] font-semibold text-[#462211] mt-1.5 tracking-tight">Jangu Group</p>
            </div>
        </div>
    );
};

export default SplashScreen;
