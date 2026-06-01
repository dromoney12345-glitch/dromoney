import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, IndianRupee, Clock, CheckSquare, XSquare, Search, XCircle as XClose, Download, ExternalLink, Calendar, CreditCard, User, Mail, Image as ImageIcon } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import AdminStatCard from '../components/AdminStatCard';
import api from '../../shared/services/api';

const Payments = () => {
    const [paymentsList, setPaymentsList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Toast state
    const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'error' }

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/payments');
            if (response.success) {
                const mapped = response.data.map(p => ({
                    id: p._id,
                    user: p.user?.name || 'Deleted User',
                    email: p.user?.email || 'N/A',
                    phone: p.user?.phone || 'N/A',
                    plan: p.plan || 'Lifetime Access',
                    amount: `₹${parseFloat(p.amount).toFixed(2)}`,
                    method: p.method || 'Razorpay',
                    date: new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                    status: p.status,
                    utr: p.razorpayPaymentId || p.utrNumber || 'N/A',
                    screenshot: p.screenshot
                }));
                setPaymentsList(mapped);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            const response = await api.put(`/admin/payments/${id}`, { status: newStatus });
            if (response.success) {
                showToast(`Payment activation ${newStatus.toLowerCase()} successfully!`, 'success');
                fetchPayments();
                setIsModalOpen(false);
            }
        } catch (err) {
            showToast(err.message || "Something went wrong", 'error');
        }
    };

    const tabs = ['All', 'Success', 'Pending', 'Failed'];

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setCurrentPage(1);
    };

    const filtered = paymentsList.filter(p => {
        const matchesSearch = p.user.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || p.utr?.includes(search);
        const matchesStatus = filter === 'All' || p.status === filter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

    const openView = (payment) => {
        setSelectedPayment(payment);
        setIsModalOpen(true);
    };

    // Derived Stats
    const totalCollected = paymentsList.filter(p => p.status === 'Success').reduce((acc, curr) => acc + Number(curr.amount.replace('₹', '')), 0);
    const pendingCount = paymentsList.filter(p => p.status === 'Pending').length;
    const successCount = paymentsList.filter(p => p.status === 'Success').length;
    const failedCount = paymentsList.filter(p => p.status === 'Failed').length;

    return (
        <div className="p-6 animate-in fade-in duration-500 relative font-['Poppins']">
            {toast && (
                <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${
                    toast.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                    {toast.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 animate-bounce" />
                    ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span className="text-xs font-medium font-['Poppins']">{toast.message}</span>
                </div>
            )}
            <PageHeader title="Payments Tracking" subtitle="Manage account activation fees and verification" />

            {/* Stat Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <AdminStatCard label="Total Revenue" value={`₹${totalCollected.toFixed(2)}`} change={`${successCount} Successful`} icon={IndianRupee} color="bg-emerald-500" />
                <AdminStatCard label="Pending Approval" value={pendingCount} change="Review UTRs" icon={Clock} color="bg-amber-500" />
                <AdminStatCard label="Active Users" value={successCount} change="Verified access" icon={CheckSquare} color="bg-sky-500" />
                <AdminStatCard label="Declined" value={failedCount} change="Payment issues" icon={XSquare} color="bg-rose-500" />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, ID or UTR number..."
                        value={search}
                        onChange={handleSearch}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-[14px] font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm transition-all font-['Poppins']"
                    />
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                    {tabs.map(t => (
                        <button key={t} onClick={() => { setFilter(t); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-tight transition-all font-['Poppins'] ${filter === t ? 'bg-[#0F172A] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6 min-h-[400px]">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/50">
                                <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">Transaction ID</th>
                                <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">User Profile</th>
                                <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">Amount</th>
                                <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">Method</th>
                                <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">UTR Number</th>
                                <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">Status</th>
                                <th className="text-center px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {currentItems.length > 0 ? currentItems.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/40 transition-colors group">
                                    <td className="px-5 py-4 font-medium text-sky-600 text-[12px] tabular-nums tracking-tight font-['Poppins']">#{p.id}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-sky-400 font-semibold text-[11px] font-['Poppins']">
                                                {p.user.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 text-[13px] leading-none tracking-tight font-['Poppins']">{p.user}</p>
                                                <p className="text-[10px] text-slate-400 mt-1 font-medium font-['Poppins']">{p.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 font-semibold text-slate-900 text-[13px] tabular-nums font-['Poppins']">{p.amount}</td>
                                    <td className="px-5 py-4 text-[12px] font-medium text-slate-500 uppercase tracking-tighter font-['Poppins']">{p.method}</td>
                                    <td className="px-5 py-4 text-[12px] font-medium text-slate-800 tabular-nums font-['Poppins']">{p.utr}</td>
                                    <td className="px-5 py-4 border-none"><StatusBadge status={p.status} /></td>
                                    <td className="px-5 py-4">
                                        <div className="flex gap-2 items-center justify-center">
                                            <button onClick={() => openView(p)} className="w-8 h-8 bg-sky-50 hover:bg-sky-500 hover:text-white text-sky-500 rounded-xl flex items-center justify-center transition-all border border-sky-100/50 shadow-sm active:scale-95"><Eye size={14} /></button>
                                            {p.status === 'Pending' && (
                                                <>
                                                    <button onClick={() => handleStatusUpdate(p.id, 'Success')} className="w-8 h-8 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-500 rounded-xl flex items-center justify-center transition-all border border-emerald-100/50 shadow-sm active:scale-95"><CheckCircle size={14} /></button>
                                                    <button onClick={() => handleStatusUpdate(p.id, 'Failed')} className="w-8 h-8 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl flex items-center justify-center transition-all border border-rose-100/50 shadow-sm active:scale-95"><XCircle size={14} /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                                            <CreditCard size={48} className="text-slate-300" />
                                            <p className="text-[11px] font-semibold uppercase tracking-normal text-slate-500 font-['Poppins']">No payment records found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-normal order-2 sm:order-1 outline-none font-['Poppins']">
                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filtered.length)} of {filtered.length} entries
                    </div>
                    <div className="flex items-center gap-2 order-1 sm:order-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-semibold uppercase text-slate-500 hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-all font-['Poppins']"
                        >
                            Prev
                        </button>
                        <div className="flex items-center gap-1.5">
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 rounded-xl text-[10px] font-semibold flex items-center justify-center transition-all shadow-sm font-['Poppins'] ${currentPage === i + 1 ? 'bg-[#0F172A] text-white' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-semibold uppercase text-slate-500 hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-all font-['Poppins']"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Payment Details View Modal ── */}
            {isModalOpen && selectedPayment && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm"></div>
                    <div className="relative bg-white w-full max-w-[420px] rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="bg-[#0F172A] p-7 text-white relative">
                            <h3 className="text-xl font-semibold tracking-tight mb-1 font-['Poppins']">Payment Verification</h3>
                            <p className="text-[10px] text-sky-400 font-medium uppercase tracking-normal font-['Poppins']">TXN ID: #{selectedPayment.id}</p>
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-7 right-7 w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors text-white/40 hover:text-white">
                                <XClose size={22} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* User & Amount Info */}
                            <div className="flex items-center justify-between bg-slate-50 p-5 rounded-[24px] border border-slate-100 shadow-inner">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-sky-400 font-semibold font-['Poppins']">
                                        {selectedPayment.user.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-semibold text-slate-800 leading-none font-['Poppins']">{selectedPayment.user}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-medium font-['Poppins']">{selectedPayment.method}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-semibold text-slate-900 leading-none font-['Poppins']">{selectedPayment.amount}</p>
                                    <p className="text-[9px] text-emerald-500 font-medium uppercase mt-1 tracking-normal font-['Poppins']">Entry Fee</p>
                                </div>
                            </div>

                            {/* UTR & ScreenShot Mockup */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal font-['Poppins']">UTR Number</p>
                                    <p className="text-[13px] font-semibold text-slate-800 tracking-tight font-mono font-['Poppins']">{selectedPayment.utr}</p>
                                </div>

                                <div className="aspect-[1.5/1] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner">
                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px]">
                                        <button className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-2xl hover:scale-110 active:scale-95 transition-all"><Download size={20} /></button>
                                        <button className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-2xl hover:scale-110 active:scale-95 transition-all"><ExternalLink size={20} /></button>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <ImageIcon size={40} className="text-slate-300" />
                                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.15em] font-['Poppins']">Payment Screenshot</p>
                                    </div>
                                </div>
                            </div>

                            {/* Date info */}
                            <div className="flex items-center gap-2 px-1">
                                <Calendar size={14} className="text-slate-300" />
                                <p className="text-[11px] font-medium text-slate-400 font-['Poppins']">Transaction initiated on {selectedPayment.date}</p>
                            </div>

                            {/* Actions */}
                            {selectedPayment.status === 'Pending' ? (
                                <div className="flex gap-4 pt-2">
                                    <button
                                        onClick={() => handleStatusUpdate(selectedPayment.id, 'Failed')}
                                        className="flex-1 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white py-4.5 rounded-[20px] font-semibold text-[11px] uppercase tracking-normal transition-all active:scale-95 shadow-lg shadow-rose-100/50 font-['Poppins']"
                                    >
                                        Decline
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(selectedPayment.id, 'Success')}
                                        className="flex-1 bg-sky-500 hover:bg-sky-600 text-white py-4.5 rounded-[20px] font-semibold text-[11px] uppercase tracking-normal transition-all active:scale-95 shadow-xl shadow-sky-200 font-['Poppins']"
                                    >
                                        Verify & Activate
                                    </button>
                                </div>
                            ) : (
                                <div className={`p-5 rounded-[24px] text-center border-2 font-['Poppins'] ${selectedPayment.status === 'Success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                    <p className="text-[10px] font-medium uppercase tracking-normal mb-1">Audit Record</p>
                                    <p className="text-[12px] font-medium tracking-tight">Status: <span className="underline decoration-2 underline-offset-4">{selectedPayment.status}</span></p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payments;
