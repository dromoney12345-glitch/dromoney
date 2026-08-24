import React from 'react';

export const FUND_TASK_COMPLETE_MSG =
    'Aapka reward aur paisa Future Fund mein add ho jayega. Fund active hone par aapko paisa mil jayega.';

const VARIANT_CLASS = {
    cream: 'bg-[#FFF5F0] border border-[#EDE4DC] text-[#462211]',
    light: 'bg-emerald-50 border border-emerald-100 text-emerald-900',
    dark: 'bg-white/10 border border-white/15 text-white/90',
};

const FundRewardNotice = ({ variant = 'cream', className = '' }) => (
    <p className={`text-[11px] font-medium leading-snug rounded-xl px-3 py-2.5 text-center ${VARIANT_CLASS[variant] || VARIANT_CLASS.cream} ${className}`}>
        {FUND_TASK_COMPLETE_MSG}
    </p>
);

export default FundRewardNotice;
