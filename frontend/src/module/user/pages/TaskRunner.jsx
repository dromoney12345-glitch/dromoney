import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { taskStorage } from '../../shared/services/taskStorage';
import api from '../../shared/services/api';
import { ChevronLeft, CheckCircle2, Play, UploadCloud, Link as LinkIcon, Loader2, Image as ImageIcon, Coins, Camera, XCircle, MessageCircle, Send, Copy, Share2 } from 'lucide-react';

const Facebook = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
    </svg>
);

const Instagram = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
);

const TaskRunner = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addCoins, userData } = useUser();
    
    // Safety check incase user not unlocking bypassed
    useEffect(() => {
        if (!userData.isPaid) {
            navigate(-1);
        }
    }, [userData.isPaid, navigate]);

    // Fetch dynamic task from storage once inside an effect
    const [task, setTask] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [status, setStatus] = useState('idle'); // idle, running, verify, completed, calling_ad
    const [screenshotFile, setScreenshotFile] = useState(null);
    const [toast, setToast] = useState(null);
    const [taskMultiplier, setTaskMultiplier] = useState(12);
    const fileInputRef = React.useRef(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        const loadTask = async () => {
            let allTasks = taskStorage.getTasks();
            console.log("TaskRunner: Searching in storage. ID:", id);
            
            let foundTask = allTasks.find(t => String(t._id || t.id) === String(id));
            
            if (!foundTask) {
                console.log("TaskRunner: Not in storage, fetching from API...");
                try {
                    const res = await api.get('/public/tasks');
                    if (res.success && res.data) {
                        allTasks = res.data;
                        taskStorage.syncTasks(allTasks); // Sync for future use
                        foundTask = allTasks.find(t => String(t._id || t.id) === String(id));
                    }
                } catch (err) {
                    console.error("TaskRunner: API Fetch Error:", err);
                }
            }

            console.log("TaskRunner: Final found task:", foundTask);
            
            if (foundTask) {
                 setTask(foundTask);
                 const tType = foundTask.type;
                 const timerValue = Number(foundTask.config?.timer) || (tType === 'Video' ? 30 : 25);
                 if (tType === 'Video' || tType === 'Web' || tType === 'Join' || tType === 'Social') {
                     setTimeLeft(timerValue);
                 }
            } else {
                console.warn("TaskRunner: Task not found anywhere.");
            }
        };

        const loadBoosterData = async () => {
            try {
                const res = await api.get('/public/boosters');
                if (res.success && res.data) {
                    const taskBooster = res.data.find(b => b.type === 'task');
                    if (taskBooster && taskBooster.benefits) {
                        for (const b of taskBooster.benefits) {
                            const match = b.match(/(\d+)x/i);
                            if (match) {
                                setTaskMultiplier(parseInt(match[1]));
                                break;
                            }
                        }
                    }
                }
            } catch (err) {}
        };

        loadTask();
        loadBoosterData();
    }, [id]);

    useEffect(() => {
        if (status === 'running' && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        } else if (status === 'running' && timeLeft === 0) {
            setStatus('verify');
        }
    }, [status, timeLeft]);

    if (!task) return (
        <div className="p-8 text-center text-white min-h-screen bg-slate-950 flex flex-col items-center justify-center font-medium uppercase tracking-widest gap-4">
            <Loader2 className="animate-spin text-sky-500 w-12 h-12" />
            <p>Loading Task Details...</p>
        </div>
    );

    const formatVideoUrl = (url) => {
        if (!url) return '';
        let videoId = '';
        let params = '';

        try {
            if (url.includes('youtube.com/watch?v=')) {
                const parts = url.split('v=')[1].split('&');
                videoId = parts[0];
                params = parts.slice(1).join('&');
            } else if (url.includes('youtu.be/')) {
                const parts = url.split('youtu.be/')[1].split('?');
                videoId = parts[0];
                params = parts[1] || '';
            } else if (url.includes('m.youtube.com/watch?v=')) {
                const parts = url.split('v=')[1].split('&');
                videoId = parts[0];
                params = parts.slice(1).join('&');
            } else if (url.includes('youtube.com/embed/')) {
                const parts = url.split('embed/')[1].split('?');
                videoId = parts[0];
                params = parts[1] || '';
            }

            if (videoId) {
                // Ensure autoplay and mute for better iframe behavior
                const base = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&enablejsapi=1`;
                return params ? `${base}&${params}` : base;
            }
        } catch (e) {
            console.error("URL Parsing error", e);
        }
        
        return url;
    };

    const startTask = async () => {
        if (task.type === 'Video') {
            setStatus('calling_ad');
            // Prefer native AdMob inside the app
            if (window.flutter_inappwebview) {
                // Register callback for when Flutter ad completes
                window.refreshRewardStatus = async () => {
                    delete window.refreshRewardStatus;
                    await submitTask();
                };
                try {
                    const { showFlutterRewardedAd } = await import('../../shared/utils/flutterAds');
                    const { ok } = await showFlutterRewardedAd('reward_ad_1');
                    if (ok) {
                        // Some builds claim via refreshRewardStatus; others return true here
                        if (window.refreshRewardStatus) {
                            await window.refreshRewardStatus();
                        } else {
                            await submitTask();
                        }
                    } else {
                        showToast('No ad available right now. Please try again.', 'error');
                        setStatus('idle');
                    }
                } catch (e) {
                    console.error('Flutter handler error', e);
                    showToast('Failed to launch Ad. Please try again.', 'error');
                    setStatus('idle');
                }
            } else {
                showToast('This feature is only available in the mobile app.', 'error');
                setStatus('idle');
            }
            return;
        }

        setStatus('running');
        // Open the external URL if it's Web/Join/Social/Watch/Bonus task
        const taskUrl = task.link || task.config?.url;
        if ((task.type === 'Web' || task.type === 'Join' || task.type === 'Social' || task.type === 'Watch' || task.type === 'Bonus') && taskUrl) {
            window.open(taskUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const submitTask = async () => {
        if ((task.type === 'Proof' || task.type === 'Download' || task.type === 'Sponsored') && screenshotFile) {
            setStatus('completed');
            try {
                // 1. Upload the image
                const formData = new FormData();
                formData.append('file', screenshotFile);
                
                // We use the new user upload route
                const uploadRes = await api.post('/user/data/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (uploadRes.success) {
                    // 2. Submit the task with the uploaded image URL
                    const submissionRes = await api.post('/user/data/tasks/submit', {
                        taskId: task._id || task.id,
                        proofImage: uploadRes.url,
                        coinsReward: task.coinsReward || task.reward || 0
                    });

                    if (submissionRes.success) {
                        // Success state
                        taskStorage.markComplete(task._id || task.id);
                        setTimeout(() => navigate('/user/earn'), 2500);
                    }
                }
            } catch (err) {
                console.error("Task submission error:", err);
                alert(err.message || "Failed to submit task proof");
                setStatus('verify');
            }
            return;
        }

        setStatus('completed');
        let rewardAmount = task.coinsReward || task.reward || 0;
        
        const taskId = task._id || task.id;
        const result = await addCoins(rewardAmount, task.title, taskId);
        
        if (!result || !result.success) {
            alert(result?.message || 'Failed to add earning. Please try again.');
            setStatus('verify');
            return;
        }
        taskStorage.markComplete(taskId);
        
        if (userData.isTaskBoosterActive) {
            setToast({ message: `Task completed! ${taskMultiplier}X Booster Applied! +₹${rewardAmount * taskMultiplier}`, type: 'success' });
            setTimeout(() => { setToast(null); navigate('/user/earn'); }, 2000);
        } else {
            setTimeout(() => navigate('/user/earn'), 2000);
        }
    };

    return (
        <div className="bg-slate-950 min-h-screen text-slate-200 flex flex-col sm:max-w-md sm:mx-auto relative z-[500] selection:bg-sky-500/30">
            {toast && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 w-[88%] max-w-sm ${
                    toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span className="text-[11px]">{toast.message}</span>
                </div>
            )}

            {/* Nav Header */}
            <div className="px-4 py-4 flex items-center gap-4 bg-slate-900 border-b border-slate-800 sticky text-left top-0 z-10 w-full shadow-lg">
                <button onClick={() => navigate(-1)} className="p-2 bg-slate-950 rounded-full hover:bg-slate-800 transition-colors border border-slate-800">
                    <ChevronLeft size={20} className="text-white" />
                </button>
                <div className="flex-1 truncate">
                    <h1 className="text-base font-medium text-white truncate">{task.title}</h1>
                    <p className="text-[9px] text-sky-400 font-medium uppercase tracking-widest leading-none mt-1">Live Task Mode</p>

                </div>
                <div className="bg-[#462211]/10 px-3 py-1.5 rounded-full border border-[#462211]/20 shadow-inner shrink-0 flex items-center gap-1">
                    <span className="font-medium text-[#B3591C] text-xs">+₹{userData.isTaskBoosterActive ? (task.coinsReward || task.reward) * taskMultiplier : (task.coinsReward || task.reward)} {userData.isTaskBoosterActive && `(${taskMultiplier}X)`}</span>
                </div>
            </div>

            {/* Content Body based on Task Type */}
            <div className="flex-1 p-5 flex flex-col">
                
                {/* LINK / WEB / JOIN / SOCIAL / VIDEO TASKS */}
                {(task.type === 'Web' || task.type === 'Join' || (task.type === 'Social' && !(task.title || '').toLowerCase().includes('share')) || task.type === 'Survey' || task.type === 'Watch' || task.type === 'Bonus' || task.type === 'Video') && (
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="w-full flex-1 min-h-[400px] bg-slate-900 border border-slate-800 rounded-3xl flex flex-col overflow-hidden relative shadow-lg items-center justify-center p-6 text-center">
                            
                            {(status === 'idle' || status === 'calling_ad') && (
                                <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                                    <button 
                                        onClick={startTask}
                                        disabled={status === 'calling_ad'}
                                        className="px-8 py-4 bg-sky-500 hover:bg-sky-400 active:scale-95 disabled:bg-slate-800 disabled:text-slate-400 font-medium text-slate-950 rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.3)] disabled:shadow-none transition-all uppercase tracking-widest text-xs flex items-center gap-2">
                                        {status === 'calling_ad' ? <Loader2 size={16} className="animate-spin" /> : null}
                                        {status === 'calling_ad' ? 'Launching Ad...' : (task.type === 'Video' ? 'Watch and Earn' : 'Open Sponsor Portal')} 
                                        {status !== 'calling_ad' && (task.type === 'Video' ? <Play size={16} className="fill-current" /> : <LinkIcon size={16} />)}
                                    </button>
                                    <p className="text-[10px] text-slate-500 mt-5 font-medium uppercase tracking-widest">{task.type === 'Video' ? 'Powered by AdMob' : 'Opens in Safe Browser'}</p>
                                </div>
                            )}
                                
                            {status === 'running' && (
                                <div className="flex flex-col items-center justify-center animate-in fade-in duration-500">
                                    <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                                        <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                                        <div className="absolute inset-0 rounded-full border-4 border-sky-500 border-t-transparent animate-spin"></div>
                                        <span className="text-2xl font-medium text-sky-400">{timeLeft}</span>
                                    </div>
                                    <h3 className="text-lg font-medium text-white tracking-tight uppercase mb-2">Verifying Session</h3>
                                    <p className="text-xs text-slate-400 font-medium">Please wait while we verify your visit...</p>
                                </div>
                            )}

                            {status === 'verify' && (
                                <div className="flex flex-col items-center justify-center animate-in slide-in-from-bottom duration-500 w-full max-w-sm">
                                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                        <CheckCircle2 size={40} className="text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-medium text-white uppercase tracking-tight mb-2">Task Successfully Completed!</h3>
                                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-8">You can now claim your reward</p>
                                    
                                    <button 
                                        onClick={submitTask}
                                        className="w-full px-8 py-4 bg-sky-500 hover:bg-sky-400 active:scale-95 font-medium text-slate-950 rounded-2xl shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all uppercase tracking-[0.2em] text-[11px]"
                                    >
                                        Claim Final Reward
                                    </button>
                                </div>
                            )}
                            
                            {status === 'completed' && (
                                <div className="flex flex-col items-center justify-center animate-in zoom-in duration-500">
                                    <Loader2 size={40} className="text-sky-500 animate-spin mb-4" />
                                    <h3 className="text-sm font-medium text-white uppercase tracking-widest">Processing Reward...</h3>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* PROOF / DOWNLOAD / SPONSORED TASK */}
                {(task.type === 'Proof' || task.type === 'Download' || task.type === 'Sponsored') && (() => {
                    const isDownload = task.type === 'Download' || 
                        String(task.title || '').toLowerCase().includes('app') || 
                        String(task.description || '').toLowerCase().includes('download');
                    const isVideo = String(task.link || task.config?.url || '').toLowerCase().includes('youtube.com') || 
                        String(task.link || task.config?.url || '').toLowerCase().includes('youtu.be');

                    let titleText = 'Proof Required';
                    let descText = task.description || 'Complete the task manually and upload proof.';
                    let btnText = 'Open Link';
                    let step2Text = 'Upload Screenshot of completed task';

                    if (isDownload) {
                        titleText = 'Download & Install';
                        descText = task.description || 'Download the app from the link below and upload screenshot of home screen.';
                        btnText = 'Download App';
                        step2Text = 'Upload Screenshot of installed app';
                    } else if (isVideo) {
                        titleText = 'Watch Video & Earn';
                        descText = task.description || 'Watch the full video below and upload a screenshot as proof of watching.';
                        btnText = 'Open YouTube';
                        step2Text = 'Upload Screenshot of completed video';
                    }

                    return (
                        <div className="flex-1 flex flex-col gap-5 justify-center">
                           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-lg relative overflow-hidden">
                                {/* Decorative blur blob */}
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-500/20 rounded-full blur-[40px] pointer-events-none"></div>

                                {isVideo ? (
                                    <div className="w-full bg-slate-950 rounded-2xl overflow-hidden aspect-video relative border border-slate-800 shadow-xl flex flex-col justify-center items-center mb-5">
                                        <iframe 
                                            src={formatVideoUrl(task.link || task.config?.url)} 
                                            className="w-full h-full border-0"
                                            title="Sponsor Video"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 rounded-[1.5rem] mx-auto flex items-center justify-center mb-5 shadow-xl shadow-rose-500/20">
                                       {isDownload ? <UploadCloud size={32} className="text-white" /> : <Camera size={32} className="text-white" />}
                                    </div>
                                )}

                                <h2 className="text-white font-medium text-xl mb-2 tracking-tight">
                                    {titleText}
                                </h2>
                                <p className="text-[11px] text-slate-400 font-medium mb-8 px-4 leading-relaxed tracking-wide">
                                    {descText}
                                </p>
                                
                                <button 
                                    className="w-full bg-slate-950 border border-slate-800 text-white hover:text-sky-400 hover:border-sky-500/50 font-medium uppercase tracking-widest py-4 rounded-xl hover:bg-slate-900 transition-all text-xs flex justify-center items-center gap-2" 
                                    onClick={() => {
                                        if (task.link) window.open(task.link, '_blank');
                                        setStatus('verify');
                                    }}
                                >
                                    {btnText} <LinkIcon size={14} />
                                </button>
                           </div>


                       {status === 'verify' && (
                           <div className="bg-slate-900/50 border border-amber-500/30 rounded-3xl p-6 animate-in slide-in-from-bottom-4 shadow-[0_0_20px_rgba(245,158,11,0.05)] text-center relative overflow-hidden">
                               <h3 className="text-amber-400 font-medium text-xs mb-1.5 uppercase tracking-widest">Step 2: Verification</h3>
                               <p className="text-[10px] text-slate-400 font-medium mb-4 uppercase tracking-wider">
                                   {step2Text}
                               </p>
                               
                                <label 
                                    htmlFor="task-proof-upload"
                                    className="relative border-2 border-dashed border-slate-700/50 hover:border-amber-500/60 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-950/50 transition-colors cursor-pointer group h-32 z-10 block"
                                >
                                    {!screenshotFile ? (
                                        <>
                                            <UploadCloud size={24} className="text-slate-500 group-hover:text-amber-500 mb-2 transition-colors relative z-0" />
                                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest text-center mt-1 relative z-0">Upload Proof Screenshot</span>
                                        </>
                                    ) : (
                                        <div className="relative w-full h-full">
                                           <img src={URL.createObjectURL(screenshotFile)} alt="proof" className="w-full h-full object-cover rounded-lg opacity-50" />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 z-0 shadow-xl">
                                                <ImageIcon size={28} className="text-emerald-500 drop-shadow-md" />
                                                <span className="text-[10px] text-emerald-400 font-medium truncate max-w-[200px] uppercase tracking-widest bg-slate-950/80 px-2 py-1 rounded">{screenshotFile.name}</span>
                                            </div>
                                        </div>
                                    )}
                                </label>
                                <input 
                                    id="task-proof-upload"
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={(e) => { if(e.target.files[0]) setScreenshotFile(e.target.files[0]); }} 
                                />
                           </div>
                       )}
                    </div>
                    );
                })()}
                {/* SHARE TASK */}
                {(task.type === 'Share' || (task.type === 'Social' && (task.title || '').toLowerCase().includes('share'))) && (
                    <div className="flex-1 flex flex-col gap-5 justify-center py-6 overflow-y-auto">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
                            <div className="absolute -top-10 -left-10 w-32 h-32 bg-sky-500/10 rounded-full blur-[40px]"></div>
                            <div className="w-16 h-16 bg-sky-500/10 rounded-3xl mx-auto flex items-center justify-center mb-4 border border-sky-500/30">
                                <Share2 size={28} className="text-sky-400" />
                            </div>
                            <h2 className="text-white font-medium text-lg mb-2">Share & Earn</h2>
                            <p className="text-[11px] text-slate-400 font-medium mb-6 px-2 leading-relaxed">
                                {task.description} <br/> 
                                Choose a platform below to share and complete this task!
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <button onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent((task.config?.text || '') + ' ' + (task.config?.url || window.location.origin))}`, '_blank'); setStatus('verify'); }} className="flex flex-col items-center justify-center gap-2 p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-2xl transition-all">
                                    <MessageCircle size={24} className="text-green-500" />
                                    <span className="text-[10px] text-green-400 font-medium uppercase tracking-widest">WhatsApp</span>
                                </button>
                                <button onClick={() => { navigator.clipboard.writeText(`${task.config?.text || ''} ${task.config?.url || window.location.origin}`); window.open('https://instagram.com/', '_blank'); setStatus('verify'); showToast("Link copied! Paste in Instagram.", "success"); }} className="flex flex-col items-center justify-center gap-2 p-3 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 rounded-2xl transition-all">
                                    <Instagram size={24} className="text-pink-500" />
                                    <span className="text-[10px] text-pink-400 font-medium uppercase tracking-widest">Instagram</span>
                                </button>
                                <button onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(task.config?.url || window.location.origin)}`, '_blank'); setStatus('verify'); }} className="flex flex-col items-center justify-center gap-2 p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-2xl transition-all">
                                    <Facebook size={24} className="text-blue-500" />
                                    <span className="text-[10px] text-blue-400 font-medium uppercase tracking-widest">Facebook</span>
                                </button>
                                <button onClick={() => { window.open(`https://t.me/share/url?url=${encodeURIComponent(task.config?.url || window.location.origin)}&text=${encodeURIComponent(task.config?.text || '')}`, '_blank'); setStatus('verify'); }} className="flex flex-col items-center justify-center gap-2 p-3 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-2xl transition-all">
                                    <Send size={24} className="text-sky-500" />
                                    <span className="text-[10px] text-sky-400 font-medium uppercase tracking-widest">Telegram</span>
                                </button>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => { navigator.clipboard.writeText(`${task.config?.text || ''} ${task.config?.url || window.location.origin}`); setStatus('verify'); showToast("Link copied to clipboard!", "success"); }} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all">
                                    <Copy size={16} className="text-slate-300" />
                                    <span className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">Copy Link</span>
                                </button>
                                {navigator.share && (
                                    <button onClick={() => { navigator.share({ title: 'Join Dromoney', text: task.config?.text || 'Check out this app!', url: task.config?.url || window.location.origin }).then(() => setStatus('verify')).catch(err => console.log('Share failed', err)); }} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all">
                                        <Share2 size={16} className="text-slate-300" />
                                        <span className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">More</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* QUIZ AND SPIN MOCKS */}
                {(task.type === 'Quiz' || task.type === 'Spin') && (
                     <div className="flex-1 flex items-center justify-center">
                         <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center shadow-2xl">
                              <h2 className="text-white font-medium text-xl mb-2">{task.title} Simulation</h2>
                              <p className="text-xs text-slate-400 mb-6">{task.description}</p>
                              <button onClick={() => setStatus('verify')} className="bg-amber-500 text-slate-950 px-6 py-3 rounded-full font-medium text-xs uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                  {task.type === 'Quiz' ? 'Simulate Quiz Win' : 'Simulate Spin Win'}
                              </button>
                         </div>
                     </div>
                )}
            </div>

            {/* Bottom Action Footer fixed to bottom of this specific page */}
             {task.type !== 'Web' && (
                 <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
                    <button 
                        onClick={submitTask}
                        disabled={status !== 'verify' || ((task.type === 'Proof' || task.type === 'Download' || task.type === 'Sponsored') && !screenshotFile) || status === 'completed'}
                        className="w-full bg-sky-500 hover:bg-sky-400 active:scale-[0.98] disabled:opacity-50 disabled:bg-slate-900 disabled:text-slate-600 text-slate-950 font-medium uppercase tracking-[0.2em] py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.2)] disabled:shadow-none flex justify-center items-center gap-2 text-[11px]"
                    >
                        {status === 'completed' && <Loader2 className="animate-spin" size={16} />}
                        {status === 'idle' ? 'Follow instructions above' : 
                         status === 'running' ? 'Task in progress...' :
                         status === 'completed' ? 'Processing...' :
                         'Claim Final Reward'}
                    </button>
                 </div>
             )}
        </div>
    );
};

export default TaskRunner;
