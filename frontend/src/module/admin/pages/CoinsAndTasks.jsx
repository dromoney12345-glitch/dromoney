import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Coins, Settings, X, Lightbulb, Loader } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import api from '../../shared/services/api';

const CoinsAndTasks = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [coinValue, setCoinValue] = useState(0.1);
    const [dailyLimit, setDailyLimit] = useState(100);
    const [activeTab, setActiveTab] = useState('tasks');
    
    // Timing Settings
    const [taskWindowStart, setTaskWindowStart] = useState('00:00');
    const [taskWindowEnd, setTaskWindowEnd] = useState('23:59');
    const [kycWindowStart, setKycWindowStart] = useState('07:00');
    const [kycWindowEnd, setKycWindowEnd] = useState('19:00');
    
    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [newTaskType, setNewTaskType] = useState('Social'); 
    const [newTaskData, setNewTaskData] = useState({
        title: '',
        description: '',
        reward: 1,
        category: 'Instagram',
        link: '',
        isDaily: false,
        config: {} 
    });

    useEffect(() => {
        fetchTasks();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/admin/settings');
            if (response.success) {
                setCoinValue(response.data.coinRate || 0.1);
                setDailyLimit(response.data.maxCoinsPerDay || 100);
                setTaskWindowStart(response.data.taskWindowStart || '00:00');
                setTaskWindowEnd(response.data.taskWindowEnd || '23:59');
                setKycWindowStart(response.data.kycWindowStart || '07:00');
                setKycWindowEnd(response.data.kycWindowEnd || '19:00');
            }
        } catch (err) {
            console.error("Fetch Settings Error:", err);
        }
    };

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/tasks');
            if (response.success) setTasks(response.data);
        } catch (err) {
            console.error("Fetch Tasks Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const deleteTask = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            const response = await api.delete(`/admin/content/task/${id}`);
            if (response.success) fetchTasks();
        } catch (err) {
            console.error("Delete Task Error:", err);
        }
    };

    const openEditModal = (task) => {
        setEditingTaskId(task._id);
        setNewTaskType(task.type);
        setNewTaskData({
            title: task.title,
            description: task.description,
            reward: task.coinsReward,
            category: task.category,
            link: task.link,
            isDaily: task.isDaily || false,
            config: task.config || {}
        });
        setIsAddModalOpen(true);
    };

    const openAddModal = () => {
        setEditingTaskId(null);
        setNewTaskType('Social');
        setNewTaskData({ title: '', description: '', reward: 1, category: 'Instagram', link: '', isDaily: false, config: {} });
        setIsAddModalOpen(true);
    };

    const handleSaveTask = async () => {
        if (!newTaskData.title || !newTaskData.link) return alert("Title and Link are required");
        
        const payload = {
            type: newTaskType,
            category: newTaskData.category,
            title: newTaskData.title,
            description: newTaskData.description,
            coinsReward: Number(newTaskData.reward),
            link: newTaskData.link ? newTaskData.link.trim() : '',
            isDaily: newTaskData.isDaily,
            config: newTaskData.config
        };

        try {
            let response;
            if (editingTaskId) {
                response = await api.put(`/admin/tasks/${editingTaskId}`, payload);
            } else {
                response = await api.post('/admin/tasks', payload);
            }
            
            if (response.success) {
                fetchTasks();
                setIsAddModalOpen(false);
            }
        } catch (err) {
            alert(err.message || "Something went wrong");
        }
    };

    const handleSaveSettings = async () => {
        setSaveLoading(true);
        try {
            const response = await api.put('/admin/settings', {
                coinRate: Number(coinValue),
                maxCoinsPerDay: Number(dailyLimit),
                taskWindowStart,
                taskWindowEnd,
                kycWindowStart,
                kycWindowEnd
            });
            
            if (response.success) {
                alert("Settings saved successfully!");
            }
        } catch (err) {
            alert(err.message || "Failed to save settings");
        } finally {
            setSaveLoading(false);
        }
    };

    return (
        <div className="p-4 animate-in fade-in duration-500">
            <PageHeader title="Coins & Tasks" subtitle="Manage daily tasks and coin economy settings" />

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {['tasks', 'settings'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                        className={`px-5 py-2.5 rounded-xl text-[11px] font-medium uppercase tracking-normal transition-all ${activeTab === t ? 'bg-sky-500 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-100'}`}>
                        {t === 'tasks' ? '📋 Tasks' : '⚙️ Coin Settings'}
                    </button>
                ))}
            </div>

            {activeTab === 'tasks' ? (
                <>
                    <div className="flex justify-end mb-4">
                        <button onClick={openAddModal} className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-medium text-[11px] uppercase tracking-normal px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95">
                            <Plus size={15} /> Add Task
                        </button>
                    </div>
                    <div className="space-y-3">
                        {tasks.length === 0 && <p className="text-center text-slate-400 text-sm py-10 font-medium">No tasks available.</p>}
                        {tasks.map(task => (
                            <div key={task._id} className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 flex items-center justify-between hover:border-slate-200 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-100">
                                        <span className="text-[10px] font-medium text-slate-400 uppercase leading-none mb-1">{task.type}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-800 text-[14px] leading-tight flex items-center gap-2">
                                            {task.title}
                                            <span className={`text-[9px] font-medium px-2 py-0.5 rounded-md ${task.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {task.status || 'Active'}
                                            </span>
                                            {task.isDaily && (
                                                <span className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-purple-100 text-purple-600 uppercase">
                                                    Daily
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{task.description}</p>
                                        {/* Task Config Badges for Admin to see what's inside */}
                                        <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[300px]">
                                            {task.config && Object.entries(task.config).map(([key, value]) => (
                                                <span key={key} className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-normal border border-slate-200">
                                                    {key}: <span className="text-sky-600 truncate max-w-[100px] inline-block align-bottom">{String(value)}</span>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-2 text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-lg inline-flex items-center gap-1 border border-amber-100/50">
                                            <Coins size={12} /> {task.coinsReward || task.reward} Coins Reward
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => openEditModal(task)} className="w-9 h-9 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center transition-all active:scale-90"><Edit2 size={16} /></button>
                                    <button onClick={() => deleteTask(task._id)} className="w-9 h-9 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl flex items-center justify-center transition-all active:scale-90"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4">
                        <h3 className="text-sm font-medium text-slate-800 uppercase tracking-normal mb-5 flex items-center gap-2"><Coins size={16} className="text-amber-500" /> Coin Economy</h3>
                        <div className="space-y-5">
                            <div>
                                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-normal">1 Coin = ₹</label>
                                <div className="flex items-center gap-3 mt-2">
                                    <input type="number" step="0.01" min="0" value={coinValue} onChange={e => setCoinValue(Math.max(0, e.target.value))}
                                        className="w-32 border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500" />
                                    <span className="text-sm font-medium text-slate-400">rupees per coin</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-normal">Max Coins Per Day</label>
                                <div className="flex items-center gap-3 mt-2">
                                    <input type="number" min="0" value={dailyLimit} onChange={e => setDailyLimit(Math.max(0, e.target.value))}
                                        className="w-32 border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500" />
                                    <span className="text-sm font-medium text-slate-400">coins/day limit per user</span>
                                </div>
                            </div>

                            <hr className="border-slate-100 my-4" />
                            <h3 className="text-sm font-medium text-slate-800 uppercase tracking-normal mb-3 flex items-center gap-2">🕒 Working Hours</h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h4 className="text-xs font-semibold text-slate-700 uppercase mb-3">Tasks Window</h4>
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <label className="text-[10px] text-slate-500 block mb-1">Start Time</label>
                                            <input type="time" value={taskWindowStart} onChange={e => setTaskWindowStart(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-sky-500" />
                                        </div>
                                        <span className="text-slate-400 mt-5">to</span>
                                        <div>
                                            <label className="text-[10px] text-slate-500 block mb-1">End Time</label>
                                            <input type="time" value={taskWindowEnd} onChange={e => setTaskWindowEnd(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-sky-500" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">Users can only complete tasks during this time window.</p>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h4 className="text-xs font-semibold text-slate-700 uppercase mb-3">KYC Window</h4>
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <label className="text-[10px] text-slate-500 block mb-1">Start Time</label>
                                            <input type="time" value={kycWindowStart} onChange={e => setKycWindowStart(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-sky-500" />
                                        </div>
                                        <span className="text-slate-400 mt-5">to</span>
                                        <div>
                                            <label className="text-[10px] text-slate-500 block mb-1">End Time</label>
                                            <input type="time" value={kycWindowEnd} onChange={e => setKycWindowEnd(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-sky-500" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">Users can only submit KYC requests during this time window.</p>
                                </div>
                            </div>

                            <button 
                                onClick={handleSaveSettings}
                                disabled={saveLoading}
                                className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-medium text-[12px] uppercase tracking-normal px-4 py-3 rounded-xl transition-all active:scale-95 shadow-md shadow-sky-100 flex items-center gap-2">
                                {saveLoading ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Settings'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔥 ADD TASK MODAL (DYNAMIC) 🔥 */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h2 className="text-base font-medium text-slate-800">Create New Task</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-4 overflow-y-auto max-h-[70vh] space-y-5">
                            
                            {/* Task Type Switcher */}
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal mb-3 block">1. Select Task Type</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {['Social', 'Survey', 'Watch', 'Join', 'Bonus', 'Sponsored', 'Video', 'Web', 'Quiz', 'Spin', 'Scratch', 'Tapper', 'Treasure'].map(type => (
                                        <button 
                                            key={type}
                                            onClick={() => { setNewTaskType(type); setNewTaskData({...newTaskData, config: {}}); }}
                                            className={`py-2 px-3 rounded-xl text-[10px] font-medium transition-all border ${newTaskType === type ? 'bg-sky-50 text-sky-600 border-sky-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Category Switcher */}
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal mb-3 block">2. Category</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {['Instagram', 'YouTube', 'Telegram', 'WhatsApp', 'Other'].map(cat => (
                                        <button 
                                            key={cat}
                                            onClick={() => { setNewTaskData({...newTaskData, category: cat}); }}
                                            className={`py-2 px-3 rounded-xl text-[10px] font-medium transition-all border ${newTaskData.category === cat ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                        >
                                            {cat}
                                        </button>                                    ))}
                                </div>
                            </div>

                            {/* Common Details */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal block">3. Basic Details</label>
                                
                                <div>
                                    <label className="text-xs font-medium text-slate-600 block mb-1">Task Title <span className="text-rose-500">*</span></label>
                                    <input type="text" placeholder="e.g. Follow us on Instagram" value={newTaskData.title} onChange={e => setNewTaskData({...newTaskData, title: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-600 block mb-1">Short Description</label>
                                    <input type="text" placeholder="Describe what the user has to do" value={newTaskData.description} onChange={e => setNewTaskData({...newTaskData, description: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-600 block mb-1">Direct Link <span className="text-rose-500">*</span></label>
                                    <input type="text" placeholder="e.g. https://instagram.com/dromoney" value={newTaskData.link} onChange={e => setNewTaskData({...newTaskData, link: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-600 block mb-1">Coins Reward <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <Coins size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                                        <input type="number" min="1" value={newTaskData.reward} onChange={e => setNewTaskData({...newTaskData, reward: Math.max(1, e.target.value)})} className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <input 
                                        type="checkbox" 
                                        id="isDaily"
                                        checked={newTaskData.isDaily} 
                                        onChange={e => setNewTaskData({...newTaskData, isDaily: e.target.checked})}
                                        className="w-5 h-5 rounded-lg border-slate-300 text-sky-600 focus:ring-sky-500"
                                    />
                                    <div>
                                        <label htmlFor="isDaily" className="text-sm font-medium text-slate-700 block leading-none mb-1">Daily Task</label>
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">User can repeat this daily</p>
                                    </div>
                                </div>
                            </div>

                            {/* 🛠️ DYNAMIC FIELDS BASED ON TYPE 🛠️ */}
                            <div className="space-y-4 pt-4 border-t border-slate-100 bg-slate-50 p-4 rounded-lg border">
                                <label className="text-[10px] font-medium text-sky-500 uppercase tracking-normal block flex items-center gap-2"><Settings size={12}/> {newTaskType} Settings</label>
                                
                                {/* Video Fields */}
                                {newTaskType === 'Video' && (
                                    <>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 block mb-1">YouTube URL</label>
                                            <input type="text" placeholder="https://youtube.com/..." value={newTaskData.config?.url || ''} onChange={e => setNewTaskData({...newTaskData, config: {...newTaskData.config, url: e.target.value}})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 block mb-1">Watch Timer (Seconds)</label>
                                            <input type="number" min="1" value={newTaskData.config?.timer || 30} onChange={e => setNewTaskData({...newTaskData, config: {...newTaskData.config, timer: Math.max(1, e.target.value)}})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500" />
                                        </div>
                                    </>
                                )}

                                {/* Web Visited */}
                                {newTaskType === 'Web' && (
                                    <>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 block mb-1">Target URL</label>
                                            <input type="url" placeholder="https://example.com" value={newTaskData.config?.url || ''} onChange={e => setNewTaskData({...newTaskData, config: {...newTaskData.config, url: e.target.value}})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 block mb-1">Wait Timer (Seconds)</label>
                                            <input type="number" min="1" value={newTaskData.config?.timer || 15} onChange={e => setNewTaskData({...newTaskData, config: {...newTaskData.config, timer: Math.max(1, e.target.value)}})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500" />
                                        </div>
                                    </>
                                )}

                                {/* Quiz */}
                                {newTaskType === 'Quiz' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 block mb-1">Question</label>
                                            <input type="text" placeholder="What is the capital of France?" value={newTaskData.config?.question || ''} onChange={e => setNewTaskData({...newTaskData, config: {...newTaskData.config, question: e.target.value}})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['A', 'B', 'C', 'D'].map(opt => (
                                                 <input key={opt} type="text" placeholder={`Option ${opt}`} value={newTaskData.config?.[`opt${opt}`] || ''} onChange={e => setNewTaskData({...newTaskData, config: {...newTaskData.config, [`opt${opt}`]: e.target.value}})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500" />
                                            ))}
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 block mb-1">Correct Answer (A/B/C/D)</label>
                                            <select value={newTaskData.config?.answer || ''} onChange={e => setNewTaskData({...newTaskData, config: {...newTaskData.config, answer: e.target.value}})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500">
                                                <option value="">Select...</option>
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                                <option value="D">D</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Spin */}
                                {newTaskType === 'Spin' && (
                                    <div>
                                        <label className="text-[10px] text-slate-500">The wheel will automatically give rewards up to the Max Coins specified above.</label>
                                    </div>
                                )}

                                {/* Sponsored / Proof / Download */}
                                {(newTaskType === 'Sponsored' || newTaskType === 'Proof' || newTaskType === 'Download') && (
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 block mb-1">
                                            Verification/Download Instructions for User
                                        </label>
                                        <textarea 
                                            placeholder="e.g. Download the app and upload home screen screenshot, or upload screenshot after following us on Instagram" 
                                            rows="3" 
                                            value={newTaskData.config?.instructions || ''} 
                                            onChange={e => setNewTaskData({...newTaskData, config: {...newTaskData.config, instructions: e.target.value}})} 
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500 resize-none"
                                        ></textarea>
                                    </div>
                                )}

                            </div>

                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 flex gap-3 bg-white">
                            <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs uppercase tracking-normal rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleSaveTask} className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs uppercase tracking-normal rounded-xl shadow-md transition-colors shadow-sky-500/20">Create Task</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoinsAndTasks;
