import apiClient from './apiClient';

const API_URL = '/api/v1/organizer';

export const getStaff = () => apiClient.get(`${API_URL}/staff`);
export const createStaff = (staffData) => apiClient.post(`${API_URL}/staff`, staffData);
export const deleteStaff = (id) => apiClient.delete(`${API_URL}/staff/${id}`);

export const getLeads = () => apiClient.get(`${API_URL}/leads`);
export const updateLead = (id, data) => apiClient.put(`${API_URL}/leads/${id}`, data);

export const updateEventLandingPage = (id, landingPageConfig) => apiClient.put(`${API_URL}/events/${id}/landing-page`, { landingPageConfig });
