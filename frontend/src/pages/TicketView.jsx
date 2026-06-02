import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as ticketApi from '../api/ticketApi';
import { Container, Row, Col, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import {
    FaDownload, FaShieldAlt, FaIdCard, FaCreditCard, FaEnvelope, FaPhoneAlt
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import axios from 'axios';
import '../css/premium-ticket.css';
import { formatCurrency } from '../utils/formatUtils';

const TicketView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState(null);
    const [qrCode, setQrCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const handlePayRemaining = () => {
        const bookingId = ticket?.booking?._id || ticket?.booking;
        if (!bookingId) return;
        navigate(`/remaining-payment/${bookingId}`);
    };

    useEffect(() => {
        if (!id || id === 'undefined') {
            console.error("[CLIENT]: Detected invalid 'undefined' ticket ID in URL");
            setLoading(false);
            return;
        }

        const fetchTicket = async () => {
            try {
                const res = await ticketApi.getTicket(id);
                setTicket(res.data.data);
                setQrCode(res.data.qrCodeUrl);
            } catch (err) {
                setError('Failed to load your digital pass.');
            } finally {
                setLoading(false);
            }
        };
        fetchTicket();
    }, [id]);

    if (loading) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#050505', fontFamily: 'Inter, sans-serif' }}>
                <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <FaShieldAlt size={50} style={{ color: '#C9A227', opacity: 0.8 }} />
                </motion.div>
                <p className="mt-4 fw-black uppercase tracking-widest small" style={{ color: '#9ca3af' }}>Synchronizing Portal...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-wrapper d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#050505', fontFamily: 'Inter, sans-serif' }}>
                <Container className="text-center">
                    <div className="p-5 shadow-2xl d-inline-block" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '24px', maxWidth: '440px', width: '100%' }}>
                        <FaShieldAlt size={50} className="mb-4 opacity-50" style={{ color: '#ef4444' }} />
                        <h3 className="fw-black mb-3 text-uppercase tracking-widest" style={{ color: '#F5F5F5' }}>ACCESS DENIED</h3>
                        <p className="fs-5 opacity-75" style={{ color: '#9ca3af' }}>{error}</p>
                        <Button 
                            className="mt-3" 
                            style={{ background: 'linear-gradient(90deg, #C9A227, #C9A227)', color: '#050505', border: 'none', fontWeight: 'bold' }}
                            onClick={() => navigate('/')}
                        >
                            Return Home
                        </Button>
                    </div>
                </Container>
            </div>
        );
    }

    if (!ticket) return null;

    // Financial Status Resolution
    const amountPaid = ticket.amountPaid || ticket.booking?.amountPaid || 0;
    const totalAmount = ticket.totalAmount || ticket.booking?.totalAmount || 0;
    const remainingAmount = Math.max(0, totalAmount - amountPaid);
    const rawPaymentStatus = ticket.paymentStatus || ticket.booking?.paymentStatus || 'pending';
    const paymentStatus = rawPaymentStatus.toUpperCase();

    const isFullyPaid = amountPaid >= totalAmount || paymentStatus === 'COMPLETED' || paymentStatus === 'PAID';

    const pdfDownloadUrl = `${axios.defaults.baseURL || 'http://localhost:5002'}/api/ticket/download-pdf/${ticket.uuid}`;

    return (
        <div className="premium-ticket-container pb-5">
            <style>{`
                .premium-ticket-container {
                    background: #050505 !important;
                    min-height: 100vh;
                    color: #F5F5F5;
                    font-family: 'Inter', sans-serif;
                }
                .premium-ticket-container .text-bright {
                    color: #ffffff !important;
                }
                .premium-ticket-container .text-soft {
                    color: #d1d5db !important;
                }
                .premium-ticket-container .text-white {
                    color: #ffffff !important;
                }
                .premium-ticket-container h1,
                .premium-ticket-container h2,
                .premium-ticket-container h3,
                .premium-ticket-container h4,
                .premium-ticket-container h5,
                .premium-ticket-container h6,
                .premium-ticket-container .h1,
                .premium-ticket-container .h2,
                .premium-ticket-container .h3,
                .premium-ticket-container .h4,
                .premium-ticket-container .h5,
                .premium-ticket-container .h6 {
                    color: #ffffff !important;
                }
                .premium-ticket-container .pass-title {
                    color: #ffffff !important;
                }
                .premium-ticket-container .pass-category {
                    color: #C9A227 !important;
                }
                .ticket-pass-card {
                    background: rgba(255,255,255,0.03) !important;
                    border: 1px solid rgba(201,162,39,0.2) !important;
                    box-shadow: 0 20px 50px rgba(201,162,39,0.05) !important;
                    color: #F5F5F5 !important;
                }
                .ticket-pass-card:hover {
                    border-color: rgba(201,162,39,0.5) !important;
                    box-shadow: 0 30px 60px rgba(201,162,39,0.12) !important;
                }
                .ticket-pass-left {
                    color: #F5F5F5 !important;
                }
                .ticket-pass-right {
                    background: rgba(201,162,39,0.04) !important;
                    border-left: 1px solid rgba(201,162,39,0.2) !important;
                    color: #F5F5F5 !important;
                }
                .pass-title {
                    color: #F5F5F5 !important;
                }
                .pass-category {
                    color: #C9A227 !important;
                }
                .pass-info-label {
                    color: rgba(255, 255, 255, 0.4) !important;
                }
                .pass-info-value {
                    color: #F5F5F5 !important;
                }
                .pass-badge {
                    background: linear-gradient(90deg, #C9A227, #C9A227) !important;
                    color: #050505 !important;
                    box-shadow: 0 4px 15px rgba(201, 162, 39, 0.25) !important;
                }
                .btn-pink {
                    background: linear-gradient(90deg, #C9A227, #C9A227, #C9A227) !important;
                    color: #050505 !important;
                    border: none !important;
                    font-weight: 800;
                    box-shadow: 0 0 30px rgba(201,162,39,0.2) !important;
                }
                .btn-pink:hover {
                    transform: scale(1.02);
                    box-shadow: 0 0 40px rgba(201,162,39,0.3) !important;
                }
                .glass-panel {
                    background: rgba(255,255,255,0.03) !important;
                    border: 1px solid rgba(201,162,39,0.15) !important;
                    color: #F5F5F5 !important;
                }
                .text-dark {
                    color: #F5F5F5 !important;
                }
                .text-primary {
                    color: #C9A227 !important;
                }
                .text-pink {
                    color: #C9A227 !important;
                }
                .bg-primary-subtle {
                    background: rgba(201,162,39,0.12) !important;
                }
                .border-primary-light {
                    border-color: rgba(201,162,39,0.3) !important;
                }
                .ticket-pass-divider {
                    border-left: 2px dashed rgba(201, 162, 39, 0.2) !important;
                }
                .ticket-pass-card::before, .ticket-pass-card::after {
                    background: #050505 !important;
                }
                .alert-warning {
                    background: rgba(201,162,39,0.06) !important;
                    border: 1px solid rgba(201,162,39,0.2) !important;
                    color: #C9A227 !important;
                }
            `}</style>
            <Container fluid className="px-md-5">
                {/* ─── Header ─── */}
                <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-5 mt-4">
                    <Badge className="bg-primary-subtle text-primary border border-primary-light px-3 py-2 mb-3 text-uppercase tracking-widest fw-black small shadow-2xl">
                        <FaShieldAlt className="me-2" /> Authorized Clearance Pass
                    </Badge>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3">
                        <div>
                            <h1 className="fw-black m-0 tracking-tighter text-bright" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.3, paddingTop: '10px' }}>
                                Digital <span style={{ color: '#C9A227' }}>Pass</span>
                            </h1>
                            <p className="text-soft mt-3 mb-0 fw-medium">
                                Secure identifier for <span className="text-bright">{ticket?.event?.title}</span>
                            </p>
                        </div>
                        <div className="d-flex gap-3">
                            <Button
                                as="a"
                                href={pdfDownloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                variant="primary"
                                className="btn btn-pink"
                            >
                                <FaDownload className="me-2" /> Download PDF Ticket
                            </Button>
                        </div>
                    </div>
                </motion.div>

                <Row className="justify-content-center">
                    <Col lg={10} xl={9}>
                        {/* ─── Premium Event Pass Card ─── */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 0.2, type: 'spring', damping: 20 }}
                            className="d-flex flex-column align-items-center"
                        >
                            {!isFullyPaid && (
                                <Alert variant="warning" className="w-100 mb-4 rounded-4 border-warning/20 bg-warning/10 text-warning fw-bold d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 p-4 shadow-lg">
                                    <div className="d-flex align-items-center gap-3">
                                        <FaShieldAlt className="fs-4 flex-shrink-0" />
                                        <div>
                                            ACCESS PENDING: Please pay the remaining balance of {formatCurrency(remainingAmount)} for entry clearance.
                                        </div>
                                    </div>
                                    <Button 
                                        className="btn btn-pink"
                                        onClick={handlePayRemaining}
                                    >
                                        <FaCreditCard className="me-2" /> Pay Remaining
                                    </Button>
                                </Alert>
                            )}

                            <div id="ticket-to-download" className="ticket-pass-card">
                                {/* Left Section: Brand & Event Details */}
                                <div className="ticket-pass-left">
                                    <div className="pass-logo">🎫</div>

                                    <div>
                                        <div className="pass-category">{ticket?.event?.category || 'Beauty Event'}</div>
                                        <h2 className="pass-title">{ticket?.event?.title}</h2>

                                        {/* Mobile optimized Details grid */}
                                        <div className="pass-info-row">
                                            <div className="pass-info-item">
                                                <span className="pass-info-label">Date</span>
                                                <span className="pass-info-value">
                                                    {ticket?.booking?.selectedDays && ticket.booking.selectedDays.length > 0
                                                        ? `${ticket.booking.selectedDays.length} Day(s) Selected`
                                                        : ((ticket?.booking?.selectedDate || ticket?.event?.date) ? new Date(ticket?.booking?.selectedDate || ticket.event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A')}
                                                </span>
                                            </div>
                                            <div className="pass-info-item">
                                                <span className="pass-info-label">Time</span>
                                                <span className="pass-info-value">{ticket?.event?.time || '10:00 AM'}</span>
                                            </div>
                                        </div>

                                        <div className="pass-info-item mb-4">
                                            <span className="pass-info-label">Venue</span>
                                            <span className="pass-info-value">{ticket?.event?.venue || 'N/A'}</span>
                                        </div>

                                        <div className="pass-info-item mb-4">
                                            <span className="pass-info-label">Attendee</span>
                                            <span className="pass-info-value fw-black text-bright text-uppercase" style={{ fontSize: '1.2rem' }}>
                                                {ticket?.name}
                                            </span>
                                            <div className="d-flex flex-wrap gap-3 mt-2 small" style={{ color: '#e5e7eb' }}>
                                                <span><FaEnvelope className="me-1" /> {ticket?.email}</span>
                                                {ticket?.mobileNumber && <span><FaPhoneAlt className="me-1" /> {ticket?.mobileNumber}</span>}
                                            </div>
                                        </div>

                                        <div className="pass-info-item mb-4">
                                            <span className="pass-info-label">Access Duration</span>
                                            <span className="pass-info-value">
                                                <div className="fw-bold">VALID FOR: {(ticket?.selectedDays?.length || ticket?.booking?.selectedDays?.length) > 0 ? `${(ticket.selectedDays || ticket.booking.selectedDays).length} Days` : '1 Day'}</div>
                                                <div className="fw-bold mt-1" style={{ fontSize: '0.85em', opacity: 0.8 }}>
                                                    {(ticket?.selectedDays?.length || ticket?.booking?.selectedDays?.length) > 0 
                                                        ? `DATES: ${(ticket.selectedDays || ticket.booking.selectedDays).map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })).join(', ')}`
                                                        : `DATE: ${new Date(ticket?.selectedDate || ticket?.booking?.selectedDate || ticket?.event?.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                                                </div>
                                            </span>
                                        </div>

                                        {/* Dynamic Catering & Meal Pass Details */}
                                        {((ticket?.booking?.selectedFood && ticket.booking.selectedFood.length > 0) ||
                                          (ticket?.event?.foodSettings && (ticket.event.foodSettings.foodType === 'compulsory' || ticket.event.foodSettings.type === 'compulsory') && ticket.event.foodSettings.options?.length > 0)) && (
                                            <div className="pass-info-item mb-4">
                                                <span className="pass-info-label">Catering & Meals</span>
                                                <span className="pass-info-value">
                                                    {ticket?.booking?.selectedFood && ticket.booking.selectedFood.length > 0 ? (
                                                        <div className="d-flex flex-column gap-1 text-pink fw-bold">
                                                            {ticket.booking.selectedFood.map((f, i) => (
                                                                <div key={i} className="small">
                                                                    🍔 {f.itemName} ({f.type.toUpperCase()}) x{f.quantity || ticket?.booking?.quantity || 1}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="d-flex flex-column gap-1 text-success fw-bold">
                                                            {ticket.event.foodSettings.options.map((f, i) => (
                                                                <div key={i} className="small">
                                                                    🥗 [INCLUDED] {f.itemName} ({f.type.toUpperCase()})
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="d-flex justify-content-between align-items-end">
                                        <div className="pass-info-item">
                                            <span className="pass-info-label">Tier</span>
                                            <span className="pass-info-value" style={{ color: '#C9A227', fontSize: '1.2rem', fontWeight: 800 }}>
                                                {ticket?.ticketType || ticket?.booking?.ticketType || 'GEN'}
                                            </span>
                                        </div>
                                        <div className="text-white-50 font-monospace small opacity-50" style={{ fontSize: '0.6rem' }}>
                                            GU-X-{(ticket?._id || 'ID').slice(-8).toUpperCase()}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Section: Validation & Price */}
                                <div className="ticket-pass-right">
                                    <div className="ticket-pass-divider" />

                                    <div className="pass-qr-wrapper">
                                        <img src={qrCode} alt="Validation Code" className="pass-qr-image" style={{ background: '#ffffff', padding: '10px', borderRadius: '12px' }} />
                                    </div>

                                    <div className="text-center">
                                        <div className="pass-info-label mb-1" style={{ color: '#D4AF37' }}>Pass Value</div>
                                        <div className="h4 fw-black m-0" style={{ color: '#C9A227' }}>{formatCurrency(totalAmount)}</div>
                                        <div className="mt-2 small fw-bold" style={{ color: isFullyPaid ? '#10b981' : '#ff9800' }}>
                                            Paid: {formatCurrency(amountPaid)}
                                        </div>
                                        
                                        {/* Live Badges showing completion status */}
                                        <div className="mt-3">
                                            <Badge bg={isFullyPaid ? 'success' : paymentStatus === 'PARTIAL' ? 'warning' : 'danger'} className="pass-badge py-2 px-3 rounded-pill uppercase fw-bold tracking-widest text-uppercase">
                                                {isFullyPaid ? 'Paid' : paymentStatus === 'PARTIAL' ? 'Partial' : 'Pending'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            className="mt-5 p-4 glass-panel rounded-5 shadow-2xl d-flex align-items-center gap-4"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201, 162, 39, 0.25)', backdropFilter: 'blur(10px)', color: '#F5F5F5' }}
                        >
                            <div className="rounded-circle p-3 shadow-lg flex-shrink-0 animate-pulse" style={{ background: '#C9A227' }}>
                                <FaIdCard size={20} style={{ color: '#050505' }} />
                            </div>
                            <div className='bt-1'>
                                <h6 className="fw-black mb-1 uppercase tracking-widest" style={{ color: '#C9A227', fontWeight: 800 }}>Entry Protocol</h6>
                                <p className="mb-0 small fw-medium opacity-80" style={{ color: '#F5F5F5' }}>Present this credential at the scanner terminal. Access requires full verification clearance. Ensure you have your secure QR ready.</p>
                            </div>
                        </motion.div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default TicketView;
