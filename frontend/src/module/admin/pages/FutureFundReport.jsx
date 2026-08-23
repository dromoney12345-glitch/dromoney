import React, { useState, useEffect } from 'react';
import { Loader2, Search, Edit2, RefreshCw } from 'lucide-react';
import api from '../../shared/services/api';

const FutureFundReport = () => {
    const [reportData, setReportData] = useState([]);
    const [reportLoading, setReportLoading] = useState(true);
    const [historyData, setHistoryData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [distributeAmount, setDistributeAmount] = useState('');
    const [distributing, setDistributing] = useState(false);
    
    // Modal state
    const [editingUser, setEditingUser] = useState(null);
    const [newOverrideProfit, setNewOverrideProfit] = useState('');
    const [savingProfit, setSavingProfit] = useState(false);
    
    // Custom Popups State
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', amount: '', users: 0, onConfirm: null });
    const [alertModal, setAlertModal] = useState({ show: false, type: 'success', title: '', message: '' });

    const showAlert = (type, title, message) => {
        setAlertModal({ show: true, type, title, message });
    };

    const fetchReport = async (previewAmount = '') => {
        try {
            setReportLoading(true);
            const q = previewAmount ? `?previewAmount=${encodeURIComponent(previewAmount)}` : '';
            const res = await api.get(`/admin/users/future-fund/report${q}`);
            if (res.success && res.data) {
                setReportData(res.data);
            }
        } catch (err) {
            console.error('Failed to load FF report', err);
        } finally {
            setReportLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/admin/users/future-fund/history');
            if (res.success && res.data) {
                setHistoryData(res.data);
            }
        } catch (err) {
            console.error('Failed to load FF history', err);
        }
    };

    // Fetch report data
    useEffect(() => {
        fetchReport();
        fetchHistory();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => fetchReport(distributeAmount), 400);
        return () => clearTimeout(t);
    }, [distributeAmount]);

    // Distribution logic
    const handleDistribute = async () => {
        if (!distributeAmount || distributeAmount <= 0) {
            return showAlert('error', 'Invalid Amount', 'Please enter a valid pool amount to distribute.');
        }
        if (reportData.length === 0) {
            return showAlert('warning', 'No Users', 'There are no active users to distribute profit to.');
        }

        // Show beautiful confirm modal instead of window.confirm
        setConfirmModal({
            show: true,
            title: 'Confirm Distribution',
            message: `Are you sure you want to distribute ₹${distributeAmount} pool amount among ${reportData.length} users?`,
            amount: distributeAmount,
            users: reportData.length,
            onConfirm: executeDistribution
        });
    };

    const executeDistribution = async () => {
        setConfirmModal({ ...confirmModal, show: false });
        setDistributing(true);
        try {
            const res = await api.post('/admin/users/future-fund/distribute', { amount: Number(distributeAmount) });
            if (res.success) {
                showAlert('success', 'Distribution Complete', res.message);
                setDistributeAmount('');
                fetchReport();
                fetchHistory();
            } else {
                showAlert('error', 'Distribution Failed', res.message || 'Failed to distribute.');
            }
        } catch (err) {
            console.error("Distribution error", err);
            showAlert('error', 'System Error', err.message);
        } finally {
            setDistributing(false);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setNewOverrideProfit(user.overrideProfit !== null && user.overrideProfit !== undefined ? user.overrideProfit.toString() : '');
    };

    const handleSaveOverrideProfit = async () => {
        if (!editingUser) return;
        setSavingProfit(true);
        try {
            const res = await api.put(`/admin/users/${editingUser.id}/future-fund/override`, { profit: newOverrideProfit });
            if (res.success) {
                setReportData(prev => prev.map(u => 
                    u.id === editingUser.id ? { ...u, overrideProfit: res.data } : u
                ));
                setEditingUser(null);
                showAlert('success', 'Profit Override Saved', 'User custom profit has been updated successfully.');
            } else {
                showAlert('error', 'Update Failed', res.message || "Failed to update custom profit.");
            }
        } catch (err) {
            console.error("Save profit error", err);
            showAlert('error', 'Error', err.message);
        } finally {
            setSavingProfit(false);
        }
    };

    const filteredData = reportData.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* Top Area: Title & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Member activity report</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage and distribute profit to active Future Fund users.</p>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                        <input 
                            type="number" 
                            placeholder="Distribute Pool Amount" 
                            value={distributeAmount}
                            onChange={(e) => setDistributeAmount(e.target.value)}
                            className="w-full md:w-56 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <button 
                        onClick={handleDistribute}
                        disabled={distributing}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-md font-medium text-sm transition-all flex items-center gap-2"
                    >
                        {distributing ? <Loader2 size={16} className="animate-spin" /> : 'Send to All Active'}
                    </button>
                </div>
            </div>

            {/* History Table */}
            {historyData.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
                    <div className="p-4 border-b border-slate-100">
                        <h2 className="text-sm font-medium text-slate-800">Past Distributions</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Total Distributed</th>
                                    <th className="px-6 py-3">Users Received</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {historyData.map((h, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 text-slate-700">{new Date(h.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-3 font-semibold text-emerald-600">₹{h.totalAmount.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-slate-600">{h.userCount} users</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Table Container */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-slate-800">Member earnings & activity</h2>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={fetchReport} 
                            disabled={reportLoading}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-50"
                            title="Refresh Data"
                        >
                            <RefreshCw size={16} className={reportLoading ? "animate-spin" : ""} />
                        </button>
                        <div className="relative w-full max-w-xs">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                            <input 
                                type="text" 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                placeholder="Search name or code..." 
                                className="w-full bg-white border border-slate-200 rounded-md pl-9 pr-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {reportLoading ? (
                    <div className="p-16 flex justify-center">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="p-16 text-center text-sm text-slate-500">
                        No active members found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Member</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Tasks</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Ads</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Referrals</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Tier</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Share %</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Est. Profit</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.map((user) => {
                                    const estProfit = Number(user.estimatedProfit || 0);

                                    return (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-900">{user.name}</div>
                                                <div className="text-[11px] text-slate-500 mt-0.5">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-3 text-sm text-slate-700 text-center">{user.breakdown?.tasks || 0}</td>
                                            <td className="px-6 py-3 text-sm text-slate-700 text-center">{user.breakdown?.ads || 0}</td>
                                            <td className="px-6 py-3 text-sm text-slate-700 text-center">{user.referrals || 0}</td>
                                            <td className="px-6 py-3 text-sm text-slate-700 text-center">
                                                {user.breakdown?.isHighTier ? (
                                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">HIGH TIER</span>
                                                ) : (
                                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">LOW TIER</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-sm font-bold text-sky-600 text-center">
                                                {user.sharePercentage.toFixed(1)}%
                                            </td>
                                            <td className="px-6 py-3 text-sm font-medium text-slate-900 text-right">
                                                ₹{estProfit.toFixed(2)}
                                                {user.overrideProfit !== null && user.overrideProfit !== undefined && (
                                                    <div className="text-[10px] text-emerald-600 mt-0.5 font-bold">+ ₹{user.overrideProfit} bonus</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <button 
                                                    onClick={() => handleEdit(user)}
                                                    className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-medium transition-colors"
                                                >
                                                    <Edit2 size={12} />
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-800">Set Extra Bonus</h3>
                            <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Member</label>
                                <div className="text-sm font-medium text-slate-900">{editingUser.name}</div>
                                <div className="text-xs text-slate-500">{editingUser.email}</div>
                            </div>
                            
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Extra Bonus Amount (₹)</label>
                                <input 
                                    type="number" 
                                    step="1"
                                    value={newOverrideProfit}
                                    onChange={(e) => setNewOverrideProfit(e.target.value)}
                                    placeholder="e.g. 200"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                />
                                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                                    Set an extra bonus for this user. This amount will be deducted from the total pool before normal distribution, and added on top of their normal share. Leave blank to remove.
                                </p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button 
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveOverrideProfit}
                                disabled={savingProfit}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-sm"
                            >
                                {savingProfit ? <Loader2 size={16} className="animate-spin" /> : 'Save Profit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">💸</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h3>
                            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                                You are about to distribute <strong className="text-slate-800">₹{confirmModal.amount}</strong> among <strong className="text-slate-800">{confirmModal.users}</strong> users. This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmModal.onConfirm}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-indigo-200"
                                >
                                    Yes, Distribute
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert / Success Toast Modal */}
            {alertModal.show && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-6 text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${alertModal.type === 'success' ? 'bg-emerald-50 text-emerald-500' : alertModal.type === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>
                                {alertModal.type === 'success' ? (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                ) : alertModal.type === 'error' ? (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                ) : (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">{alertModal.title}</h3>
                            <p className="text-sm text-slate-500 mb-6">{alertModal.message}</p>
                            <button 
                                onClick={() => setAlertModal({ ...alertModal, show: false })}
                                className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors"
                            >
                                Okay
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FutureFundReport;
