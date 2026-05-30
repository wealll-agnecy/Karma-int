import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Button, Badge } from 'react-bootstrap';
import { FaBell, FaCheck, FaTrash } from 'react-icons/fa';
import firebaseRealtimeService from '../utils/socketService';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';

const OrganizerNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/v1/notifications');
            setNotifications(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
            toast.error('Failed to load notifications history.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user || !user._id) return;
        
        // Fetch historical
        fetchNotifications();

        // Connect realtime for new ones
        firebaseRealtimeService.connect(user._id);
        const handleNewNotif = (notif) => {
            setNotifications(prev => {
                if (prev.find(n => n.id === notif.id || n._id === notif.id)) return prev;
                return [notif, ...prev];
            });
        };

        firebaseRealtimeService.on('notification', handleNewNotif);

        return () => {
            firebaseRealtimeService.off('notification', handleNewNotif);
        };
    }, [user]);

    const markAsRead = async (id) => {
        try {
            await apiClient.patch(`/api/v1/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id || n.id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error(err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await apiClient.post('/api/v1/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            toast.success('All notifications marked as read.');
        } catch (err) {
            console.error(err);
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString();
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="dashboard-page">
            <Container fluid className="px-md-5">
                <div className="dashboard-header mb-5 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <div>
                        <h2 className="dashboard-title-main d-flex align-items-center gap-3">
                            <FaBell className="text-warning" /> Notifications
                            {unreadCount > 0 && <Badge bg="danger" pill className="fs-6">{unreadCount} New</Badge>}
                        </h2>
                        <p className="dashboard-subtext">Real-time alerts and activity log for your events.</p>
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="outline-light" onClick={markAllAsRead} className="rounded-pill px-4 border-secondary text-dark">
                            <FaCheck className="me-2" /> Mark All as Read
                        </Button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                    </div>
                ) : (
                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                        <div className="list-group list-group-flush">
                            {notifications.length > 0 ? (
                                notifications.map((n, idx) => {
                                    const id = n._id || n.id;
                                    return (
                                        <div 
                                            key={id || idx} 
                                            className={`list-group-item p-4 d-flex justify-content-between align-items-start transition-all ${!n.isRead ? 'bg-light border-start border-4 border-warning' : ''}`}
                                        >
                                            <div>
                                                <h6 className="fw-bold mb-1 text-dark">{n.title}</h6>
                                                <p className="mb-2 text-secondary">{n.message}</p>
                                                <small className="text-muted fw-semibold">{formatTime(n.createdAt)}</small>
                                            </div>
                                            {!n.isRead && (
                                                <Button 
                                                    variant="link" 
                                                    className="text-primary text-decoration-none shadow-none small fw-bold"
                                                    onClick={() => markAsRead(id)}
                                                >
                                                    Mark Read
                                                </Button>
                                            )}
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center p-5 text-muted">
                                    <FaBell size={40} className="mb-3 opacity-25" />
                                    <h5>No notifications yet</h5>
                                    <p>You're all caught up! New activity will appear here.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </Container>
        </div>
    );
};

export default OrganizerNotifications;
