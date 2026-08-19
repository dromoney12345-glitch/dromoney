/**
 * Task Storage Service
 * Completions are stored with timestamps so daily tasks can renew.
 */

const TASKS_KEY = 'dromoney_tasks';
const COMPLETED_TASKS_KEY = 'dromoney_completed_tasks';

const INITIAL_TASKS = [
    { 
        id: '1', 
        type: 'Web', 
        title: 'Visit Website Page', 
        description: 'Stay for 15s to earn rewards.', 
        reward: 1, 
        icon: 'Monitor',
        config: { url: 'https://google.com', timer: 15 }
    },
    { 
        id: '2', 
        type: 'Video', 
        title: 'Watch Video Task', 
        description: 'Watch this short video to earn rewards.', 
        reward: 1, 
        icon: 'Youtube',
        config: { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', timer: 30 }
    },
    { 
        id: '3', 
        type: 'Quiz', 
        title: 'Simple Quiz Task', 
        description: 'Answer 1 question correctly.', 
        reward: 1, 
        icon: 'Lightbulb',
        config: { question: 'What is the color of the sky?', options: ['Red', 'Blue', 'Green', 'Yellow'], answer: 'Blue' }
    },
    { 
        id: '4', 
        type: 'Spin', 
        title: 'Spin Wheel Task', 
        description: 'Try your luck and win coins!', 
        reward: 1, 
        icon: 'Disc',
        config: { min: 1, max: 10 }
    },
    { 
        id: '5', 
        type: 'Memory', 
        title: 'Memory Master', 
        description: 'Match emoji pairs in a grid.', 
        reward: 1, 
        icon: 'Zap',
        config: { grid: 6 } 
    },
    { 
        id: '6', 
        type: 'Treasure', 
        title: 'Treasure Chest', 
        description: 'Pick the right box!', 
        reward: 1, 
        icon: 'Rocket',
        config: { boxes: 3 }
    },
    { 
        id: '7', 
        type: 'Tapper', 
        title: 'Speed Tapper', 
        description: 'Tap 25 times fast!', 
        reward: 1, 
        icon: 'Zap',
        config: { target: 25, duration: 10 }
    },
    { 
        id: '8', 
        type: 'Scratch', 
        title: 'Magic Scratch Card', 
        description: 'Rub to reveal hidden coins.', 
        reward: 1, 
        icon: 'Sparkles',
        config: { threshold: 80 }
    },
    { 
        id: '9', 
        type: 'Share', 
        title: 'Share Platform Task', 
        description: 'Share on WhatsApp / Social.', 
        reward: 1, 
        icon: 'MessageCircle',
        config: { url: 'https://dromoney.com', text: 'Hey, join Dromoney and start earning daily coins!' }
    },
    { 
        id: '10', 
        type: 'Proof', 
        title: 'Like & Follow Task', 
        description: 'Follow our page and upload proof.', 
        reward: 1, 
        icon: 'Instagram',
        config: { url: 'https://instagram.com', instructions: 'Go to the link, follow, and take a screenshot.' }
    }
];

const normalizeEntries = (raw) => {
    if (!Array.isArray(raw)) return [];
    // Legacy format was plain string IDs with no timestamp — those blocked renew forever on mobile.
    // Drop them so tasks can renew; only keep timestamped entries.
    return raw
        .filter((item) => item && typeof item === 'object' && item.taskId)
        .map((item) => ({
            taskId: String(item.taskId),
            completedAt: item.completedAt || new Date().toISOString()
        }));
};

export const taskStorage = {
    getTasks: () => {
        const stored = localStorage.getItem(TASKS_KEY);
        const currentTasks = stored ? JSON.parse(stored) : null;

        if (!currentTasks || currentTasks.length < 10) {
            const normalizedInitial = INITIAL_TASKS.map(t => ({
                ...t,
                id: t._id || t.id,
                _id: t._id || t.id
            }));
            localStorage.setItem(TASKS_KEY, JSON.stringify(normalizedInitial));
            return normalizedInitial;
        }
        return currentTasks.map(t => ({
            ...t,
            id: t._id || t.id,
            _id: t._id || t.id
        }));
    },
    
    syncTasks: (serverTasks) => {
        if (!serverTasks || !Array.isArray(serverTasks)) return;
        const normalized = serverTasks.map(t => ({
            ...t,
            id: t._id || t.id,
            _id: t._id || t.id
        }));
        localStorage.setItem(TASKS_KEY, JSON.stringify(normalized));
    },

    saveTask: (task) => {
        const tasks = taskStorage.getTasks();
        const newTask = { 
            ...task, 
            id: Date.now().toString(),
            status: 'Active' 
        };
        const updated = [...tasks, newTask];
        localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
        return newTask;
    },

    deleteTask: (id) => {
        const tasks = taskStorage.getTasks();
        const updated = tasks.filter(t => t.id !== id);
        localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
    },

    updateTask: (id, updatedData) => {
        const tasks = taskStorage.getTasks();
        const updated = tasks.map(t => t.id === id ? { ...t, ...updatedData } : t);
        localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
    },

    markComplete: (taskId) => {
        const entries = normalizeEntries(JSON.parse(localStorage.getItem(COMPLETED_TASKS_KEY) || '[]'));
        const id = String(taskId);
        const without = entries.filter(e => e.taskId !== id);
        without.push({ taskId: id, completedAt: new Date().toISOString() });
        localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify(without));
    },

    /**
     * Returns completed task IDs still active since the last renewal tick.
     * Pass sinceDate (Date) to filter; without it returns all IDs (legacy callers).
     */
    getCompletedTasks: (sinceDate) => {
        const entries = normalizeEntries(JSON.parse(localStorage.getItem(COMPLETED_TASKS_KEY) || '[]'));
        if (!sinceDate) {
            return entries.map(e => e.taskId);
        }
        const sinceMs = new Date(sinceDate).getTime();
        const active = entries.filter(e => new Date(e.completedAt).getTime() >= sinceMs);
        // Persist pruned list so old completions don't stick forever on mobile
        if (active.length !== entries.length) {
            localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify(active));
        }
        return active.map(e => e.taskId);
    },

    clearCompletedBefore: (sinceDate) => {
        const entries = normalizeEntries(JSON.parse(localStorage.getItem(COMPLETED_TASKS_KEY) || '[]'));
        const sinceMs = new Date(sinceDate).getTime();
        const active = entries.filter(e => new Date(e.completedAt).getTime() >= sinceMs);
        localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify(active));
        return active.map(e => e.taskId);
    }
};
