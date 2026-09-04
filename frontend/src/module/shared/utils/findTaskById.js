import { taskStorage } from '../services/taskStorage';
import api from '../services/api';

/** Match Mongo `_id` or legacy `id` (string-safe). */
export function matchTaskId(task, id) {
    if (!task || id == null || id === '') return false;
    const target = String(id);
    return String(task._id || '') === target || String(task.id || '') === target;
}

/**
 * Resolve a task by route id from local cache, then public API.
 * Always preferred over find-by-`id`-only (API tasks often only have `_id`).
 */
export async function findTaskById(id) {
    if (id == null || id === '') return null;

    const fromStorage = taskStorage.getTasks().find((t) => matchTaskId(t, id));
    if (fromStorage) return fromStorage;

    try {
        const res = await api.get('/public/tasks');
        if (res.success && Array.isArray(res.data)) {
            taskStorage.syncTasks(res.data);
            return res.data.find((t) => matchTaskId(t, id)) || null;
        }
    } catch (err) {
        console.error('findTaskById: API fetch failed', err);
    }

    return null;
}
