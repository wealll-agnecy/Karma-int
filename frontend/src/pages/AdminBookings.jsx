import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Spinner, Badge } from 'react-bootstrap';
import { FaUserTie, FaCalendarAlt, FaTicketAlt, FaChevronRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import * as adminBookingApi from '../api/adminBookingApi';
import toast from 'react-hot-toast';
import '../css/dashboard.css';
import '../css/AdminStyles.css';

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
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1500);
                } else {
                    toast.error('Failed to load organizers');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchOrganizers();
    }, []);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <div className="dashboard-page bg-premium-light">
            <Container fluid className="px-md-5 py-4">
                <div className="dashboard-header overview-section mb-3">
                    <div className="d-flex align-items-center gap-3 mb-2">
                        <span className="badge-pink-soft px-3 py-1 rounded-pill small fw-bold">NETWORK INFRASTRUCTURE</span>
                    </div>
                    <h2 className="dashboard-title-main mb-1 d-flex align-items-center gap-3">
                        <FaUserTie className="text-pink d-none d-lg-inline-flex" /> Organizers
                    </h2>
                    <p className="dashboard-subtext m-0">Real-time performance metrics and node management across all event hosts.</p>
                </div>
 
                <Row>
                    <Col md={12}>
                        {organizers.length === 0 ? (
                            <Card className="border-0 shadow-sm rounded-5 text-center py-5 bg-white mb-4">
                                <Card.Body className="py-5">
                                    <div className="display-1 mb-4 opacity-10">🔭</div>
                                    <h4 className="fw-black text-dark mb-2">No organizers detected.</h4>
                                    <p className="text-secondary fw-medium mb-0">The registry is currently empty. Incoming host nodes will appear here in real-time.</p>
                                </Card.Body>
                            </Card>
                        ) : (
                            <>
                                {/* ─── Desktop View (Table) ─── */}
                                <Card className="border-0 shadow-sm rounded-5 overflow-hidden bg-white d-none d-lg-block mb-4">
                                    <Card.Body className="p-0">
                                        <div className="table-responsive">
                                            <Table hover className="align-middle mb-0 custom-premium-table">
                                                <thead className="bg-light/50 border-bottom">
                                                    <tr>
                                                        <th className="px-4 py-4 text-secondary small fw-black text-uppercase tracking-widest">Organizer Node</th>
                                                        <th className="px-4 py-4 text-secondary small fw-black text-uppercase tracking-widest text-center">Mobile Number</th>
                                                        <th className="px-4 py-4 text-secondary small fw-black text-uppercase tracking-widest text-center">Active Events</th>
                                                        <th className="px-4 py-4 text-secondary small fw-black text-uppercase tracking-widest text-center">Engagement</th>
                                                        <th className="px-4 py-4 text-secondary small fw-black text-uppercase tracking-widest text-end">Management</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="border-0">
                                                    {organizers.map((org) => (
                                                        <tr key={org._id} className="transition-all hover-bg-slate-50 border-bottom border-slate-100">
                                                            <td className="px-4 py-4">
                                                                <Link to={`/admin/bookings/${org._id}`} className="text-decoration-none d-flex align-items-center gap-3">
                                                                    <div className="avatar-gradient-pink text-white d-flex align-items-center justify-content-center rounded-circle shadow-sm fw-bold" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>
                                                                        {org.name?.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <h6 className="mb-0 fw-black text-dark hover-text-pink transition-all">{org.name}</h6>
                                                                        <span className="small text-secondary fw-medium">{org.email}</span>
                                                                    </div>
                                                                </Link>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="small text-secondary fw-bold">{org.phone || 'N/A'}</span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <div className="d-flex flex-column align-items-center">
                                                                    <span className="h5 mb-0 fw-black text-dark">{org.totalEvents}</span>
                                                                    <span className="small text-secondary text-uppercase tracking-widest fw-bold" style={{ fontSize: '0.65rem' }}>Units</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <Badge className="bg-success-subtle text-success border border-success-light rounded-pill px-3 py-2 fw-bold small">
                                                                    <FaTicketAlt className="me-2" />
                                                                    {org.totalBookings} Attendees
                                                                </Badge>
                                                            </td>
                                                            <td className="px-4 py-4 text-end">
                                                                <Button 
                                                                    as={Link} 
                                                                    to={`/admin/bookings/${org._id}`}
                                                                    className="btn-pink-outline rounded-pill px-4 py-2 fw-bold small transition-all d-inline-flex align-items-center gap-2"
                                                                >
                                                                    Events <FaChevronRight size={10} />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </Card.Body>
                                </Card>

                                {/* ─── Mobile View (Cards) ─── */}
                                <div className="d-lg-none">
                                    <div className="d-flex flex-column gap-3">
                                        {organizers.map((org) => (
                                            <Card key={org._id} className="border-0 shadow-sm rounded-4 p-3 bg-white mobile-organizer-card-item">
                                                <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between mb-3 pb-3 border-bottom border-slate-100 gap-3">
                                                    <Link to={`/admin/bookings/${org._id}`} className="text-decoration-none d-flex align-items-center gap-3 overflow-hidden w-100">
                                                        <div className="avatar-gradient-pink text-white d-flex align-items-center justify-content-center rounded-circle shadow-sm fw-bold flex-shrink-0" style={{ width: '45px', height: '45px', minWidth: '45px' }}>
                                                            {org.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <h6 className="mb-0 fw-black text-dark text-truncate" style={{ fontSize: '0.95rem' }}>{org.name}</h6>
                                                            <span className="small text-secondary fw-medium text-truncate d-block">{org.email}</span>
                                                        </div>
                                                    </Link>
                                                    <Button 
                                                        as={Link} 
                                                        to={`/admin/bookings/${org._id}`}
                                                        className="btn-pink-outline rounded-pill px-3 py-2 fw-bold transition-all d-flex justify-content-center align-items-center gap-2 flex-shrink-0 w-100 w-sm-auto"
                                                        style={{ fontSize: '0.8rem' }}
                                                    >
                                                        Events <FaChevronRight size={10} />
                                                    </Button>
                                                </div>
                                                
                                                <div className="d-grid bg-slate-50 p-2 rounded-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                                                    <div className="d-flex flex-column align-items-center text-center">
                                                        <span className="text-secondary small fw-bold text-uppercase mb-1" style={{ fontSize: '0.55rem', letterSpacing: '0.05em' }}>Phone</span>
                                                        <span className="small text-dark fw-bold text-truncate w-100 px-1" style={{ fontSize: '0.75rem' }}>{org.phone || 'N/A'}</span>
                                                    </div>
                                                    <div className="d-flex flex-column align-items-center text-center border-start border-end border-slate-200 px-1">
                                                        <span className="text-secondary small fw-bold text-uppercase mb-1" style={{ fontSize: '0.55rem', letterSpacing: '0.05em' }}>Events</span>
                                                        <span className="small text-dark fw-bold text-truncate w-100 px-1" style={{ fontSize: '0.75rem' }}>{org.totalEvents} Units</span>
                                                    </div>
                                                    <div className="d-flex flex-column align-items-center text-center">
                                                        <span className="text-secondary small fw-bold text-uppercase mb-1" style={{ fontSize: '0.55rem', letterSpacing: '0.05em' }}>Guests</span>
                                                        <Badge className="bg-success-subtle text-success border border-success-light rounded-pill px-2 py-1 fw-bold text-truncate" style={{ fontSize: '0.65rem', maxWidth: '100%' }}>
                                                            {org.totalBookings}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>

                            </>
                        )}
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default AdminBookings;
