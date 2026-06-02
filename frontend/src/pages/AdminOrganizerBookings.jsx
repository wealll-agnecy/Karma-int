import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Spinner } from 'react-bootstrap';
import { FaArrowLeft, FaCalendarAlt, FaMapMarkerAlt, FaUsers, FaArrowRight, FaTicketAlt } from 'react-icons/fa';
import * as adminBookingApi from '../api/adminBookingApi';
import toast from 'react-hot-toast';

const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    card: { background: 'rgba(255,255,255,0.97)', border: '1px solid #ede8f4', borderRadius: '22px', boxShadow: '0 8px 32px rgba(100,60,180,0.07)', transition: 'all .3s ease', overflow: 'hidden' },
};

const AdminOrganizerBookings = () => {
    const { organizerId } = useParams();
    const [eventGroups, setEventGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!organizerId || organizerId === 'undefined') { setLoading(false); return; }
        const fetchBookings = async () => {
            try {
                const res = await adminBookingApi.getOrganizerBookings(organizerId);
                setEventGroups(res.data.data);
            } catch (err) {
                console.error('Error fetching bookings:', err);
                toast.error('Failed to load bookings');
            } finally { setLoading(false); }
        };
        fetchBookings();
    }, [organizerId]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fdf7ff' }}>
            <Spinner animation="border" style={{ color: '#8b5cf6', width: '2.5rem', height: '2.5rem' }} />
        </div>
    );

    return (
        <div style={P.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>
                {/* Header */}
                <div style={{ padding: '40px 0 28px', display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                    <Link to="/admin/bookings"
                        style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0, boxShadow: '0 6px 20px rgba(139,92,246,.25)', transition: 'all .2s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(139,92,246,.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(139,92,246,.25)'; }}
                    >
                        <FaArrowLeft color="#fff" size={18} />
                    </Link>
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '6px' }}>Admin Portal</div>
                        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-1.5px', color: '#1e1b2e', margin: 0 }}>Organizer's Events</h1>
                        <p style={{ color: '#6b7280', marginTop: '6px', marginBottom: 0, fontSize: '0.9rem' }}>Operational intelligence across all deployment nodes.</p>
                    </div>
                </div>

                {eventGroups.length === 0 ? (
                    <div style={{ ...P.card, textAlign: 'center', padding: '80px 24px' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.15 }}>🔭</div>
                        <h4 style={{ fontWeight: 800, color: '#1e1b2e', marginBottom: '8px' }}>No events detected for this host.</h4>
                        <p style={{ color: '#6b7280', marginBottom: '28px' }}>When this node initializes events, they will appear in the registry.</p>
                        <Link to="/admin/bookings"
                            style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 600, fontSize: '0.9rem', padding: '12px 28px', textDecoration: 'none', display: 'inline-block', boxShadow: '0 6px 20px rgba(139,92,246,.25)' }}
                        >Return to Registry</Link>
                    </div>
                ) : (
                    <Row className="g-4 mb-5">
                        {eventGroups.map((group) => (
                            <Col key={group.event._id} xl={4} lg={6} md={6}>
                                <div style={{ ...P.card, height: '100%', display: 'flex', flexDirection: 'column', transition: 'all .3s ease' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 18px 48px rgba(100,60,180,0.13)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(100,60,180,0.07)'; }}
                                >
                                    {/* Event Image */}
                                    <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                                        <img
                                            src={group.event.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80'}
                                            alt={group.event.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s ease' }}
                                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                        />
                                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(30,27,46,0.7) 0%, transparent 60%)' }} />
                                        {group.event.category && (
                                            <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderRadius: '999px', padding: '4px 12px', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1e1b2e' }}>
                                                {group.event.category}
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Body */}
                                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <h5 style={{ fontWeight: 800, color: '#1e1b2e', marginBottom: '16px', letterSpacing: '-0.4px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {group.event.title}
                                        </h5>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '0.8rem', fontWeight: 600 }}>
                                                <FaCalendarAlt size={12} color="#ec4899" />
                                                {new Date(group.event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '0.8rem', fontWeight: 600 }}>
                                                <FaUsers size={12} color="#ec4899" />
                                                {group.bookings.length} Guests
                                            </div>
                                        </div>

                                        <Link to={`/admin/event-attendees/${group.event._id}`}
                                            style={{ marginTop: 'auto', background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 600, fontSize: '0.85rem', padding: '12px 20px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(139,92,246,.2)', transition: 'all .2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(139,92,246,.3)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(139,92,246,.2)'; }}
                                        >
                                            View Attendees <FaArrowRight size={12} />
                                        </Link>
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                )}
            </Container>
        </div>
    );
};

export default AdminOrganizerBookings;
