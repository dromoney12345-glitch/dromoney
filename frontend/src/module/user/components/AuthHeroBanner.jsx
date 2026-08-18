import React from 'react';

/**
 * Hero banner for auth screens — illustration only (no Hindi text).
 * Matches mockup: Hello bubble + wallet / coins / phone on cream background.
 */
const AuthHeroBanner = () => (
    <div className="relative w-full max-w-[300px] mx-auto h-[128px] mb-1 shrink-0">
        <div className="absolute inset-0 rounded-2xl bg-[#FFFBF7] border border-[#F0E6DC]/80 overflow-hidden">
            {/* Soft blobs */}
            <div className="absolute top-1 right-8 w-20 h-20 bg-[#FFE8D6] rounded-full opacity-70" />
            <div className="absolute bottom-0 left-6 w-24 h-24 bg-[#E8F5EE] rounded-full opacity-60" />
            <div className="absolute top-6 left-10 w-3 h-3 text-[#F59E0B] opacity-80 text-[10px]">✦</div>
            <div className="absolute top-14 right-16 w-2 h-2 text-[#F59E0B] opacity-60 text-[8px]">✦</div>

            {/* Hello bubble */}
            <div className="absolute top-3 left-1/2 -translate-x-[42%] z-10 bg-[#FFF8F0] border border-[#EDE4DC] rounded-2xl px-5 py-2 shadow-sm">
                <span className="text-[22px] font-bold text-[#C45A1A] tracking-tight">Hello!</span>
            </div>

            {/* Wallet */}
            <div className="absolute bottom-3 left-[38%] -translate-x-1/2 w-[72px] h-[48px] bg-gradient-to-b from-[#8B4513] to-[#5D2E17] rounded-lg rounded-b-xl shadow-md z-[2]">
                <div className="absolute -top-2 left-1 right-1 h-3 bg-[#6B3410] rounded-t-md" />
                <div className="absolute top-1 left-2 right-2 h-1 bg-[#A0522D]/50 rounded" />
                {/* Bills */}
                <div className="absolute -top-4 left-3 w-8 h-5 bg-[#86EFAC] rounded-sm border border-[#4ADE80]/40 rotate-[-8deg]" />
                <div className="absolute -top-3 left-6 w-7 h-4 bg-[#BBF7D0] rounded-sm border border-[#4ADE80]/30 rotate-[4deg]" />
            </div>

            {/* Coins */}
            <div className="absolute bottom-2 left-[30%] w-7 h-7 rounded-full bg-gradient-to-br from-[#FCD34D] to-[#D97706] border-2 border-[#F59E0B] shadow-sm flex items-center justify-center text-[10px] font-bold text-[#92400E] z-[3]">
                ₹
            </div>
            <div className="absolute bottom-4 left-[26%] w-5 h-5 rounded-full bg-gradient-to-br from-[#FDE68A] to-[#F59E0B] border border-[#D97706] opacity-90 z-[2]" />

            {/* Phone */}
            <div className="absolute bottom-3 right-[22%] w-[34px] h-[52px] bg-white rounded-lg border-2 border-[#E5E7EB] shadow-sm z-[2] flex flex-col items-center justify-center pt-1">
                <div className="w-5 h-5 rounded-full bg-[#462211]/10 flex items-center justify-center">
                    <span className="text-[#462211] text-[11px] font-bold">✓</span>
                </div>
                <div className="mt-1 space-y-0.5">
                    <div className="w-4 h-0.5 bg-[#EDE4DC] rounded" />
                    <div className="w-3 h-0.5 bg-[#EDE4DC] rounded mx-auto" />
                </div>
            </div>

            {/* Plant */}
            <div className="absolute bottom-2 right-[14%] w-4 h-5 z-[1]">
                <div className="w-3 h-3 bg-[#86EFAC] rounded-full mx-auto -mb-1" />
                <div className="w-4 h-2.5 bg-[#F3E8E0] rounded-sm border border-[#EDE4DC]" />
            </div>
        </div>
    </div>
);

export default AuthHeroBanner;
