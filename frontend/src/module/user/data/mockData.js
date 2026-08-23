export const MOCK_USER = {
  name: "Rahul Sharma",
  id: "AFF-10903",
  mobile: "+91 98765 43210",
  isPaid: true, // Auto unlocked for testing tasks
  isBoosterActive: false,
  boosterDaysLeft: 0,
  earnings: {
    total: 1560,
    today: 210,
    referral: 850,
  },
  coins: {
    total: 450,
    history: [
      { id: 1, type: 'credit', amount: 3, source: 'Video Ad Task', date: '2026-04-05' },
      { id: 2, type: 'debit', amount: 50, source: 'Quiz Event Entry', date: '2026-04-04' },
      { id: 3, type: 'credit', amount: 3, source: 'Website Visit', date: '2026-04-04' },
    ],
  },
  referrals: {
    count: 6,
    code: "RAHUL660",
    link: "https://earningapp.com/join/RAHUL660",
  },
  futureFund: {
    progress: 65,
    criteria: [
      { id: 1, title: "15 Successful Sales", target: 15, current: 12, completed: false },
      { id: 2, title: "Daily 15 Min Activity", target: 15, current: 15, completed: true },
    ],
  },
  wallet: {
    balance: 450,
    transactions: [
      { id: 101, type: 'credit', amount: 200, title: 'Referral Bonus', status: 'Success', date: '2026-04-05' },
      { id: 102, type: 'debit', amount: 50, title: 'Event Entry Fee', status: 'Success', date: '2026-04-05' },
      { id: 103, type: 'withdrawal', amount: 500, title: 'Bank Payout', status: 'Pending', date: '2026-04-04' },
    ],
  },
};

export const TASKS = [
  { id: 1, title: "Visit Business Idea Page", description: "Explore the business idea page", reward: "Complete", actionText: "Complete", icon: "Monitor" },
  { id: 2, title: "Watch a Short Video", description: "Watch a video till the end", reward: "Complete", actionText: "Complete", icon: "Youtube" },
  { id: 3, title: "Answer a Simple Quiz", description: "Answer a quick question", reward: "Complete", actionText: "Complete", icon: "Lightbulb" },
  { id: 4, title: "Spin the Wheel", description: "Spin the wheel as a task", reward: "Play", actionText: "Spin Now >", actionType: "highlighted", icon: "Disc" },
  { id: 5, title: "Share Our Platform", description: "Share our link via WhatsApp", reward: "Complete", actionText: "Complete", icon: "MessageCircle" },
  { id: 6, title: "Upload Story for Us", description: "Upload our site story on Instagram", reward: "Complete", actionText: "Complete", icon: "Instagram" },
  { id: 7, title: "Like & Follow Us", description: "Like and follow our page", reward: "Complete", actionText: "Complete", icon: "ThumbsUp" },
  { id: 8, title: "Comment on Our Post", description: "Write a comment on our post", reward: "Complete", actionText: "Complete", icon: "MessageSquare" },
  { id: 9, title: "Open & Explore Link", description: "Open and explore an external site", reward: "Complete", actionText: "Upload Proof", actionType: "highlighted", icon: "Link" },
];

export const EVENTS = [
  { id: 201, title: "Mega Quiz Night", fee: 50, reward: "₹500", participants: 124, status: "Registering", time: "Tonight 8 PM" },
  { id: 202, title: "Referral Race", fee: 100, reward: "₹5000", participants: 45, status: "Ongoing", time: "Ends in 2 days" },
];

export const NOTIFICATIONS = [
  { id: 1, title: "Payment Received", message: "₹200 referral bonus credited for Sumeet.", time: "2m ago", type: "success" },
  { id: 2, title: "Booster Expiring", message: "Your Monthly Booster expires in 2 days. Renew now!", time: "1h ago", type: "warning" },
  { id: 3, title: "New Event Active", message: "Mega Quiz is now open for registration.", time: "3h ago", type: "info" },
  { id: 4, title: "Welcome to Platform", message: "Start sharing your link to earn big rewards.", time: "1d ago", type: "success" },
];

