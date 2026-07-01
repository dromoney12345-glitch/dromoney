import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Calendar, Users, Award, Trophy } from 'lucide-react';
import api from '../../shared/services/api';

const EventsReport = () => {
    const [eventsData, setEventsData] = useState([]);
    const [profitsData, setProfitsData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const [eventsRes, profitsRes] = await Promise.all([
                api.get('/admin/events'),
                api.get('/admin/profits')
            ]);
            
            if (eventsRes.success) {
                setEventsData(eventsRes.data);
            }
            if (profitsRes.success) {
                setProfitsData(profitsRes.data);
            }
        } catch (err) {
            console.error('Failed to load events report', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData();
    }, []);

    return (
        <div className="p-6 bg-slate-50 min-h-screen font-['Poppins']">
            {/* Top Area: Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Event Activity Report</h1>
                    <p className="text-[12px] text-slate-500 mt-1 font-medium">Track event performance, participants, and generated admin profits.</p>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <button 
                        onClick={fetchReportData} 
                        disabled={loading}
                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-medium text-[12px] transition-all shadow-sm flex items-center gap-2"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Profits Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Trophy size={16} />
                    </div>
                    <h2 className="text-[13px] font-semibold text-slate-800 uppercase tracking-tight">Past Event Profits</h2>
                </div>
                <div className="overflow-x-auto scrollbar-hide min-h-[150px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-semibold tracking-normal">
                            <tr>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Event Title</th>
                                <th className="px-5 py-3">Event Tag</th>
                                <th className="px-5 py-3">Admin Profit Earned</th>
                                <th className="px-5 py-3">Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {profitsData.length > 0 ? profitsData.map((profit) => (
                                <tr key={profit._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-4 text-[12px] font-medium text-slate-500">
                                        {new Date(profit.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-[13px] font-semibold text-slate-800">
                                        {profit.event?.title || 'Deleted Event'}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="bg-sky-50 border border-sky-100 text-sky-600 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-tight">
                                            {profit.event?.tag || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 font-bold text-emerald-600 text-[13px] tabular-nums">
                                        ₹{profit.amount.toFixed(2)}
                                    </td>
                                    <td className="px-5 py-4 text-[11px] font-medium text-slate-500">
                                        {profit.source}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-5 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Trophy size={32} className="text-slate-200" />
                                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-tight">No profits recorded yet</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Events Summary Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                            <Award size={16} />
                        </div>
                        <h2 className="text-[13px] font-semibold text-slate-800 uppercase tracking-tight">Event Earnings & Activity</h2>
                    </div>
                </div>
                <div className="overflow-x-auto scrollbar-hide min-h-[250px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-semibold tracking-normal">
                            <tr>
                                <th className="px-5 py-3">Event</th>
                                <th className="px-5 py-3 text-center">Status</th>
                                <th className="px-5 py-3 text-center">Entry Fee</th>
                                <th className="px-5 py-3 text-center">Total Pool</th>
                                <th className="px-5 py-3 text-center">Joined</th>
                                <th className="px-5 py-3 text-center">Awarded</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {eventsData.length > 0 ? eventsData.map((e) => {
                                const totalPool = (e.participantsCount || 0) * e.entryFee;
                                return (
                                    <tr key={e._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-[13px] text-slate-800 tracking-tight">{e.title}</div>
                                            <div className="text-[10px] font-medium text-slate-400 mt-0.5">{e.tag}</div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight border ${
                                                e.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                e.status === 'Inactive' ? 'bg-slate-50 text-slate-500 border-slate-100' :
                                                'bg-rose-50 text-rose-500 border-rose-100'
                                            }`}>
                                                {e.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center font-semibold text-slate-700 text-[13px] tabular-nums">
                                            {e.entryFee} <span className="text-[10px] text-slate-400 font-medium ml-1">Coins</span>
                                        </td>
                                        <td className="px-5 py-4 text-center font-bold text-amber-500 text-[13px] tabular-nums">
                                            {totalPool} <span className="text-[10px] text-amber-500/70 font-medium ml-1">Coins</span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-slate-600">
                                                <Users size={14} className="text-slate-400" />
                                                <span className="font-semibold text-[13px]">{e.participantsCount || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                                                <Award size={14} className="text-emerald-400" />
                                                <span className="font-semibold text-[13px]">{e.awardedCount || 0}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="6" className="px-5 py-16 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Calendar size={32} className="text-slate-200" />
                                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-tight">No events found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EventsReport;
