import React, { useState, useEffect } from 'react';
import { 
    Settings as SettingsIcon, Shield, CreditCard, 
    Layout, Coins, Bell, Save, CheckCircle2,
    Lock, Mail, Globe, AlertTriangle, Eye, EyeOff, ImageIcon, Loader2
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { SettingsDataService } from '../../../services/SettingsDataService';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [config, setConfig] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            const data = await SettingsDataService.getSettings();
            if (data) setConfig(data);
        };
        fetchSettings();
    }, []);

    const handleChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await SettingsDataService.saveSettings(config);
            setIsSaving(false);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (err) {
            console.error(err);
            setIsSaving(false);
            alert("Failed to save settings");
        }
    };

    if (!config) return <div className="p-4 text-center font-medium animate-pulse">Loading Platform Config...</div>;

    const tabs = [
        { id: 'general', label: 'General', icon: Layout, color: 'text-sky-500', bg: 'bg-sky-50' },
        { id: 'payments', label: 'Payments', icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        { id: 'earnings', label: 'Earnings', icon: Coins, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { id: 'security', label: 'Security', icon: Shield, color: 'text-rose-500', bg: 'bg-rose-50' },
    ];

    return (
        <div className="p-4 animate-in fade-in duration-500 pb-20 relative">
            <PageHeader title="System Settings" subtitle="Global configuration for branding, payments, and commission logic" />

            {/* Success Toast */}
            {showToast && (
                <div className="fixed top-24 right-8 z-50 animate-in slide-in-from-right duration-300">
                    <div className="bg-emerald-500 text-white px-4 py-4 rounded-lg shadow-2xl flex items-center gap-3">
                        <CheckCircle2 size={24} />
                        <div>
                            <p className="text-xs font-medium uppercase tracking-normal">Settings Saved</p>
                            <p className="text-[10px] font-medium opacity-80">Platform parameters updated successfully.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-5">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-72 space-y-3">
                    <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center justify-between px-5 py-4 rounded-lg transition-all duration-300 group
                                    ${activeTab === tab.id ? 'bg-[#1A1C30] text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${activeTab === tab.id ? 'bg-white/10' : tab.bg} ${activeTab === tab.id ? 'text-white' : tab.color}`}>
                                        <tab.icon size={18} />
                                    </div>
                                    <span className="text-[11px] font-medium uppercase tracking-normal">{tab.label}</span>
                                </div>
                                {activeTab === tab.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>}
                            </button>
                        ))}
                    </div>

                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 mt-6 relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 text-amber-100 rotate-12">
                            <AlertTriangle size={80} />
                        </div>
                        <h4 className="text-[11px] font-medium text-amber-900 uppercase tracking-normal mb-2 flex items-center gap-2 relative z-10">
                            <AlertTriangle size={14} /> Attention
                        </h4>
                        <p className="text-[10px] font-medium text-amber-900/60 leading-relaxed relative z-10">
                            Changes made to 'Earnings' affect user calculations in real-time. Double check before saving.
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 min-h-[500px] flex flex-col">
                        {/* Tab Content Header */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tabs.find(t => t.id === activeTab).bg} ${tabs.find(t => t.id === activeTab).color}`}>
                                    {React.createElement(tabs.find(t => t.id === activeTab).icon, { size: 20 })}
                                </div>
                                <h2 className="text-xl font-medium text-slate-900 tracking-tight uppercase">
                                    {tabs.find(t => t.id === activeTab).label} Configuration
                                </h2>
                            </div>
                            <div className="h-1 w-20 bg-slate-100 rounded-full"></div>
                        </div>

                        <div className="flex-1">
                            {activeTab === 'general' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Globe size={14} className="text-slate-400" />
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">Platform Name</label>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={config.appName}
                                                onChange={(e) => handleChange('appName', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Mail size={14} className="text-slate-400" />
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">System Email</label>
                                            </div>
                                            <input 
                                                type="email" 
                                                value={config.contactEmail}
                                                onChange={(e) => handleChange('contactEmail', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Globe size={14} className="text-slate-400" />
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">Contact Phone / WhatsApp</label>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={config.contactPhone}
                                                onChange={(e) => handleChange('contactPhone', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all" 
                                            />
                                        </div>
                                        <div className="lg:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                            <div>
                                                <h4 className="text-[13px] font-medium text-slate-800 uppercase tracking-tight">Maintenance Mode</h4>
                                                <p className="text-[11px] font-medium text-slate-400 mt-1">Temporarily block user access for updates</p>
                                            </div>
                                            <button 
                                                onClick={() => handleChange('maintenanceMode', !config.maintenanceMode)}
                                                className={`relative w-16 h-8 rounded-full transition-all duration-300 ${config.maintenanceMode ? 'bg-rose-500 shadow-lg shadow-rose-200' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-sm ${config.maintenanceMode ? 'translate-x-8' : ''}`}></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'payments' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                                            <CreditCard size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-medium text-indigo-900 tracking-tight">Financial Hub Configuration</p>
                                            <p className="text-[11px] font-medium text-indigo-600/70 mt-1 max-w-md">Configure UPI and Bank details for user registration fees (Default: ₹{config.registrationFee}).</p>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Admin UPI ID</label>
                                            <input 
                                                type="text" 
                                                value={config.adminUpiId}
                                                onChange={(e) => handleChange('adminUpiId', e.target.value)}
                                                placeholder="BHARATPE2R0P0Z7W3H84355@unitype" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">QR Scanner Image</label>
                                            <div className="flex items-center gap-4">
                                                {config.qrScannerImage ? (
                                                    <img src={config.qrScannerImage} alt="QR Scanner" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                                                ) : (
                                                    <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                                                        <ImageIcon className="text-slate-300" size={24} />
                                                    </div>
                                                )}
                                                <div className="flex-1 relative">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                try {
                                                                    const btn = e.target.nextElementSibling;
                                                                    if (btn) btn.classList.remove('hidden');
                                                                    const url = await SettingsDataService.uploadImage(file);
                                                                    handleChange('qrScannerImage', url);
                                                                } catch (err) {
                                                                    alert('Failed to upload image. Please try again.');
                                                                } finally {
                                                                    const btn = e.target.nextElementSibling;
                                                                    if (btn) btn.classList.add('hidden');
                                                                }
                                                            }
                                                        }}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" 
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-indigo-500 flex items-center gap-2">
                                                        <Loader2 size={14} className="animate-spin" /> Uploading...
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-slate-400 mt-1">Make sure to click "Save Settings" at the top after uploading your image.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Manual Bank Details</label>
                                            <textarea 
                                                rows={4} 
                                                value={config.bankDetails}
                                                onChange={(e) => handleChange('bankDetails', e.target.value)}
                                                placeholder="Account Number, IFSC, Branch Name..." 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'earnings' && (
                                <div className="space-y-10 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[
                                            { label: 'Referral Commission', field: 'referralCommission', unit: '₹', icon: '🎁', info: 'Direct sale bonus' },
                                            { label: 'Coin Value', field: 'coinRate', unit: '₹', icon: '🪙', info: '1 Coin = ₹ Value', step: 0.01 },
                                            { label: 'Minimum Payout', field: 'minWithdrawal', unit: '₹', icon: '🏧', info: 'Withdrawal limit' },
                                            { label: 'Ad Reward', field: 'adRewardCoins', unit: '🪙', icon: '💰', info: 'Coins per Watch Ad', step: 1 },
                                            { label: 'Ad Cooldown', field: 'adCooldownSeconds', unit: 's', icon: '⏱️', info: 'Wait time between ads', step: 1 },
                                            { label: 'Max Daily Ads', field: 'adMaxDailyLimit', unit: 'ads', icon: '🎬', info: 'Limit per user', step: 1 }
                                        ].map((item, idx) => (
                                            <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all group">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-2xl">{item.icon}</span>
                                                    <span className="bg-white/80 px-2 py-1 rounded-lg text-[9px] font-medium text-slate-400 uppercase tracking-normal border border-slate-200">System Parameter</span>
                                                </div>
                                                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-normal ml-1">{item.label}</label>
                                                <div className="relative mt-2">
                                                    {item.unit === '₹' ? (
                                                        <>
                                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-medium text-slate-400">{item.unit}</span>
                                                            <input 
                                                                type="number" 
                                                                step={item.step || 1}
                                                                value={config[item.field]}
                                                                onChange={(e) => handleChange(item.field, e.target.value)}
                                                                className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-5 py-4 text-lg font-medium text-emerald-600 focus:outline-none focus:border-emerald-500 transition-all" 
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <input 
                                                                type="number" 
                                                                step={item.step || 1}
                                                                value={config[item.field]}
                                                                onChange={(e) => handleChange(item.field, e.target.value)}
                                                                className={`w-full bg-white border border-slate-200 rounded-lg pl-5 ${item.unit.length > 2 ? 'pr-16' : 'pr-10'} py-4 text-lg font-medium text-emerald-600 focus:outline-none focus:border-emerald-500 transition-all`} 
                                                            />
                                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 font-medium text-slate-400">{item.unit}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-medium text-slate-400 mt-3 ml-1 uppercase tracking-tight opacity-60">{item.info}</p>
                                            </div>
                                        ))}

                                        {/* Task Window Settings */}
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all group col-span-1 md:col-span-2 lg:col-span-3">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">⏰</span>
                                                    <div>
                                                        <h4 className="text-[13px] font-medium text-slate-800 uppercase tracking-tight">Daily KYC Time Window</h4>
                                                        <p className="text-[10px] font-medium text-slate-400 mt-1">Specify between what times users are allowed to complete KYC</p>
                                                    </div>
                                                </div>
                                                <span className="bg-white/80 px-2 py-1 rounded-lg text-[9px] font-medium text-slate-400 uppercase tracking-normal border border-slate-200">System Parameter</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                <div>
                                                    <label className="text-[10px] font-medium text-slate-500 uppercase tracking-normal ml-1">
                                                        Start Time <span className="text-blue-500 font-bold">({
                                                            (() => {
                                                                let [h, m] = (config.kycWindowStart || '07:00').split(':');
                                                                h = parseInt(h);
                                                                const ampm = h >= 12 ? 'PM' : 'AM';
                                                                h = h % 12 || 12;
                                                                return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
                                                            })()
                                                        })</span>
                                                    </label>
                                                    <input 
                                                        type="time" 
                                                        value={config.kycWindowStart || '07:00'}
                                                        onChange={(e) => handleChange('kycWindowStart', e.target.value)}
                                                        className="w-full mt-2 bg-white border border-slate-200 rounded-lg px-4 py-4 text-lg font-medium text-emerald-600 focus:outline-none focus:border-emerald-500 transition-all" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-medium text-slate-500 uppercase tracking-normal ml-1">
                                                        End Time <span className="text-blue-500 font-bold">({
                                                            (() => {
                                                                let [h, m] = (config.kycWindowEnd || '19:00').split(':');
                                                                h = parseInt(h);
                                                                const ampm = h >= 12 ? 'PM' : 'AM';
                                                                h = h % 12 || 12;
                                                                return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
                                                            })()
                                                        })</span>
                                                    </label>
                                                    <input 
                                                        type="time" 
                                                        value={config.kycWindowEnd || '19:00'}
                                                        onChange={(e) => handleChange('kycWindowEnd', e.target.value)}
                                                        className="w-full mt-2 bg-white border border-slate-200 rounded-lg px-4 py-4 text-lg font-medium text-emerald-600 focus:outline-none focus:border-emerald-500 transition-all" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-emerald-500 shadow-sm">
                                                <TrendingUpIcon size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-medium text-emerald-900 tracking-tight">Referral Reward System</p>
                                                <p className="text-[11px] font-medium text-emerald-600/70 mt-1">Enable/Disable referral bonuses for all users.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleChange('referralSystemEnabled', !config.referralSystemEnabled)}
                                            className={`relative w-16 h-8 rounded-full transition-all duration-300 ${config.referralSystemEnabled ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-sm ${config.referralSystemEnabled ? 'translate-x-8' : ''}`}></div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <div className="max-w-md space-y-6">
                                        <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center gap-4 mb-2">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm">
                                                <Shield size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-medium text-rose-900 tracking-tight">Access Control</p>
                                                <p className="text-[11px] font-medium text-rose-600/70 mt-1">Update primary administrator credentials.</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Mail size={14} className="text-slate-400" />
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">Admin Login Email</label>
                                            </div>
                                            <input 
                                                type="email" 
                                                value={config.adminEmail}
                                                onChange={(e) => handleChange('adminEmail', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 text-sm font-medium text-slate-800 focus:outline-none focus:border-rose-500 transition-all mb-4" 
                                            />
                                        </div>
                                        <div className="space-y-2 relative">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Lock size={14} className="text-slate-400" />
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">Admin Dashboard Password</label>
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type={showPassword ? "text" : "password"} 
                                                    value={config.adminPassword || ''}
                                                    onChange={(e) => handleChange('adminPassword', e.target.value)}
                                                    placeholder="Enter new password to update"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 text-sm font-medium text-slate-800 focus:outline-none focus:border-rose-500 transition-all pr-12" 
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer / Save Action */}
                        <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                            <div className="hidden md:block">
                                <p className="text-[10px] font-medium text-slate-400">Last Sync: {new Date().toLocaleTimeString()}</p>
                            </div>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`flex items-center gap-3 bg-[#1A1C30] text-white px-6 py-3 rounded-xl text-[12px] font-medium uppercase tracking-normal transition-all shadow-2xl shadow-slate-300
                                    ${isSaving ? 'opacity-80 scale-95' : 'hover:scale-[1.02] active:scale-95'}`}
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <Save size={18} />
                                )}
                                {isSaving ? 'Saving Configurations...' : 'Save System Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes trending-up {
                    0% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                    100% { transform: translateY(0); }
                }
                .trending-icon {
                    animation: trending-up 2s infinite ease-in-out;
                }
            `}} />
        </div>
    );
};

// Simple internal component for the icon
const TrendingUpIcon = ({ size }) => (
    <div className="trending-icon">
        <Coins size={size} />
    </div>
);

export default Settings;
