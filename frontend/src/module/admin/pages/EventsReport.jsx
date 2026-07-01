import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Calendar, Users, Award, Trophy } from 'lucide-react';
import api from '../../shared/services/api';

const EventsReport = () => {
    const [eventsData, setEventsData] = useState([]);
    const [profitsData, setProfitsData] = useState([]);
    const [coinRate, setCoinRate] = useState(0.10);
    const [loading, setLoading] = useState(true);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const [eventsRes, profitsRes, settingsRes] = await Promise.all([
                api.get('/admin/events'),
                api.get('/admin/profits'),
                api.get('/admin/settings')
            ]);
            
            if (eventsRes.success) {
                setEventsData(eventsRes.data);
            }
            if (profitsRes.success) {
                setProfitsData(profitsRes.data);
            }
            if (settingsRes.success && settingsRes.data) {
                setCoinRate(settingsRes.data.coinRate || 0.10);
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
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* Top Area: Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Event Activity Report</h1>
                    <p className="text-sm text-slate-500 mt-1">Track event performance, participants, and generated admin profits.</p>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <button 
                        onClick={fetchReportData} 
                        disabled={loading}
                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-md font-medium text-[12px] transition-all shadow-sm flex items-center gap-2"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Profits Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-slate-800">Past Event Profits</h2>
                    <button 
                        onClick={fetchReportData} 
                        disabled={loading}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-50"
                        title="Refresh Data"
                    >
                        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
                <div className="overflow-x-auto scrollbar-hide min-h-[150px]">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Event Title</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Event Tag</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Admin Profit Earned</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {profitsData.length > 0 ? profitsData.map((profit) => (
                                <tr key={profit._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-3 text-slate-700 whitespace-nowrap">
                                        {new Date(profit.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3 font-semibold text-slate-800">
                                        {profit.event?.title || 'Deleted Event'}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="bg-sky-50 border border-sky-100 text-sky-600 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-tight">
                                            {profit.event?.tag || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 font-bold text-emerald-600 text-[13px] tabular-nums">
                                        ₹{profit.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-3 text-[11px] font-medium text-slate-500">
                                        {profit.source}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
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
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-slate-800">Event Earnings & Activity</h2>
                    <button 
                        onClick={fetchReportData} 
                        disabled={loading}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-50"
                        title="Refresh Data"
                    >
                        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
                <div className="overflow-x-auto scrollbar-hide min-h-[250px]">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Event</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Entry Fee</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Total Pool</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Joined</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Awarded</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {eventsData.length > 0 ? eventsData.map((e) => {
                                const totalPoolCoins = (e.participantsCount || 0) * e.fee;
                                const totalPoolCash = totalPoolCoins * coinRate;
                                return (
                                    <tr key={e._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="font-semibold text-[13px] text-slate-800 tracking-tight">{e.title}</div>
                                            <div className="text-[10px] font-medium text-slate-400 mt-0.5">{e.tag}</div>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight border ${
                                                e.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                e.status === 'Inactive' ? 'bg-slate-50 text-slate-500 border-slate-100' :
                                                'bg-rose-50 text-rose-500 border-rose-100'
                                            }`}>
                                                {e.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-center font-semibold text-slate-700 text-[13px] tabular-nums">
                                            {e.fee} <span className="text-[10px] text-slate-400 font-medium ml-1">Coins</span>
                                        </td>
                                        <td className="px-6 py-3 text-center font-bold text-amber-500 text-[13px] tabular-nums">
                                            ₹{totalPoolCash.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-slate-600">
                                                <Users size={14} className="text-slate-400" />
                                                <span className="font-semibold text-[13px]">{e.participantsCount || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                                                <Award size={14} className="text-emerald-400" />
                                                <span className="font-semibold text-[13px]">{e.awardedCount || 0}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center">
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
