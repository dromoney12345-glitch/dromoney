import React, { useState, useEffect } from 'react';
import { Search, Eye, XCircle, Calendar, Upload, Download, ExternalLink, Image as ImageIcon, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api from '../../shared/services/api';
import { useAdmin } from '../context/AdminContext';

const TaskApprovals = () => {
    const { addNotification } = useAdmin();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Pending');
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/tasks/submissions');
            if (response.success) {
                setSubmissions(response.data);
            }
        } catch (err) {
            console.error("Submissions Fetch error:", err);
            addNotification("Error", "Failed to fetch submissions", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        let reason = '';
        if (action === 'reject') {
            reason = window.prompt("Enter rejection reason:");
            if (reason === null) return; 
        }

        try {
            const endpoint = `/admin/tasks/submissions/${id}/${action}`;
            const response = await api.put(endpoint, { reason });
            
            if (response.success) {
                addNotification("Success", `Submission ${action}ed successfully`, "success");
                fetchSubmissions();
                setIsModalOpen(false);
            }
        } catch (err) {
            console.error(err);
            addNotification("Error", err.message || "Action Failed", "error");
        }
    };

    const filtered = submissions.filter(sub => {
        const userName = sub.user?.name || '';
        const taskTitle = sub.task?.title || '';
        const matchesSearch = userName.toLowerCase().includes(search.toLowerCase()) || 
                             taskTitle.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'All' || sub.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const openView = (sub) => {
        setSelectedSubmission(sub);
        setIsModalOpen(true);
    };

    return (
        <div className="p-4 animate-in fade-in duration-500">
            <PageHeader title="Task Approvals" subtitle="Verify and approve manual task proofs from users" />

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by user or task name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-lg text-[14px] font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-100 shadow-sm">
                    {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-tight transition-all
                            ${statusFilter === status ? 'bg-[#0F172A] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden mb-6">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/50">
                                <th className="text-left px-4 py-3 text-[10px] font-medium text-slate-400 uppercase tracking-normal">User / Task</th>
                                <th className="text-left px-4 py-3 text-[10px] font-medium text-slate-400 uppercase tracking-normal">Reward</th>
                                <th className="text-left px-4 py-3 text-[10px] font-medium text-slate-400 uppercase tracking-normal">Date</th>
                                <th className="text-left px-4 py-3 text-[10px] font-medium text-slate-400 uppercase tracking-normal">Status</th>
                                <th className="text-center px-4 py-3 text-[10px] font-medium text-slate-400 uppercase tracking-normal">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.length > 0 ? filtered.map(sub => (
                                <tr key={sub._id} className="hover:bg-slate-50/40 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-sky-400 font-medium text-[13px]">
                                                {sub.user?.name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 text-[13px] tracking-tight">{sub.user?.name || 'Unknown User'}</p>
                                                <p className="text-[10px] text-sky-500 font-medium uppercase tracking-tight leading-none mt-0.5">{sub.task?.title || 'Unknown Task'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100/50 inline-flex">
                                            <CheckCircle size={12} /> {sub.coinsReward} Coins
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Calendar size={13} className="text-slate-400" />
                                            <span className="text-[11px] font-medium tabular-nums">{new Date(sub.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={sub.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center">
                                            <button
                                                onClick={() => openView(sub)}
                                                className="w-10 h-10 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-500 rounded-xl flex items-center justify-center transition-all active:scale-95 border border-slate-100 shadow-sm"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                                            <Clock size={48} className="text-slate-300" />
                                            <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">No submissions found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Review Modal */}
            {isModalOpen && selectedSubmission && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm"></div>
                    <div className="relative bg-white w-full max-w-[440px] rounded-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="bg-[#0F172A] p-7 text-white relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-medium tracking-tight mb-1">Proof Review</h3>
                                    <p className="text-[10px] text-sky-400 font-medium uppercase tracking-normal">{selectedSubmission.task?.title}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors text-white/40 hover:text-white">
                                    <XCircle size={22} />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-7">
                            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal mb-0.5">Submitted By</p>
                                    <p className="text-[13px] font-medium text-slate-800">{selectedSubmission.user?.name}</p>
                                    <p className="text-[11px] font-medium text-slate-500">{selectedSubmission.user?.phone}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal mb-0.5">Reward</p>
                                    <p className="text-[15px] font-medium text-amber-600">{selectedSubmission.coinsReward} Coins</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal px-1">Proof Image</p>
                                <div className="aspect-[4/3] bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner">
                                    <img 
                                        src={selectedSubmission.proofImage} 
                                        alt="Proof" 
                                        className="w-full h-full object-contain p-2"
                                    />
                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px]">
                                        <a href={selectedSubmission.proofImage} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-slate-900 shadow-2xl hover:scale-110 active:scale-95 transition-all"><Download size={20} /></a>
                                        <a href={selectedSubmission.proofImage} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-slate-900 shadow-2xl hover:scale-110 active:scale-95 transition-all"><ExternalLink size={20} /></a>
                                    </div>
                                </div>
                            </div>

                            {selectedSubmission.status === 'Pending' ? (
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAction(selectedSubmission._id, 'reject')}
                                        className="flex-1 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white py-4.5 rounded-lg font-medium text-[11px] uppercase tracking-normal transition-all active:scale-95 border border-rose-100"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleAction(selectedSubmission._id, 'approve')}
                                        className="flex-1 bg-sky-500 hover:bg-sky-600 text-white py-4.5 rounded-lg font-medium text-[11px] uppercase tracking-normal transition-all active:scale-95 shadow-xl shadow-sky-200"
                                    >
                                        Approve
                                    </button>
                                </div>
                            ) : (
                                <div className={`p-4 rounded-lg text-center border-2 ${selectedSubmission.status === 'Approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        {selectedSubmission.status === 'Approved' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                        <p className="text-[10px] font-medium uppercase tracking-normal">Record Processed</p>
                                    </div>
                                    <p className="text-[12px] font-medium">This submission was <span className="underline decoration-2 underline-offset-4 uppercase">{selectedSubmission.status}</span></p>
                                    {selectedSubmission.rejectionReason && (
                                        <p className="text-[10px] mt-2 font-medium opacity-70">Reason: {selectedSubmission.rejectionReason}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskApprovals;
