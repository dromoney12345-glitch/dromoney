import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
    Menu, Bell, Wallet as WalletIcon, Home as HomeIcon, LayoutGrid, User, History, 
    PhoneCall, HelpCircle, Building2, Rocket, MonitorPlay, X, CheckCircle2, 
    AlertCircle, Info, Sparkles, Headset, TrendingUp, 
    Wrench, MessageSquare, Zap, Users, Share2 
} from 'lucide-react';
import { motion } from "framer-motion";
import { useUser } from './context/UserContext';
import LogoImg from '../../assets/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png';

const UserLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { userData, notifications, clearNotifications, markAsRead, logout } = useUser();

    const navItems = [
        { path: '/user/home', label: 'Home', icon: HomeIcon },
        { path: '/user/income', label: 'Income', icon: TrendingUp },
        { path: '/user/wallet', label: 'Wallet', icon: WalletIcon },
        { path: '/user/watch', label: 'Watch', icon: MonitorPlay },
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
        <div className="h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden flex flex-col max-w-md mx-auto relative">
            {/* --- New Dromoney Fixed Top Header --- */}
            <header className="shrink-0 z-50 bg-slate-900/95 backdrop-blur-md px-4 py-1.5 flex items-center justify-between border-b border-slate-800 shadow-xl min-h-[57px]">
                {/* 1. Brand & Logo (Left Side) */}
                <div className="flex items-center gap-1 active:scale-95 transition-transform cursor-pointer" onClick={() => navigate('/user/home')}>
                    <div className="w-14 h-14 flex items-center justify-center">
                        <img src={LogoImg} alt="Logo" className="w-full h-full object-contain brightness-110 drop-shadow-xl" />
                    </div>
                    <span className="text-[18px] font-black tracking-[0.1em] uppercase font-outfit truncate">
                        <span className="text-[#8B4513]">DRO</span>
                        <span className="text-white">MONEY</span>
                    </span>
                </div>

                {/* 3. Right Side: Actions */}
                <div className="flex items-center gap-0.5 flex-shrink-0">

 
                    {/* Bell */}
                    <button
                        onClick={() => setIsNotifOpen(true)}
                        className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-sky-400 relative active:scale-90 transition-all"
                    >
                        <Bell size={17} strokeWidth={2} />
                        {notifications.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-sky-500 rounded-full border border-slate-900"></span>
                        )}
                    </button>
 
                    {/* Menu */}
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="w-8 h-8 flex items-center justify-center text-slate-100 hover:text-sky-400 active:scale-90 transition-all"
                    >
                        <Menu size={22} strokeWidth={2} />
                    </button>
                </div>
            </header>

            {/* --- Notification Drawer (Right Side) --- */}
            <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isNotifOpen ? 'visible' : 'invisible disabled'}`}>
                {/* Backdrop Blur */}
                <div
                    onClick={() => setIsNotifOpen(false)}
                    className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 ${isNotifOpen ? 'opacity-100' : 'opacity-0'}`}
                ></div>

                {/* Drawer Body */}
                <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-[#F1F9F3] shadow-2xl transition-transform duration-500 ease-out flex flex-col ${isNotifOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    {/* Ultra-Compact Header Row - Navy Blue Theme */}
                    <div className="relative h-16 bg-gradient-to-br from-[#0B1221] to-[#1E293B] rounded-b-3xl shadow-lg overflow-hidden flex items-center px-5 shrink-0">
                        {/* Decorative Elements */}
                        <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] pointer-events-none">
                            <Bell size={100} className="text-white" />
                        </div>
                        
                        {/* Compact Row: Icon + Title */}
                        <div className="flex items-center gap-3 relative z-20 w-full">
                            <div className="w-8 h-8 flex items-center justify-center bg-white/5 backdrop-blur-md rounded-lg text-white border border-white/10">
                                <Bell size={18} />
                            </div>
                            
                            <div className="flex flex-col flex-1">
                                <p className="text-blue-400 text-[7px] font-black uppercase tracking-[0.2em] leading-none mb-1">
                                    In-App Updates
                                </p>
                                <h2 className="text-base font-black text-white tracking-tight leading-none uppercase">
                                    Notifications
                                </h2>
                            </div>

                            <button
                                onClick={() => setIsNotifOpen(false)}
                                className="w-8 h-8 flex items-center justify-center bg-white/5 backdrop-blur-md rounded-lg text-white active:scale-90 transition-all border border-white/10"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {notifications.length > 0 ? (
                            notifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    onClick={() => markAsRead(notif.id)}
                                    className={`flex gap-3 p-4 rounded-2xl transition-all cursor-pointer group relative border ${
                                        notif.isRead 
                                        ? 'bg-white/40 border-slate-200/50 opacity-60' 
                                        : 'bg-white border-blue-100 shadow-sm shadow-blue-100/30'
                                    }`}
                                >
                                    {!notif.isRead && (
                                        <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
                                    )}
                                    <div className={`mt-0.5 shrink-0 transition-transform group-hover:scale-110 ${notif.isRead ? 'grayscale opacity-30' : ''}`}>
                                        {getNotifIcon(notif.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <h4 className={`text-[13px] font-bold tracking-tight transition-colors ${notif.isRead ? 'text-slate-500' : 'text-slate-800'} uppercase`}>
                                                {notif.title}
                                            </h4>
                                            <span className="text-[8px] font-bold text-slate-400 bg-slate-50/50 px-1.5 py-0.5 rounded-md border border-slate-100">
                                                {notif.time}
                                            </span>
                                        </div>
                                        <p className={`text-[11px] font-medium leading-relaxed ${notif.isRead ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {notif.message}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-20">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 opacity-40">
                                    <Bell size={32} className="text-slate-300 stroke-1" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">All caught up</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-white/20 backdrop-blur-md border-t border-slate-200/50 text-center">
                        <button
                            onClick={clearNotifications}
                            className="w-full py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-white border border-blue-100 rounded-xl shadow-sm active:scale-95 transition-all"
                        >
                            Clear all notifications
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Standard Compact Side Menu (Right Side) --- */}
            <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isMenuOpen ? 'visible' : 'invisible'}`}>
                {/* Backdrop */}
                <div
                    onClick={() => setIsMenuOpen(false)}
                    className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                ></div>

                {/* Drawer Body (Full Height, Compact, No Scroll) */}
                <div className={`absolute top-0 right-0 h-full w-[260px] bg-[#0B1221] shadow-2xl transition-transform duration-500 ease-out flex flex-col ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    
                    {/* --- Slim Header --- */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/10">
                                <Menu size={16} className="text-emerald-500" />
                            </div>
                            <h2 className="text-[13px] font-medium text-slate-300 tracking-[0.1em] uppercase">Menu</h2>
                        </div>
                        <button onClick={() => setIsMenuOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Navigation Area - Ultra Compact */}
                    <div className="flex-1 overflow-hidden py-3 px-3">
                        <div className="flex flex-col space-y-1">
                            {/* Profile Entry - Simplified */}
                            <button 
                                onClick={() => { navigate('/user/profile'); setIsMenuOpen(false); }}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.03] rounded-2xl transition-all group mb-2"
                            >
                                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-slate-800">
                                    <img src={userData?.profileImage || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&q=80&fit=crop"} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[15px] font-normal text-white leading-none tracking-tight">{userData?.name || 'Guest User'}</p>
                                    <p className="text-[10px] text-emerald-500 font-normal mt-1 uppercase tracking-wider">Profile</p>
                                </div>
                            </button>

                            <div className="h-px bg-white/5 mx-4 mb-2"></div>

                            {/* Options with reduced padding */}
                            {[
                                { icon: HelpCircle, label: 'How It Works', path: '/user/info/how-it-works' },
                                { icon: Sparkles, label: 'Benefits', path: '/user/info/benefits' },
                                { icon: Share2, label: 'Refer & Earn', path: '/user/marketing' },
                                { icon: Rocket, label: 'Promote Brand', path: '/user/promote-brand' },
                                { icon: Building2, label: 'About Us', path: '/user/info/about' }
                            ].map((item, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => { 
                                        if (item.path === '/user/marketing') {
                                            navigate(item.path, { state: { showReferral: true } });
                                        } else {
                                            navigate(item.path);
                                        }
                                        setIsMenuOpen(false); 
                                    }}
                                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.03] rounded-xl transition-all group"
                                >
                                    <item.icon size={18} className="text-slate-500 group-hover:text-emerald-400 group-hover:scale-105 transition-all" />
                                    <span className="text-[13px] font-normal text-slate-300">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Footer - No Scroll Anchor */}
                    <div className="p-4 border-t border-white/5">
                        <button 
                            onClick={() => { logout(); navigate('/user/auth/login'); setIsMenuOpen(false); }}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all active:scale-95 shadow-lg shadow-black/20 font-normal uppercase text-[11px] tracking-widest"
                        >
                            Log out
                        </button>
                        <p className="text-[9px] font-normal text-slate-600 uppercase tracking-[0.1em] mt-4 text-center">Version 1.0.2</p>
                    </div>
                </div>
            </div>

            {/* --- Dynamic Content Rendering Area (Pages) --- */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
                <Outlet />
            </main>

            {/* --- Premium White Elevated Bottom Navigation Bar --- */}
            <div className="shrink-0 z-50">
                {/* The Ultra-Light Mustard Bar Container */}
                <div className="relative bg-[#FFFEF7] border-t border-black/5 h-20 flex items-center px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.06)]">
                    
                    {/* --- The Jumping Bubble Layer --- */}
                    <div className="absolute inset-0 flex px-4 pointer-events-none">
                        {(() => {
                            const activeIdx = navItems.findIndex(item => location.pathname === item.path);
                            const isBottomNavRoute = activeIdx !== -1;
                            
                            return isBottomNavRoute && (
                                <motion.div
                                    animate={{ x: `${activeIdx * 100}%` }}
                                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                                    className="w-1/5 h-full flex items-center justify-center"
                                >
                                    <motion.div
                                        key={location.pathname}
                                        initial={{ y: 0 }}
                                        animate={{ 
                                            y: [0, -38, 0],
                                            scaleX: [1, 0.8, 1.1, 1],
                                            scaleY: [1, 1.2, 0.9, 1]
                                        }}
                                        transition={{ 
                                            duration: 0.5, 
                                            times: [0, 0.5, 1],
                                            ease: ["easeOut", "easeIn"]
                                        }}
                                        className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-500 flex items-center justify-center shadow-[0_8px_20px_rgba(59,130,246,0.3)] border-[6px] border-[#FFFEF7] -mt-16"
                                    >
                                        {(() => {
                                            const activeItem = navItems[activeIdx];
                                            const Icon = activeItem.icon;
                                            return <Icon size={28} className="text-white" strokeWidth={2.5} />;
                                        })()}
                                    </motion.div>
                                </motion.div>
                            );
                        })()}
                    </div>

                    {/* --- Static Navigation Buttons --- */}
                    {navItems.map((item, idx) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={idx}
                                onClick={() => navigate(item.path)}
                                className="flex-1 h-full flex flex-col items-center justify-center relative z-10"
                            >
                                <Icon 
                                    size={26} 
                                    className={`mb-1 transition-opacity duration-300 ${isActive ? "opacity-0" : "opacity-100 text-slate-400"}`} 
                                    strokeWidth={2} 
                                />
                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${isActive ? "text-blue-600" : "text-slate-600"}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default UserLayout;
