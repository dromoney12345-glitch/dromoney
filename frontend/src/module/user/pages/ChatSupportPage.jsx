import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, ShieldAlert, CreditCard, Loader2 } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';

const ChatSupportPage = () => {
    const navigate = useNavigate();
    const { userData, refreshUserProfile, addNotification } = useUser();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);

    // Subscription Check
    const isExpired = userData.supportExpiry && new Date(userData.supportExpiry) < new Date();

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const res = await api.get('/chat');
            if (res.success) {
                setMessages(res.data);
            }
        } catch (err) {
            console.error("Chat error", err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            const res = await api.post('/chat', { message: newMessage });
            if (res.success) {
                setMessages([...messages, res.data]);
                setNewMessage('');
                if (!userData.businessHubFirstAccessedAt) refreshUserProfile();
            }
        } catch (err) {
            addNotification("Error", "Message failed to send", "error");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col font-['Poppins',sans-serif]" style={{ height: 'calc(100vh - 48px - 80px)', overflow: 'hidden' }}>
            {/* Compact Header */}
            <div className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-3 shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-600 active:scale-95 transition-all border border-slate-100"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-semibold text-slate-900 tracking-tight leading-none">Support Chat</h1>
                    <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-[9px] font-semibold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online
                        </p>
                        {userData.supportExpiry && !isExpired && (
                            <p className="text-[8px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-tight">
                                {Math.ceil((new Date(userData.supportExpiry) - new Date()) / (1000 * 60 * 60 * 24))} Days Left
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Body - only this scrolls */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
                {messages.length === 0 && !isExpired && (
                    <div className="text-center py-12">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Send size={24} />
                        </div>
                        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-tight">Ask us anything!</h3>
                        <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider leading-relaxed px-8">Our expert team is here to guide your business journey.</p>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[12px] font-medium leading-relaxed
                            ${m.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 rounded-tl-sm border border-slate-100 shadow-sm'}`}>
                            {m.message}
                            <p className="text-[8px] opacity-60 mt-1 text-right font-medium">
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {isExpired && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-3">
                        <ShieldAlert className="mx-auto text-amber-500" size={28} />
                        <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-tight">Support Plan Expired</h4>
                        <p className="text-[10px] text-amber-600 font-medium leading-relaxed px-2">Your access to support has ended. Please unlock a business plan to continue.</p>
                        <button
                            onClick={() => navigate('/user/business-ideas')}
                            className="w-full bg-slate-900 text-white py-3 rounded-xl text-[11px] font-semibold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <CreditCard size={16} />
                            View Premium Plans
                        </button>
                    </div>
                )}
            </div>

            {/* Input - stays at bottom of the flex container */}
            {!isExpired && (
                <div className="px-4 py-2.5 bg-white border-t border-slate-100 shrink-0">
                    <form onSubmit={handleSend} className="flex gap-2 items-center">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Describe your query..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        />
                        <button
                            type="submit"
                            disabled={sending || !newMessage.trim()}
                            className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-50 shadow-md shrink-0"
                        >
                            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatSupportPage;
