import React, { useState, useEffect } from 'react';
import { Search, Eye, Ban, Edit2, CheckCircle, XCircle, User, Mail, Phone, Wallet, Users as UsersIcon, Calendar, ArrowRight, TrendingUp, Save, Trash2, ShieldAlert, FileText, Camera, Check, AlertCircle, Loader2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api from '../../shared/services/api';

const Users = () => {
    // ── Data & States ──
    const [userList, setUserList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    
    // View Drawer State
    const [selectedUser, setSelectedUser] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Edit Modal State
    const [editingUser, setEditingUser] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // KYC Approval State
    const [kycActionLoading, setKycActionLoading] = useState(false);

    // ── Logic ──
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/users');
            if (response.success) {
                // Map backend user to UI format
                const mappedUsers = response.data.map(u => ({
                    id: u._id,
                    name: u.name,
                    email: u.email,
                    mobile: u.phone || 'N/A',
                    referrals: u.referralCount || 0,
                    earnings: `₹${parseFloat(u.wallet?.lifetimeEarnings || 0).toFixed(2)}`,
                    wallet: `₹${parseFloat(u.wallet?.balance || 0).toFixed(2)}`,
                    status: u.isBlocked ? 'Blocked' : 'Active',
                    joined: new Date(u.createdAt).toLocaleDateString(),
                    kyc: u.kyc || { status: 'Not Started' },
                    isBlocked: u.isBlocked || false
                }));
                
                setUserList(mappedUsers);
            }
        } catch (err) {
            console.error("Fetch Users Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setCurrentPage(1);
    };

    const toggleStatus = async (id) => {
        try {
            const response = await api.put(`/admin/users/${id}/block`);
            if (response.success) {
                // Refresh the user list to show updated status
                fetchUsers();
            }
        } catch (err) {
            console.error("Toggle Status Error:", err);
        }
    };

    const handleManageKyc = async (id, status) => {
        let rejectionReason = '';
        if (status === 'Rejected') {
            rejectionReason = window.prompt("Enter rejection reason:");
            if (!rejectionReason) return;
        }

        setKycActionLoading(true);
        try {
            const response = await api.put(`/admin/users/${id}/kyc`, { status, rejectionReason });
            if (response.success) {
                fetchUsers();
                // Close drawer or update locally
                setIsDrawerOpen(false);
            }
        } catch (err) {
            console.error("KYC Manage Error:", err);
            alert("Failed to update KYC status");
        } finally {
            setKycActionLoading(false);
        }
    };

    const handleDeleteUser = async (id, name) => {
        if (window.confirm(`Are you sure you want to permanently delete user "${name}" and all their associated data? This action cannot be undone.`)) {
            try {
                const response = await api.delete(`/admin/users/${id}`);
                if (response.success) {
                    fetchUsers(); // Refresh list
                }
            } catch (err) {
                console.error("Delete User Error:", err);
                alert(`Failed to delete user: ${err.message || "Please try again."}`);
            }
        }
    };

    const [editError, setEditError] = useState('');

    const handleSaveEdit = (e) => {
        e.preventDefault();
        setEditError('');

        // Strict email validation
        const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
        const emailParts = (editingUser?.email || '').split('@');
        const localPart = emailParts[0]?.toLowerCase();
        const domainWithoutTld = emailParts[1]?.split('.')[0]?.toLowerCase();

        if (!emailRegex.test(editingUser?.email || '')) {
            setEditError('Please enter a valid email address (e.g. name@gmail.com)');
            return;
        }
        if (localPart && domainWithoutTld && localPart === domainWithoutTld) {
            setEditError('Please use a real email address (e.g. name@gmail.com)');
            return;
        }

        // Implement backend edit if needed
        setIsEditModalOpen(false);
    };

    // Apply filtering based on status and search
    const filtered = userList.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) || 
                            user.email.toLowerCase().includes(search.toLowerCase()) || 
                            user.mobile.includes(search);
        
        let matchesStatus = true;
        if (statusFilter === 'Active') {
            matchesStatus = !user.isBlocked;
        } else if (statusFilter === 'Blocked') {
            matchesStatus = user.isBlocked;
        }
        // For 'All', matchesStatus remains true
        
        return matchesSearch && matchesStatus;
    }); 

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

    const activeUserInDrawer = userList.find(u => u.id === selectedUser?.id);

    const openDetails = (user) => {
        setSelectedUser(user);
        setIsDrawerOpen(true);
    };

    const openEdit = (user) => {
        setEditingUser({ ...user });
        setIsEditModalOpen(true);
    };

    return (
        <div className="p-4 animate-in fade-in duration-500 relative font-['Poppins']">
            <PageHeader title="User Management" subtitle="View and manage all registered users" />

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by name or mobile..."
                        value={search}
                        onChange={handleSearch}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-lg text-[14px] font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm font-['Poppins']"
                    />
                </div>
                
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-100 shadow-sm">
                    {['All', 'Active', 'Blocked'].map(status => (
                        <button
                            key={status}
                            onClick={() => { 
                                setStatusFilter(status); 
                                setCurrentPage(1);
                            }}
                            className={`px-5 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-tight transition-all font-['Poppins']
                            ${statusFilter === status ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden mb-6 font-['Poppins']">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/50">
                                <th className="text-left px-5 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">User</th>
                                <th className="text-left px-5 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">Mobile</th>
                                <th className="text-center px-5 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">KYC Status</th>
                                <th className="text-left px-5 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">Earnings</th>
                                <th className="text-left px-5 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">Wallet</th>
                                <th className="text-left px-5 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">Status</th>
                                <th className="text-left px-5 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-normal text-center font-['Poppins']">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {currentItems.length > 0 ? currentItems.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/40 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-xl flex items-center justify-center text-white font-semibold text-[13px] shrink-0 shadow-sm font-['Poppins']">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 leading-none text-[13px] tracking-tight font-['Poppins']">{user.name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium mt-1 tracking-tight font-['Poppins']">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-[13px] font-medium text-slate-600 tabular-nums font-['Poppins']">{user.mobile}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <StatusBadge status={user.kyc.status} />
                                            {(user.kyc.status === 'Pending' || user.kyc.status === 'pending') && (
                                                <span className="text-[8px] font-semibold text-amber-500 uppercase tracking-tighter font-['Poppins']">Requires Review</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-[13px] font-semibold text-emerald-600 font-['Poppins']">{user.earnings}</td>
                                    <td className="px-5 py-4 text-[13px] font-semibold text-slate-800 font-['Poppins']">{user.wallet}</td>
                                    <td className="px-5 py-4"><StatusBadge status={user.status} /></td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => openDetails(user)} title="View Detail" className="w-8 h-8 bg-sky-50 hover:bg-sky-500 hover:text-white text-sky-500 rounded-xl flex items-center justify-center transition-all active:scale-90 border border-sky-100/50 relative">
                                                <Eye size={14} />
                                                {(user.kyc.status === 'Pending' || user.kyc.status === 'pending') && (
                                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 border-2 border-white rounded-full animate-pulse"></span>
                                                )}
                                            </button>
                                            <button onClick={() => openEdit(user)} title="Edit User" className="w-8 h-8 bg-slate-50 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl flex items-center justify-center transition-all active:scale-90 border border-slate-100/50">
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => toggleStatus(user.id)}
                                                title={user.status === 'Active' ? 'Block' : 'Unblock'} 
                                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 border shadow-sm
                                                ${user.status === 'Active' ? 'bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 border-rose-100' : 'bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-500 border-emerald-100'}`}
                                            >
                                                {user.status === 'Active' ? <Ban size={14} /> : <CheckCircle size={14} />}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(user.id, user.name)}
                                                title="Delete User" 
                                                className="w-8 h-8 bg-slate-50 hover:bg-rose-600 hover:text-white text-slate-400 rounded-xl flex items-center justify-center transition-all active:scale-90 border border-slate-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center text-slate-400 uppercase font-semibold text-[10px] font-['Poppins']">No users found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 font-['Poppins']">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-normal order-2 sm:order-1">
                        Showing {filtered.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filtered.length)} of {filtered.length} entries
                    </div>
                    <div className="flex items-center gap-2 order-1 sm:order-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-semibold uppercase text-slate-500 hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-all"
                        >
                            Prev
                        </button>
                        <div className="flex items-center gap-1.5">
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 rounded-xl text-[10px] font-semibold flex items-center justify-center transition-all shadow-sm ${currentPage === i + 1 ? 'bg-sky-500 text-white border-sky-400' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-semibold uppercase text-slate-500 hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* ── User Detail Drawer ── */}
            {isDrawerOpen && activeUserInDrawer && (
                <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
                    <div onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
                    <div className="absolute top-0 right-0 h-full w-full max-w-[400px] bg-slate-50 shadow-2xl animate-in slide-in-from-right duration-500 ease-out flex flex-col overflow-hidden font-['Poppins']">
                        {/* Drawer Header */}
                        <div className="bg-[#0F172A] p-4 text-white shrink-0 relative">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400 font-semibold text-xl border border-sky-500/30 font-['Poppins']">
                                        {activeUserInDrawer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold tracking-tight font-['Poppins']">{activeUserInDrawer.name}</h3>
                                        <p className="text-sky-400 text-[9px] font-semibold uppercase tracking-normal font-['Poppins']">{activeUserInDrawer.status} Profile</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsDrawerOpen(false)} className="text-white/30 hover:text-white">
                                    <XCircle size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
                            {/* KYC Approval Card (Crucial Part) */}
                            <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden p-4 space-y-5 font-['Poppins']">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <ShieldAlert size={14} className="text-amber-500" />
                                        <span className="text-[10px] font-semibold uppercase tracking-normal font-['Poppins']">KYC Verification</span>
                                    </div>
                                    <StatusBadge status={activeUserInDrawer.kyc.status} />
                                </div>

                                {activeUserInDrawer.kyc.documentImage ? (
                                    <div className="space-y-4">
                                        <div className="relative group rounded-lg overflow-hidden border border-slate-100 aspect-video bg-slate-50">
                                            <img src={activeUserInDrawer.kyc.documentImage} alt="KYC" className="w-full h-full object-cover" />
                                            <a href={activeUserInDrawer.kyc.documentImage} target="_blank" rel="noreferrer" className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                                                <button className="bg-white text-slate-900 px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-normal shadow-xl font-['Poppins']">View Full Size</button>
                                            </a>
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <FileText size={16} className="text-slate-400" />
                                            <div>
                                                <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">Aadhaar Number</p>
                                                <p className="text-[13px] font-semibold text-slate-700 tracking-tight tabular-nums font-['Poppins']">{activeUserInDrawer.kyc.documentNumber || 'N/A'}</p>
                                            </div>
                                        </div>

                                        {/* Approval Buttons */}
                                        {(activeUserInDrawer.kyc.status === 'Pending' || activeUserInDrawer.kyc.status === 'pending') && (
                                            <div className="grid grid-cols-2 gap-3 pt-2">
                                                <button 
                                                    disabled={kycActionLoading}
                                                    onClick={() => handleManageKyc(activeUserInDrawer.id, 'Approved')}
                                                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-lg text-[10px] font-semibold uppercase tracking-normal shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 font-['Poppins']"
                                                >
                                                    {kycActionLoading ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Approve</>}
                                                </button>
                                                <button 
                                                    disabled={kycActionLoading}
                                                    onClick={() => handleManageKyc(activeUserInDrawer.id, 'Rejected')}
                                                    className="flex items-center justify-center gap-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white py-3.5 rounded-lg text-[10px] font-semibold uppercase tracking-normal border border-rose-100 transition-all active:scale-95 disabled:opacity-50 font-['Poppins']"
                                                >
                                                    <XCircle size={14} /> Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-8 flex flex-col items-center justify-center gap-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        <Camera size={24} className="text-slate-300" />
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-normal font-['Poppins']">No Document Uploaded</p>
                                    </div>
                                )}
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-4 rounded-lg border border-slate-100">
                                    <p className="text-[8px] font-medium text-slate-400 uppercase tracking-normal mb-1 font-['Poppins']">Mobile</p>
                                    <p className="text-[12px] font-medium text-slate-700 font-['Poppins']">{activeUserInDrawer.mobile}</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-slate-100">
                                    <p className="text-[8px] font-medium text-slate-400 uppercase tracking-normal mb-1 font-['Poppins']">Joined</p>
                                    <p className="text-[12px] font-medium text-slate-700 font-['Poppins']">{activeUserInDrawer.joined}</p>
                                </div>
                            </div>

                            {/* Wallet Stats */}
                            <div className="space-y-3">
                                <div className="bg-emerald-500 p-4 rounded-lg text-white shadow-lg shadow-emerald-500/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <Wallet size={16} />
                                        <span className="text-[8px] font-medium uppercase tracking-normal bg-white/20 px-2 py-0.5 rounded-full font-['Poppins']">Earnings</span>
                                    </div>
                                    <h4 className="text-2xl font-medium font-['Poppins']">{activeUserInDrawer.earnings}</h4>
                                    <p className="text-emerald-100 text-[9px] font-medium mt-1 font-['Poppins']">Lifetime total revenue</p>
                                </div>
                                <div className="bg-sky-500 p-4 rounded-lg text-white shadow-lg shadow-sky-500/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <UsersIcon size={16} />
                                        <span className="text-[8px] font-medium uppercase tracking-normal bg-white/20 px-2 py-0.5 rounded-full font-['Poppins']">Network</span>
                                    </div>
                                    <h4 className="text-2xl font-medium font-['Poppins']">{activeUserInDrawer.referrals}</h4>
                                    <p className="text-sky-100 text-[9px] font-medium mt-1 font-['Poppins']">Direct invitations sent</p>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 bg-white border-t border-slate-100">
                            <button 
                                onClick={() => toggleStatus(activeUserInDrawer.id)} 
                                className={`w-full py-4 rounded-lg font-medium text-[10px] uppercase tracking-normal transition-all active:scale-95 shadow-xl font-['Poppins']
                                ${activeUserInDrawer.status === 'Active' ? 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
                            >
                                {activeUserInDrawer.status === 'Active' ? 'Block Account' : 'Unblock Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit User Modal ── */}
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm"></div>
                    <form onSubmit={handleSaveEdit} className="relative bg-white w-full max-w-[400px] rounded-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 font-['Poppins']">
                        <div className="bg-[#0F172A] p-4 text-white text-center relative">
                            <h3 className="text-lg font-medium tracking-tight font-['Poppins']">Edit Profile</h3>
                            <button title="Close" type="button" onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-6">
                            {editError && (
                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2">
                                    <AlertCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                                    <p className="text-rose-600 text-[11px] font-medium font-['Poppins']">{editError}</p>
                                </div>
                            )}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-medium uppercase tracking-normal text-slate-400 mb-2 font-['Poppins']">Full Name</label>
                                    <input type="text" value={editingUser.name} onChange={(e) => setEditingUser({...editingUser, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-medium text-slate-700 font-['Poppins']" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium uppercase tracking-normal text-slate-400 mb-2 font-['Poppins']">Email</label>
                                    <input
                                        type="email"
                                        value={editingUser.email}
                                        onChange={(e) => { setEditingUser({...editingUser, email: e.target.value}); setEditError(''); }}
                                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-[13px] font-medium text-slate-700 font-['Poppins'] transition-colors ${editError ? 'border-rose-300 bg-rose-50/30' : 'border-slate-100'}`}
                                        placeholder="name@gmail.com"
                                    />
                                    <p className="text-[9px] text-slate-400 font-medium mt-1.5 ml-1 font-['Poppins']">Use a real email provider (gmail.com, yahoo.com, etc.)</p>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white py-4 rounded-lg font-medium text-[12px] uppercase tracking-normal shadow-xl shadow-sky-500/25 transition-all font-['Poppins']">Save Changes</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Users;
