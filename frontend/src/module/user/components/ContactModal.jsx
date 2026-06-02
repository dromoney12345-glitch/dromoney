import React from 'react';
import { X, Mail, Phone, MapPin, MessageCircle, Building2 } from 'lucide-react';

const ContactModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
            
            <div className="relative bg-white w-full max-w-[280px] sm:max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-transparent flex justify-between items-start text-white">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-medium text-white text-lg tracking-tight">Contact Support</h3>
                            <p className="text-[9px] uppercase tracking-widest text-slate-300 font-medium">24/7 Enterprise Helpdesk</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-slate-200 hover:bg-white/20 transition-colors active:scale-95 shadow-sm">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100/50 shrink-0">
                            <Mail size={16} className="text-sky-500" strokeWidth={2.5} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Email Support</p>
                            <p className="text-[13px] font-medium text-slate-800 truncate">support@earningapp.com</p>
                        </div>
                    </div>

                    <div className="p-3 sm:p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100/50 shrink-0">
                            <Phone size={16} className="text-amber-500" strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Toll-Free Helpline</p>
                            <p className="text-[13px] font-medium text-slate-800">1800-123-4567</p>
                        </div>
                    </div>

                    <div className="p-3 sm:p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100/50 shrink-0">
                            <MapPin size={16} className="text-rose-500" strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Corporate Office</p>
                            <p className="text-[11px] font-medium text-slate-800 leading-snug truncate">124 Cyber Hub, Gurugram</p>
                        </div>
                    </div>
                </div>

                <div className="p-5 bg-sky-50 border-t border-sky-100">
                    <button 
                        onClick={() => window.open('https://api.whatsapp.com/send?phone=919876543210', '_blank')}
                        className="w-full py-3.5 bg-emerald-500 text-white font-medium text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2">
                        <MessageCircle size={16} strokeWidth={2.5} /> Chat on WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ContactModal;
