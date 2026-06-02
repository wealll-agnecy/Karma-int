
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Modal } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaPhone, FaTicketAlt, FaCalendarDay, FaWallet, FaArrowLeft, FaSearch, FaUsers, FaEye, FaFileExcel } from 'react-icons/fa';
import { formatCurrency } from '../utils/formatUtils';
import * as analyticsApi from '../api/analyticsApi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import PremiumSearchBar from '../components/common/PremiumSearchBar';
import '../css/AdminStyles.css';

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
        if (!eventId || eventId === 'undefined') {
            setLoading(false);
            return;
        }
        const fetchAttendees = async () => {
            try {
                const res = await analyticsApi.getEventAttendees(eventId);
                const rawData = res.data?.data || [];
                // Since a booking can have multiple attendees, we flatten them
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
            } finally {
                setLoading(false);
            }
        };
        fetchAttendees();
    }, [eventId]);

    const filteredAttendees = attendees.filter(a => {
        const matchesSearch = a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             a.phone?.includes(searchTerm);
        
        const matchesFilter = filterType === 'all' || a.plan?.toLowerCase() === filterType;
        
        return matchesSearch && matchesFilter;
    });

    const silverCount = attendees.filter(a => a.plan?.toLowerCase() === 'silver').length;
    const goldCount = attendees.filter(a => a.plan?.toLowerCase() === 'gold').length;
    const platinumCount = attendees.filter(a => a.plan?.toLowerCase() === 'platinum').length;

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

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 bg-premium-light">
                <Spinner animation="border" variant="pink" />
            </div>
        );
    }

    return (
        <div className="dashboard-page bg-premium-light pb-5">
            <Container fluid className="px-md-5 py-4">
                {/* Header Section */}
                <div className="mb-5 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-4">
                    <div className="d-flex align-items-center gap-4">
                        <button 
                            onClick={() => navigate(-1)} 
                            className="avatar-gradient-pink rounded-circle d-flex align-items-center justify-content-center border-0 shadow-sm transition-premium hover-translate-y text-white"
                            style={{ width: '56px', height: '56px', flexShrink: 0 }}
                        >
                            <FaArrowLeft size={20} style={{ color: 'white' }} />
                        </button>
                        <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <span className="badge-pink-soft px-3 py-1 rounded-pill small fw-bold text-uppercase tracking-wider">Attendee Registry</span>
                            </div>
                             <h2 className="dashboard-title-main text-dark fw-black tracking-tighter m-0 d-flex align-items-center gap-3" style={{ fontSize: '2.2rem' }}>
                                 <FaUsers className="text-pink d-none d-lg-inline-flex" /> Event Guests
                             </h2>
                        </div>
                    </div>
                    
                    <div className="d-flex align-items-center gap-3">
                        <Button 
                            variant="success" 
                            className="rounded-pill d-flex align-items-center gap-2 shadow-sm border-0 px-3"
                            onClick={handleExportExcel}
                        >
                            <FaFileExcel /> <span className="d-none d-md-inline">Excel</span>
                        </Button>
                        <PremiumSearchBar 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ minWidth: '250px' }}
                        />
                    </div>
                </div>

                {/* Statistics Summary */}
                <Row className="mb-4 g-3">
                    <Col xs={6} md={6} lg>
                        <Card 
                            className={`border-0 shadow-sm rounded-4 p-3 bg-white h-100 cursor-pointer attendee-stat-card transition-all ${filterType === 'all' ? 'ring-pink' : ''}`}
                            onClick={() => setFilterType('all')}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <div className="icon-box-premium rounded-4 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                                    <FaUsers size={18} />
                                </div>
                                <div>
                                    <h6 className="text-secondary tiny-text fw-bold text-uppercase mb-1">Attendees</h6>
                                    <h5 className="fw-black mb-0">{attendees.length}</h5>
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={6} md={6} lg>
                        <Card className="border-0 shadow-sm rounded-4 p-3 bg-white h-100 attendee-stat-card">
                            <div className="d-flex align-items-center gap-3">
                                <div className="icon-box-premium rounded-4 d-flex align-items-center justify-content-center bg-success-subtle text-success" style={{ width: '45px', height: '45px' }}>
                                    <FaWallet size={18} />
                                </div>
                                <div>
                                    <h6 className="text-secondary tiny-text fw-bold text-uppercase mb-1">Revenue</h6>
                                    <h5 className="fw-black mb-0">₹{attendees.reduce((acc, a) => acc + (a.amountPaid / (attendees.filter(at => at.bookingId === a.bookingId).length || 1)), 0).toLocaleString()}</h5>
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={4} md={4} lg>
                        <Card 
                            className={`border-0 shadow-sm rounded-4 p-3 bg-white h-100 cursor-pointer attendee-stat-card transition-all ${filterType === 'silver' ? 'ring-pink' : ''}`}
                            onClick={() => setFilterType('silver')}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <div className="icon-box-premium rounded-4 d-flex align-items-center justify-content-center bg-secondary-subtle text-secondary" style={{ width: '45px', height: '45px' }}>
                                    <FaTicketAlt size={18} />
                                </div>
                                <div>
                                    <h6 className="text-secondary tiny-text fw-bold text-uppercase mb-1">Silver</h6>
                                    <h5 className="fw-black mb-0">{silverCount}</h5>
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={4} md={4} lg>
                        <Card 
                            className={`border-0 shadow-sm rounded-4 p-3 bg-white h-100 cursor-pointer attendee-stat-card transition-all ${filterType === 'gold' ? 'ring-pink' : ''}`}
                            onClick={() => setFilterType('gold')}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <div className="icon-box-premium rounded-4 d-flex align-items-center justify-content-center bg-warning-subtle text-warning" style={{ width: '45px', height: '45px' }}>
                                    <FaTicketAlt size={18} />
                                </div>
                                <div>
                                    <h6 className="text-secondary tiny-text fw-bold text-uppercase mb-1">Gold</h6>
                                    <h5 className="fw-black mb-0">{goldCount}</h5>
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={4} md={4} lg>
                        <Card 
                            className={`border-0 shadow-sm rounded-4 p-3 bg-white h-100 cursor-pointer attendee-stat-card transition-all ${filterType === 'platinum' ? 'ring-pink' : ''}`}
                            onClick={() => setFilterType('platinum')}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <div className="icon-box-premium rounded-4 d-flex align-items-center justify-content-center bg-primary-subtle text-primary" style={{ width: '45px', height: '45px' }}>
                                    <FaTicketAlt size={18} />
                                </div>
                                <div>
                                    <h6 className="text-secondary tiny-text fw-bold text-uppercase mb-1">Platinum</h6>
                                    <h5 className="fw-black mb-0">{platinumCount}</h5>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* Attendee Table (Desktop View) */}
                <Card className="border-0 shadow-sm rounded-5 overflow-hidden bg-white d-none d-lg-block">
                    <div className="table-responsive">
                        <Table hover className="align-middle mb-0 custom-premium-table">
                            <thead>
                                <tr>
                                    <th className="px-4 py-4 text-secondary small fw-black text-uppercase tracking-widest">Attendee</th>
                                    <th className="px-4 py-4 text-secondary small fw-black text-uppercase tracking-widest">Contact Info</th>
                                    <th className="px-4 py-4 text-secondary small fw-black text-uppercase tracking-widest text-center">Ticket Type</th>
                                    <th className="px-4 py-4 text-secondary small fw-black text-uppercase tracking-widest text-center">Booking Date</th>
                                    <th className="px-4 py-4 text-secondary small fw-black text-uppercase tracking-widest text-center">Amount Paid</th>
                                    <th className="px-4 py-4 text-secondary small fw-black text-uppercase tracking-widest text-end">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAttendees.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-5">
                                            <div className="display-1 mb-4 opacity-10">👤</div>
                                            <h5 className="text-secondary fw-bold">No attendees found matching your search.</h5>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAttendees.map((attendee, idx) => (
                                        <tr key={idx} className="transition-all hover-bg-slate-50 border-bottom border-slate-100">
                                            <td className="px-4 py-4">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="avatar-gradient-pink text-white d-flex align-items-center justify-content-center rounded-circle shadow-sm fw-bold" style={{ width: '45px', height: '45px' }}>
                                                        {attendee.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <h6 className="mb-0 fw-black text-dark">{attendee.name}</h6>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="d-flex flex-column gap-1">
                                                    <div className="d-flex align-items-center gap-2 small text-secondary fw-medium">
                                                        <FaEnvelope className="text-pink" size={12} />
                                                        {attendee.email}
                                                    </div>
                                                    <div className="d-flex align-items-center gap-2 small text-secondary fw-medium">
                                                        <FaPhone className="text-pink" size={12} />
                                                        {attendee.phone}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <Badge className="bg-light text-dark border border-slate-200 rounded-pill px-3 py-2 fw-bold small text-uppercase">
                                                    <FaCalendarDay className="me-2 text-pink" />
                                                    {attendee.ticketType}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="small fw-bold text-dark mb-0">
                                                    {new Date(attendee.bookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="small text-secondary" style={{ fontSize: '0.65rem' }}>
                                                    {new Date(attendee.bookingDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="fw-black text-dark h6 mb-0">₹{attendee.amountPaid.toLocaleString()}</div>
                                                <div className="small text-secondary fw-bold" style={{ fontSize: '0.65rem' }}>TOTAL ORDER: ₹{attendee.totalAmount}</div>
                                            </td>
                                            <td className="px-4 py-4 text-end">
                                                <Button 
                                                    variant="link" 
                                                    className="p-0 text-pink shadow-none"
                                                    onClick={() => handleShowDetails(attendee)}
                                                >
                                                    <FaEye size={18} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Card>

                {/* Attendee Mobile Cards View */}
                <div className="d-lg-none">
                    {filteredAttendees.length === 0 ? (
                        <Card className="border-0 shadow-sm rounded-5 text-center py-5 bg-white mb-4">
                            <Card.Body className="py-5">
                                <div className="display-1 mb-4 opacity-10">👤</div>
                                <h5 className="text-secondary fw-bold">No attendees found matching your search.</h5>
                            </Card.Body>
                        </Card>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {filteredAttendees.map((attendee, idx) => (
                                <Card key={idx} className="border-0 shadow-sm rounded-4 p-3 bg-white mobile-attendee-card-item">
                                    <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom border-slate-100">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="avatar-gradient-pink text-white d-flex align-items-center justify-content-center rounded-circle shadow-sm fw-bold" style={{ width: '45px', height: '45px', minWidth: '45px' }}>
                                                {attendee.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="overflow-hidden">
                                                <h6 className="mb-0 fw-black text-dark text-truncate" style={{ fontSize: '0.95rem' }}>{attendee.name}</h6>
                                                <span className="small text-secondary fw-semibold uppercase tracking-wider" style={{ fontSize: '0.7rem' }}>
                                                    {attendee.plan || 'Standard'} Plan
                                                </span>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <Button 
                                                variant="link" 
                                                className="p-0 text-pink shadow-none"
                                                onClick={() => handleShowDetails(attendee)}
                                            >
                                                <FaEye size={18} />
                                            </Button>
                                            <Badge className="bg-light text-dark border border-slate-200 rounded-pill px-3 py-2 fw-bold small text-uppercase flex-shrink-0">
                                                {attendee.ticketType}
                                            </Badge>
                                        </div>
                                    </div>
                                    
                                    <div className="d-flex flex-column gap-2 mb-3">
                                        <div className="d-flex align-items-center gap-2 small text-secondary fw-medium">
                                            <FaEnvelope className="text-pink flex-shrink-0" size={12} />
                                            <span className="text-truncate">{attendee.email}</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2 small text-secondary fw-medium">
                                            <FaPhone className="text-pink flex-shrink-0" size={12} />
                                            <span>{attendee.phone}</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2 small text-secondary fw-medium">
                                            <FaCalendarDay className="text-pink flex-shrink-0" size={12} />
                                            <span>
                                                {new Date(attendee.bookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(attendee.bookingDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-center justify-content-between pt-2 border-top border-slate-100">
                                        <div>
                                            <span className="text-secondary small fw-bold text-uppercase d-block mb-0.5" style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>Total Order</span>
                                            <div className="small text-secondary fw-bold">₹{attendee.totalAmount}</div>
                                        </div>
                                        <div className="text-end">
                                            <span className="text-secondary small fw-bold text-uppercase d-block mb-0.5" style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>Paid Amount</span>
                                            <div className="fw-black text-pink h6 mb-0">₹{attendee.amountPaid.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Attendee Details Modal */}
                <Modal 
                    show={showModal} 
                    onHide={() => setShowModal(false)} 
                    centered 
                    size="lg"
                    className="premium-details-modal"
                >
                    <Modal.Header closeButton style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <Modal.Title style={{ fontFamily: 'Outfit, sans-serif', fontWeight: '700' }}>
                            Booking Details Summary
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                        {selectedBooking && (
                            <div>
                                {/* Section 1: Primary Attendee Info */}
                                <div className="mb-4">
                                    <h6 className="text-uppercase text-muted fw-bold small mb-3" style={{ letterSpacing: '1px' }}>Primary Attendee</h6>
                                    <Row className="g-3">
                                        <Col md={4}>
                                            <div className="p-3 border rounded-3 bg-light">
                                                <div className="text-muted small">Full Name</div>
                                                <div className="fw-bold">{selectedBooking.attendeeName}</div>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="p-3 border rounded-3 bg-light">
                                                <div className="text-muted small">Email Address</div>
                                                <div className="fw-bold text-truncate">{selectedBooking.email}</div>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="p-3 border rounded-3 bg-light">
                                                <div className="text-muted small">Phone Number</div>
                                                <div className="fw-bold">{selectedBooking.phone || 'N/A'}</div>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>

                                {/* Section 2: Booking Info */}
                                <div className="mb-4 border-top pt-4">
                                    <h6 className="text-uppercase text-muted fw-bold small mb-3" style={{ letterSpacing: '1px' }}>Booking & Plan Information</h6>
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <div className="p-3 border rounded-3 bg-light">
                                                <div className="text-muted small">Event Name</div>
                                                <div className="fw-bold text-pink">{selectedBooking.eventName}</div>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div className="p-3 border rounded-3 bg-light">
                                                <div className="text-muted small">Plan Type</div>
                                                <div className="fw-bold">{selectedBooking.ticketTier}</div>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div className="p-3 border rounded-3 bg-light">
                                                <div className="text-muted small">Tickets Booked</div>
                                                <div className="fw-black text-primary fs-5">
                                                    {selectedBooking.bookedQuantity || 1} Ticket(s)
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>

                                {/* Section 3: Group Members */}
                                <div className="mb-4 border-top pt-4">
                                    <h6 className="text-uppercase text-muted fw-bold small mb-3" style={{ letterSpacing: '1px' }}>Group Members ({selectedBooking.attendeeDetails?.length || 0})</h6>
                                    {selectedBooking.attendeeDetails && selectedBooking.attendeeDetails.length > 0 ? (
                                        <div className="table-responsive border rounded-3">
                                            <Table hover className="m-0 align-middle">
                                                <thead className="bg-light">
                                                    <tr className="small text-uppercase fw-bold text-slate">
                                                        <th className="px-3 py-2">#</th>
                                                        <th className="py-2">Member Name</th>
                                                        <th className="py-2">Phone / Contact</th>
                                                        <th className="px-3 py-2">Email</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedBooking.attendeeDetails.map((member, index) => (
                                                        <tr key={index}>
                                                            <td className="px-3 py-2 text-muted small">{index + 1}</td>
                                                            <td className="py-2 fw-bold">{member.name}</td>
                                                            <td className="py-2">{member.phone || 'N/A'}</td>
                                                            <td className="px-3 py-2 text-muted small">{member.email || 'N/A'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-3 text-muted border rounded-3 bg-light-subtle small">
                                            No secondary group members added. Single ticket booking.
                                        </div>
                                    )}
                                </div>

                                {/* Section 4: Food & Addons Selection (Conditional) */}
                                {((selectedBooking.selectedFood && selectedBooking.selectedFood.length > 0) || 
                                  (selectedBooking.selectedAddons && selectedBooking.selectedAddons.length > 0)) && (
                                    <div className="mb-4 border-top pt-4">
                                        <Row>
                                            {selectedBooking.selectedFood && selectedBooking.selectedFood.length > 0 && (
                                                <Col md={selectedBooking.selectedAddons && selectedBooking.selectedAddons.length > 0 ? 6 : 12}>
                                                    <h6 className="text-uppercase text-muted fw-bold small mb-3" style={{ letterSpacing: '1px' }}>Food Orders</h6>
                                                    <div className="table-responsive border rounded-3">
                                                        <Table hover className="m-0 align-middle small">
                                                            <thead className="bg-light">
                                                                <tr>
                                                                    <th className="px-3 py-2">Item</th>
                                                                    <th className="py-2">Type</th>
                                                                    <th className="px-3 py-2 text-end">Qty</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {selectedBooking.selectedFood.map((food, idx) => (
                                                                    <tr key={idx}>
                                                                        <td className="px-3 py-2 fw-bold">{food.itemName}</td>
                                                                        <td className="py-2"><Badge bg={food.type === 'veg' ? 'success' : 'danger'}>{food.type}</Badge></td>
                                                                        <td className="px-3 py-2 text-end">{food.quantity}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </Table>
                                                    </div>
                                                </Col>
                                            )}

                                            {selectedBooking.selectedAddons && selectedBooking.selectedAddons.length > 0 && (
                                                <Col md={selectedBooking.selectedFood && selectedBooking.selectedFood.length > 0 ? 6 : 12}>
                                                    <h6 className="text-uppercase text-muted fw-bold small mb-3" style={{ letterSpacing: '1px' }}>Addons / Goodies</h6>
                                                    <div className="table-responsive border rounded-3">
                                                        <Table hover className="m-0 align-middle small">
                                                            <thead className="bg-light">
                                                                <tr>
                                                                    <th className="px-3 py-2">Item</th>
                                                                    <th className="px-3 py-2 text-end">Qty</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {selectedBooking.selectedAddons.map((addon, idx) => (
                                                                    <tr key={idx}>
                                                                        <td className="px-3 py-2 fw-bold">{addon.itemName}</td>
                                                                        <td className="px-3 py-2 text-end">{addon.quantity}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </Table>
                                                    </div>
                                                </Col>
                                            )}
                                        </Row>
                                    </div>
                                )}

                                {/* Section 5: Financial Summary */}
                                <div className="border-top pt-4 mb-2">
                                    <h6 className="text-uppercase text-muted fw-bold small mb-3" style={{ letterSpacing: '1px' }}>Payment Summary</h6>
                                    <div className="p-3 border rounded-3" style={{ background: 'linear-gradient(135deg, #fff 0%, #fef2f2 100%)' }}>
                                        <Row className="g-3 text-center">
                                            <Col xs={4}>
                                                <div className="text-muted small">Total Cost</div>
                                                <div className="fw-bold fs-5 text-dark">{formatCurrency(selectedBooking.totalAmount)}</div>
                                            </Col>
                                            <Col xs={4} className="border-start border-end">
                                                <div className="text-muted small">Amount Paid</div>
                                                <div className="fw-bold fs-5 text-success">{formatCurrency(selectedBooking.amountPaid)}</div>
                                            </Col>
                                            <Col xs={4}>
                                                <div className="text-muted small">Outstanding Balance</div>
                                                <div className={`fw-bold fs-5 ${selectedBooking.remainingAmount > 0 ? 'text-danger' : 'text-slate'}`}>
                                                    {formatCurrency(selectedBooking.remainingAmount)}
                                                </div>
                                            </Col>
                                        </Row>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer style={{ borderTop: '1px solid #f1f5f9' }}>
                        <Button variant="secondary" className="rounded-3 px-4 fw-bold" onClick={() => setShowModal(false)}>
                            Close Details
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default AdminEventAttendees;
