import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Badge, Spinner, Modal, Table } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaPhone, FaTicketAlt, FaCalendarDay, FaWallet, FaArrowLeft, FaSearch, FaUsers, FaEye, FaFileExcel } from 'react-icons/fa';
import { formatCurrency } from '../utils/formatUtils';
import * as analyticsApi from '../api/analyticsApi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    card: { background: 'rgba(255,255,255,0.97)', border: '1px solid #ede8f4', borderRadius: '22px', boxShadow: '0 8px 32px rgba(100,60,180,0.07)', transition: 'all .3s ease', overflow: 'hidden' },
    statCard: (active, accent) => ({ background: '#fff', border: `1.5px solid ${active ? accent : '#ede8f4'}`, borderRadius: '18px', padding: '20px', cursor: 'pointer', boxShadow: active ? `0 8px 24px ${accent}20` : '0 4px 12px rgba(0,0,0,0.02)', transition: 'all .2s' }),
    label: { fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#9ca3af', display: 'block', marginBottom: '8px' },
};

const AdminEventAttendees = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);

    useEffect(() => {
        if (!eventId || eventId === 'undefined') { setLoading(false); return; }
        const fetchAttendees = async () => {
            try {
                const res = await analyticsApi.getEventAttendees(eventId);
                const rawData = res.data?.data || [];
                const flattened = rawData.flatMap(booking => 
                    (booking.attendeeDetails || []).map(attendee => ({
                        ...attendee,
                        ticketType: booking.ticketType || 'N/A',
                        plan: booking.selectedPlans?.label || booking.selectedPlans?.name || 'Standard',
                        totalAmount: booking.totalAmount || 0,
                        amountPaid: booking.amountPaid || 0,
                        paymentStatus: booking.paymentStatus || 'unknown',
                        orderId: booking.orderId || 'N/A',
                        bookingId: booking._id,
                        bookingDate: booking.createdAt,
                        rawBooking: booking
                    }))
                );
                setAttendees(flattened);
            } catch (err) {
                console.error('Error fetching attendees:', err);
                toast.error('Failed to load attendee list');
            } finally { setLoading(false); }
        };
        fetchAttendees();
    }, [eventId]);

    const filteredAttendees = attendees.filter(a => {
        const matchesSearch = (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (a.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (a.phone || '').includes(searchTerm);
        const matchesFilter = filterType === 'all' || (a.plan || '').toLowerCase() === filterType;
        return matchesSearch && matchesFilter;
    });

    const silverCount = attendees.filter(a => (a.plan || '').toLowerCase() === 'silver').length;
    const goldCount = attendees.filter(a => (a.plan || '').toLowerCase() === 'gold').length;
    const platinumCount = attendees.filter(a => (a.plan || '').toLowerCase() === 'platinum').length;

    const handleShowDetails = (attendee) => {
        const booking = attendee.rawBooking || {};
        setSelectedBooking({
            attendeeName: booking.user?.name || booking.attendeeDetails?.[0]?.name || attendee.name,
            email: booking.user?.email || booking.attendeeDetails?.[0]?.email || attendee.email,
            phone: booking.user?.phone || booking.attendeeDetails?.[0]?.phone || attendee.phone,
            eventName: booking.event?.title || attendee.eventName || 'Event',
            ticketTier: attendee.ticketType || booking.ticketType || 'Standard',
            bookedQuantity: booking.quantity || booking.attendeeDetails?.length || 1,
            attendeeDetails: booking.attendeeDetails || [attendee],
            selectedFood: booking.selectedFood || [],
            selectedAddons: booking.selectedAddons || [],
            totalAmount: booking.totalAmount || attendee.totalAmount || 0,
            amountPaid: booking.amountPaid || attendee.amountPaid || 0,
            remainingAmount: Math.max((booking.totalAmount || attendee.totalAmount || 0) - (booking.amountPaid || attendee.amountPaid || 0), 0)
        });
        setShowModal(true);
    };

    const handleExportExcel = () => {
        const data = filteredAttendees.map(attendee => ({
            Name: attendee.name,
            Email: attendee.email,
            Phone: attendee.phone,
            'Ticket Type': attendee.ticketType,
            'Booking Date': new Date(attendee.bookingDate).toLocaleDateString(),
            'Amount Paid': attendee.amountPaid,
            'Total Order': attendee.totalAmount
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendees");
        XLSX.writeFile(wb, `Attendees_${eventId}.xlsx`);
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fdf7ff' }}>
            <Spinner animation="border" style={{ color: '#8b5cf6', width: '2.5rem', height: '2.5rem' }} />
        </div>
    );

    return (
        <div style={P.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>
                {/* Header */}
                <div style={{ padding: '40px 0 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <button onClick={() => navigate(-1)}
                            style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', boxShadow: '0 6px 20px rgba(139,92,246,.25)', flexShrink: 0 }}
                        >
                            <FaArrowLeft size={18} />
                        </button>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '6px' }}>Attendee Registry</div>
                            <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 800, letterSpacing: '-1px', color: '#1e1b2e', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FaUsers color="#d946ef" size={28} /> Event Guests
                            </h1>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <button onClick={handleExportExcel}
                            style={{ background: '#10b981', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 600, fontSize: '0.85rem', padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(16,185,129,0.2)' }}
                        >
                            <FaFileExcel /> Excel
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1.5px solid #ede8f4', borderRadius: '14px', padding: '10px 16px', boxShadow: '0 4px 16px rgba(100,60,180,0.06)' }}>
                            <FaSearch color="#9ca3af" size={13} />
                            <input type="text" placeholder="Search guests..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                style={{ border: 'none', outline: 'none', fontSize: '0.85rem', color: '#374151', background: 'transparent', width: '200px' }} />
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <Row className="g-3 mb-4">
                    <Col xs={6} lg>
                        <div style={P.statCard(filterType === 'all', '#8b5cf6')} onClick={() => setFilterType('all')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaUsers /></div>
                                <div><div style={P.label}>Attendees</div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e1b2e' }}>{attendees.length}</div></div>
                            </div>
                        </div>
                    </Col>
                    <Col xs={6} lg>
                        <div style={{ ...P.statCard(false, '#10b981'), cursor: 'default' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaWallet /></div>
                                <div><div style={P.label}>Revenue</div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e1b2e' }}>₹{attendees.reduce((acc, a) => acc + (a.amountPaid / (attendees.filter(at => at.bookingId === a.bookingId).length || 1)), 0).toLocaleString()}</div></div>
                            </div>
                        </div>
                    </Col>
                    <Col xs={4} lg>
                        <div style={P.statCard(filterType === 'silver', '#94a3b8')} onClick={() => setFilterType('silver')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaTicketAlt /></div>
                                <div><div style={P.label}>Silver</div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e1b2e' }}>{silverCount}</div></div>
                            </div>
                        </div>
                    </Col>
                    <Col xs={4} lg>
                        <div style={P.statCard(filterType === 'gold', '#eab308')} onClick={() => setFilterType('gold')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef9c3', color: '#ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaTicketAlt /></div>
                                <div><div style={P.label}>Gold</div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e1b2e' }}>{goldCount}</div></div>
                            </div>
                        </div>
                    </Col>
                    <Col xs={4} lg>
                        <div style={P.statCard(filterType === 'platinum', '#3b82f6')} onClick={() => setFilterType('platinum')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaTicketAlt /></div>
                                <div><div style={P.label}>Platinum</div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e1b2e' }}>{platinumCount}</div></div>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* Desktop Table */}
                <div className="d-none d-lg-block" style={P.card}>
                    {filteredAttendees.length === 0 ? (
                        <div style={{ padding: '80px 24px', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '16px' }}>👤</div>
                            <h5 style={{ fontWeight: 700, color: '#1e1b2e' }}>No attendees found</h5>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8f7fc', borderBottom: '1.5px solid #ede8f4' }}>
                                    <th style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', textAlign: 'left' }}>Attendee</th>
                                    <th style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', textAlign: 'left' }}>Contact Info</th>
                                    <th style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', textAlign: 'center' }}>Ticket Type</th>
                                    <th style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', textAlign: 'center' }}>Booking Date</th>
                                    <th style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', textAlign: 'center' }}>Amount Paid</th>
                                    <th style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAttendees.map((attendee, idx) => (
                                    <tr key={idx} style={{ borderTop: '1px solid #f3f4f6', transition: 'background .2s' }} onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#6d28d9', flexShrink: 0 }}>
                                                    {(attendee.name || 'G')[0].toUpperCase()}
                                                </div>
                                                <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.9rem' }}>{attendee.name}</div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '0.8rem', marginBottom: '4px' }}><FaEnvelope color="#d946ef" /> {attendee.email}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '0.8rem' }}><FaPhone color="#d946ef" /> {attendee.phone}</div>
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            <span style={{ background: '#f8f7fc', border: '1px solid #ede8f4', borderRadius: '999px', padding: '6px 12px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#374151' }}>
                                                {attendee.ticketType}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.85rem' }}>{new Date(attendee.bookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>{new Date(attendee.bookingDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>₹{attendee.amountPaid.toLocaleString()}</div>
                                            <div style={{ color: '#9ca3af', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Total: ₹{attendee.totalAmount}</div>
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                            <button onClick={() => handleShowDetails(attendee)} style={{ background: 'transparent', border: 'none', color: '#d946ef', cursor: 'pointer', padding: '4px' }}>
                                                <FaEye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Mobile Cards View */}
                <div className="d-lg-none">
                    {filteredAttendees.length === 0 ? (
                        <div style={{ ...P.card, padding: '40px 24px', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '16px' }}>👤</div>
                            <h5 style={{ fontWeight: 700, color: '#1e1b2e' }}>No attendees found</h5>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredAttendees.map((attendee, idx) => (
                                <div key={idx} style={P.card}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #ede8f4' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#6d28d9', flexShrink: 0 }}>
                                                {(attendee.name || 'G')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.9rem' }}>{attendee.name}</div>
                                                <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{attendee.plan || 'Standard'} Plan</div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleShowDetails(attendee)} style={{ background: '#f5f3ff', border: 'none', borderRadius: '10px', color: '#8b5cf6', padding: '8px', cursor: 'pointer' }}>
                                            <FaEye size={14} />
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '0.8rem' }}><FaEnvelope color="#d946ef" size={12} /> {attendee.email}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '0.8rem' }}><FaPhone color="#d946ef" size={12} /> {attendee.phone}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '0.8rem' }}><FaCalendarDay color="#d946ef" size={12} /> {new Date(attendee.bookingDate).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px dashed #ede8f4' }}>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Order</div>
                                            <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.85rem' }}>₹{attendee.totalAmount}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount Paid</div>
                                            <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>₹{attendee.amountPaid.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal */}
                <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                    <Modal.Header closeButton style={{ borderBottom: '1px solid #ede8f4', padding: '24px' }}>
                        <Modal.Title style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1e1b2e' }}>Booking Details</Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ padding: '24px', background: '#fdf7ff' }}>
                        {selectedBooking && (
                            <div>
                                <h6 style={P.label}>Primary Attendee</h6>
                                <Row className="g-3 mb-4">
                                    <Col md={4}><div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #ede8f4' }}><div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>Name</div><div style={{ fontWeight: 700, color: '#1e1b2e' }}>{selectedBooking.attendeeName}</div></div></Col>
                                    <Col md={4}><div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #ede8f4' }}><div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>Email</div><div style={{ fontWeight: 700, color: '#1e1b2e' }}>{selectedBooking.email}</div></div></Col>
                                    <Col md={4}><div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #ede8f4' }}><div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>Phone</div><div style={{ fontWeight: 700, color: '#1e1b2e' }}>{selectedBooking.phone || 'N/A'}</div></div></Col>
                                </Row>

                                <h6 style={P.label}>Booking & Plan Information</h6>
                                <Row className="g-3 mb-4">
                                    <Col md={6}><div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #ede8f4' }}><div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>Event Name</div><div style={{ fontWeight: 700, color: '#d946ef' }}>{selectedBooking.eventName}</div></div></Col>
                                    <Col md={3}><div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #ede8f4' }}><div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>Plan Type</div><div style={{ fontWeight: 700, color: '#1e1b2e' }}>{selectedBooking.ticketTier}</div></div></Col>
                                    <Col md={3}><div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #ede8f4' }}><div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>Tickets</div><div style={{ fontWeight: 800, color: '#8b5cf6', fontSize: '1.1rem' }}>{selectedBooking.bookedQuantity || 1}</div></div></Col>
                                </Row>

                                <h6 style={P.label}>Group Members ({selectedBooking.attendeeDetails?.length || 0})</h6>
                                <div style={{ background: '#fff', border: '1px solid #ede8f4', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
                                    {selectedBooking.attendeeDetails && selectedBooking.attendeeDetails.length > 0 ? (
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ background: '#f8f7fc' }}>
                                                <tr>
                                                    <th style={{ padding: '12px 16px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textAlign: 'left' }}>#</th>
                                                    <th style={{ padding: '12px 16px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textAlign: 'left' }}>Member Name</th>
                                                    <th style={{ padding: '12px 16px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textAlign: 'left' }}>Phone</th>
                                                    <th style={{ padding: '12px 16px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textAlign: 'left' }}>Email</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedBooking.attendeeDetails.map((m, i) => (
                                                    <tr key={i} style={{ borderTop: '1px solid #ede8f4' }}>
                                                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#6b7280' }}>{i + 1}</td>
                                                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 700, color: '#1e1b2e' }}>{m.name}</td>
                                                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#4b5563' }}>{m.phone || 'N/A'}</td>
                                                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#4b5563' }}>{m.email || 'N/A'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>Single ticket booking.</div>
                                    )}
                                </div>

                                <Row className="g-3 mb-4">
                                    {selectedBooking.selectedFood && selectedBooking.selectedFood.length > 0 && (
                                        <Col md={6}>
                                            <h6 style={P.label}>Food Orders</h6>
                                            <div style={{ background: '#fff', border: '1px solid #ede8f4', borderRadius: '12px', padding: '12px' }}>
                                                {selectedBooking.selectedFood.map((f, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < selectedBooking.selectedFood.length - 1 ? '1px solid #ede8f4' : 'none' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1b2e' }}>{f.itemName} <span style={{ color: f.type === 'veg' ? '#10b981' : '#ef4444', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', background: f.type === 'veg' ? '#d1fae5' : '#fee2e2', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>{f.type}</span></span>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>x{f.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </Col>
                                    )}
                                    {selectedBooking.selectedAddons && selectedBooking.selectedAddons.length > 0 && (
                                        <Col md={6}>
                                            <h6 style={P.label}>Addons / Goodies</h6>
                                            <div style={{ background: '#fff', border: '1px solid #ede8f4', borderRadius: '12px', padding: '12px' }}>
                                                {selectedBooking.selectedAddons.map((a, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < selectedBooking.selectedAddons.length - 1 ? '1px solid #ede8f4' : 'none' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1b2e' }}>{a.itemName}</span>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>x{a.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </Col>
                                    )}
                                </Row>

                                <h6 style={P.label}>Payment Summary</h6>
                                <div style={{ background: 'linear-gradient(135deg, #fff 0%, #faf5ff 100%)', border: '1.5px solid #e9d5ff', borderRadius: '16px', padding: '20px' }}>
                                    <Row className="g-3 text-center">
                                        <Col xs={4}>
                                            <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Cost</div>
                                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e1b2e' }}>{formatCurrency(selectedBooking.totalAmount)}</div>
                                        </Col>
                                        <Col xs={4} style={{ borderLeft: '1px solid #e9d5ff', borderRight: '1px solid #e9d5ff' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Amount Paid</div>
                                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#10b981' }}>{formatCurrency(selectedBooking.amountPaid)}</div>
                                        </Col>
                                        <Col xs={4}>
                                            <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Outstanding</div>
                                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: selectedBooking.remainingAmount > 0 ? '#ef4444' : '#6b7280' }}>
                                                {formatCurrency(selectedBooking.remainingAmount)}
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                            </div>
                        )}
                    </Modal.Body>
                </Modal>
            </Container>
        </div>
    );
};

export default AdminEventAttendees;
