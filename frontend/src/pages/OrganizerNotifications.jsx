import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Button } from 'react-bootstrap';
import { FaBell, FaCheck, FaCheckDouble } from 'react-icons/fa';
import firebaseRealtimeService from '../utils/socketService';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';

const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    card: { background: 'rgba(255,255,255,0.97)', border: '1px solid #ede8f4', borderRadius: '22px', boxShadow: '0 8px 32px rgba(100,60,180,0.07)', transition: 'all .3s ease', padding: '28px' },
};

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
        } finally { setLoading(false); }
    };

    useEffect(() => {
        if (!user || !user._id) return;
        fetchNotifications();
        firebaseRealtimeService.connect(user._id);
        const handleNewNotif = (notif) => {
            setNotifications(prev => {
                if (prev.find(n => n.id === notif.id || n._id === notif.id)) return prev;
                return [notif, ...prev];
            });
        };
        firebaseRealtimeService.on('notification', handleNewNotif);
        return () => { firebaseRealtimeService.off('notification', handleNewNotif); };
    }, [user]);

    const markAsRead = async (id) => {
        try {
            await apiClient.patch(`/api/v1/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id || n.id === id ? { ...n, isRead: true } : n));
        } catch (err) { console.error(err); }
    };

    const markAllAsRead = async () => {
        try {
            await apiClient.post('/api/v1/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            toast.success('All notifications marked as read.');
        } catch (err) { console.error(err); }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' — ' + d.toLocaleDateString();
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div style={P.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>
                {/* Header */}
                <div style={{ padding: '40px 0 28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '8px' }}>Organizer Portal</div>
                        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-1.5px', color: '#1e1b2e', margin: 0, display: 'flex', alignItems: 'center', gap: '14px' }}>
                            Notifications
                            {unreadCount > 0 && (
                                <span style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', borderRadius: '999px', padding: '4px 14px', fontSize: '0.8rem', fontWeight: 700 }}>
                                    {unreadCount} New
                                </span>
                            )}
                        </h1>
                        <p style={{ color: '#6b7280', marginTop: '6px', marginBottom: 0, fontSize: '0.9rem' }}>Real-time alerts and activity log for your events.</p>
                    </div>
                    {unreadCount > 0 && (
                        <button onClick={markAllAsRead}
                            style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 600, fontSize: '0.82rem', padding: '10px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 20px rgba(139,92,246,.25)' }}
                        >
                            <FaCheckDouble size={13} /> Mark All as Read
                        </button>
                    )}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px' }}>
                        <Spinner animation="border" style={{ color: '#8b5cf6', width: '2.5rem', height: '2.5rem' }} />
                    </div>
                ) : notifications.length === 0 ? (
                    <div style={{ ...P.card, textAlign: 'center', padding: '80px 24px' }}>
                        <FaBell size={52} color="#e9d5ff" style={{ marginBottom: '16px' }} />
                        <h4 style={{ fontWeight: 800, color: '#1e1b2e', marginBottom: '8px' }}>No notifications yet</h4>
                        <p style={{ color: '#6b7280', margin: 0 }}>You're all caught up! New activity will appear here.</p>
                    </div>
                ) : (
                    <div style={{ ...P.card, padding: 0, overflow: 'hidden', marginBottom: '40px' }}>
                        {notifications.map((n, idx) => {
                            const id = n._id || n.id;
                            return (
                                <div key={id || idx}
                                    style={{
                                        padding: '20px 24px',
                                        borderBottom: idx < notifications.length - 1 ? '1px solid #f3f4f6' : 'none',
                                        background: !n.isRead ? 'linear-gradient(135deg,#fdf4ff,#faf5ff)' : 'transparent',
                                        borderLeft: !n.isRead ? '4px solid #a78bfa' : '4px solid transparent',
                                        transition: 'background .2s',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        gap: '16px',
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '14px', flex: 1 }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                                            background: !n.isRead ? 'linear-gradient(135deg,#e9d5ff,#c4b5fd)' : '#f3f4f6',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <FaBell size={15} color={!n.isRead ? '#8b5cf6' : '#9ca3af'} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.9rem', marginBottom: '4px' }}>{n.title}</div>
                                            <p style={{ color: '#6b7280', fontSize: '0.83rem', margin: '0 0 6px', lineHeight: 1.6 }}>{n.message}</p>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600 }}>{formatTime(n.createdAt)}</div>
                                        </div>
                                    </div>
                                    {!n.isRead && (
                                        <button onClick={() => markAsRead(id)}
                                            style={{ background: 'transparent', border: '1.5px solid #c4b5fd', borderRadius: '10px', color: '#8b5cf6', padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all .2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <FaCheck size={10} /> Mark Read
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </Container>
        </div>
    );
};

export default OrganizerNotifications;
