import api from '../module/shared/services/api';

export const SettingsDataService = {
    getSettings: async () => {
        try {
            const response = await api.get('/admin/settings');
            return response.data;
        } catch (err) {
            console.error('Error fetching settings:', err);
            return null;
        }
    },

    saveSettings: async (newSettings) => {
        try {
            const response = await api.put('/admin/settings', newSettings);
            return response.data;
        } catch (err) {
            console.error('Error saving settings:', err);
            throw err;
        }
    },

    uploadImage: async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.post('/admin/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.url;
        } catch (err) {
            console.error('Error uploading image:', err);
            throw err;
        }
    }
};
