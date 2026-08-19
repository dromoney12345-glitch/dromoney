import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, HelpCircle, Sparkles, Headset, Building2, CheckCircle2 } from 'lucide-react';
import api from '../../shared/services/api';

const LOCAL_FALLBACKS = {
    'privacy': {
        title: 'Privacy Policy',
        subtitle: 'Your Data Privacy & Security',
        sections: [
            {
                title: 'A. Data We Collect',
                text: '• Personal information: your name, phone number, and email address.\n• KYC data: Aadhaar/PAN details (used only to verify identity and prevent fraud).\n• Bank details: information you provide for withdrawals.\n• Device information: your IP address and device ID (to ensure one account per phone).'
            },
            {
                title: 'B. How We Use Data',
                text: '• To send payments to your wallet and complete KYC verification.\n• To verify ads and task completion.\n• To improve app security and prevent spam.'
            },
            {
                title: 'C. Data Security',
                text: 'We do not sell your data to third parties. Your data is stored encrypted on our secure servers.'
            },
            {
                title: 'D. Third-Party Services',
                text: 'We use Razorpay for payments and AdMob/Google Ads for advertisements. They may process your data according to their own policies.'
            }
        ]
    },
    'terms': {
        title: 'Terms & Conditions',
        subtitle: 'Usage Guidelines & Agreement',
        sections: [
            { title: '1. Account Creation', text: 'Users must provide accurate, complete information during registration. Multiple accounts per device are strictly prohibited to prevent fraud.' },
            { title: '2. Eligibility', text: 'The platform is for individuals looking to earn through verified task models and affiliate partnerships. Automated bot activity is strictly banned.' },
            { title: '3. Financial Payouts', text: 'Earnings are generated based on verified task completion and referral guidelines. The platform reserves the right to review conversions.' }
        ]
    },
    'guidelines': {
        title: 'Community Guidelines',
        subtitle: 'Community & Ethical Standards',
        sections: [
            { title: 'Ethical Earning', text: 'Always follow task instructions precisely to ensure coin credit. Fair play is required for all active users.' },
            { title: 'Respect & Safety', text: 'Maintain professional, respectful conduct in all platform community interactions and helpdesk inquiries.' }
        ]
    },
    'refund-policy': {
        title: 'Refund & Cancellation Policy',
        subtitle: 'Rules regarding digital content, technical issues, bans, and user errors.',
        sections: [
            {
                title: '1. Digital Content',
                text: 'The ₹499 course and ₹49/₹11 boosters on our platform are digital goods. Once payment is successful and content access is granted, no refund will be issued.'
            },
            {
                title: '2. Technical Issues',
                text: 'If money was deducted from your bank but the course or booster was not activated in the app, please wait 24–48 hours. If the issue persists, contact support with your transaction ID. If payment is confirmed, the service will be activated — cash refunds are not provided.'
            },
            {
                title: '3. Account Ban',
                text: 'If a user is found committing fraud, fake referrals, or violating rules and their account is banned, no remaining balance or subscription fee will be refunded.'
            },
            {
                title: '4. User Error',
                text: 'The company is not responsible for accidentally purchased boosters or courses, and no refund will be issued for such purchases.'
            }
        ]
    },
    'how-it-works': {
        title: 'How It Works',
        subtitle: 'Master the Dromoney Platform',
        sections: [
            { title: '1. Register & Verify', text: 'Create your account and complete a simple KYC to unlock all earning features safely. Your identity is verified through Aadhaar/PAN to ensure platform security.' },
            { title: '2. Explore Opportunities', text: 'Browse through affiliate projects, daily tasks, and exclusive business ideas tailored for you. Choose from multiple income streams.' },
            { title: '3. Start Earning', text: 'Complete tasks or refer partners to accumulate coins and real cash in your dashboard. Track your progress in real-time.' },
            { title: '4. Instant Payouts', text: 'Withdraw your earnings directly to your bank account with our secure payment gateway. Get paid with 100% transparency.' }
        ]
    },
    'benefits': {
        title: 'User Benefits',
        subtitle: 'Why choose Dromoney?',
        sections: [
            { title: 'Financial Freedom', text: 'Access multiple income streams that you can manage from anywhere in the world. Earn at your own pace without any fixed targets.' },
            { title: 'Skill Development', text: 'Learn marketing and business strategies through our verified project frameworks. Get certified.' },
            { title: 'Safe & Secure', text: 'Your data and earnings are protected by industry-leading security protocols. We use encryption.' },
            { title: 'Community Support', text: 'Join thousands of earners and get 24/7 assistance from our expert team.' }
        ]
    },
    'support': {
        title: 'Support Center',
        subtitle: 'We are here to help you 24/7',
        sections: [
            { title: 'Direct Assistance', text: 'Chat with our support executives for any technical or payment related queries.' },
            { title: 'Knowledge Base', text: 'Read our guides and FAQs to solve common issues instantly without waiting.' },
            { title: 'Email Support', text: 'For complex issues, reach us at support@dromoney.com for detailed resolutions.' }
        ]
    },
    'about': {
        title: 'About Dromoney',
        subtitle: 'Empowering Digital Earners',
        sections: [
            { title: 'Our Mission', text: 'To provide a transparent and efficient platform where everyone can monetize their digital presence. We believe in fair compensation and equal opportunities.' },
            { title: 'The Platform', text: 'Dromoney is India\'s fastest growing affiliate and task-based earning ecosystem. We connect brands with genuine users.' },
            { title: 'Transparency', text: 'We believe in fairness. Every payout and task is tracked with 100% precision. Our verified system ensures security.' }
        ]
    },
    'future-features': {
        title: 'Future and Option',
        subtitle: 'Upcoming earning opportunities',
        sections: [
            { title: '1. What is Future Fund?', text: 'Dromoney brings a revolutionary earning model for consistent performers. By completing your daily tasks and meeting specific sales targets, you unlock a recurring income stream similar to a creator fund.' },
            { title: '2. Eligibility Criteria', text: 'To qualify for the Future Fund, you need to:\n• Successfully generate 10 affiliate sales.\n• Maintain 15 minutes of daily active participation for 10 consecutive days.\n• Follow all community guidelines strictly.' },
            { title: '3. Performance Rewards', text: 'Once eligible, your earnings are scaled based on your platform activity. The more actively you participate and refer, the higher your tiered rewards.' }
        ]
    },
    'contact': {
        title: 'Contact Us',
        subtitle: 'We are always here to help',
        sections: [
            { title: 'Email Support', text: 'app@dromoney.com' },
            { title: 'Phone Support / WhatsApp', text: '+91 9876543210' }
        ]
    }
};

