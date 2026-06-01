import React, { useState, useEffect } from 'react';
import {
    Trophy, Plus, Play, Square, CheckCircle, Edit3, Trash2, Save,
    Users, Gift, Zap, ClipboardList, Award, Eye, ChevronDown, ChevronRight,
    ToggleLeft, ToggleRight, Star, Coins, X, AlertCircle, Check, Sparkles, Clock
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import api from '../../shared/services/api';

const TAG_COLORS = {
    Quiz: 'bg-blue-50 text-blue-600 border-blue-100',
    Draw: 'bg-purple-50 text-purple-600 border-purple-100',
    Prediction: 'bg-amber-50 text-amber-600 border-amber-100',
    Brain: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    Tapper: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    Scratch: 'bg-rose-50 text-rose-600 border-rose-100'
};

const STATUS_COLORS = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Inactive: 'bg-slate-50 text-slate-500 border-slate-100',
    Draft: 'bg-slate-50 text-slate-500 border-slate-100',
    Ended: 'bg-rose-50 text-rose-600 border-rose-100',
    'Coming Soon': 'bg-amber-50 text-amber-600 border-amber-100'
};

// ─── Sub-components ───────────────────────────────────────

const TabBtn = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-medium uppercase tracking-normal transition-all font-['Poppins'] ${
            active ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' : 'text-slate-500 hover:bg-slate-50'
        }`}
    >
        <Icon size={14} />
        {label}
    </button>
);

const Toast = ({ msg, type }) => (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white text-[12px] font-medium uppercase tracking-normal animate-in slide-in-from-bottom-4 duration-300 font-['Poppins'] ${type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
        {type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
        {msg}
    </div>
);

// ─── Tab 1: Events Overview ───────────────────────────────

const OverviewTab = ({ events, onUpdateEvent, onDeleteEvent, onShowToast }) => {
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});

    const startEdit = (event) => {
        setEditingId(event.id);
        setEditData({ 
            ...event, 
            fee: Math.max(0, event.fee) // Ensure fee is never negative
        });
    };

    const saveEdit = () => {
        onUpdateEvent(editingId, {
            title: editData.title,
            tag: editData.tag,
            fee: +editData.fee,
            prize: editData.prize,
            startTime: editData.startTime,
            status: editData.status
        });
        setEditingId(null);
        onShowToast('Event updated successfully!', 'success');
    };

    const toggleStatus = (event) => {
        const next = event.status === 'Active' ? 'Inactive' : 'Active';
        onUpdateEvent(event.id, { status: next });
        onShowToast(`Event "${event.title}" set to ${next}`, 'success');
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {events.map(event => {
                const isEditing = editingId === event.id;

                return (
                    <div key={event.id} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow relative group font-['Poppins']">
                        {/* Delete Button on Hover */}
                        <button
                            onClick={() => {
                                if (window.confirm(`Are you sure you want to delete the event "${event.title}"?`)) {
                                    onDeleteEvent(event.id);
                                }
                            }}
                            className="absolute top-5 right-5 p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Event"
                        >
                            <Trash2 size={14} />
                        </button>

                        {/* Header */}
                        <div className="flex items-start justify-between mb-4 pr-8">
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${TAG_COLORS[event.tag] || 'bg-slate-50 border-slate-100'}`}>
                                    <Trophy size={20} />
                                </div>
                                <div>
                                    {isEditing ? (
                                        <input
                                            value={editData.title}
                                            onChange={e => setEditData(p => ({ ...p, title: e.target.value }))}
                                            className="text-[14px] font-medium text-slate-800 border-b-2 border-sky-400 bg-transparent outline-none w-40"
                                        />
                                    ) : (
                                        <h3 className="font-medium text-slate-800 text-[14px] leading-none font-['Poppins']">{event.title}</h3>
                                    )}
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-medium uppercase tracking-normal border font-['Poppins'] ${TAG_COLORS[event.tag] || 'bg-slate-50 border-slate-100'}`}>
                                        {event.tag}
                                    </span>
                                </div>
                            </div>
                            {isEditing ? (
                                <select
                                    value={editData.status}
                                    onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-[9px] font-medium text-slate-700 outline-none"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Coming Soon">Coming Soon</option>
                                </select>
                            ) : (
                                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-medium uppercase tracking-normal border font-['Poppins'] ${STATUS_COLORS[event.status] || STATUS_COLORS.Inactive}`}>
                                    {event.status}
                                </span>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {[
                                { label: 'Entry', value: isEditing ? null : `${Math.max(0, event.fee)} Coins`, edit: <input type="number" min="0" value={editData.fee} onChange={e => setEditData(p => ({ ...p, fee: Math.max(0, +e.target.value) }))} className="w-14 border-b border-sky-300 text-center text-sm font-medium outline-none bg-transparent" /> },
                                { label: 'Prize', value: isEditing ? null : event.prize, edit: <input value={editData.prize} onChange={e => setEditData(p => ({ ...p, prize: e.target.value }))} className="w-16 border-b border-sky-300 text-center text-sm font-medium outline-none bg-transparent" /> },
                                { label: 'Joined', value: event.participantsCount || 0 },
                                { label: 'Awarded', value: event.awardedCount || 0 },
                            ].map((stat, i) => (
                                <div key={i} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center font-['Poppins']">
                                    <p className="text-[8px] font-medium text-slate-400 uppercase tracking-normal mb-1 font-['Poppins']">{stat.label}</p>
                                    {(i === 0 || i === 1) && isEditing
                                        ? <div className="flex justify-center">{stat.edit}</div>
                                        : <p className="text-sm font-medium text-slate-900 font-['Poppins']">{stat.value}</p>
                                    }
                                </div>
                            ))}
                        </div>

                        {/* Start Time */}
                        <div className="mb-4 font-['Poppins']">
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-normal mb-1 font-['Poppins']">Start Time</p>
                            {isEditing ? (
                                <input
                                    value={editData.startTime}
                                    onChange={e => setEditData(p => ({ ...p, startTime: e.target.value }))}
                                    className="text-sm font-medium text-slate-700 border-b border-sky-300 outline-none bg-transparent w-full font-['Poppins']"
                                />
                            ) : (
                                <p className="text-sm font-medium text-slate-700 font-['Poppins']">{event.startTime}</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <button onClick={saveEdit} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-[11px] uppercase tracking-normal bg-emerald-500 text-white active:scale-95 transition-all font-['Poppins']">
                                        <Save size={13} /> Save
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-[11px] uppercase tracking-normal bg-slate-100 text-slate-500 font-['Poppins']">
                                        <X size={13} /> Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => startEdit(event)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-[11px] uppercase tracking-normal bg-sky-50 text-sky-600 hover:bg-sky-100 transition-all font-['Poppins']">
                                        <Edit3 size={13} /> Edit
                                    </button>
                                    <button onClick={() => toggleStatus(event)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-[11px] uppercase tracking-normal transition-all font-['Poppins'] ${event.status === 'Active' ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                                        {event.status === 'Active' ? <><Square size={13} /> Stop</> : <><Play size={13} /> Activate</>}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Tab 2: Content Editor ───────────────────────────────

const ContentTab = ({ events, onRefreshEvents, onShowToast }) => {
    const [selectedEventId, setSelectedEventId] = useState('');
    const [questions, setQuestions] = useState([]);
    const [prizes, setPrizes] = useState([]);
    const [cards, setCards] = useState([]);
    const [goldReward, setGoldReward] = useState(40);
    const [peekTime, setPeekTime] = useState(2.5);
    const [maxTime, setMaxTime] = useState(60);

    const sel = events.find(e => e.id === selectedEventId) || events[0];

    useEffect(() => {
        if (events && events.length > 0 && !selectedEventId) {
            setSelectedEventId(events[0].id);
        }
    }, [events, selectedEventId]);

    useEffect(() => {
        if (sel) {
            setQuestions(sel.config?.questions || []);
            setPrizes(sel.config?.prizes || []);
            setCards(sel.config?.cards || []);
            setGoldReward(sel.config?.coinReward || 40);
            setPeekTime(sel.config?.peekTime || 2.5);
            setMaxTime(sel.config?.maxTime || 60);
        }
    }, [sel]);

    // ── Quiz ──
    const addQuestion = () => {
        const newQ = { id: Date.now(), question: 'New Question?', options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 0 };
        setQuestions(prev => [...prev, newQ]);
    };
    const updateQuestion = (idx, field, val) => {
        setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: val } : q));
    };
    const updateOption = (qIdx, oIdx, val) => {
        setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? val : o) } : q));
    };
    const deleteQuestion = (idx) => setQuestions(prev => prev.filter((_, i) => i !== idx));

    const saveQuestions = async () => {
        try {
            const res = await api.put(`/admin/events/${selectedEventId}`, {
                config: {
                    ...sel?.config,
                    questions: questions.map(q => ({
                        question: q.question,
                        options: q.options,
                        answer: q.answer
                    }))
                }
            });
            if (res.success) {
                onShowToast('Quiz questions saved!', 'success');
                onRefreshEvents();
            }
        } catch (err) {
            console.error(err);
            onShowToast('Failed to save questions', 'error');
        }
    };

    // ── Draw ──
    const addPrize = () => setPrizes(prev => [...prev, { id: Date.now(), label: 'New Prize', coins: 0, cash: 0 }]);
    const updatePrize = (idx, field, val) => setPrizes(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
    const deletePrize = (idx) => setPrizes(prev => prev.filter((_, i) => i !== idx));

    const savePrizes = async () => {
        try {
            const res = await api.put(`/admin/events/${selectedEventId}`, {
                config: {
                    ...sel?.config,
                    prizes: prizes.map(p => ({
                        label: p.label,
                        coins: p.coins,
                        cash: p.cash
                    }))
                }
            });
            if (res.success) {
                onShowToast('Lucky Draw prizes saved!', 'success');
                onRefreshEvents();
            }
        } catch (err) {
            console.error(err);
            onShowToast('Failed to save prizes', 'error');
        }
    };

    // ── Memory Master ──
    const updateCard = (idx, field, val) => setCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));
    const saveMemoryGame = async () => {
        try {
            const res = await api.put(`/admin/events/${selectedEventId}`, {
                config: {
                    ...sel?.config,
                    cards: cards.map(c => ({
                        icon: c.icon,
                        color: c.color
                    })),
                    peekTime: +peekTime,
                    maxTime: +maxTime
                }
            });
            if (res.success) {
                onShowToast('Memory Master updated!', 'success');
                onRefreshEvents();
            }
        } catch (err) {
            console.error(err);
            onShowToast('Failed to save Memory configuration', 'error');
        }
    };

    if (!sel) return <div className="text-center py-6 text-slate-400">Please create an event first.</div>;

    return (
        <div className="space-y-6 font-['Poppins']">
            {/* Event Selector */}
            <div className="flex flex-wrap gap-2">
                {events.map(ev => (
                    <button key={ev.id} onClick={() => setSelectedEventId(ev.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-medium uppercase tracking-normal border transition-all font-['Poppins'] ${selectedEventId === ev.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${ev.status === 'Active' ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>
                        {ev.title}
                    </button>
                ))}
            </div>

            {/* Quiz Content */}
            {sel.tag === 'Quiz' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 animate-in fade-in font-['Poppins']">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[15px] font-medium text-slate-800 font-['Poppins']">Quiz Questions ({questions.length})</h3>
                        <div className="flex gap-2">
                            <button onClick={addQuestion} className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-medium uppercase tracking-normal hover:bg-blue-100 transition-all font-['Poppins']">
                                <Plus size={14} /> Add Question
                            </button>
                            <button onClick={saveQuestions} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[11px] font-medium uppercase tracking-normal hover:bg-emerald-600 transition-all shadow-md font-['Poppins']">
                                <Save size={14} /> Save All
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                        {questions.map((q, qIdx) => (
                            <div key={q.id || qIdx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 animate-in fade-in duration-300">
                                <div className="flex items-start gap-3">
                                    <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 mt-0.5">{qIdx + 1}</span>
                                    <input
                                        value={q.question}
                                        onChange={e => updateQuestion(qIdx, 'question', e.target.value)}
                                        className="flex-1 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                                        placeholder="Question text..."
                                    />
                                    <button onClick={() => deleteQuestion(qIdx)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 ml-9">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className={`flex items-center gap-2 bg-white border rounded-lg px-2 py-1.5 ${q.answer === oIdx ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                                            <button
                                                onClick={() => updateQuestion(qIdx, 'answer', oIdx)}
                                                className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all ${q.answer === oIdx ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}
                                            />
                                            <input
                                                value={opt}
                                                onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                                                className="text-[11px] font-bold text-slate-700 bg-transparent outline-none flex-1 min-w-0"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="ml-9 text-[9px] font-medium text-emerald-600 uppercase tracking-normal">● filled = correct answer</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Lucky Draw Content */}
            {sel.tag === 'Draw' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 animate-in fade-in font-['Poppins']">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[15px] font-medium text-slate-800 font-['Poppins']">Draw Prizes ({prizes.length})</h3>
                        <div className="flex gap-2">
                            <button onClick={addPrize} className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-[11px] font-medium uppercase tracking-normal hover:bg-purple-100 transition-all font-['Poppins']">
                                <Plus size={14} /> Add Prize
                            </button>
                            <button onClick={savePrizes} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[11px] font-medium uppercase tracking-normal shadow-md font-['Poppins']">
                                <Save size={14} /> Save All
                            </button>
                        </div>
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {prizes.map((p, idx) => (
                            <div key={p.id || idx} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3 animate-in fade-in duration-350">
                                <Gift size={16} className="text-purple-500 shrink-0" />
                                <input value={p.label} onChange={e => updatePrize(idx, 'label', e.target.value)} className="flex-1 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none" placeholder="Label (e.g. ₹500)" />
                                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                                    <span className="text-[10px] text-slate-400 font-bold">Cash ₹</span>
                                    <input type="number" min="0" value={p.cash} onChange={e => updatePrize(idx, 'cash', Math.max(0, +e.target.value))} className="w-14 text-sm font-bold text-slate-800 outline-none text-center" />
                                </div>
                                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                                    <Coins size={12} className="text-amber-500" />
                                    <input type="number" min="0" value={p.coins} onChange={e => updatePrize(idx, 'coins', Math.max(0, +e.target.value))} className="w-14 text-sm font-bold text-slate-800 outline-none text-center" />
                                </div>
                                <button onClick={() => deletePrize(idx)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Memory Master Content */}
            {sel.tag === 'Brain' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 animate-in fade-in font-['Poppins']">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[15px] font-medium text-slate-800 font-['Poppins']">Card Symbols ({cards.length})</h3>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                <span className="text-[10px] font-medium text-slate-400 uppercase font-['Poppins']">Peek (s)</span>
                                <input type="number" step="0.5" min="0" value={peekTime} onChange={e => setPeekTime(Math.max(0, e.target.value))} className="w-12 text-sm font-medium text-slate-800 outline-none text-center bg-transparent font-['Poppins']" />
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                <span className="text-[10px] font-medium text-slate-400 uppercase font-['Poppins']">Game (s)</span>
                                <input type="number" min="1" value={maxTime} onChange={e => setMaxTime(Math.max(1, e.target.value))} className="w-12 text-sm font-medium text-slate-800 outline-none text-center bg-transparent font-['Poppins']" />
                            </div>
                            <button onClick={saveMemoryGame} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl text-[11px] font-medium uppercase tracking-normal shadow-md font-['Poppins']">
                                <Save size={14} /> Save Config
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
                        {cards.map((c, idx) => (
                            <div key={c.id || idx} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 animate-in fade-in duration-350">
                                <div className={`w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center ${c.color} shadow-sm`}>
                                    <Sparkles size={20} />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 w-16">Icon Name:</span>
                                        <input value={c.icon} onChange={e => updateCard(idx, 'icon', e.target.value)} className="flex-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 w-16">Color Class:</span>
                                        <input value={c.color} onChange={e => updateCard(idx, 'color', e.target.value)} className="flex-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                        <AlertCircle size={18} className="text-indigo-500" />
                        <p className="text-[11px] font-bold text-indigo-700">Memory Master requires 6 pairs. Icons must be valid Lucide icon names.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Tab 3: Participants ──────────────────────────────────

const ParticipantsTab = ({ events, onShowToast }) => {
    const [selectedEventId, setSelectedEventId] = useState('');
    const [timeFilter, setTimeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('timeTaken');
    const [searchQuery, setSearchQuery] = useState('');
    const [participants, setParticipants] = useState([]);
    const [awardNote, setAwardNote] = useState('');
    const [awardingId, setAwardingId] = useState(null);
    const [viewingParticipant, setViewingParticipant] = useState(null);

    useEffect(() => {
        if (events && events.length > 0 && !selectedEventId) {
            setSelectedEventId(events[0].id);
        }
    }, [events, selectedEventId]);

    const fetchParticipants = async () => {
        if (!selectedEventId) return;
        try {
            const res = await api.get(`/admin/events/${selectedEventId}/participants`);
            if (res.success && res.data) {
                setParticipants(res.data.map(p => ({
                    ...p,
                    id: p._id,
                    name: p.user?.name || 'Anonymous User',
                    email: p.user?.email || 'N/A',
                    phone: p.user?.phone || 'N/A',
                    joinedAt: new Date(p.joinedAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    })
                })));
            }
        } catch (err) {
            console.error("Failed to fetch participants:", err);
        }
    };

    useEffect(() => {
        fetchParticipants();
    }, [selectedEventId]);

    const handleAward = async (p) => {
        try {
            const res = await api.put(`/admin/events/participants/${p.id}`, {
                prizeStatus: 'Awarded',
                prizeNote: awardNote || 'Prize Awarded by Admin'
            });
            if (res.success) {
                onShowToast(`Prize successfully awarded to ${p.name}!`, 'success');
                setAwardingId(null);
                setAwardNote('');
                fetchParticipants();
            }
        } catch (err) {
            console.error(err);
            onShowToast('Failed to award prize', 'error');
        }
    };

    const filteredParticipants = participants.filter(p => {
        if (statusFilter === 'winner' && p.prizeStatus !== 'Awarded') return false;
        if (searchQuery && !p.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;

        if (timeFilter === 'all') return true;
        const now = Date.now();
        const pTimestamp = p.createdAt ? new Date(p.createdAt).getTime() : 0;
        const ONE_DAY = 24 * 60 * 60 * 1000;

        if (timeFilter === 'today') {
            const startOfToday = new Date().setHours(0, 0, 0, 0);
            return pTimestamp >= startOfToday;
        }
        if (timeFilter === 'yesterday') {
            const startOfToday = new Date().setHours(0, 0, 0, 0);
            const startOfYesterday = startOfToday - ONE_DAY;
            return pTimestamp >= startOfYesterday && pTimestamp < startOfToday;
        }
        if (timeFilter === 'week') {
            return (now - pTimestamp) <= ONE_DAY * 7;
        }
        if (timeFilter === 'month') {
            return (now - pTimestamp) <= ONE_DAY * 30;
        }
        return true;
    });

    const sortedParticipants = [...filteredParticipants].sort((a, b) => {
        if (sortBy === 'timeTaken') {
            const timeA = a.timeTaken !== undefined && a.timeTaken !== null ? a.timeTaken : Infinity;
            const timeB = b.timeTaken !== undefined && b.timeTaken !== null ? b.timeTaken : Infinity;
            return timeA - timeB;
        }
        if (sortBy === 'score') {
            const scoreA = a.score !== undefined && a.score !== null ? a.score : -Infinity;
            const scoreB = b.score !== undefined && b.score !== null ? b.score : -Infinity;
            return scoreB - scoreA;
        }
        // default recent joins
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
    });

    // Min completion time of valid completions
    const validTimes = participants
        .map(p => p.timeTaken)
        .filter(t => t !== undefined && t !== null && t > 0);
    const minTime = validTimes.length > 0 ? Math.min(...validTimes) : null;

    // Find the participant with the minimum timeTaken (fastest)
    const fastestParticipant = minTime !== null 
        ? participants.find(p => p.timeTaken === minTime)
        : null;

    const totalJoined = participants.length;
    const prizesAwarded = participants.filter(p => p.prizeStatus === 'Awarded').length;
    const topScore = participants.length > 0 ? Math.max(...participants.map(p => p.score || 0)) : 0;

    return (
        <div className="space-y-6">
            {/* Event Selector */}
            <div className="flex flex-wrap gap-2">
                {events.map(ev => (
                    <button key={ev.id} onClick={() => { setSelectedEventId(ev.id); setAwardingId(null); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-medium uppercase tracking-normal border transition-all ${selectedEventId === ev.id ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${ev.status === 'Active' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-300'}`}></span>
                        {ev.title}
                    </button>
                ))}
            </div>

            {/* Filter Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-normal mr-2 ml-1">Filter:</span>
                    <select
                        value={timeFilter}
                        onChange={e => setTimeFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-medium text-slate-700 outline-none focus:border-sky-400"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="week">Past 7 Days</option>
                        <option value="month">Past 30 Days</option>
                    </select>

                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-normal mr-2 ml-2">Sort:</span>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 text-[11px] font-medium text-amber-800 outline-none focus:border-amber-400"
                    >
                        <option value="timeTaken">Completion Speed (Fastest First)</option>
                        <option value="score">Highest Score / Remaining</option>
                        <option value="joined">Recent Joins</option>
                    </select>

                    <button
                        onClick={() => setStatusFilter(statusFilter === 'all' ? 'winner' : 'all')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-medium uppercase tracking-normal border transition-all ${statusFilter === 'winner' ? 'bg-amber-100 border-amber-300 text-amber-700 font-bold ml-2' : 'bg-slate-50 border-slate-200 text-slate-500 ml-2'}`}
                    >
                        <Award size={14} className={statusFilter === 'winner' ? 'fill-amber-500' : ''} />
                        {statusFilter === 'winner' ? 'Showing Winners' : 'Filter Winners'}
                    </button>
                </div>

                <div className="relative w-full md:w-64">
                    <Eye size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-sky-400 transition-all"
                    />
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Total Joined', value: totalJoined, color: 'text-sky-600', bg: 'bg-sky-50', icon: Users },
                    { label: 'Prizes Awarded', value: prizesAwarded, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
                    { 
                        label: minTime !== null ? `Fastest (${fastestParticipant?.name || 'User'})` : 'Top Score', 
                        value: minTime !== null ? `${minTime}s` : topScore || '—', 
                        color: 'text-amber-600', 
                        bg: 'bg-amber-50', 
                        icon: Trophy 
                    },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex items-center justify-between border border-white shadow-sm`}>
                         <div className="p-3 rounded-xl bg-white/50">
                            <s.icon size={20} className={s.color} />
                        </div>
                        <div className="text-right">
                            <p className={`text-xl md:text-2xl font-medium ${s.color}`}>{s.value}</p>
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-normal mt-0.5">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Winner Spotlight Card */}
            {fastestParticipant && (
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-orange-400 relative overflow-hidden">
                    <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 opacity-10 text-[120px] select-none pointer-events-none">🏆</div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white text-xl font-medium shrink-0 shadow-inner">
                            🏅
                        </div>
                        <div className="text-left">
                            <span className="bg-white/20 text-white px-2.5 py-0.5 rounded-lg text-[8px] font-medium uppercase tracking-normal">
                                👑 Record Holder (Minimum Completion Time)
                            </span>
                            <h4 className="text-lg font-medium tracking-tight mt-1">{fastestParticipant.name || 'Anonymous User'}</h4>
                            <p className="text-[11px] font-bold text-amber-50 mt-0.5">
                                Finished with {fastestParticipant.result || 'perfect matching'} in a record-breaking <strong className="text-white text-xs font-medium bg-white/20 px-2 py-0.5 rounded-md">{fastestParticipant.timeTaken} seconds</strong>!
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 relative z-10">
                        {fastestParticipant.prizeStatus !== 'Awarded' ? (
                            <button
                                onClick={() => { 
                                    setAwardingId(fastestParticipant.id); 
                                    setAwardNote(`Winner with record-breaking speed of ${fastestParticipant.timeTaken} seconds! 🎉`); 
                                }}
                                className="bg-white text-orange-600 hover:bg-orange-50 px-4.5 py-2.5 rounded-xl text-[9px] font-medium uppercase tracking-normal active:scale-95 transition-all shadow-md cursor-pointer"
                            >
                                🎁 Approve & Give Prize
                            </button>
                        ) : (
                            <span className="bg-emerald-500/30 border border-emerald-400 px-3 py-1.5 rounded-xl text-[9px] font-medium uppercase tracking-normal flex items-center gap-1.5 text-white font-extrabold">
                                <CheckCircle size={12} /> Approved Winner
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Participants Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-2">
                        <Users size={16} className="text-slate-400" />
                        <h3 className="font-medium text-slate-800 text-[14px]">
                            {statusFilter === 'winner' ? 'Event Winners' : 'Event Participants'}
                        </h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => onShowToast('Excel report generated and downloading...', 'success')}
                            className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-medium uppercase tracking-normal border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-2"
                        >
                            <ClipboardList size={12} /> Export Excel
                        </button>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">Showing {sortedParticipants.length} results</p>
                    </div>
                </div>

                {sortedParticipants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                        <div className="p-6 bg-slate-50 rounded-full mb-4">
                            <Users size={48} strokeWidth={1} />
                        </div>
                        <p className="text-[11px] font-medium uppercase tracking-normal mb-1">No matching participants</p>
                        <p className="text-[9px] font-bold text-slate-400">Try changing your filters or searching</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {sortedParticipants.map(p => {
                            const isFastest = p.timeTaken !== undefined && p.timeTaken !== null && p.timeTaken > 0 && p.timeTaken === minTime;
                            return (
                                <div key={p.id}>
                                    <div 
                                        onClick={() => setViewingParticipant(p)}
                                        className={`flex items-center p-4 hover:bg-slate-50 cursor-pointer transition-colors ${p.prizeStatus === 'Awarded' ? 'bg-emerald-50/10' : ''}`}
                                    >
                                        {/* Avatar */}
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-medium text-sm mr-4 shrink-0 shadow-sm ${p.prizeStatus === 'Awarded' ? 'bg-gradient-to-br from-amber-400 to-orange-500' : isFastest ? 'bg-gradient-to-br from-rose-500 to-amber-500 animate-pulse' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
                                            {p.prizeStatus === 'Awarded' ? <Award size={18} /> : isFastest ? <Trophy size={18} className="text-white fill-white" /> : (p.name || 'U')[0].toUpperCase()}
                                        </div>
                                        
                                        {/* Name & Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-medium text-slate-800 text-[13px] truncate">{p.name || 'Anonymous User'}</p>
                                                {p.prizeStatus === 'Awarded' && (
                                                    <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md text-[8px] font-medium uppercase tracking-normal border border-amber-200">WINNER</span>
                                                )}
                                                {isFastest && (
                                                    <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md text-[8px] font-medium uppercase tracking-normal border border-rose-200 flex items-center gap-1 animate-pulse">⚡ FASTEST COMPLETION</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                <div className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                                                    <Zap size={10} className="text-slate-500" />
                                                    <span className="text-[10px] font-bold">{p.result || '—'}</span>
                                                </div>
                                                {p.timeTaken !== undefined && p.timeTaken !== null && (
                                                    <div className="flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md border border-sky-100">
                                                        <Clock size={10} className="text-sky-500" />
                                                        <span className="text-[10px] font-medium">Completed in {p.timeTaken}s</span>
                                                    </div>
                                                )}
                                                <span className="text-[10px] text-slate-300 hidden sm:inline">|</span>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={10} className="text-slate-400" />
                                                    <span className="text-[10px] font-bold text-slate-500">{p.joinedAt}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Prize & Status */}
                                        <div className="flex items-center gap-6 pr-2">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-normal mb-0.5">Prize Won</p>
                                                <p className="text-[13px] font-medium text-amber-600">{p.prize || 'No Prize'}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-medium uppercase tracking-normal border flex items-center gap-1.5 ${p.prizeStatus === 'Awarded' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                    {p.prizeStatus === 'Awarded' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                                    {p.prizeStatus}
                                                </span>
                                                {p.prizeStatus !== 'Awarded' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setAwardingId(awardingId === p.id ? null : p.id); }}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-50 text-sky-600 rounded-xl text-[9px] font-medium uppercase tracking-normal hover:bg-sky-100 active:scale-95 transition-all border border-sky-100"
                                                    >
                                                        <Award size={11} /> Give Prize
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Award Awarding UI */}
                                    {awardingId === p.id && (
                                        <div className="mx-4 mb-4 bg-slate-50 border border-sky-200 rounded-2xl p-4 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-medium text-sky-600 uppercase tracking-normal">Award Prize to {p.name}</p>
                                                <button onClick={() => setAwardingId(null)}>
                                                    <X size={14} className="text-slate-400" />
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    value={awardNote}
                                                    onChange={e => setAwardNote(e.target.value)}
                                                    placeholder="Add a congratulation note or transaction ID..."
                                                    className="flex-1 text-[12px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-sky-400"
                                                />
                                                <button
                                                    onClick={() => handleAward(p)}
                                                    className="flex items-center gap-2 px-4 py-3 bg-sky-500 text-white rounded-xl font-medium text-[11px] uppercase tracking-normal shadow-lg shadow-sky-200 active:scale-95 transition-all"
                                                >
                                                    <CheckCircle size={16} /> Confirm
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Participant Detail Modal */}
            {viewingParticipant && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 relative">
                            <button onClick={() => setViewingParticipant(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center text-white text-3xl font-medium shadow-xl shadow-sky-100">
                                    {(viewingParticipant.name || 'U')[0].toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-medium text-slate-800 tracking-tight">{viewingParticipant.name}</h2>
                                    <p className="text-slate-400 font-bold text-sm">Joined {viewingParticipant.joinedAt}</p>
                                    {viewingParticipant.prizeStatus === 'Awarded' && (
                                        <span className="inline-block mt-2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-normal border border-amber-200">Event Winner</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-8">
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-normal mb-1 text-center">Performance</p>
                                    <p className="text-sm font-medium text-slate-800 text-center">{viewingParticipant.result || 'No Result'}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-normal mb-1 text-center">Completion Time</p>
                                    <p className="text-sm font-medium text-slate-800 text-center">
                                        {viewingParticipant.timeTaken !== undefined && viewingParticipant.timeTaken !== null ? `${viewingParticipant.timeTaken}s` : 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 flex flex-col justify-center">
                                    <p className="text-[9px] font-medium text-amber-500 uppercase tracking-normal mb-1 text-center">Reward Status</p>
                                    <p className="text-sm font-medium text-amber-700 text-center">{viewingParticipant.prize || 'Claimable'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[11px] font-medium text-slate-400 uppercase tracking-normal">Contact Details</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                                        <span className="text-[11px] font-bold text-slate-400">Email Address</span>
                                        <span className="text-[11px] font-medium text-slate-700">{viewingParticipant.email}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                                        <span className="text-[11px] font-bold text-slate-400">Mobile Number</span>
                                        <span className="text-[11px] font-medium text-slate-700">{viewingParticipant.phone}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                                        <span className="text-[11px] font-bold text-slate-400">Registration Date</span>
                                        <span className="text-[11px] font-medium text-slate-700">{viewingParticipant.joinedAt}</span>
                                    </div>
                                </div>
                            </div>

                            {viewingParticipant.prizeStatus !== 'Awarded' ? (
                                <button
                                    onClick={() => { setAwardingId(viewingParticipant.id); setViewingParticipant(null); }}
                                    className="w-full mt-8 bg-sky-500 text-white py-4 rounded-2xl font-medium text-[12px] uppercase tracking-normal shadow-xl shadow-sky-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Award size={18} /> Award Prize Now
                                </button>
                            ) : (
                                <div className="mt-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                                    <CheckCircle className="text-emerald-500" size={20} />
                                    <div>
                                        <p className="text-[11px] font-medium text-emerald-800 uppercase">Prize Awarded</p>
                                        <p className="text-[10px] font-bold text-emerald-600">{viewingParticipant.prizeNote || 'Awarded by Administrator'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────

const EventsAdmin = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createLoading, setCreateLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newEventData, setNewEventData] = useState({
        title: '',
        tag: 'Quiz',
        fee: 10,
        prize: '₹500',
        startTime: 'Live Now',
        status: 'Active'
    });

    const fetchEvents = async () => {
        try {
            const res = await api.get('/admin/events');
            if (res.success && res.data) {
                setEvents(res.data.map(e => ({
                    ...e,
                    id: e._id // map DB _id to id so overview/tabs continue to work perfectly
                })));
            }
        } catch (err) {
            console.error("Failed to load events from server:", err);
            showToast("Failed to load events", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleUpdateEvent = async (eventId, updates) => {
        try {
            const res = await api.put(`/admin/events/${eventId}`, updates);
            if (res.success) {
                showToast("Event updated successfully", "success");
                await fetchEvents();
            }
        } catch (err) {
            console.error("Failed to update event:", err);
            showToast("Failed to update event", "error");
        }
    };

    const handleDeleteEvent = async (eventId) => {
        try {
            const res = await api.delete(`/admin/events/${eventId}`);
            if (res.success) {
                showToast("Event deleted successfully", "success");
                await fetchEvents();
            }
        } catch (err) {
            console.error("Failed to delete event:", err);
            showToast("Failed to delete event", "error");
        }
    };

    const handleAddEvent = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            // Setup default config templates based on tag
            let defaultConfig = {};
            if (newEventData.tag === 'Quiz') {
                defaultConfig = {
                    questions: [
                        { question: "What is the capital of India?", options: ["Mumbai", "New Delhi", "Kolkata", "Chennai"], answer: 1 }
                    ]
                };
            } else if (newEventData.tag === 'Draw') {
                defaultConfig = {
                    prizes: [
                        { label: '50 Coins', coins: 50, cash: 0 },
                        { label: '₹100', coins: 0, cash: 100 }
                    ]
                };
            } else if (newEventData.tag === 'Brain') {
                defaultConfig = {
                    cards: [
                        { icon: 'Trophy', color: 'text-amber-500' },
                        { icon: 'Zap', color: 'text-blue-500' },
                        { icon: 'Heart', color: 'text-rose-500' },
                        { icon: 'Star', color: 'text-emerald-500' },
                        { icon: 'Ghost', color: 'text-purple-500' },
                        { icon: 'Gem', color: 'text-indigo-500' }
                    ],
                    peekTime: 2.5,
                    maxTime: 60
                };
            }

            const res = await api.post('/admin/events', {
                ...newEventData,
                config: defaultConfig
            });

            if (res.success) {
                showToast("Event created successfully!", "success");
                setIsAddModalOpen(false);
                setNewEventData({
                    title: '',
                    tag: 'Quiz',
                    fee: 10,
                    prize: '₹500',
                    startTime: 'Live Now',
                    status: 'Active'
                });
                await fetchEvents();
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to create event", "error");
        } finally {
            setCreateLoading(false);
        }
    };

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="p-6 animate-in fade-in duration-500 font-['Poppins']">
            {toast && <Toast msg={toast.msg} type={toast.type} />}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <PageHeader title="Events & Contests" subtitle="Manage live events, content, and participants" />
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-sky-500 text-white rounded-2xl font-medium text-[12px] uppercase tracking-normal shadow-lg shadow-sky-200 hover:bg-sky-600 active:scale-95 transition-all font-['Poppins']"
                >
                    <Plus size={16} /> Add Event
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 mt-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit">
                <TabBtn active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={Trophy} label="Events" />
                <TabBtn active={activeTab === 'content'} onClick={() => setActiveTab('content')} icon={Edit3} label="Content Editor" />
                <TabBtn active={activeTab === 'participants'} onClick={() => setActiveTab('participants')} icon={Users} label="Participants" />
            </div>

            {loading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {activeTab === 'overview' && (
                        <OverviewTab events={events} onUpdateEvent={handleUpdateEvent} onDeleteEvent={handleDeleteEvent} onShowToast={showToast} />
                    )}
                    {activeTab === 'content' && (
                        <ContentTab events={events} onRefreshEvents={fetchEvents} onShowToast={showToast} />
                    )}
                    {activeTab === 'participants' && (
                        <ParticipantsTab events={events} onShowToast={showToast} />
                    )}
                </>
            )}

            {/* Add Event Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 font-['Poppins']">
                        <form onSubmit={handleAddEvent} className="p-8 relative space-y-6 font-['Poppins']">
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <X size={20} />
                            </button>

                            <div>
                                <h2 className="text-2xl font-medium text-slate-800 tracking-tight font-['Poppins']">Create New Event</h2>
                                <p className="text-slate-400 font-bold text-xs mt-1 font-['Poppins']">Configure event metadata and default parameters</p>
                            </div>

                            <div className="space-y-4 font-['Poppins']">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal font-['Poppins']">Event Title</label>
                                    <input
                                        required
                                        value={newEventData.title}
                                        onChange={e => setNewEventData(p => ({ ...p, title: e.target.value }))}
                                        placeholder="e.g. Daily Brain Quiz"
                                        className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-sky-400 focus:bg-white transition-all font-['Poppins']"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal font-['Poppins']">Game Type</label>
                                        <select
                                            value={newEventData.tag}
                                            onChange={e => setNewEventData(p => ({ ...p, tag: e.target.value }))}
                                            className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-sky-400 focus:bg-white font-['Poppins']"
                                        >
                                            <option value="Quiz">Quiz Game</option>
                                            <option value="Draw">Lucky Draw</option>
                                            <option value="Brain">Memory Master</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal font-['Poppins']">Entry Fee (Coins)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            value={newEventData.fee}
                                            onChange={e => setNewEventData(p => ({ ...p, fee: Math.max(0, +e.target.value) }))}
                                            className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-sky-400 focus:bg-white font-['Poppins']"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal font-['Poppins']">Pool Prize Description</label>
                                        <input
                                            required
                                            value={newEventData.prize}
                                            onChange={e => setNewEventData(p => ({ ...p, prize: e.target.value }))}
                                            placeholder="e.g. ₹500 Pool"
                                            className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-sky-400 focus:bg-white font-['Poppins']"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal font-['Poppins']">Start Time</label>
                                        <input
                                            required
                                            value={newEventData.startTime}
                                            onChange={e => setNewEventData(p => ({ ...p, startTime: e.target.value }))}
                                            className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-sky-400 focus:bg-white font-['Poppins']"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal font-['Poppins']">Status</label>
                                    <select
                                        value={newEventData.status}
                                        onChange={e => setNewEventData(p => ({ ...p, status: e.target.value }))}
                                        className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-sky-400 focus:bg-white font-['Poppins']"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Draft">Draft</option>
                                        <option value="Coming Soon">Coming Soon</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={createLoading}
                                className="w-full bg-sky-500 disabled:bg-sky-300 text-white py-4 rounded-2xl font-medium text-[12px] uppercase tracking-normal shadow-xl shadow-sky-200 hover:bg-sky-600 active:scale-95 transition-all flex items-center justify-center gap-2 font-['Poppins']"
                            >
                                {createLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span className="font-['Poppins']">Creating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus size={16} /> <span className="font-['Poppins']">Create Event</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventsAdmin;
