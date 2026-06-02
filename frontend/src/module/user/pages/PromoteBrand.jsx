import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Phone, Mail, Briefcase, Link, Users, Rocket, CheckCircle2, ChevronDown, Plus, Clock, ExternalLink, Loader2 } from 'lucide-react';
import api from '../../shared/services/api';

const PromoteBrand = () => {
    const navigate = useNavigate();
    const [view, setView] = useState('list'); // 'list' or 'form'
    const [myPromotions, setMyPromotions] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        whatsapp: '',
        category: '',
        link: '',
        budget: '',
        usersRequired: '',
        description: ''
    });
    
    const [errors, setErrors] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const costPerUser = 1;

    // Fetch promotions from database API
    const fetchPromotions = async () => {
        setFetching(true);
        try {
            const res = await api.get('/user/data/promotions');
            if (res.success && res.data) {
                setMyPromotions(res.data);
                // If there are no promotions, default to form view
                if (res.data.length === 0) {
                    setView('form');
                } else {
                    setView('list');
                }
            }
        } catch (err) {
            console.error("Error fetching promotions:", err);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    const categories = [
        'App Download',
        'Video Watch',
        'Instagram Follow',
        'YouTube Subscribe',
        'Website Visit',
        'Custom Task'
    ];

    // Validation functions
    const validateName = (name) => {
        if (!name || name.trim().length === 0) {
            return "Name is required";
        }
        if (name.trim().length < 2) {
            return "Name must be at least 2 characters";
        }
        if (!/^[a-zA-Z\s]+$/.test(name)) {
            return "Name can only contain letters and spaces";
        }
        return "";
    };

    const validateMobile = (mobile) => {
        if (!mobile || mobile.length === 0) {
            return "Mobile number is required";
        }
        if (mobile.length !== 10) {
            return "Mobile number must be exactly 10 digits";
        }
        if (!/^\d{10}$/.test(mobile)) {
            return "Mobile number must contain only digits";
        }
        return "";
    };

    const validateWhatsapp = (whatsapp) => {
        if (!whatsapp || whatsapp.trim().length === 0) {
            return "WhatsApp/Email is required";
        }
        
        if (whatsapp.includes('@')) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(whatsapp)) {
                return "Invalid email format";
            }
        } else {
            // Must be a phone number - exactly 10 digits
            if (!/^\d{10}$/.test(whatsapp)) {
                return "WhatsApp number must be exactly 10 digits";
            }
        }
        return "";
    };

    const validateCategory = (category) => {
        if (!category || category.trim().length === 0) {
            return "Please select a task category";
        }
        return "";
    };

    const validateLink = (link) => {
        if (!link || link.trim().length === 0) {
            return "Task link is required";
        }
        try {
            new URL(link);
        } catch {
            return "Invalid URL format";
        }
        return "";
    };

    const validateBudget = (budget) => {
        if (!budget || Number(budget) <= 0) {
            return "Budget must be greater than 0";
        }
        if (Number(budget) > 100000) {
            return "Budget cannot exceed ₹100,000";
        }
        return "";
    };

    const validateUsers = (users) => {
        if (!users || Number(users) <= 0) {
            return "Target users must be greater than 0";
        }
        return "";
    };

    // Real-time validation on field change
    const handleFieldChange = (field, value) => {
        setFormData(prev => ({...prev, [field]: value}));
        
        let error = "";
        switch(field) {
            case 'name':
                error = validateName(value);
                break;
            case 'mobile':
                error = validateMobile(value.replace(/\D/g, '').slice(0, 10));
                break;
            case 'whatsapp':
                error = validateWhatsapp(value);
                break;
            case 'category':
                error = validateCategory(value);
                break;
            case 'link':
                error = validateLink(value);
                break;
            case 'budget':
                error = validateBudget(value);
                break;
            case 'usersRequired':
                error = validateUsers(value);
                break;
            default:
                break;
        }
        
        setErrors(prev => ({...prev, [field]: error}));
    };

    const handleBudgetChange = (val) => {
        const budget = val === '' ? '' : Number(val);
        setFormData(prev => ({
            ...prev,
            budget: val,
            usersRequired: budget === '' ? '' : String(budget / costPerUser)
        }));
        setErrors(prev => ({...prev, budget: validateBudget(val)}));
    };

    const handleUsersChange = (val) => {
        const users = val === '' ? '' : Number(val);
        setFormData(prev => ({
            ...prev,
            usersRequired: val,
            budget: users === '' ? '' : String(users * costPerUser)
        }));
        setErrors(prev => ({...prev, usersRequired: validateUsers(val)}));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate all fields
        const newErrors = {
            name: validateName(formData.name),
            mobile: validateMobile(formData.mobile),
            whatsapp: validateWhatsapp(formData.whatsapp),
            category: validateCategory(formData.category),
            link: validateLink(formData.link),
            budget: validateBudget(formData.budget),
            usersRequired: validateUsers(formData.usersRequired)
        };
        
        setErrors(newErrors);
        
        // Check if there are any errors
        const hasErrors = Object.values(newErrors).some(error => error !== "");
        if (hasErrors) {
            alert("Please fix the errors in the form");
            return;
        }

        setLoading(true);
        
        try {
            const res = await api.post('/user/data/promotions', {
                name: formData.name,
                mobile: formData.mobile,
                whatsapp: formData.whatsapp,
                category: formData.category,
                link: formData.link,
                budget: Number(formData.budget),
                usersRequired: Number(formData.usersRequired),
                description: formData.description
            });

            if (res.success) {
                setIsSubmitted(true);
                // Reset form
                setFormData({ name: '', mobile: '', whatsapp: '', category: '', link: '', budget: '', usersRequired: '', description: '' });
                setErrors({});
                // Refresh list
                await fetchPromotions();
                setView('list');
                setTimeout(() => {
                    setIsSubmitted(false);
                }, 3000);
            }
        } catch (err) {
            console.error("Error submitting promotion:", err);
            alert(err.message || "Failed to submit promotion campaign");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="p-8 text-center text-slate-800 min-h-screen bg-[#F1F9F3] flex flex-col items-center justify-center font-medium uppercase tracking-widest gap-4">
                <Loader2 className="animate-spin text-sky-500 w-12 h-12" />
                <p>Loading Campaigns...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F1F9F3] pb-24 relative overflow-hidden">
            
            {/* LIST VIEW HEADER - NAVY THEME (Matching Image 2) */}
            {view === 'list' && (
                <div className="relative h-16 bg-[#0B1221] rounded-b-3xl shadow-lg flex items-center px-5 fixed top-0 left-0 right-0 z-[60] max-w-md mx-auto">
                    {/* Decorative Vector */}
                    <div className="absolute right-0 top-0 opacity-[0.05] pointer-events-none">
                        <Rocket size={80} className="text-white" />
                    </div>
                    {/* Compact Row */}
                    <div className="flex items-center gap-3 relative z-20 w-full text-left">
                        <button 
                            onClick={() => navigate(-1)} 
                            className="w-8 h-8 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-xl text-white active:scale-90 transition-all border border-white/10 cursor-pointer"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex flex-col">
                            <p className="text-blue-400 text-[7px] font-medium uppercase tracking-[0.2em] leading-none mb-1">
                                Brand Portal
                            </p>
                            <h1 className="text-sm font-medium text-white tracking-tight leading-none uppercase">
                                My Promotions
                            </h1>
                        </div>
                    </div>
                </div>
            )}

            {/* FORM VIEW HEADER - LIGHT GRADIENT THEME (Matching Image 1) */}
            {view === 'form' && (
                <div className="relative h-16 bg-gradient-to-r from-[#1B75FF] to-[#14B8FF] flex items-center px-5 fixed top-0 left-0 right-0 z-[60] max-w-md mx-auto shadow-md">
                    <div className="flex items-center gap-3 relative z-20 w-full text-left">
                        <button 
                            onClick={() => {
                                if (myPromotions.length > 0) {
                                    setView('list');
                                } else {
                                    navigate('/user/home');
                                }
                            }} 
                            className="w-8 h-8 flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer"
                        >
                            <ChevronLeft size={22} strokeWidth={2.5} />
                        </button>
                        <div className="flex items-center gap-1.5">
                            <Rocket size={18} className="text-white fill-white animate-pulse" />
                            <h1 className="text-sm font-medium text-white tracking-tight leading-none uppercase">
                                Promotion Details
                            </h1>
                        </div>
                    </div>
                </div>
            )}

            <div className="pt-6 px-4 pb-24 max-w-md mx-auto">
                
                {/* LIST VIEW: Display Campaigns */}
                {view === 'list' && (
                    <div className="space-y-4 animate-in fade-in duration-500 text-left">
                        {isSubmitted && (
                             <div className="bg-emerald-500 text-white p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-200 animate-bounce">
                                <CheckCircle2 size={24} />
                                <span className="text-xs font-medium uppercase tracking-widest leading-none">Campaign Created Successfully!</span>
                             </div>
                        )}

                        <div className="mb-1">
                            <h2 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] leading-none">Your Ad Requests History</h2>
                        </div>

                        {myPromotions.length === 0 ? (
                            <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-10 text-center">
                                <Rocket size={32} className="text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-medium text-[12px] leading-relaxed">No active promotions. Start your first campaign!</p>
                            </div>
                        ) : (
                            myPromotions.map((promo) => (
                                <div key={promo._id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:border-blue-100 transition-all p-5 mb-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-sky-55 rounded-2xl flex items-center justify-center text-sky-500 border border-sky-100">
                                                <Briefcase size={18} />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-slate-800 text-[13px] uppercase tracking-wide leading-none">{promo.category}</h3>
                                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-1.5 leading-none">{promo.brandName}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[8px] font-medium px-2.5 py-1 rounded-full uppercase tracking-widest border ${
                                            promo.status === 'Pending' ? 'bg-amber-50 text-amber-500 border-amber-100' : 
                                            promo.status === 'Rejected' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                                            'bg-emerald-50 text-emerald-500 border-emerald-100'
                                        }`}>
                                            {promo.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-slate-50">
                                            <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Budget</p>
                                            <p className="text-[14px] font-medium text-slate-800 leading-none">₹{promo.budget}</p>
                                        </div>
                                        <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-slate-50">
                                            <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Target Users</p>
                                            <p className="text-[14px] font-medium text-slate-800 leading-none">{promo.usersRequired}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[9px] font-medium text-slate-400 border-t border-slate-50 pt-4 mt-2">
                                        <span className="flex items-center gap-1"><Clock size={12}/> {new Date(promo.createdAt).toLocaleDateString()}</span>
                                        <a href={promo.brandLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sky-500 font-medium hover:underline">
                                            View Campaign <ExternalLink size={12}/>
                                        </a>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
                
                {/* FORM VIEW: Pixel-Perfect to Image 1 */}
                {view === 'form' && (
                    <form onSubmit={handleSubmit} className="space-y-3 animate-in fade-in duration-500 pb-12 text-left bg-white p-5 rounded-3xl shadow-sm border border-slate-100/50">
                        {/* NAME */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-medium text-[#5B718F] tracking-widest uppercase ml-1">Name</label>
                            <div className={`relative flex items-center bg-white border rounded-xl h-11 shadow-sm group focus-within:ring-1 transition-all ${
                                errors.name ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500/20' : 'border-[#E2E8F0] focus-within:border-[#1B75FF] focus-within:ring-[#1B75FF]/20'
                            }`}>
                                <div className={`w-11 h-full flex items-center justify-center border-r ${
                                    errors.name ? 'border-red-200 text-red-400' : 'border-[#F1F5F9] text-slate-300 group-focus-within:text-[#1B75FF]'
                                } transition-colors`}>
                                    <User size={16} />
                                </div>
                                <input 
                                    required
                                    type="text"
                                    placeholder="Enter your name"
                                    className="flex-1 h-full px-3 text-xs font-medium text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                                    value={formData.name}
                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                />
                            </div>
                            {errors.name && <p className="text-[9px] font-medium text-red-500 ml-1">{errors.name}</p>}
                        </div>

                        {/* MOBILE NUMBER */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-medium text-[#5B718F] tracking-widest uppercase ml-1">Mobile Number</label>
                            <div className={`relative flex items-center bg-white border rounded-xl h-11 shadow-sm group focus-within:ring-1 transition-all ${
                                errors.mobile ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500/20' : 'border-[#E2E8F0] focus-within:border-[#1B75FF] focus-within:ring-[#1B75FF]/20'
                            }`}>
                                <div className={`w-11 h-full flex items-center justify-center border-r ${
                                    errors.mobile ? 'border-red-200 text-red-400' : 'border-[#F1F5F9] text-slate-300 group-focus-within:text-[#1B75FF]'
                                } transition-colors`}>
                                    <Phone size={16} />
                                </div>
                                <input 
                                    required
                                    type="tel"
                                    placeholder="Mobile"
                                    maxLength={10}
                                    className="flex-1 h-full px-3 text-xs font-medium text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                                    value={formData.mobile}
                                    onChange={(e) => handleFieldChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                />
                            </div>
                            {errors.mobile && <p className="text-[9px] font-medium text-red-500 ml-1">{errors.mobile}</p>}
                        </div>

                        {/* WHATSAPP/EMAIL */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-medium text-[#5B718F] tracking-widest uppercase ml-1">Whatsapp/Email</label>
                            <div className={`relative flex items-center bg-white border rounded-xl h-11 shadow-sm group focus-within:ring-1 transition-all ${
                                errors.whatsapp ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500/20' : 'border-[#E2E8F0] focus-within:border-[#1B75FF] focus-within:ring-[#1B75FF]/20'
                            }`}>
                                <div className={`w-11 h-full flex items-center justify-center border-r ${
                                    errors.whatsapp ? 'border-red-200 text-red-400' : 'border-[#F1F5F9] text-slate-300 group-focus-within:text-[#1B75FF]'
                                } transition-colors`}>
                                    <Mail size={16} />
                                </div>
                                <input 
                                    required
                                    type="text"
                                    placeholder="Contact"
                                    maxLength={50}
                                    className="flex-1 h-full px-3 text-xs font-medium text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                                    value={formData.whatsapp}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        // If it's only digits, limit to 10
                                        if (/^\d*$/.test(val)) {
                                            handleFieldChange('whatsapp', val.slice(0, 10));
                                        } else {
                                            // Allow email format
                                            handleFieldChange('whatsapp', val);
                                        }
                                    }}
                                />
                            </div>
                            {errors.whatsapp && <p className="text-[9px] font-medium text-red-500 ml-1">{errors.whatsapp}</p>}
                        </div>

                        {/* TASK CATEGORY */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-medium text-[#5B718F] tracking-widest uppercase ml-1">Task Category</label>
                            <div className="relative flex items-center bg-white border border-[#E2E8F0] rounded-xl h-11 shadow-sm group focus-within:border-[#1B75FF] focus-within:ring-1 focus-within:ring-[#1B75FF]/20 transition-all">
                                <div className="w-11 h-full flex items-center justify-center border-r border-[#F1F5F9] text-slate-300 group-focus-within:text-[#1B75FF] transition-colors">
                                    <Briefcase size={16} />
                                </div>
                                <select 
                                    required
                                    className="flex-1 h-full px-3 text-xs font-medium text-slate-700 bg-transparent outline-none appearance-none cursor-pointer"
                                    value={formData.category}
                                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                                >
                                    <option value="" disabled>Select Task Type</option>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                <div className="absolute right-3 pointer-events-none text-slate-300">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </div>

                        {/* TASK LINK */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-medium text-[#5B718F] tracking-widest uppercase ml-1">Task Link</label>
                            <div className="relative flex items-center bg-white border border-[#E2E8F0] rounded-xl h-11 shadow-sm group focus-within:border-[#1B75FF] focus-within:ring-1 focus-within:ring-[#1B75FF]/20 transition-all">
                                <div className="w-11 h-full flex items-center justify-center border-r border-[#F1F5F9] text-slate-300 group-focus-within:text-[#1B75FF] transition-colors">
                                    <Link size={16} />
                                </div>
                                <input 
                                    required
                                    type="url"
                                    placeholder="Paste link here"
                                    className="flex-1 h-full px-3 text-xs font-medium text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                                    value={formData.link}
                                    onChange={(e) => setFormData({...formData, link: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* BUDGET & TARGET USERS SIDE-BY-SIDE */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-medium text-[#5B718F] tracking-widest uppercase ml-1">Budget (₹)</label>
                                <div className="relative flex items-center bg-white border border-[#E2E8F0] rounded-xl h-11 shadow-sm group focus-within:border-[#1B75FF] focus-within:ring-1 focus-within:ring-[#1B75FF]/20 transition-all">
                                    <div className="w-8 h-full flex items-center justify-center border-r border-[#F1F5F9] text-slate-300 font-medium text-xs">
                                        ₹
                                    </div>
                                    <input 
                                        required
                                        type="number"
                                        placeholder="Budget"
                                        className="flex-1 h-full px-2 text-xs font-medium text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                                        value={formData.budget}
                                        onChange={(e) => handleBudgetChange(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-medium text-[#5B718F] tracking-widest uppercase ml-1">Target Users</label>
                                <div className="relative flex items-center bg-white border border-[#E2E8F0] rounded-xl h-11 shadow-sm group focus-within:border-[#1B75FF] focus-within:ring-1 focus-within:ring-[#1B75FF]/20 transition-all">
                                    <div className="w-8 h-full flex items-center justify-center border-r border-[#F1F5F9] text-slate-300">
                                        <Users size={14} />
                                    </div>
                                    <input 
                                        required
                                        type="number"
                                        placeholder="Users"
                                        className="flex-1 h-full px-2 text-xs font-medium text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                                        value={formData.usersRequired}
                                        onChange={(e) => handleUsersChange(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Estimator yellow panel */}
                        <div className="bg-[#FFFDF0] border border-[#FEF3C7] rounded-xl p-3 text-center shadow-sm relative overflow-hidden">
                            <p className="text-[#D97706] text-[8px] font-medium uppercase tracking-[0.15em] mb-1 leading-none">
                                Estimate: ₹1/User Cost
                            </p>
                            <p className="text-slate-800 text-sm font-medium tracking-tight leading-none">
                                ₹{formData.budget || 0} = {formData.usersRequired || 0} Users
                            </p>
                        </div>

                        {/* DESCRIPTION (OPTIONAL) */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-medium text-[#5B718F] tracking-widest uppercase ml-1">Description (Optional)</label>
                            <div className="relative bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm group focus-within:border-[#1B75FF] focus-within:ring-1 focus-within:ring-[#1B75FF]/20 transition-all">
                                <textarea 
                                    placeholder="Explain your promotion goal..."
                                    className="w-full bg-transparent outline-none text-xs font-medium text-slate-700 placeholder:text-slate-300 h-20 resize-none"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* SUBMIT & CONTINUE BUTTON */}
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-[#FFB600] hover:bg-[#E5A300] text-white font-medium uppercase tracking-[0.2em] py-3.5 rounded-xl shadow-lg shadow-amber-100 active:scale-[0.98] transition-all text-[11px] border border-white/5 disabled:opacity-50 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : 'SUBMIT & CONTINUE'}
                        </button>
                    </form>
                )}
            </div>

            {/* Floating Plus Button to Add New Campaign (Matching Image 2) */}
            {view === 'list' && (
                <button 
                    onClick={() => setView('form')}
                    className="fixed bottom-10 right-6 w-14 h-14 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-full shadow-[0_8px_25px_rgba(2,132,199,0.4)] flex items-center justify-center active:scale-90 transition-all z-[100] border-4 border-white cursor-pointer"
                >
                    <Plus size={30} strokeWidth={3} />
                </button>
            )}
        </div>
    );
};

export default PromoteBrand;
