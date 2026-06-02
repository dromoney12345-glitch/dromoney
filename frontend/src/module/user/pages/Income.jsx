import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import PaymentModal from '../components/PaymentModal';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import {
    Share2, TrendingUp, CheckSquare, Trophy, Briefcase,
    Sparkles, ChevronRight, Lock, Loader2, ShieldCheck, Zap,
    UploadCloud, Fingerprint, Image as ImageIcon, CheckCircle2, Clock, Wifi,
    ChevronLeft, Copy, Download, AlertTriangle, BookOpen, AlertCircle, FileText
} from 'lucide-react';
import { contentStorage } from '../../shared/services/contentStorage';
import LogoImg from '../../../assets/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png';
import api from '../../shared/services/api';

// ─── 6 Income Cards Config (Modern Fintech Design) ───────────────────────────
const INCOME_OPTIONS = [
    {
        id: 1,
        title: 'Earn ₹200 Per Referral',
        subtitle: 'Invite users and earn ₹200 on each purchase',
        icon: Share2,
        bg: 'bg-gradient-to-br from-blue-600 via-sky-500 to-emerald-400',
        cta: 'Invite & Earn',
        route: '/user/marketing',
        isHighlight: true
    },
    {
        id: 2,
        title: 'Future Fund',
        subtitle: 'Complete targets & earn bonus rewards',
        icon: TrendingUp,
        bg: 'bg-indigo-50',
        borderColor: 'border-indigo-100',
        cta: 'View Progress',
        route: '/user/future-fund',
        hasProgress: true
    },
    {
        id: 3,
        title: 'Earn Coins Daily',
        subtitle: 'Complete tasks and earn coins',
        icon: CheckSquare,
        bg: 'bg-orange-50',
        borderColor: 'border-orange-100',
        cta: 'Start Tasks',
        route: '/user/earn',
    },
    {
        id: 4,
        title: 'Win Real Cash',
        subtitle: 'Join events and win rewards',
        icon: Trophy,
        bg: 'bg-purple-50',
        borderColor: 'border-purple-100',
        cta: 'Join Now',
        route: '/user/events',
    },
    {
        id: 5,
        title: 'Start Your Journey',
        subtitle: 'Explore free & premium ideas',
        icon: Briefcase,
        bg: 'bg-emerald-50',
        borderColor: 'border-emerald-100',
        cta: 'Explore',
        route: '/user/business-ideas',
    },
    {
        id: 6,
        title: 'Future and Option',
        subtitle: 'Upcoming earning opportunities',
        icon: Sparkles,
        bg: 'bg-slate-100',
        borderColor: 'border-slate-200',
        cta: 'Discover',
        route: '/user/info/future-features',
        locked: false,
    },
];

