import React, { useState, useEffect } from 'react';
import { Search, Eye, XCircle, User, Calendar, ShieldCheck, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api from '../../shared/services/api';
import { useAdmin } from '../context/AdminContext';

const KYC = () => {
    const { addNotification } = useAdmin();
    const [kycRequests, setKycRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [selectedKyc, setSelectedKyc] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchKycRequests();
    }, [search, statusFilter]);

    const fetchKycRequests = async () => {
        setLoading(true);
        try {
            const endpoint = statusFilter === 'Pending' ? '/admin/kyc/pending' : `/admin/users?search=${search}&status=${statusFilter === 'All' ? '' : statusFilter}`;
            const response = await api.get(endpoint);
            
            if (response.success) {
                const kycUsers = response.data
                    .filter(u => u.kyc && u.kyc.status !== 'Not Started')
                    .map(u => ({
                        id: u._id,
                        name: u.name,
                        mobile: u.phone,
                        aadharNumber: u.kyc.documentNumber || 'N/A',
                        timestamp: new Date(u.updatedAt || u.createdAt || Date.now()).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        }),
                        status: u.kyc.status,
                        aadharImage: u.kyc.documentImage,
                        reason: u.kyc.rejectionReason
                    }));
                setKycRequests(kycUsers);
            }
        } catch (err) {
            console.error("KYC Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, newStatus) => {
        let reason = '';
        if (newStatus === 'Rejected') {
            reason = window.prompt("Enter rejection reason (e.g., Image not clear):");
            if (reason === null) return; // Cancel
        }

        try {
            const response = await api.put(`/admin/users/${id}/kyc`, { 
                status: newStatus,
                rejectionReason: reason
            });
            if (response.success) {
                addNotification("Success", `KYC ${newStatus} Successfully`, "success");
                fetchKycRequests();
                setIsModalOpen(false);
            }
        } catch (err) {
            console.error(err);
            addNotification("Error", err.response?.data?.message || "Action Failed", "error");
        }
    };

    const filtered = kycRequests.filter(req => {
        const matchesSearch = req.name.toLowerCase().includes(search.toLowerCase()) || req.mobile.includes(search);
        const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

    const openView = (kyc) => {
        setSelectedKyc(kyc);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 animate-in fade-in duration-500">
            <PageHeader title="KYC Verification" subtitle="Manage and verify user identity documents" />

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name or mobile..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-[14px] font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                    {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                        <button
                            key={status}
                            onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-tight transition-all
                            ${statusFilter === status ? 'bg-[#0F172A] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Simplified Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/50">
                                <th className="text-left px-4 py-3 text-[10px] font-medium text-slate-400 uppercase tracking-normal">User Profile</th>
                                <th className="text-left px-4 py-3 text-[10px] font-medium text-slate-400 uppercase tracking-normal">Submission Date</th>
                                <th className="text-left px-4 py-3 text-[10px] font-medium text-slate-400 uppercase tracking-normal">Current Status</th>
                                <th className="text-center px-4 py-3 text-[10px] font-medium text-slate-400 uppercase tracking-normal">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {currentItems.length > 0 ? currentItems.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50/40 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-sky-400 font-medium text-[13px] shadow-sm transform group-hover:scale-105 transition-transform">
                                                {req.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 text-[13px] tracking-tight">{req.name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium tracking-tight">{req.mobile}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Calendar size={13} className="text-sky-500 opacity-60" />
                                            <span className="text-[12px] font-medium tabular-nums">{req.timestamp}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={req.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center">
                                            <button
                                                onClick={() => openView(req)}
                                                title="Review KYC"
                                                className="w-10 h-10 bg-sky-50 hover:bg-sky-500 hover:text-white text-sky-500 rounded-xl flex items-center justify-center transition-all active:scale-95 border border-sky-100/50 shadow-sm"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                                            <ImageIcon size={48} />
                                            <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">No verification requests found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-normal order-2 sm:order-1">
                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filtered.length)} of {filtered.length} entries
                    </div>
                    <div className="flex items-center gap-2 order-1 sm:order-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-medium uppercase text-slate-500 hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-all"
                        >
                            Prev
                        </button>
                        <div className="flex items-center gap-1.5">
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 rounded-xl text-[10px] font-medium flex items-center justify-center transition-all shadow-sm ${currentPage === i + 1 ? 'bg-sky-500 text-white border-sky-400' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-medium uppercase text-slate-500 hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Improved KYC Review Modal ── */}
            {isModalOpen && selectedKyc && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm"></div>
                    <div className="relative bg-white w-full max-w-[440px] rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                        {/* Modal Header */}
                        <div className="bg-[#0F172A] p-7 text-white relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-medium tracking-tight mb-1">KYC Review</h3>
                                    <p className="text-[10px] text-sky-400 font-medium uppercase tracking-normal">{selectedKyc.name}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors text-white/40 hover:text-white">
                                    <XCircle size={22} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-7">
                            {/* Aadhar Content Only */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={14} className="text-sky-500" />
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal leading-none">Aadhar Card Verification</p>
                                    </div>
                                    <span className="text-[13px] font-medium text-slate-800 tracking-[0.1em] tabular-nums">{selectedKyc.aadharNumber}</span>
                                </div>

                                {/* Premium Photo Preview */}
                                <div className="aspect-[1.5/1] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner">
                                    {selectedKyc.aadharImage ? (
                                        <img 
                                            src={selectedKyc.aadharImage} 
                                            alt="Aadhar Card" 
                                            className="w-full h-full object-contain p-2"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <ImageIcon size={40} className="text-slate-300" />
                                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.15em]">No Image Available</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px]">
                                        <a href={selectedKyc.aadharImage} download target="_blank" rel="noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-2xl hover:scale-110 active:scale-95 transition-all"><Download size={20} /></a>
                                        <a href={selectedKyc.aadharImage} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-2xl hover:scale-110 active:scale-95 transition-all"><ExternalLink size={20} /></a>
                                    </div>
                                </div>
                            </div>

                            {/* Verification Actions: Inline buttons */}
                            {selectedKyc.status === 'Pending' ? (
                                <div className="flex gap-4 pt-2">
                                    <button
                                        onClick={() => handleAction(selectedKyc.id, 'Rejected')}
                                        className="flex-1 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white py-4.5 rounded-[20px] font-medium text-[11px] uppercase tracking-normal transition-all active:scale-95 shadow-lg shadow-rose-100/50"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleAction(selectedKyc.id, 'Approved')}
                                        className="flex-1 bg-sky-500 hover:bg-sky-600 text-white py-4.5 rounded-[20px] font-medium text-[11px] uppercase tracking-normal transition-all active:scale-95 shadow-xl shadow-sky-200"
                                    >
                                        Approve
                                    </button>
                                </div>
                            ) : (
                                <div className={`p-5 rounded-[24px] text-center border-2 ${selectedKyc.status === 'Approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                    <p className="text-[10px] font-medium uppercase tracking-normal mb-1">Verification Record</p>
                                    <p className="text-[12px] font-medium">This submission was verified as <span className="underline decoration-2 underline-offset-4">{selectedKyc.status}</span></p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KYC;
