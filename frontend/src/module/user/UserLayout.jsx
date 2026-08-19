import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
    Bell, Home as HomeIcon, User, HelpCircle, Building2, Rocket, X, CheckCircle2, 
    AlertCircle, Info, Sparkles, Headset, TrendingUp, Briefcase, Share2, MoreVertical, Menu
} from 'lucide-react';
import { useUser } from './context/UserContext';
import api from '../shared/services/api';
import LogoImg from '../../assets/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png';
import PullToRefreshWrapper from './components/PullToRefreshWrapper';

const UserLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const { userData, notifications, clearNotifications, markAsRead, logout } = useUser();

    const kycOk = ['approved', 'verified'].includes(String(userData?.kycStatus || '').toLowerCase());

    // Future Fund heartbeat after KYC (no longer requires ₹499 unlock)
    useEffect(() => {
        if (!kycOk) return undefined;

        const ping = () => {
            if (document.visibilityState !== 'visible') return;
            api.post('/user/data/future-fund/activity', { minutes: 1 }).catch(() => {});
        };

        // First ping shortly after open, then every 60s
        const initial = setTimeout(ping, 5000);
        const interval = setInterval(ping, 60 * 1000);

        const onVisible = () => {
            if (document.visibilityState === 'visible') ping();
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            clearTimeout(initial);
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [kycOk]);

    useEffect(() => {
        const handleResize = () => {
            // If window height shrinks by more than 20% (keyboard opened)
            if (window.visualViewport) {
                setIsKeyboardOpen(window.visualViewport.height < window.innerHeight * 0.8);
            } else {
                setIsKeyboardOpen(window.innerHeight < 500);
            }
        };
        window.visualViewport?.addEventListener('resize', handleResize);
        window.addEventListener('resize', handleResize);
        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Combine global and personal notifications
    const allNotifications = React.useMemo(() => {
        const readIds = JSON.parse(localStorage.getItem('dromoney_read_notifs') || '[]');
        
        const personalNotifs = (userData?.userNotifications || []).map(n => {
            const idStr = n._id || n.id || Math.random().toString();
            return {
                id: idStr,
                title: n.title,
                message: n.message,
                time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
                timestamp: n.createdAt ? new Date(n.createdAt).getTime() : Date.now(),
                type: n.type || 'info',
                isRead: n.isRead || readIds.includes(idStr)
            };
        });
        
        const globalNotifs = notifications.map(n => ({
            ...n,
            timestamp: n.id // Global ones use timestamp for id in some places, or we can just assume recent
        }));

        return [...globalNotifs, ...personalNotifs].sort((a, b) => b.timestamp - a.timestamp);
    }, [notifications, userData?.userNotifications]);

    const unreadNotifs = allNotifications.filter(n => !n.isRead);

    const navItems = [
        { path: '/user/home', label: 'Home', icon: HomeIcon },
        { path: '/user/income', label: 'Income', icon: TrendingUp },
        { path: '/user/business', label: 'Business', icon: Briefcase },
        { path: '/user/profile', label: 'Profile', icon: User },
    ];

    const getNotifIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="text-emerald-500" size={18} />;
            case 'warning': return <AlertCircle className="text-amber-500" size={18} />;
            case 'info': return <Info className="text-sky-500" size={18} />;
            default: return <Bell className="text-sky-500" size={18} />;
        }
    };

    return (
        <div className="bg-white text-slate-900 font-poppins overflow-hidden flex flex-col max-w-md mx-auto relative" style={{ height: '100vh', backgroundColor: '#FCF8F5' }}>
            <header className="shrink-0 z-50 bg-white px-3 py-2 flex items-center justify-between min-h-[54px] border-b border-slate-100/80">
                <div className="flex items-center gap-2.5 active:scale-95 transition-transform cursor-pointer" onClick={() => navigate('/user/home')}>
                    <div
                        className="w-10 h-10 rounded-[11px] shrink-0 flex items-center justify-center overflow-hidden"
                        style={{
                            background: 'radial-gradient(ellipse 90% 85% at 50% 38%, #FFF9F3 0%, #F5E4D0 42%, #E2C4A4 100%)',
                            boxShadow: '0 2px 8px rgba(70,34,17,0.08), inset 0 2px 4px rgba(255,255,255,0.7)',
                        }}
                    >
                        <img src={LogoImg} alt="Dromoney" className="w-[34px] h-[34px] object-contain" draggable={false} />
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-[16px] font-bold text-[#1A1A1A] leading-none tracking-tight">Dromoney</span>
                        <span className="text-[9px] text-slate-400 font-medium mt-0.5 tracking-wide">
                            Learn <span className="text-[#B3591C]">•</span> Grow <span className="text-[#B3591C]">•</span> Earn
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        onClick={() => setIsNotifOpen(true)}
                        className="w-9 h-9 flex items-center justify-center text-slate-700 relative active:scale-90"
                    >
                        <Bell size={20} strokeWidth={2} />
                        {unreadNotifs.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C2520A] rounded-full border-2 border-white"></span>
                        )}
                    </button>
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="w-9 h-9 flex items-center justify-center text-slate-700 active:scale-90"
                    >
                        <MoreVertical size={20} strokeWidth={2} />
                    </button>
                </div>
            </header>

            {/* --- Notification Modal (Popup Form) --- */}
            <div className={`fixed inset-0 z-[100] transition-all duration-300 flex items-center justify-center ${isNotifOpen ? 'visible' : 'invisible'}`}>
                {/* Backdrop Blur */}
                <div
                    onClick={() => setIsNotifOpen(false)}
                    className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isNotifOpen ? 'opacity-100' : 'opacity-0'}`}
                ></div>

                {/* Modal Body */}
                <div className={`relative w-[92%] max-w-sm bg-[#FCF8F5] shadow-2xl rounded-3xl overflow-hidden transition-all duration-300 ease-out flex flex-col max-h-[80vh] ${isNotifOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}>
                    <div className="bg-white px-5 py-3 flex items-center gap-3 border-b border-[#EDE4DC] shrink-0">
                        <div className="w-8 h-8 flex items-center justify-center bg-[#462211] rounded-lg text-white">
                            <Bell size={16} />
                        </div>
                        <div className="flex flex-col flex-1">
                            <p className="text-[#B3591C] text-[7px] font-medium uppercase tracking-[0.2em] leading-none mb-0.5">
                                In-App Updates
                            </p>
                            <h2 className="text-[15px] font-semibold text-[#462211] tracking-tight leading-none">
                                Notifications
                            </h2>
                        </div>
                        <button
                            onClick={() => setIsNotifOpen(false)}
                            className="w-8 h-8 flex items-center justify-center bg-[#FFF5F0] rounded-lg text-[#462211] active:scale-90 transition-all border border-[#EDE4DC]"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                        {allNotifications.length > 0 ? (
                            allNotifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    onClick={() => markAsRead(notif.id)}
                                    className={`flex gap-3 p-3.5 rounded-2xl transition-all cursor-pointer group relative border ${
                                        notif.isRead 
                                        ? 'bg-white/60 border-[#EDE4DC]/50 opacity-60' 
                                        : 'bg-white border-[#EDE4DC] shadow-[0_2px_8px_rgba(70,34,17,0.06)]'
                                    }`}
                                >
                                    {!notif.isRead && (
                                        <div className="absolute top-3.5 right-3.5 w-1.5 h-1.5 bg-[#B3591C] rounded-full animate-pulse"></div>
                                    )}
                                    <div className={`mt-0.5 shrink-0 transition-transform group-hover:scale-110 ${notif.isRead ? 'grayscale opacity-30' : ''}`}>
                                        {getNotifIcon(notif.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <h4 className={`text-[12px] font-medium tracking-tight transition-colors ${notif.isRead ? 'text-[#7A5648]' : 'text-[#462211]'} uppercase`}>
                                                {notif.title}
                                            </h4>
                                            <span className="text-[8px] font-medium text-[#7A5648] bg-[#FFF5F0] px-1.5 py-0.5 rounded-md border border-[#EDE4DC]">
                                                {notif.time}
                                            </span>
                                        </div>
                                        <p className={`text-[11px] font-medium leading-relaxed ${notif.isRead ? 'text-[#A89890]' : 'text-[#7A5648]'}`}>
                                            {notif.message}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-20">
                                <div className="w-16 h-16 bg-[#F3E8E0] rounded-full flex items-center justify-center mb-4 opacity-60">
                                    <Bell size={32} className="text-[#D4C4B8] stroke-1" />
                                </div>
                                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#7A5648]">All caught up</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-white/20 backdrop-blur-md border-t border-slate-200/50 text-center">
                        <button
                            onClick={clearNotifications}
                            className="w-full py-3 text-[10px] font-medium text-blue-600 uppercase tracking-widest bg-white border border-blue-100 rounded-xl shadow-sm active:scale-95 transition-all"
                        >
                            Clear all notifications
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Side Menu (Right Drawer) — scoped inside app container --- */}
            <div className={`absolute inset-0 z-[100] transition-all duration-400 ${isMenuOpen ? 'visible' : 'invisible'}`}>
                <div
                    onClick={() => setIsMenuOpen(false)}
                    className={`absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-400 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                ></div>

                <div className={`absolute top-0 right-0 h-full w-[270px] max-w-[80%] bg-[#FCF8F5] shadow-2xl transition-transform duration-400 ease-out flex flex-col ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="px-4 py-3.5 border-b border-[#EDE4DC] flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-[9px] bg-[#462211] flex items-center justify-center">
                                <Menu size={14} className="text-white" />
                            </div>
                            <span className="text-[13px] font-semibold text-[#462211] tracking-tight uppercase">Menu</span>
                        </div>
                        <button onClick={() => setIsMenuOpen(false)} className="w-8 h-8 flex items-center justify-center text-[#9A8478] hover:text-[#462211] transition-colors active:scale-90">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-2.5 px-2.5">
                        <button 
                            onClick={() => { navigate('/user/profile'); setIsMenuOpen(false); }}
                            className="w-full px-3 py-3 flex items-center gap-3 hover:bg-white/60 rounded-xl transition-all mb-1"
                        >
                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-[#EDE4DC]">
                                <img src={userData?.profileImage || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&q=80&fit=crop"} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="text-left min-w-0">
                                <p className="text-[14px] font-semibold text-[#462211] leading-none tracking-tight truncate">{userData?.name || 'Guest User'}</p>
                                <p className="text-[9px] text-[#B3591C] font-semibold mt-1 uppercase tracking-wider">Profile</p>
                            </div>
                        </button>

                        <div className="h-px bg-[#EDE4DC] mx-3 mb-1.5"></div>

                        {[
                            { icon: User, label: 'Settings', path: '/user/profile' },
                            { icon: HelpCircle, label: 'How It Works', path: '/user/info/how-it-works' },
                            { icon: Sparkles, label: 'Benefits', path: '/user/info/benefits' },
                            { icon: Share2, label: 'Invite', path: '/user/guide/invite' },
                            { icon: Rocket, label: 'Promote Brand', path: '/user/promote-brand' },
                            { icon: Building2, label: 'About Us', path: '/user/info/about' },
                            { icon: Headset, label: 'Contact Us', path: '/user/info/contact' }
                        ].map((item, idx) => (
                            <button 
                                key={idx}
                                onClick={() => { 
                                    if (item.path.includes('invite') || item.path.includes('marketing')) {
                                        navigate(item.path, { state: { showReferral: true } });
                                    } else {
                                        navigate(item.path);
                                    }
                                    setIsMenuOpen(false); 
                                }}
                                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-white/60 rounded-xl transition-all group"
                            >
                                <item.icon size={17} className="text-[#9A8478] group-hover:text-[#B3591C] transition-colors" strokeWidth={2} />
                                <span className="text-[13px] font-medium text-[#462211]">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="px-4 py-3.5 border-t border-[#EDE4DC]">
                        <button 
                            onClick={() => { logout(); navigate('/user/auth/login'); setIsMenuOpen(false); }}
                            className="w-full py-3 bg-[#462211] hover:bg-[#5D2E17] text-white rounded-xl transition-all active:scale-95 shadow-md font-semibold uppercase text-[11px] tracking-widest"
                        >
                            Log Out
                        </button>
                        <p className="text-[9px] font-medium text-[#9A8478] uppercase tracking-[0.1em] mt-3 text-center">Version 1.0.2</p>
                    </div>
                </div>
            </div>

            {/* --- Dynamic Content Rendering Area (Pages) --- */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth" style={{ paddingBottom: '68px' }}>
                <PullToRefreshWrapper>
                    <Outlet />
                </PullToRefreshWrapper>
            </div>

            {/* --- Premium White Elevated Bottom Navigation Bar --- FIXED: stays at bottom even when keyboard is open */}
            {!isKeyboardOpen && (
            <div
                className="absolute bottom-0 left-0 right-0 z-50 w-full px-3 pb-2"
                style={{ transform: 'translateZ(0)' }}
            >
                <div className="relative bg-white rounded-2xl h-[60px] flex items-center px-1.5 shadow-[0_-6px_20px_rgba(15,23,42,0.07)] border border-slate-100">
                    {navItems.map((item, idx) => {
                        const Icon = item.icon;
                        const isActive = item.label === 'Business'
                            ? location.pathname.includes('business')
                            : location.pathname === item.path;
                        const activeCls = 'text-[#462211]';
                        const activeShadow = 'bg-[#FFF5F0] shadow-[0_4px_12px_rgba(70,34,17,0.12)]';
                        return (
                            <button
                                key={idx}
                                onClick={() => navigate(item.path)}
                                className="flex-1 h-full flex items-center justify-center"
                            >
                                <div className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1.5 rounded-xl ${isActive ? activeShadow : ''}`}>
                                    <Icon
                                        size={18}
                                        className={isActive ? activeCls : 'text-slate-400'}
                                        strokeWidth={isActive ? 2.4 : 2}
                                    />
                                    <span className={`text-[10px] font-semibold tracking-wide ${isActive ? activeCls : 'text-slate-400'}`}>
                                        {item.label}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
            )}
        </div>
    );
};

export default UserLayout;
