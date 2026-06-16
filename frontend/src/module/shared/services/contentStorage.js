const INFO_KEY = 'dromoney_info_pages_v2';
const PROJECTS_KEY = 'dromoney_project_card_v1';

const DEFAULT_CONTENT = {
    'how-it-works': {
        title: 'How It Works',
        subtitle: 'Master the Dromoney Platform',
        sections: [
            { title: '1. Register & Verify', text: 'Create your account and complete a simple KYC to unlock all earning features safely.' },
            { title: '2. Explore Opportunities', text: 'Browse through affiliate projects, daily tasks, and exclusive business ideas tailored for you.' },
            { title: '3. Start Earning', text: 'Complete tasks or refer partners to accumulate coins and real cash in your dashboard.' },
            { title: '4. Instant Payouts', text: 'Withdraw your earnings directly to your bank account with our secure payment gateway.' }
        ]
    },
    'benefits': {
        title: 'User Benefits',
        subtitle: 'Why choose Dromoney?',
        sections: [
            { title: 'Financial Freedom', text: 'Access multiple income streams that you can manage from anywhere in the world.' },
            { title: 'Skill Development', text: 'Learn marketing and business strategies through our verified project frameworks.' },
            { title: 'Safe & Secure', text: 'Your data and earnings are protected by industry-leading security protocols.' },
            { title: 'Community Support', text: 'Join thousands of earners and get 24/7 assistance from our expert team.' }
        ]
    },
    'support': {
        title: 'Support Center',
        subtitle: 'We are here to help you 24/7',
        sections: [
            { title: 'Direct Assistance', text: 'Chat with our support executives for any technical or payment related queries.' },
            { title: 'Knowledge Base', text: 'Read our guides and FAQs to solve common issues instantly without waiting.' },
            { title: 'Email Support', text: 'For complex issues, reach us at support@dromoney.com for detailed resolutions.' }
        ]
    },
    'about': {
        title: 'About Dromoney',
        subtitle: 'Empowering Digital Earners',
        sections: [
            { title: 'Our Mission', text: 'To provide a transparent and efficient platform where everyone can monetize their digital presence.' },
            { title: 'The Platform', text: 'Dromoney is India\'s fastest growing affiliate and task-based earning ecosystem.' },
            { title: 'Transparency', text: 'We believe in fairness. Every payout and task is tracked with 100% precision.' }
        ]
    }
};

const DEFAULT_PROJECTS = {
    title: 'Dromoney Projects',
    description: 'Access exclusive high-ticket affiliate projects and scale your monthly income with verified partners.'
};

export const contentStorage = {
    getPages: () => {
        const saved = localStorage.getItem(INFO_KEY);
        if (saved) {
            return { ...DEFAULT_CONTENT, ...JSON.parse(saved) };
        }
        localStorage.setItem(INFO_KEY, JSON.stringify(DEFAULT_CONTENT));
        return DEFAULT_CONTENT;
    },
    updatePage: (pageId, data) => {
        const pages = contentStorage.getPages();
        if (pages[pageId] || DEFAULT_CONTENT[pageId]) {
            pages[pageId] = { ...pages[pageId], ...data };
            localStorage.setItem(INFO_KEY, JSON.stringify(pages));
        }
        return pages;
    },
    getProjects: () => {
        const saved = localStorage.getItem(PROJECTS_KEY);
        if (saved) return JSON.parse(saved);
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(DEFAULT_PROJECTS));
        return DEFAULT_PROJECTS;
    },
    updateProjects: (data) => {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(data));
        return data;
    }
};