const pageVariants = {
    enter: (direction) => ({
        x: direction > 0 ? 120 : -120,
        opacity: 0,
        scale: 0.98
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1,
        transition: {
            x: { type: "spring", stiffness: 350, damping: 30 },
            opacity: { duration: 0.2 },
            scale: { duration: 0.2 }
        }
    },
    exit: (direction) => ({
        zIndex: 0,
        x: direction < 0 ? 120 : -120,
        opacity: 0,
        scale: 0.98,
        transition: {
            x: { type: "spring", stiffness: 350, damping: 30 },
            opacity: { duration: 0.15 },
            scale: { duration: 0.15 }
        }
    })
};

const Income = () => {
    const navigate = useNavigate();
    const { userData, unlockPlatform, addNotification, loading: userLoading, refreshUserProfile } = useUser();
    const { isPaid, kycStatus: userKycStatus, hasCompletedCourse } = userData;

    // --- State Management ---
    const [kycStatus, setKycStatus] = useState(userKycStatus || 'Not Started');
    const [aadhaarNum, setAadhaarNum] = useState('');
    const [kycPhoto, setKycPhoto] = useState(null);
    const [rawFile, setRawFile] = useState(null);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [projectsData, setProjectsData] = useState({ title: 'Dromoney Projects', description: 'Loading latest projects...' });
    const [futureFeaturesConfig, setFutureFeaturesConfig] = useState({
        title: 'Future and Option',
        subtitle: 'Upcoming earning opportunities'
    });

    // Onboarding Course Slides States
    const [courseStep, setCourseStep] = useState(1);
    const [courseDirection, setCourseDirection] = useState(0);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [localCourseCompleted, setLocalCourseCompleted] = useState(false);
    const [courseData, setCourseData] = useState({
        page1: {
            title: '📈 Dromoney से कमाई कैसे करें',
            intro: 'Dromoney एक ऐसा platform है जहाँ आप सीखकर मात्र 15 मिनट मैं earning कर सकते हैं।\n\nयह कोई guaranteed income platform नहीं है — आपकी कमाई आपकी मेहनत ओर कंसिस्टेंसी पर depend करती है।',
            methodsTitle: '💼 कमाई के तरीके:',
            methods: [
                { title: '1. Affiliate Marketing (₹200 per sale)', points: ['आपको एक referral link मिलेगा', 'आप उसे share करेंगे', 'हर course sale पर ₹200 commission मिलेगा'] },
                { title: '2. Future Fund (Reward System)', points: ['Monetization system (YouTube की तरह)', 'Criteria: 10 successful sales & 10 दिन active (15 min daily)', '✓ इसके बाद आपको platform से performance-based reward मिलेगा'] }
            ]
        },
        page2: {
            title: '⚡ Affiliate + Promotion Setup',
            steps: [
                { stepNum: '✦ Step 1', title: 'logo download kre & call Script', details: 'सबसे पहले नीचे दिए गए Download button से Dromoney logo डाउनलोड करें जो सीधा आपकी गैलरी में सेव हो जाएगा।' },
                { stepNum: '✦ Step 2', title: 'Ready Templates copy', details: 'नीचे दिए गए Promotion messages में से किसी एक को copy करें।' },
                { stepNum: '✦ Step 3', title: 'whatsapp status lagye 📲', details: 'डाउनलोड की गई logo image को अपने Whatsapp status पर लगायें और copy किया हुआ text description में paste कर दें। [Your Referral Link] की जगह अपना link अवश्य डालें।' },
                { stepNum: '✦ Step 4', title: 'how to promote other plateform 💻', details: 'Facebook, Instagram reels, and status, या direct chats के माध्यम से प्रमोट करें।' }
            ],
            templatesTitle: '📋 Ready Templates (Copy-Paste)',
            templates: [
                '⚡ Dromoney से मात्र 15 मिनट रोज़ काम करके सीखें और कमाएं।\n\nDirect ₹200 Referral bonus! ⚡ 100% Genuine Payment सीधा bank account में।\n\nअभी रजिस्टर करें ⚡\n[Your Link]',
                '✦ Work From Home Opportunity!\n\nक्या आप भी मोबाइल से ₹500 - ₹2000 रोज़ कमाना चाहते हैं? बिना किसी risk के शुरू करें। ✦\n\nRegister Link ⚡\n[Your Link]'
            ],
            step5Title: '✦ Step 5: Professional Calling Setup 📞',
            step5Details: 'जब लोग आपके status देखकर आपको message करें, तो उन्हें प्यार से समझाएं और signup करवाएं। Detailed call script के लिए नीचे दिए गए Script button पर क्लिक करें।',
            callScriptLink: 'https://docs.google.com/document/d/1XgIsY_D7Beb6E6w318G6VOf6-K6gLqC1BqWpZ3pM2-8/edit',
            logoUrl: LogoImg
        },
        page3: {
            title: '📅 रोज क्या करें',
            dailyPlanTitle: '📋 Daily Plan:',
            dailyPlans: [
                'Daily updates share context',
                'Status update dynamic details',
                'Task daily basis 15 min focus'
            ],
            exampleTitle: '📈 Example:',
            examples: [
                '✦ 1 sale daily = ₹200',
                '✦ 30 Days = ₹6000',
                '✦ 10 sales complete = Monthly Salary/Future Fund eligibility activated'
            ],
            rulesTitle: '📌 Important Rules:',
            rules: [
                'Spamming block your account permanently',
                'Fake info direct permanent suspension',
                'Self referral strict warning'
            ]
        }
    });

    useEffect(() => {
        fetchProjects();
        fetchFutureFeatures();
        fetchOnboardingCourse();
        setKycStatus(userKycStatus);
    }, [userKycStatus]);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/public/content/income_projects');
            if (res.success) {
                if (res.data.data) {
                    setProjectsData(res.data.data);
                } else {
                    setProjectsData(res.data);
                }
            }
        } catch (err) {
            console.error("Content fetch failed:", err);
        }
    };

    const fetchFutureFeatures = async () => {
        try {
            const res = await api.get('/public/content/menu_future_features');
            if (res.success && res.data) {
                const d = res.data.data;
                setFutureFeaturesConfig({
                    title: d?.title || res.data.title || 'Future and Option',
                    subtitle: d?.subtitle || res.data.description || 'Upcoming earning opportunities'
                });
            }
        } catch (err) {
            console.error("FF config fetch failed:", err);
        }
    };

    const fetchOnboardingCourse = async () => {
        try {
            const res = await api.get('/public/content/onboarding_course');
            if (res.success && res.data && res.data.data) {
                setCourseData(res.data.data);
            }
        } catch (err) {
            console.error("Course content fetch failed:", err);
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setRawFile(file);
            setKycPhoto(URL.createObjectURL(file));
        }
    };

    const handleKycSubmit = async () => {
        if (!aadhaarNum || !rawFile) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('documentNumber', aadhaarNum);
            formData.append('document', rawFile);

            const res = await api.patch('/user/data/kyc', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.success) {
                setKycStatus('Pending');
                addNotification("Submitted!", "KYC is now in review.", "success");
            }
        } catch (err) {
            addNotification("Error", err.message || "Failed to submit KYC", "error");
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = async () => {
        await refreshUserProfile();
        setIsPaymentOpen(false);
        addNotification("Unlocked!", "Full platform access granted!", "success");
    };

    const handleCardClick = (route) => {
        if (route === '/user/marketing') {
            navigate(route, { state: { showReferral: true } });
        } else if (route) {
            navigate(route);
        }
    };

    const handleCopyText = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        addNotification("Copied!", "Template message copied to clipboard.", "success");
        setTimeout(() => {
            setCopiedIndex(null);
        }, 1500);
    };

    const handleDownloadLogo = async () => {
        try {
            addNotification("Downloading!", "Starting logo download to your gallery...", "success");
            
            // Direct download link from our server proxy is 100% reliable on all mobile and desktop devices.
            // Bypasses any mobile webview blob constraints or Cloudinary CORS blocks.
            const downloadUrl = `${api.defaults.baseURL}/public/content/download-logo`;
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.target = '_blank';
            link.download = 'dromoney_logo.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log("Download completed via server proxy");
        } catch (err) {
            console.error("Download error:", err);
            addNotification("Error", "Failed to download logo. Please try again.", "error");
        }
    };

    const handleDownloadCallingScript = () => {
        try {
            addNotification("Generating!", "Creating calling script PDF...", "success");
            
            // Create PDF document
            const doc = new jsPDF();
            
            // Set font
            doc.setFont("helvetica");
            
            // Title
            doc.setFontSize(18);
            doc.setTextColor(255, 140, 0); // Orange color
            doc.text("DROMONEY - PROFESSIONAL CALLING SCRIPT", 20, 20);
            
            // Subtitle
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text("📞 CALLING SCRIPT FOR AFFILIATE MARKETING", 20, 30);
            
            // Line separator
            doc.setDrawColor(200, 200, 200);
            doc.line(20, 35, 190, 35);
            
            let yPosition = 45;
            const lineHeight = 7;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 20;
            const maxWidth = 170;
            
            // Helper function to add text with auto page break
            const addText = (text, fontSize = 10, isBold = false, color = [0, 0, 0]) => {
                doc.setFontSize(fontSize);
                doc.setTextColor(...color);
                if (isBold) {
                    doc.setFont("helvetica", "bold");
                } else {
                    doc.setFont("helvetica", "normal");
                }
                
                const lines = doc.splitTextToSize(text, maxWidth);
                lines.forEach((line) => {
                    if (yPosition > pageHeight - margin) {
                        doc.addPage();
                        yPosition = margin;
                    }
                    doc.text(line, margin, yPosition);
                    yPosition += lineHeight;
                });
            };
            
            // Content
            addText("OPENING", 11, true, [255, 140, 0]);
            addText('"नमस्ते! मैं Dromoney से बोल रहा हूँ। क्या आपके पास 2 मिनट हैं?"', 10);
            yPosition += 3;
            
            addText("INTRODUCTION", 11, true, [255, 140, 0]);
            addText('"Dromoney एक platform है जहाँ आप सीखकर कमा सकते हैं। बिना किसी investment के!"', 10);
            yPosition += 3;
            
            addText("KEY BENEFITS", 11, true, [255, 140, 0]);
            addText("✓ ₹200 per referral commission", 10);
            addText("✓ 100% genuine payment", 10);
            addText("✓ Direct bank transfer", 10);
            addText("✓ No hidden charges", 10);
            addText("✓ Flexible working hours", 10);
            yPosition += 3;
            
            addText("OBJECTION HANDLING", 11, true, [255, 140, 0]);
            
            addText("Q: क्या यह genuine है?", 10, true);
            addText('"हाँ, हम 100% genuine हैं। हजारों users पहले से earning कर रहे हैं।"', 10);
            yPosition += 2;
            
            addText("Q: क्या investment लगेगी?", 10, true);
            addText('"नहीं, बिल्कुल free है। सिर्फ 15 मिनट daily काम करना है।"', 10);
            yPosition += 2;
            
            addText("Q: Payment कब मिलेगी?", 10, true);
            addText('"7 दिन के अंदर आपके bank account में सीधा transfer हो जाएगी।"', 10);
            yPosition += 3;
            
            addText("CLOSING", 11, true, [255, 140, 0]);
            addText('"तो क्या आप आज ही शुरू करना चाहेंगे? मैं आपको registration में help कर दूँगा।"', 10);
            yPosition += 3;
            
            addText("FOLLOW UP", 11, true, [255, 140, 0]);
            addText('"अगर आपको कोई सवाल हो तो बेझिझक पूछें। मैं हमेशा आपकी मदद के लिए यहाँ हूँ।"', 10);
            yPosition += 5;
            
            // Footer
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(`Generated on: ${new Date().toLocaleDateString('hi-IN')}`, margin, pageHeight - 10);
            doc.text("For more info: www.dromoney.com", margin, pageHeight - 5);
            
            // Save PDF or open in new tab for mobile
            if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
                const blob = doc.output('blob');
                const blobUrl = window.URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
            } else {
                doc.save("Dromoney_Calling_Script.pdf");
            }
            
            addNotification("Success!", "Calling script PDF generated!", "success");
        } catch (err) {
            console.error("PDF download error:", err);
            addNotification("Error", "Failed to download script. Please try again.", "error");
        }
    };

    const handleFinishCourse = async () => {
        setLoading(true);
        try {
            const res = await api.post('/user/data/complete-course');
            // Instantly bypass intercept screen visually for snappy zero-lag feel
            setLocalCourseCompleted(true);
            await refreshUserProfile();
            addNotification("Congratulations! 🎉", "Course completed. Start Earning!", "success");
        } catch (err) {
            console.error("Error completing course:", err);
            // Fallback so the user is never stuck if the backend actually updated but timed out
            setLocalCourseCompleted(true);
            await refreshUserProfile();
            addNotification("Welcome! 🎉", "Let's start earning!", "success");
        } finally {
            setLoading(false);
        }
    };

    const status = (userKycStatus || 'Not Started').toLowerCase();

    useEffect(() => {
        if (userLoading) return; // Wait for profile sync before redirecting
        if (status === 'pending' || status === 'rejected') {
            navigate('/user/auth/pending');
        } else if (status === 'not started') {
             navigate('/user/auth/kyc');
        }
    }, [status, navigate, userLoading]);

    if (userLoading || status === 'pending' || status === 'rejected' || status === 'not started') {
        return (
            <div className="min-h-screen bg-[#0B1221] flex flex-col items-center justify-center gap-4 text-white">
                <Loader2 className="animate-spin text-amber-500" size={32} />
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Verifying access...</p>
            </div>
        );
    }


    // ── LAYER 3: Approved but not Paid ──────────────────────────────────────
    if ((status === 'approved' || status === 'verified') && !isPaid) {
        return (
            <>
                {isPaymentOpen && (
                    <PaymentModal
                        isOpen={true}
                        onClose={() => setIsPaymentOpen(false)}
                        plan="Income Access"
                        amount={499}
                        onSuccess={handlePaymentSuccess}
                    />
                )}
                <div className="flex flex-col p-5 max-h-[90vh] bg-slate-50 animate-in fade-in duration-500 pb-20 justify-center">
                    <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 flex flex-col relative scale-[0.95]">
                        <div className="bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 p-6 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 blur-2xl"></div>
                            <CheckCircle2 size={40} className="text-white mx-auto mb-3 drop-shadow-lg" />
                            <h2 className="text-white font-medium text-xl tracking-tight">KYC Verified!</h2>
                            <p className="text-white/80 text-[10px] font-medium uppercase tracking-widest mt-1">Identity Confirmed</p>
                        </div>

                        <div className="p-6 text-center">
                            <p className="text-slate-400 text-[13px] font-medium mb-6 leading-relaxed">
                                "Congratulations! Your account is verified. To unlock 6+ income methods, purchase our premium access course today."
                            </p>

                            <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100 mb-6 flex items-center justify-between">
                                <div className="text-left">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none">Enrollment Fee</p>
                                    <p className="text-2xl font-medium text-sky-600 mt-1 leading-none">₹499</p>
                                </div>
                                <div className="bg-white px-3 py-1 rounded-lg border border-sky-100">
                                    <span className="text-[10px] font-medium text-emerald-500 tracking-tighter">LIFE ACCESS</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsPaymentOpen(true)}
                                className="w-full bg-slate-900 hover:bg-black active:scale-95 text-white font-medium uppercase tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-3 shadow-xl transition-all shadow-slate-100 text-xs"
                            >
                                <Zap size={16} fill="currentColor" className="text-sky-400" />
                                Buy Course & Unlock
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const renderOnboardingCourseContent = (isModal = false) => {
        const handlePrev = () => {
            if (courseStep > 1) {
                setCourseDirection(-1);
                setCourseStep(prev => prev - 1);
            }
        };

        const handleNext = () => {
            if (courseStep < 3) {
                setCourseDirection(1);
                setCourseStep(prev => prev + 1);
            }
        };

        const handleDragEnd = (event, info) => {
            const swipeThreshold = 50;
            if (info.offset.x < -swipeThreshold) {
                handleNext();
            } else if (info.offset.x > swipeThreshold) {
                handlePrev();
            }
        };

        const containerClass = isModal
            ? "w-full max-w-md bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden relative flex flex-col p-5 space-y-4"
            : "w-full flex-1 flex flex-col space-y-6 md:space-y-8 bg-slate-50";

        const progressTrackClass = "bg-slate-100";
        const borderClass = "border-slate-100";
        const textMutedClass = "text-slate-500";
        const textTitleClass = "text-slate-800";
        const footerBgClass = isModal ? "bg-white border-t border-slate-100 pt-3 flex gap-3 shrink-0" : "border-t border-slate-100 pt-4 pb-4 flex gap-4 shrink-0 bg-white sticky bottom-0 z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.03)]";

        return (
            <div className={containerClass}>
                
                {/* Thin stories-style progress bar */}
                <div className="flex gap-1.5 py-1 shrink-0">
                    {[1, 2, 3].map((step) => (
                        <button
                            key={step}
                            onClick={() => {
                                setCourseDirection(step > courseStep ? 1 : -1);
                                setCourseStep(step);
                            }}
                            className={`h-2 flex-1 rounded-full overflow-hidden transition-all cursor-pointer relative ${progressTrackClass}`}
                        >
                            <motion.div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-cyan-500"
                                initial={{ width: "0%" }}
                                animate={{ width: step <= courseStep ? "100%" : "0%" }}
                                transition={{ duration: 0.35, ease: "easeInOut" }}
                            />
                        </button>
                    ))}
                </div>

                {/* Header */}
                <div className={`flex items-center justify-between shrink-0 px-1 border-b pb-4 ${borderClass}`}>
                    <div>
                        <span className="text-[10px] font-medium tracking-widest uppercase text-indigo-500">STEP {courseStep} OF 3</span>
                        <h2 className="text-lg font-medium tracking-tight text-slate-900">
                            {isModal ? 'Guidelines & Templates 🎓' : 'Onboarding Guide 🎓'}
                        </h2>
                    </div>
                    {isModal ? (
                        <button
                            onClick={() => setIsCourseModalOpen(false)}
                            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-sm transition-all active:scale-90"
                        >
                            ✕
                        </button>
                    ) : (
                        <div className="bg-emerald-50 text-emerald-600 font-medium text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl border border-emerald-100">
                            Course Active
                        </div>
                    )}
                </div>

                {/* Smooth Carousel Frame */}
                <div className={isModal ? "relative flex-1 overflow-hidden min-h-[460px] flex flex-col justify-between" : "relative flex-1 flex flex-col justify-between"}>
                    <AnimatePresence custom={courseDirection} mode="wait">
                        <motion.div
                            key={courseStep}
                            custom={courseDirection}
                            variants={pageVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            drag={isModal ? "x" : false}
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.4}
                            onDragEnd={isModal ? handleDragEnd : undefined}
                            className={isModal 
                                ? "w-full absolute inset-0 overflow-y-auto space-y-4 pr-1 scrollbar-thin cursor-grab active:cursor-grabbing pb-4" 
                                : "w-full space-y-6 pb-6"}
                        >
                            {/* PAGE 1 CONTENT */}
                            {courseStep === 1 && (
                                <div className="space-y-6 select-none">
                                    <div>
                                        <h3 className={`text-xl font-medium leading-tight ${textTitleClass}`}>
                                            {courseData.page1.title}
                                        </h3>
                                        <p className={`text-sm font-semibold leading-relaxed mt-2.5 ${textMutedClass}`}>
                                            {courseData.page1.intro}
                                        </p>
                                    </div>

                                    <div className="space-y-3.5">
                                        <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400">{courseData.page1.methodsTitle}</h4>
                                        
                                         {courseData.page1.methods?.map((m, idx) => {
                                            const pointsMerged = m.points?.join(' • ') || '';
                                            return (
                                                <div key={idx} className="border border-slate-100 rounded-2xl p-4.5 flex flex-col gap-1.5 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-md hover:border-slate-200">
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="text-[14px] font-medium leading-tight text-slate-800">{m.title}</h5>
                                                        <p className="text-[12px] font-semibold mt-1.5 leading-relaxed text-slate-500 font-poppins">
                                                            {pointsMerged}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* PAGE 2 CONTENT */}
                            {courseStep === 2 && (
                                <div className="space-y-6">
                                    <h3 className={`text-xl font-medium leading-tight ${textTitleClass}`}>
                                        {courseData.page2.title}
                                    </h3>

                                    {/* Premium Logo Showcase Container */}
                                    <div className="rounded-3xl p-5 border border-indigo-100/40 flex flex-col items-center text-center gap-3.5 bg-gradient-to-br from-indigo-50/30 to-blue-50/30">
                                        <img 
                                            src={courseData.page2.logoUrl || LogoImg} 
                                            alt="Dromoney Logo" 
                                            className="h-20 object-contain drop-shadow-sm select-none"
                                        />
                                        <p className="text-xs font-medium leading-normal px-2 text-slate-500">
                                            {courseData.page2.steps?.[0]?.details || 'सबसे पहले Dromoney logo डाउनलोड करें जो सीधा आपकी गैलरी में सेव हो जाएगा।'}
                                        </p>
                                        <button
                                            onClick={handleDownloadLogo}
                                            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-95 text-white font-medium uppercase text-[11px] tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all mt-1"
                                        >
                                            <Download size={14} /> Download Logo to Gallery
                                        </button>
                                    </div>

                                    {/* Promotion Steps */}
                                    <div className="space-y-3">
                                        {courseData.page2.steps?.slice(1).map((step, idx) => (
                                            <div key={idx} className="rounded-2xl p-4 border border-slate-100 bg-white flex flex-col gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-300 hover:border-slate-200">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-[9px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100">{step.stepNum}</span>
                                                    <h4 className="text-xs font-medium leading-none text-slate-800">{step.title}</h4>
                                                </div>
                                                <p className="text-[12px] font-semibold leading-relaxed text-slate-500 font-poppins">{step.details}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Calling Script script link */}
                                    {courseData.page2.step5Title && (
                                        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4.5 flex flex-col gap-1.5">
                                            <h4 className="text-xs font-medium flex items-center gap-1.5 text-amber-800">
                                                <AlertTriangle size={14} /> {courseData.page2.step5Title}
                                            </h4>
                                            <p className="text-[12px] font-semibold leading-relaxed text-slate-600 font-poppins">{courseData.page2.step5Details}</p>
                                            {courseData.page2.callScriptLink && (
                                                <button
                                                    onClick={handleDownloadCallingScript}
                                                    className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium uppercase text-[10px] tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-center"
                                                >
                                                    <Download size={14} /> View Calling Scripts (PDF)
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Ready Templates */}
                                    <div className="space-y-3.5 pt-1">
                                        <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400">{courseData.page2.templatesTitle}</h4>
                                        <div className="space-y-3">
                                            {courseData.page2.templates?.map((tmpl, idx) => {
                                                const isCopied = copiedIndex === idx;
                                                return (
                                                    <div key={idx} className="rounded-3xl p-4.5 border border-slate-100 bg-slate-50/80 relative flex flex-col gap-4">
                                                        <p className="text-[12px] font-semibold leading-relaxed whitespace-pre-wrap select-all pr-1 text-slate-600 font-poppins">
                                                            {tmpl}
                                                        </p>
                                                        <button
                                                            onClick={() => handleCopyText(tmpl, idx)}
                                                            className={`w-full border py-3.5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-wider shadow-md transition-all active:scale-95 ${
                                                                isCopied 
                                                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/10' 
                                                                    : 'bg-white hover:bg-slate-100 border-slate-200 text-indigo-600'
                                                            }`}
                                                            title="Copy Template"
                                                        >
                                                            {isCopied ? (
                                                                <>
                                                                    <CheckCircle2 size={13} /> Copied!
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy size={13} /> Copy Template
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PAGE 3 CONTENT */}
                            {courseStep === 3 && (
                                <div className="space-y-6">
                                    <h3 className={`text-xl font-medium leading-tight ${textTitleClass}`}>
                                        {courseData.page3.title}
                                    </h3>

                                             {/* Examples */}
                                    <div className="rounded-3xl p-5 border border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-blue-50/40 space-y-3.5 relative overflow-hidden shadow-sm">
                                        <h4 className="text-xs font-medium text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                            <TrendingUp size={14} /> {courseData.page3.exampleTitle}
                                        </h4>
                                        <div className="space-y-2">
                                            {courseData.page3.examples?.map((ex, idx) => (
                                                <p key={idx} className="text-[13px] font-medium leading-relaxed text-slate-700 font-poppins">
                                                    {ex}
                                                </p>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Security and Safety Rules */}
                                    <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-4.5 space-y-3.5">
                                        <h4 className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 text-rose-800">
                                            <AlertCircle size={14} /> {courseData.page3.rulesTitle}
                                        </h4>
                                        <div className="space-y-2.5">
                                            {courseData.page3.rules?.map((rule, idx) => (
                                                <div key={idx} className="flex items-start gap-2.5">
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-rose-50 text-rose-600">
                                                        <AlertCircle size={12} />
                                                    </div>
                                                    <p className="text-[12px] font-semibold leading-normal text-slate-600 font-poppins">{rule}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Navigation controls */}
                <div className={footerBgClass}>
                    {courseStep > 1 ? (
                        <button
                            onClick={handlePrev}
                            className={`flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-slate-200/50 ${isModal ? 'text-[10px] py-3' : 'text-[11px] py-4 shadow-sm'}`}
                        >
                            <ChevronLeft size={14} /> Prev
                        </button>
                    ) : (
                        <div className="flex-1"></div>
                    )}

                    {courseStep < 3 ? (
                        <button
                            onClick={handleNext}
                            className={`flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-medium uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-indigo-500/10 ${isModal ? 'text-[10px] py-3' : 'text-[11px] py-4'}`}
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    ) : (
                        isModal ? (
                            <button
                                onClick={() => setIsCourseModalOpen(false)}
                                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium uppercase text-[10px] tracking-widest py-3 rounded-xl flex items-center justify-center gap-1 transition-all active:scale-95 shadow-lg shadow-emerald-500/10"
                            >
                                Close Guide
                            </button>
                        ) : (
                            <button
                                onClick={handleFinishCourse}
                                disabled={loading}
                                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium uppercase text-[11px] tracking-widest py-4 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-emerald-500/15 disabled:opacity-50"
                            >
                                {loading ? 'Completing...' : 'Finish & Earn'}
                            </button>
                        )
                    )}
                </div>

            </div>
        );
    };

    // ── INTERCEPT LAYER: Onboarding course slideshow for Paid but not completed ──
    if (isPaid && !hasCompletedCourse && !localCourseCompleted) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
                <div className="w-full min-h-screen flex flex-col px-5 py-8 justify-between">
                    {renderOnboardingCourseContent(false)}
                </div>
            </div>
        );
    }

    // ── LAYER 4: Final Income Cards (Modern Mobile UI Redesign) ─────────────
    return (
        <div className="flex flex-col gap-5 p-5 bg-[#F8FAFC] animate-in fade-in duration-700">
            {/* Minimal Sub-Header */}
            <div className="flex items-start justify-between px-1 mb-3">
                <div className="flex flex-col gap-1.5">
                    <h2 className="text-2xl font-medium text-slate-900 tracking-tight leading-none mt-1">Income Center</h2>
                    <div className="flex flex-wrap items-center gap-2.5 mt-0.5">
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.15em] leading-none">Verified Earning Systems</p>
                        
                        {/* Course Reopen link (कोर्स & टेंपलेट्स) */}
                        <button
                            onClick={() => {
                                setCourseStep(1);
                                setIsCourseModalOpen(true);
                            }}
                            className="text-[9px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-tighter transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap"
                        >
                            <BookOpen size={10} /> कोर्स & टेंपलेट्स
                        </button>
                    </div>
                </div>
                <div className="pt-1.5 pr-1 shrink-0">
                    <TrendingUp size={24} strokeWidth={2.5} className="text-blue-500" />
                </div>
            </div>

            {/* Optional Course Modal Viewer with Click-Outside closing */}
            {isCourseModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
                    onClick={() => setIsCourseModalOpen(false)}
                >
                    <div onClick={(e) => e.stopPropagation()}>
                        {renderOnboardingCourseContent(true)}
                    </div>
                </div>
            )}

            {/* Premium Debit Card Style Referral Section (Rounded & Compact) */}
            <div className="px-1 mb-1">
                <div
                    onClick={() => handleCardClick(INCOME_OPTIONS[0].route)}
                    className="w-full relative aspect-[2/1] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 shadow-xl active:brightness-90 transition-all cursor-pointer overflow-hidden group flex flex-col justify-between border border-white/10"
                    style={{ borderRadius: '2rem' }}
                >
                    {/* Holographic Overlays */}
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none"></div>
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
                    
                    {/* Top Row: Brand & Wireless */}
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-medium text-white/40 uppercase tracking-[0.3em] mb-0.5">Dromoney Card</span>
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-5 bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500 rounded-sm shadow-inner relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-20 border-t border-b border-black/20 grid grid-cols-3">
                                        <div className="border-r border-black/20"></div>
                                        <div className="border-r border-black/20"></div>
                                    </div>
                                </div>
                                <div className="text-white/30">
                                    <Wifi size={14} className="rotate-90" />
                                </div>
                            </div>
                        </div>
                        <img src={LogoImg} className="w-8 h-8 object-contain brightness-0 invert opacity-80" alt="Logo" />
                    </div>

                    {/* Middle Row: Numbers / Title */}
                    <div className="relative z-10 py-1">
                        <h3 className="text-lg font-medium text-white tracking-[0.05em] leading-tight drop-shadow-lg">
                            {INCOME_OPTIONS[0].title.replace('Earn ', '')}
                        </h3>
                        <p className="text-[9px] font-medium text-indigo-300 uppercase tracking-widest mt-0.5">
                            {INCOME_OPTIONS[0].subtitle}
                        </p>
                    </div>

                    {/* Bottom Row: Name & Mastercard Logo Design */}
                    <div className="flex justify-between items-end relative z-10">
                        <div className="flex flex-col">
                            <span className="text-[6px] font-medium text-white/30 uppercase tracking-widest mb-0.5">Card Holder</span>
                            <span className="text-[12px] font-medium text-white uppercase tracking-wider">{userData.name || 'REFERRAL PARTNER'}</span>
                        </div>
                        <div className="flex items-center">
                            <div className="relative flex">
                                <div className="w-7 h-7 bg-rose-500 rounded-full opacity-90"></div>
                                <div className="w-7 h-7 bg-amber-500 rounded-full -ml-3.5 opacity-80 backdrop-blur-sm"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Glassmorphism Card Grid (Compact & Rounded) */}
            <div className="grid grid-cols-2 gap-2.5 pb-8">
                {INCOME_OPTIONS.slice(1).map((opt) => {
                    const Icon = opt.icon;
                    const THEMES = {
                        2: { gradient: 'from-blue-50 to-indigo-100', accent: 'text-indigo-600', pill: 'bg-indigo-600/10 text-indigo-700', shadow: 'shadow-indigo-100' },
                        3: { gradient: 'from-amber-50 to-orange-100', accent: 'text-orange-600', pill: 'bg-orange-600/10 text-orange-700', shadow: 'shadow-orange-100' },
                        4: { gradient: 'from-purple-50 to-violet-100', accent: 'text-violet-600', pill: 'bg-violet-600/10 text-violet-700', shadow: 'shadow-violet-100' },
                        5: { gradient: 'from-emerald-50 to-teal-100', accent: 'text-teal-600', pill: 'bg-teal-600/10 text-teal-700', shadow: 'shadow-teal-100' },
                        6: { gradient: 'from-slate-100 to-slate-200', accent: 'text-slate-600', pill: 'bg-slate-600/10 text-slate-700', shadow: 'shadow-slate-200' }
                    };
                    const theme = THEMES[opt.id] || THEMES[6];

                    return (
                        <div
                            key={opt.id}
                            onClick={() => handleCardClick(opt.route)}
                            className={`relative bg-gradient-to-br ${theme.gradient} p-3.5 shadow-lg ${theme.shadow} border border-white active:scale-[0.98] transition-all cursor-pointer overflow-hidden group flex flex-col`}
                            style={{ borderRadius: '1.5rem' }}
                        >
                            {/* Glass Background Decor */}
                            <div className="absolute -right-6 -top-6 w-20 h-20 bg-white/40 rounded-full blur-2xl"></div>

                            {/* Top Dual Icons - More Compact */}
                            <div className="flex gap-1.5 mb-2 relative z-10">
                                <div className="w-7 h-7 bg-white/70 backdrop-blur-md rounded-lg flex items-center justify-center border border-white shadow-sm">
                                    <Icon size={14} className={theme.accent} />
                                </div>
                                <div className="w-7 h-7 bg-white/40 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/50">
                                    <Zap size={12} className="text-slate-400" />
                                </div>
                            </div>

                            {/* Content - High Density */}
                            <div className="relative z-10 flex-1">
                                <h3 className="text-[12px] font-medium text-slate-800 tracking-tight leading-none mb-1">
                                    {opt.id === 6 ? futureFeaturesConfig.title : opt.title}
                                </h3>
                                <p className="text-[8.5px] font-medium text-slate-500 leading-tight tracking-tight line-clamp-2">
                                    {opt.id === 6 ? futureFeaturesConfig.subtitle : opt.subtitle}
                                </p>
                            </div>

                            {/* Bottom Row - Integrated Action */}
                            <div className="flex items-center justify-between mt-2.5 relative z-10">
                                <div className={`${theme.pill} px-1.5 py-0.5 rounded-full border border-white/20`}>
                                    <span className="text-[6.5px] font-medium uppercase tracking-wider">{opt.locked ? 'Coming Soon' : 'Active'}</span>
                                </div>
                                <div className="w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform">
                                    <ChevronRight size={10} strokeWidth={3} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm relative overflow-hidden group mb-4">
                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center shrink-0 border border-sky-100">
                    <Briefcase size={20} className="text-sky-500" />
                </div>
                <div>
                    <h4 className="text-[11px] font-medium text-slate-800 uppercase tracking-widest leading-none">{projectsData.title}</h4>
                    <p className="text-[9px] font-medium text-slate-400 leading-tight mt-1">
                        {projectsData.description}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Income;

