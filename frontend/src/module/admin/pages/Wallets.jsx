import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, X, Download } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import AdminStatCard from '../components/AdminStatCard';
import { Wallet, IndianRupee, Clock, AlertCircle, User, Building2, CreditCard, Calendar, Hash } from 'lucide-react';
import api from '../../shared/services/api';

const Wallets = () => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });

    // Toast
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Balance Modal
    const [selectedUser, setSelectedUser] = useState(null);
    const [showBalanceModal, setShowBalanceModal] = useState(false);

    // Detail Modal
    const [selectedDetail, setSelectedDetail] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Confirm action modal
    const [confirmAction, setConfirmAction] = useState(null); // { id, status, name, amount }

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const fetchWithdrawals = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/withdrawals');
            if (response.success) {
                const data = response.data.map(w => ({
                    id: w._id,
                    user: w.user?.name || 'Unknown',
                    walletBalance: w.user?.wallet?.balance || 0,
                    rawAmount: w.amount,
                    amount: `₹${w.amount}`,
                    method: w.paymentMethod || w.method || 'UPI',
                    upiId: w.upiId,
                    bankDetails: w.bankDetails,
                    date: new Date(w.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    time: new Date(w.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    status: w.status
                }));
                setList(data);
                if (response.stats) {
                    setStats(response.stats);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, status, isBulk = false, ids = []) => {
        setLoading(true);
        try {
            if (isBulk) {
                const response = await api.post('/admin/withdrawals/bulk-approve', { withdrawalIds: ids });
                if (response.success) {
                    showToast(response.message || `Bulk approval complete!`, 'success');
                }
            } else {
                const response = await api.put(`/admin/withdrawals/${id}`, { status });
                if (response.success) {
                    showToast(`Withdrawal ${status} successfully!`, 'success');
                }
            }
        } catch (err) {
            showToast(err.message || 'Something went wrong', 'error');
        } finally {
            setConfirmAction(null);
            setShowDetailModal(false);
            setLoading(false);
            fetchWithdrawals();
        }
    };

    const handleExportCSV = async () => {
        setLoading(true);
        try {
            const blob = await api.get('/admin/withdrawals/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'pending_withdrawals.csv');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            showToast('CSV downloaded successfully!', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to download CSV', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkApprove = () => {
        const pendingIds = list.filter(w => w.status === 'Pending').map(w => w.id);
        if (pendingIds.length === 0) {
            showToast('No pending withdrawals to approve', 'error');
            return;
        }

        setConfirmAction({
            isBulk: true,
            ids: pendingIds,
            status: 'Approved',
            name: `${pendingIds.length} Requests`,
            amount: 'Bulk Processing'
        });
    };

    const openDetail = (w) => {
        setSelectedDetail(w);
        setShowDetailModal(true);
    };

    const openBalance = (w) => {
        setSelectedUser(w);
        setShowBalanceModal(true);
    };

    const statusColor = (s) => {
        if (s === 'Approved') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (s === 'Rejected') return 'text-rose-600 bg-rose-50 border-rose-200';
        return 'text-amber-600 bg-amber-50 border-amber-200';
    };

    return (
        <div className="p-4 animate-in fade-in duration-500 relative font-['Poppins']">

            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${
                    toast.type === 'success'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                    {toast.type === 'success'
                        ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    }
                    <span className="text-xs">{toast.message}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <PageHeader title="Wallet & Withdrawals" subtitle="Review and process withdrawal requests" />
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        disabled={loading}
                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-medium rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                        <Download size={14} /> Download CSV
                    </button>
                    <button
                        onClick={handleBulkApprove}
                        disabled={loading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-medium rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                    >
                        <CheckCircle size={14} /> Mark All As Paid
                    </button>
                </div>
            </div>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <AdminStatCard label="Total Value"  value={`₹${stats.total}`}    change={`${list.length} requests`} icon={Wallet}       color="bg-slate-700"   />
                <AdminStatCard label="Approved"     value={`₹${stats.approved}`} change="Success"                  icon={IndianRupee}   color="bg-emerald-500" />
                <AdminStatCard label="Pending"      value={`₹${stats.pending}`}  change="Awaiting"                 icon={Clock}         color="bg-amber-500"   />
                <AdminStatCard label="Rejected"     value={`₹${stats.rejected}`} change="Declined"                 icon={AlertCircle}   color="bg-rose-500"    />
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                {['ID', 'User', 'Amount', 'Method', 'Date', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-[10px] text-slate-400 uppercase tracking-normal">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="7" className="py-16 text-center text-[11px] text-slate-400 uppercase tracking-normal">Loading...</td></tr>
                            ) : list.length === 0 ? (
                                <tr><td colSpan="7" className="py-16 text-center text-[11px] text-slate-400 uppercase tracking-normal">No withdrawal requests found</td></tr>
                            ) : list.map(w => (
                                <tr key={w.id} className="hover:bg-slate-50/40 transition-colors">
                                    <td className="px-5 py-4 text-[11px] text-sky-600 font-mono">{w.id.slice(-8).toUpperCase()}</td>
                                    <td className="px-5 py-4 text-slate-800 text-[13px]">{w.user}</td>
                                    <td className="px-5 py-4 text-slate-900 text-[13px]">{w.amount}</td>
                                    <td className="px-5 py-4">
                                        <p className="text-[12px] text-slate-600">{w.method}</p>
                                        {w.method === 'UPI' ? (
                                            <p className="text-[10px] text-slate-400">{w.bankDetails?.upiId || 'N/A'}</p>
                                        ) : w.bankDetails ? (
                                            <div className="text-[10px] text-slate-400 mt-0.5 space-y-0.5">
                                                <p>A/C: {w.bankDetails.accountNumber}</p>
                                                <p>IFSC: {w.bankDetails.ifscCode}</p>
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-slate-400">N/A</p>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-[12px] text-slate-400">{w.date}</td>
                                    <td className="px-5 py-4"><StatusBadge status={w.status} /></td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            {/* Wallet Balance */}
                                            <button
                                                onClick={() => openBalance(w)}
                                                title="View wallet balance"
                                                className="w-7 h-7 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-500 rounded-lg flex items-center justify-center transition-all border border-amber-100 cursor-pointer"
                                            >
                                                <Wallet size={13} />
                                            </button>

                                            {/* View Details */}
                                            <button
                                                onClick={() => openDetail(w)}
                                                title="View details"
                                                className="w-7 h-7 bg-sky-50 hover:bg-sky-500 hover:text-white text-sky-500 rounded-lg flex items-center justify-center transition-all border border-sky-100 cursor-pointer"
                                            >
                                                <Eye size={13} />
                                            </button>

                                            {/* Approve — only for Pending */}
                                            {w.status === 'Pending' && (
                                                <>
                                                    <button
                                                        onClick={() => setConfirmAction({ id: w.id, status: 'Approved', name: w.user, amount: w.amount })}
                                                        title="Approve"
                                                        className="w-7 h-7 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-500 rounded-lg flex items-center justify-center transition-all border border-emerald-100 cursor-pointer"
                                                    >
                                                        <CheckCircle size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmAction({ id: w.id, status: 'Rejected', name: w.user, amount: w.amount })}
                                                        title="Reject"
                                                        className="w-7 h-7 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-lg flex items-center justify-center transition-all border border-rose-100 cursor-pointer"
                                                    >
                                                        <XCircle size={13} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── CONFIRM ACTION MODAL ── */}
            {confirmAction && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg w-full max-w-sm p-4 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${confirmAction.status === 'Approved' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            {confirmAction.status === 'Approved'
                                ? <CheckCircle size={24} className="text-emerald-500" />
                                : <XCircle size={24} className="text-rose-500" />
                            }
                        </div>
                        <h3 className="text-center text-[15px] text-slate-800 mb-1">
                            {confirmAction.status === 'Approved' ? 'Approve Withdrawal?' : 'Reject Withdrawal?'}
                        </h3>
                        <p className="text-center text-[11px] text-slate-400 mb-5">
                            {confirmAction.name} — {confirmAction.amount}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAction(confirmAction.id, confirmAction.status, confirmAction.isBulk, confirmAction.ids)}
                                className={`flex-1 py-2.5 rounded-xl text-[11px] text-white transition-all cursor-pointer ${
                                    confirmAction.status === 'Approved'
                                        ? 'bg-emerald-500 hover:bg-emerald-600'
                                        : 'bg-rose-500 hover:bg-rose-600'
                                }`}
                            >
                                Confirm {confirmAction.status}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DETAIL MODAL ── */}
            {showDetailModal && selectedDetail && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        {/* Header */}
                        <div className="bg-slate-900 px-4 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-white text-[14px]">Withdrawal Details</h3>
                                <p className="text-slate-400 text-[10px] uppercase tracking-normal mt-0.5">ID: {selectedDetail.id.slice(-8).toUpperCase()}</p>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-all cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 space-y-4">
                            {/* Status badge */}
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 uppercase tracking-normal">Status</span>
                                <span className={`text-[11px] px-3 py-1 rounded-full border ${statusColor(selectedDetail.status)}`}>
                                    {selectedDetail.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[9px] text-slate-400 uppercase tracking-normal mb-1 flex items-center gap-1"><User size={9} /> User</p>
                                    <p className="text-[13px] text-slate-800">{selectedDetail.user}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[9px] text-slate-400 uppercase tracking-normal mb-1 flex items-center gap-1"><IndianRupee size={9} /> Amount</p>
                                    <p className="text-[13px] text-emerald-600">{selectedDetail.amount}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[9px] text-slate-400 uppercase tracking-normal mb-1 flex items-center gap-1"><Calendar size={9} /> Date</p>
                                    <p className="text-[12px] text-slate-700">{selectedDetail.date}</p>
                                    <p className="text-[10px] text-slate-400">{selectedDetail.time}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[9px] text-slate-400 uppercase tracking-normal mb-1 flex items-center gap-1"><CreditCard size={9} /> Method</p>
                                    <p className="text-[12px] text-slate-700">{selectedDetail.method}</p>
                                </div>
                            </div>

                            {/* Bank Details */}
                            {selectedDetail.method === 'Bank Transfer' && selectedDetail.bankDetails && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                                    <p className="text-[9px] text-slate-400 uppercase tracking-normal flex items-center gap-1 mb-2"><Building2 size={9} /> Bank Details</p>
                                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                                        <div><span className="text-slate-400">Holder:</span> <span className="text-slate-700">{selectedDetail.bankDetails.holderName}</span></div>
                                        <div><span className="text-slate-400">Bank:</span> <span className="text-slate-700">{selectedDetail.bankDetails.bankName}</span></div>
                                        <div><span className="text-slate-400">A/C:</span> <span className="text-slate-700 font-mono">{selectedDetail.bankDetails.accountNumber}</span></div>
                                        <div><span className="text-slate-400">IFSC:</span> <span className="text-slate-700 font-mono">{selectedDetail.bankDetails.ifscCode}</span></div>
                                    </div>
                                </div>
                            )}
                            {selectedDetail.method === 'UPI' && selectedDetail.bankDetails?.upiId && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <p className="text-[9px] text-slate-400 uppercase tracking-normal mb-1">UPI ID</p>
                                    <p className="text-[12px] text-slate-700 font-mono">{selectedDetail.bankDetails.upiId}</p>
                                </div>
                            )}

                            {/* Action buttons inside detail modal for Pending */}
                            {selectedDetail.status === 'Pending' && (
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setConfirmAction({ id: selectedDetail.id, status: 'Approved', name: selectedDetail.user, amount: selectedDetail.amount })}
                                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] uppercase tracking-normal flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        <CheckCircle size={14} /> Approve
                                    </button>
                                    <button
                                        onClick={() => setConfirmAction({ id: selectedDetail.id, status: 'Rejected', name: selectedDetail.user, amount: selectedDetail.amount })}
                                        className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] uppercase tracking-normal flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        <XCircle size={14} /> Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── WALLET BALANCE MODAL ── */}
            {showBalanceModal && selectedUser && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg w-full max-w-sm p-4 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[14px] text-slate-800">Wallet Balance</h3>
                            <button onClick={() => setShowBalanceModal(false)} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 transition-all cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center mb-4">
                            <p className="text-[10px] text-amber-600 uppercase tracking-normal mb-1">{selectedUser.user}'s Balance</p>
                            <p className="text-3xl text-slate-900">₹{selectedUser.walletBalance?.toLocaleString()}</p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between mb-5">
                            <span className="text-[11px] text-slate-500">This Withdrawal</span>
                            <span className="text-[13px] text-rose-500">{selectedUser.amount}</span>
                        </div>

                        <button
                            onClick={() => setShowBalanceModal(false)}
                            className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-[11px] uppercase tracking-normal transition-all cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Wallets;
