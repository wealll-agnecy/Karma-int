import apiClient from './apiClient';

const API_URL = '/api/v1/analytics';

export const getOrganizerStats = async () => {
    return await apiClient.get(`${API_URL}/organizer`);
};

export const getOrganizerDashboardStats = async () => {
    return await apiClient.get(`${API_URL}/organizer`);
};

export const getEventDashboardStats = async (eventId) => {
    // Falls back to organizer endpoint since event dashboard uses same aggregation in this MVP
    return await apiClient.get(`${API_URL}/organizer`);
};

export const getEventStats = async (eventId) => {
    return { data: { success: true, data: {} } }; // Dummy for specRes
};

export const getEventRecentBookings = async (eventId) => {
    return { data: { success: true, data: [] } };
};

export const getOrganizerRecentBookings = async () => {
    return { data: { success: true, data: [] } };
};

export const getAdminStats = async () => {
    return await apiClient.get(`${API_URL}/admin`);
};

export const getEventAttendees = async (eventId) => {
    return await apiClient.get(`${API_URL}/event/${eventId}/attendees`);
};

export const getOrganizerRevenue = async () => {
    return await apiClient.get('/api/v1/organizer/revenue');
};