const InfoPage = () => {
    const { type } = useParams();
    const navigate = useNavigate();
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchPageData = async () => {
            setLoading(true);
            try {
                const dbKey = `menu_${type.replace(/-/g, '_')}`;
                const res = await api.get(`/public/content/${dbKey}`);
                console.log("API Response for", dbKey, ":", res); // Debug log
                
                if (res.success && res.data && res.data.data) {
                    const d = res.data.data;
                    console.log("Extracted data:", d); // Debug log
                    
                    if (d && d.sections && Array.isArray(d.sections) && d.sections.length > 0) {
                        setPageData({
                            title: d.title,
                            subtitle: d.subtitle,
                            sections: d.sections
                        });
                        return; // Exit early on success
                    }
                }
                
                // Fall back if data format from DB is generic or pending setup
                if (LOCAL_FALLBACKS[type]) {
                    setPageData(LOCAL_FALLBACKS[type]);
                    return;
                }
                
                throw new Error("Data not in expected format");
                
            } catch (err) {
                console.error("Error fetching page data:", err);
                // Try fallback first before showing error
                if (LOCAL_FALLBACKS[type]) {
                    setPageData(LOCAL_FALLBACKS[type]);
                } else {
                    setPageData({
                        title: 'ERROR',
                        subtitle: 'Failed to load content from database',
                        sections: [{ 
                            title: 'Connection Problem', 
                            text: 'Unable to fetch data from server. Please check your internet connection and try again.' 
                        }]
                    });
                }
            } finally {
                setLoading(false);
            }
        };
        fetchPageData();
    }, [type]);

    const getIcon = (size = 24, className = "") => {
        const props = { size, className };
        switch(type) {
            case 'how-it-works': return <HelpCircle {...props} />;
            case 'benefits': return <Sparkles {...props} />;
            case 'support': return <Headset {...props} />;
            case 'contact': return <Headset {...props} />;
            case 'about': return <Building2 {...props} />;
            default: return <Info {...props} />;
        }
    };

    if (loading) {
        return (
            <div className="max-w-md mx-auto shadow-2xl min-h-screen bg-white flex flex-col items-center justify-center font-poppins">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-red-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing Design...</p>
            </div>
        );
    }

    if (!pageData) return null;

    // Premium Layout for Information Pages
    return (
        <div className="max-w-md mx-auto shadow-2xl flex flex-col min-h-screen bg-[#F8FAFC] font-poppins pb-24 relative overflow-hidden">
            {/* Ultra-Compact Header Row - Navy Blue Theme */}
            <div className="relative h-16 bg-gradient-to-br from-[#0B1221] to-[#1E293B] rounded-b-3xl shadow-lg overflow-hidden flex items-center px-5">
                {/* Decorative Elements */}
                <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] pointer-events-none">
                    {getIcon(100, "text-white")}
                </div>
                
                {/* Compact Row: Back + Title */}
                <div className="flex items-center gap-3 relative z-20 w-full">
                    <button 
                        onClick={() => {
                            if (type === 'future-features') {
                                navigate('/user/income');
                            } else {
                                navigate('/user/home');
                            }
                        }} 
                        className="w-8 h-8 flex items-center justify-center bg-white/5 backdrop-blur-md rounded-lg text-white active:scale-90 transition-all border border-white/10"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    
                    <div className="flex flex-col">
                        <p className="text-blue-400 text-[7px] font-medium uppercase tracking-[0.2em] leading-none mb-1">
                            User Guide
                        </p>
                        <h1 className="text-base font-medium text-white tracking-tight leading-none uppercase">
                            {pageData.title}
                        </h1>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-8 flex flex-col gap-4 relative z-10">
                {/* Subtitle / Intro - Compact */}
                <div className="px-2">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-relaxed">
                        {pageData.subtitle}
                    </p>
                </div>

                {/* Content Sections as Compact Cards */}
                <div className="grid gap-3">
                    {pageData.sections.map((section, idx) => (
                        <div key={idx} className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm group active:bg-slate-50 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 border border-blue-100 text-blue-500">
                                    <CheckCircle2 size={14} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[13px] font-medium text-slate-800 mb-0.5 uppercase tracking-wide">
                                        {section.title}
                                    </h4>
                                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed whitespace-pre-line">
                                        {section.text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InfoPage;
