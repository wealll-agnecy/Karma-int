import apiClient from './apiClient';

const API_URL = '/api/v1/payments';

export const createRazorpayOrder = (amount, currency = 'INR', referenceData = {}) => {
    return apiClient.post(`${API_URL}/create-order`, { amount, currency, referenceData });
};

export const verifyRazorpayPayment = (paymentData) => {
    return apiClient.post(`${API_URL}/verify`, paymentData);
};
