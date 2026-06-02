import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Spinner, Badge } from 'react-bootstrap';
import { FaUserTie, FaCalendarAlt, FaTicketAlt, FaChevronRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import * as adminBookingApi from '../api/adminBookingApi';
import toast from 'react-hot-toast';
import '../css/dashboard.css';
import '../css/AdminStyles.css';

const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    card: { background: 'rgba(255,255,255,0.97)', border: '1px solid #ede8f4', borderRadius: '22px', boxShadow: '0 8px 32px rgba(100,60,180,0.07)', transition: 'all .3s ease', padding: '28px' },
    label: { fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#9ca3af' },
};

const AdminBookings = () => {
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrganizers = async () => {
            try {
                const res = await adminBookingApi.getOrganizersWithStats();
                setOrganizers(res.data.data);
            } catch (err) {
                console.error('Error fetching organizers:', err);
                if (err.response && err.response.status === 401) {
                    toast.error('Session expired. Redirecting to login...');
                    setTimeout(() => { window.location.href = '/login'; }, 1500);
                } else {
                    toast.error('Failed to load organizers');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchOrganizers();
    }, []);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100" style={{ background: '#fdf7ff' }}>
            <Spinner animation="border" style={{ color: '#8b5cf6', width: '2.5rem', height: '2.5rem' }} />
        </div>
    );

    return (
        <div style={P.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>
                {/* Header */}
                <div style={{ padding: '40px 0 32px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '8px' }}>Admin Portal</div>
                    <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-1.5px', color: '#1e1b2e', margin: 0 }}>Organizers</h1>
                    <p style={{ color: '#6b7280', marginTop: '6px', marginBottom: 0, fontSize: '0.9rem' }}>Real-time performance metrics and node management across all event hosts.</p>
                </div>

                {organizers.length === 0 ? (
                    <div style={{ ...P.card, textAlign: 'center', padding: '80px 24px' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.2 }}>🔭</div>
                        <h4 style={{ fontWeight: 800, color: '#1e1b2e', marginBottom: '8px' }}>No organizers detected.</h4>
                        <p style={{ color: '#6b7280', margin: 0 }}>The registry is currently empty. Incoming host nodes will appear here.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="d-none d-lg-block mb-5">
                            <div style={{ ...P.card, padding: 0, overflow: 'hidden' }}>
                                <Table className="m-0 align-middle">
                                    <thead>
                                        <tr style={{ background: '#f8f7fc', borderBottom: '1.5px solid #ede8f4' }}>
                                            {['Organizer Node', 'Mobile Number', 'Active Events', 'Engagement', 'Management'].map((h, i) => (
                                                <th key={i} style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', border: 'none', textAlign: i >= 2 ? 'center' : 'left', textAlignLast: i === 4 ? 'right' : undefined }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {organizers.map((org) => (
                                            <tr key={org._id}
                                                style={{ borderTop: '1px solid #f3f4f6', transition: 'background .2s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '16px 20px', border: 'none' }}>
                                                    <Link to={`/admin/bookings/${org._id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: '#6d28d9', flexShrink: 0 }}>
                                                            {org.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.9rem' }}>{org.name}</div>
                                                            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{org.email}</div>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td style={{ padding: '16px 20px', border: 'none', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>{org.phone || 'N/A'}</span>
                                                </td>
                                                <td style={{ padding: '16px 20px', border: 'none', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e1b2e', lineHeight: 1 }}>{org.totalEvents}</div>
                                                    <div style={{ fontSize: '0.62rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '3px' }}>Units</div>
                                                </td>
                                                <td style={{ padding: '16px 20px', border: 'none', textAlign: 'center' }}>
                                                    <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: '999px', padding: '6px 14px', fontSize: '0.72rem', fontWeight: 700 }}>
                                                        <FaTicketAlt style={{ marginRight: '5px', fontSize: '0.65rem' }} />{org.totalBookings} Attendees
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 20px', border: 'none', textAlign: 'right' }}>
                                                    <Button as={Link} to={`/admin/bookings/${org._id}`}
                                                        style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 600, fontSize: '0.78rem', padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(139,92,246,.2)' }}
                                                    >
                                                        Events <FaChevronRight size={9} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </div>

                        {/* Mobile Cards */}
                        <div className="d-lg-none d-flex flex-column gap-3 mb-5">
                            {organizers.map((org) => (
                                <div key={org._id} style={{ ...P.card, padding: '20px', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg,#d946ef,#8b5cf6)' }} />
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '12px', flexWrap: 'wrap' }}>
                                        <Link to={`/admin/bookings/${org._id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
                                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: '#6d28d9', flexShrink: 0 }}>
                                                {org.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.name}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.email}</div>
                                            </div>
                                        </Link>
                                        <Button as={Link} to={`/admin/bookings/${org._id}`}
                                            style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 600, fontSize: '0.75rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}
                                        >
                                            Events <FaChevronRight size={9} />
                                        </Button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', background: '#f8f7fc', borderRadius: '14px', padding: '12px' }}>
                                        {[
                                            { label: 'Phone', value: org.phone || 'N/A' },
                                            { label: 'Events', value: `${org.totalEvents} Units` },
                                            { label: 'Guests', value: org.totalBookings },
                                        ].map((item, i) => (
                                            <div key={i} style={{ textAlign: 'center', borderRight: i < 2 ? '1px solid #ede8f4' : 'none', paddingRight: i < 2 ? '8px' : 0 }}>
                                                <div style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: '4px' }}>{item.label}</div>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Container>
        </div>
    );
};

export default AdminBookings;
