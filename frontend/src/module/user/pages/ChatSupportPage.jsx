import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, ShieldAlert, CreditCard, Loader2 } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';
import PaymentModal from '../components/PaymentModal';

const SUPPORT_RENEWAL_AMOUNT = 150;
const SUPPORT_RENEWAL_DAYS = 90;

const ChatSupportPage = () => {
    const navigate = useNavigate();
    const { userData, refreshUserProfile, addNotification } = useUser();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [showRenewalModal, setShowRenewalModal] = useState(false);
    const scrollRef = useRef(null);

    const hasActiveSupport = userData?.supportExpiry && new Date(userData.supportExpiry) > new Date();
    const daysLeft = hasActiveSupport
        ? Math.ceil((new Date(userData.supportExpiry) - new Date()) / (1000 * 60 * 60 * 24))
        : 0;

    useEffect(() => {
        if (hasActiveSupport) fetchMessages();
        const interval = setInterval(() => {
            if (hasActiveSupport) fetchMessages();
        }, 5000);
        return () => clearInterval(interval);
    }, [hasActiveSupport]);

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
            console.error('Chat error', err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending || !hasActiveSupport) return;

        setSending(true);
        try {
            const res = await api.post('/chat', { message: newMessage });
            if (res.success) {
                setMessages([...messages, res.data]);
                setNewMessage('');
                if (!userData.businessHubFirstAccessedAt) refreshUserProfile();
            }
        } catch (err) {
            addNotification('Error', err.message || 'Message failed to send', 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col font-['Poppins',sans-serif] bg-[#FCF8F5]" style={{ height: 'calc(100vh - 48px - 80px)', overflow: 'hidden' }}>
            <div className="bg-white border-b border-[#F3E8E0] px-4 py-2.5 flex items-center gap-3 shrink-0">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="w-8 h-8 bg-[#FCF8F5] rounded-lg flex items-center justify-center text-[#462211] active:scale-95 transition-all border border-[#EDE4DC]"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-semibold text-[#462211] tracking-tight leading-none">Support Chat</h1>
                    <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online
                        </p>
                        {hasActiveSupport && (
                            <p className="text-[8px] font-semibold text-[#462211] bg-[#FDF4EA] px-2 py-0.5 rounded-full uppercase tracking-tight">
                                {daysLeft} Days Left
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
                {messages.length === 0 && hasActiveSupport && (
                    <div className="text-center py-12">
                        <div className="w-14 h-14 bg-[#FDF4EA] text-[#462211] rounded-full flex items-center justify-center mx-auto mb-3">
                            <Send size={24} />
                        </div>
                        <h3 className="text-xs font-semibold text-[#462211] uppercase tracking-tight">Ask us anything!</h3>
                        <p className="text-[10px] font-medium text-[#9A8478] mt-1 uppercase tracking-wider leading-relaxed px-8">Our expert team is here to guide your business journey.</p>
                    </div>
                )}

                {hasActiveSupport && messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[12px] font-medium leading-relaxed
                            ${m.sender === 'user' ? 'bg-[#462211] text-white rounded-tr-sm' : 'bg-white text-slate-800 rounded-tl-sm border border-[#EDE4DC] shadow-sm'}`}>
                            {m.message}
                            <p className="text-[8px] opacity-60 mt-1 text-right font-medium">
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {!hasActiveSupport && (
                    <div className="bg-[#FFF5F0] border border-[#EDE4DC] rounded-2xl p-5 text-center space-y-3 mt-6">
                        <ShieldAlert className="mx-auto text-[#B85C1E]" size={28} />
                        <h4 className="text-xs font-semibold text-[#462211] uppercase tracking-tight">
                            {userData?.supportExpiry ? 'Support Plan Expired' : 'Support Chat Locked'}
                        </h4>
                        <p className="text-[11px] text-[#7A5648] font-medium leading-relaxed px-2">
                            Renew support chat for ₹{SUPPORT_RENEWAL_AMOUNT} and get {SUPPORT_RENEWAL_DAYS} days of expert help.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowRenewalModal(true)}
                            className="w-full bg-[#462211] text-white py-3 rounded-xl text-[11px] font-semibold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <CreditCard size={16} />
                            Renew · ₹{SUPPORT_RENEWAL_AMOUNT}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/user/business-ideas')}
                            className="w-full bg-white text-[#462211] border border-[#EDE4DC] py-3 rounded-xl text-[11px] font-semibold uppercase tracking-widest active:scale-95 transition-all"
                        >
                            View Premium Plans
                        </button>
                    </div>
                )}
            </div>

            {hasActiveSupport && (
                <div className="px-4 py-2.5 bg-white border-t border-[#F3E8E0] shrink-0">
                    <form onSubmit={handleSend} className="flex gap-2 items-center">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Describe your query..."
                            className="flex-1 bg-[#FCF8F5] border border-[#EDE4DC] rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-[#462211]/20 transition-all outline-none"
                        />
                        <button
                            type="submit"
                            disabled={sending || !newMessage.trim()}
                            className="w-11 h-11 bg-[#462211] text-white rounded-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-50 shadow-md shrink-0"
                        >
                            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </form>
                </div>
            )}

            {showRenewalModal && (
                <PaymentModal
                    isOpen={showRenewalModal}
                    onClose={() => setShowRenewalModal(false)}
                    plan="3 Months Support Extension"
                    type="SUPPORT_CHAT_RENEWAL"
                    extraData={{
                        planName: '3 Months Support Extension',
                        durationInDays: SUPPORT_RENEWAL_DAYS
                    }}
                    onSuccess={() => {
                        setShowRenewalModal(false);
                        refreshUserProfile?.();
                    }}
                />
            )}
        </div>
    );
};

export default ChatSupportPage;
