import { useState, useEffect } from 'react';
import { Container, Row, Col, Badge } from 'react-bootstrap';
import { FaUsers, FaQrcode } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { formatCurrency } from '../utils/formatUtils';

const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    card: { background: 'rgba(255,255,255,0.97)', border: '1px solid #ede8f4', borderRadius: '22px', boxShadow: '0 8px 32px rgba(100,60,180,0.07)', overflow: 'hidden' }
};

const StaffDashboard = () => {
    const [attendees, setAttendees] = useState([]);
    const [recentEntries, setRecentEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAttendees = async () => {
        try {
            const saved = localStorage.getItem('recent_scans');
            if (saved) setRecentEntries(JSON.parse(saved));

            const res = await apiClient.get('/api/v1/organizer/bookings');
            setAttendees(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch attendees', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendees();
    }, []);

    return (
        <div style={P.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>
                <div style={{ padding: '40px 0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '8px' }}>Staff Portal</div>
                        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 800, letterSpacing: '-1px', color: '#1e1b2e', margin: 0 }}>Entry System</h1>
                    </div>
                    <Link to="/staff/scanner" style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '12px 24px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 20px rgba(139,92,246,.25)' }}>
                        <FaQrcode /> Open Scanner
                    </Link>
                </div>

                <Row className="g-4">
                    <Col lg={12}>
                        <div style={P.card}>
                            <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #ede8f4' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaUsers size={18} /></div>
                                <h5 style={{ fontWeight: 800, color: '#1e1b2e', margin: 0 }}>Recent Entries</h5>
                            </div>
                            
                            <div className="d-none d-lg-block">
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f8f7fc' }}>
                                        <tr>
                                            <th style={{ padding: '16px 24px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', textAlign: 'left' }}>Attendee</th>
                                            <th style={{ padding: '16px 24px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', textAlign: 'left' }}>Event</th>
                                            <th style={{ padding: '16px 24px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', textAlign: 'left' }}>Payment</th>
                                            <th style={{ padding: '16px 24px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', textAlign: 'center' }}>Status</th>
                                            <th style={{ padding: '16px 24px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', textAlign: 'center' }}>Plan</th>
                                            <th style={{ padding: '16px 24px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', textAlign: 'center' }}>Reason</th>
                                            <th style={{ padding: '16px 24px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', textAlign: 'right' }}>Scan Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentEntries.length > 0 ? recentEntries.map((item, index) => {
                                            const total = item.total || 0; const paid = item.paid || 0; const due = Math.max(total - paid, 0);
                                            const isFullyPaid = paid >= total && total > 0; const isPartial = paid > 0 && paid < total;
                                            return (
                                                <tr key={index} style={{ borderTop: '1px solid #ede8f4' }}>
                                                    <td style={{ padding: '16px 24px', fontWeight: 700, color: '#1e1b2e', fontSize: '0.9rem' }}>{item.name}</td>
                                                    <td style={{ padding: '16px 24px', fontSize: '0.8rem', color: '#4b5563' }}>{item.event}</td>
                                                    <td style={{ padding: '16px 24px' }}>
                                                        <div style={{ fontWeight: 800, color: '#1e1b2e', fontSize: '0.9rem' }}>{formatCurrency(paid)} / {formatCurrency(total)}</div>
                                                        <div style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: 700 }}>Due: {isFullyPaid ? formatCurrency(0) : formatCurrency(due)}</div>
                                                        <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, background: isFullyPaid ? '#d1fae5' : isPartial ? '#fef3c7' : '#fee2e2', color: isFullyPaid ? '#059669' : isPartial ? '#d97706' : '#dc2626' }}>
                                                            {isFullyPaid ? 'FULLY PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                        <span style={{ background: item.status === 'GRANTED' ? '#d1fae5' : '#fee2e2', color: item.status === 'GRANTED' ? '#059669' : '#dc2626', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>{item.status}</span>
                                                    </td>
                                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>{item.selectedPlan || item.planName || 'N/A'}</span>
                                                    </td>
                                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#4b5563' }}>{item.reason || 'Valid Ticket'}</span>
                                                    </td>
                                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.8rem', color: '#6b7280' }}>{item.time}</td>
                                                </tr>
                                            );
                                        }) : attendees.filter(a => a.status === 'used' || a.isScanned).slice(0, 10).map((attendee) => {
                                            const total = attendee.totalAmount || 0; const paid = attendee.amountPaid || 0; const due = Math.max(total - paid, 0);
                                            const isFullyPaid = paid >= total && total > 0; const isPartial = paid > 0 && paid < total;
                                            return (
                                                <tr key={attendee._id} style={{ borderTop: '1px solid #ede8f4' }}>
                                                    <td style={{ padding: '16px 24px' }}>
                                                        <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.9rem' }}>{attendee.name || attendee.user?.name || attendee.attendeeDetails?.[0]?.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{attendee.email || attendee.user?.email || attendee.attendeeDetails?.[0]?.email}</div>
                                                    </td>
                                                    <td style={{ padding: '16px 24px', fontSize: '0.8rem', color: '#4b5563' }}>{attendee.eventName || attendee.event?.title}</td>
                                                    <td style={{ padding: '16px 24px' }}>
                                                        <div style={{ fontWeight: 800, color: '#1e1b2e', fontSize: '0.9rem' }}>{formatCurrency(paid)} / {formatCurrency(total)}</div>
                                                        <div style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: 700 }}>Due: {isFullyPaid ? formatCurrency(0) : formatCurrency(due)}</div>
                                                        <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, background: isFullyPaid ? '#d1fae5' : isPartial ? '#fef3c7' : '#fee2e2', color: isFullyPaid ? '#059669' : isPartial ? '#d97706' : '#dc2626' }}>
                                                            {isFullyPaid ? 'FULLY PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                        <span style={{ background: '#dbeafe', color: '#2563eb', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>SCANNED</span>
                                                    </td>
                                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>{attendee.selectedPlan || attendee.planName || 'N/A'}</span>
                                                    </td>
                                                    <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: '#4b5563' }}>Valid Ticket</td>
                                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.8rem', color: '#6b7280' }}>{attendee.scannedAt ? new Date(attendee.scannedAt).toLocaleTimeString() : 'N/A'}</td>
                                                </tr>
                                            );
                                        })}
                                        {recentEntries.length === 0 && attendees.length === 0 && !loading && (
                                            <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No entries processed yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="d-lg-none" style={{ padding: '16px' }}>
                                {recentEntries.length > 0 ? recentEntries.map((item, index) => {
                                    const total = item.total || 0; const paid = item.paid || 0;
                                    const isFullyPaid = paid >= total && total > 0; const isPartial = paid > 0 && paid < total;
                                    return (
                                        <div key={index} style={{ background: '#fff', border: '1px solid #ede8f4', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <div><div style={{ fontWeight: 800, color: '#1e1b2e' }}>{item.name}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.event}</div></div>
                                                <span style={{ background: item.status === 'GRANTED' ? '#d1fae5' : '#fee2e2', color: item.status === 'GRANTED' ? '#059669' : '#dc2626', padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700 }}>{item.status}</span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#4b5563', marginBottom: '12px' }}><div>Plan: {item.selectedPlan || item.planName || 'Standard'}</div><div>Result: {item.reason || 'Valid Ticket'}</div></div>
                                            <div style={{ borderTop: '1px dashed #ede8f4', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                                <div><div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 700 }}>PAID / TOTAL</div><div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{formatCurrency(paid)} / {formatCurrency(total)}</div></div>
                                                <div style={{ textAlign: 'right' }}><div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 700 }}>STATUS</div>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isFullyPaid ? '#059669' : isPartial ? '#d97706' : '#dc2626' }}>{isFullyPaid ? 'FULLY PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) : attendees.filter(a => a.status === 'used' || a.isScanned).slice(0, 10).map((attendee) => {
                                    const total = attendee.totalAmount || 0; const paid = attendee.amountPaid || 0;
                                    const isFullyPaid = paid >= total && total > 0; const isPartial = paid > 0 && paid < total;
                                    return (
                                        <div key={attendee._id} style={{ background: '#fff', border: '1px solid #ede8f4', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <div><div style={{ fontWeight: 800, color: '#1e1b2e' }}>{attendee.name || attendee.user?.name || attendee.attendeeDetails?.[0]?.name}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{attendee.eventName || attendee.event?.title}</div></div>
                                                <span style={{ background: '#dbeafe', color: '#2563eb', padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700 }}>SCANNED</span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#4b5563', marginBottom: '12px' }}><div>Plan: {attendee.selectedPlan || attendee.planName || 'Standard'}</div><div>Result: Valid Ticket</div></div>
                                            <div style={{ borderTop: '1px dashed #ede8f4', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                                <div><div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 700 }}>PAID / TOTAL</div><div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{formatCurrency(paid)} / {formatCurrency(total)}</div></div>
                                                <div style={{ textAlign: 'right' }}><div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 700 }}>STATUS</div>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isFullyPaid ? '#059669' : isPartial ? '#d97706' : '#dc2626' }}>{isFullyPaid ? 'FULLY PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {recentEntries.length === 0 && attendees.length === 0 && !loading && (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No entries processed yet.</div>
                                )}
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default StaffDashboard;
