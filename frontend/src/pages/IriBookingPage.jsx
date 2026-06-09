import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as bookingApi from '../api/bookingApi';
import api from '../api/apiClient';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { playSound } from "../utils/soundManager";
import './IriBookingPage.css';

export default function IriBookingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const selectedPlanName = location.state?.plan || 'Delegate Pass';

    // Primary attendee form
    const [fullName, setFullName] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [email, setEmail] = useState('');
    const [carrier, setCarrier] = useState('');
    const [address, setAddress] = useState('');
    const [pincode, setPincode] = useState('');

    // Additional members
    const [members, setMembers] = useState([]);
    const [eventDetails, setEventDetails] = useState(null);
    const [isLoadingEvent, setIsLoadingEvent] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const [paymentMode, setPaymentMode] = useState('full');
    const [partialAmountValue, setPartialAmountValue] = useState('');

    // Plan pricing map
    const planPrices = {
        'Package 1': 20000,
        'Package 2': 30000,
        'Delegate Pass': 4999,
        'VIP Pass': 9999,
        'Elite Pass': 19999,
        'Early Bird': 999,
        'Regular': 3000,
    };
    const planPrice = planPrices[selectedPlanName] || 4999;
    const totalPersons = 1 + members.length;
    const subtotal = planPrice * totalPersons;
    const platformFee = 0;
    const total = subtotal;

    // VALID DUMMY OBJECTID FOR DEVELOPMENT FALLBACKS
    const VALID_FALLBACK_ID = "65f1a2b3c4d5e6f7a8b9c0de";

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                setIsLoadingEvent(true);
                const { data } = await api.get('/api/v1/events?limit=1');

                const eventList = data?.data || data?.events || (Array.isArray(data) ? data : null);

                if (eventList && eventList.length > 0) {
                    setEventDetails(eventList[0]);
                } else {
                    // console.warn('Backend responded but did not return a valid events list array. Using fallback schema.');
                    setEventDetails({
                        _id: VALID_FALLBACK_ID,
                        title: "IRI APEX Basic to Advanced Master Class 2026",
                        venue: "ALTAIR BOUTIQUE HOTEL, SALT LAKE",
                        date: "2026-08-17T00:00:00.000Z",
                        ticketTypes: [{ name: "Delegate Pass" }],
                        isFallback: true
                    });
                }
            } catch (err) {
                console.error('Failed to fetch event directly from backend endpoint:', err);
                setEventDetails({
                    _id: VALID_FALLBACK_ID,
                    title: "IRI APEX Basic to Advanced Master Class 2026",
                    venue: "ALTAIR BOUTIQUE HOTEL, SALT LAKE",
                    date: "2026-08-17T00:00:00.000Z",
                    ticketTypes: [{ name: "Delegate Pass" }],
                    isFallback: true
                });
            } finally {
                setIsLoadingEvent(false);
            }
        };
        fetchEvent();
    }, []);

    const handleAddMember = () => {
        setMembers([...members, { name: '', whatsappNumber: '', email: '' }]);
    };

    const handleMemberChange = (index, field, value) => {
        const updated = [...members];
        updated[index][field] = value;
        setMembers(updated);
    };

    const handleRemoveMember = (index) => {
        setMembers(members.filter((_, i) => i !== index));
    };

    const handlePayNow = async () => {
        const eventId = eventDetails?._id || VALID_FALLBACK_ID;

        // FIXED: Stop checkout if live event details were never fetched correctly
        if (eventDetails?.isFallback) {
            return toast.error('Unable to process payment. Could not load valid live event configurations from server.');
        }

        if (paymentMode === 'partial') {
            const parsedPartial = Number(partialAmountValue);
            if (!parsedPartial || parsedPartial <= 0) return toast.error('Please enter a valid partial amount');
            if (parsedPartial > total) return toast.error(`Partial amount cannot exceed total of ₹${total}`);
        }

        if (!fullName.trim()) return toast.error('Please enter your Full Name');
        if (!whatsappNumber.trim()) return toast.error('Please enter your WhatsApp Number');
        if (!email.trim()) return toast.error('Please enter your Email');
        if (!address.trim()) return toast.error('Please enter your Address');
        if (!pincode.trim()) return toast.error('Please enter your Pincode');

        for (let i = 0; i < members.length; i++) {
            if (!members[i].name.trim()) return toast.error(`Enter Name for Member ${i + 1}`);
            if (!members[i].whatsappNumber.trim()) return toast.error(`Enter WhatsApp for Member ${i + 1}`);
            if (!members[i].email?.trim()) return toast.error(`Enter Email for Member ${i + 1}`);
        }

        setProcessing(true);
        try {
            const attendeeDetails = [
                { name: fullName, phone: whatsappNumber, email: email },
                ...members.map((m) => ({
                    name: m.name,
                    phone: m.whatsappNumber,
                    email: m.email,
                })),
            ];

            const ticketType = selectedPlanName || eventDetails?.ticketTypes?.[0]?.name;
            const finalAmount = paymentMode === 'partial' ? Number(partialAmountValue) : total;

            // Load Razorpay Script
            const loadToast = toast.loading(`Initiating secure checkout for ₹${finalAmount.toLocaleString('en-IN')}...`);
            const { loadRazorpayScript } = await import("../utils/loadScript");
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                toast.error("Failed to load payment gateway.", { id: loadToast });
                setProcessing(false);
                return;
            }

            // Standard backend checkout logic call (Creates booking)
            const checkoutRes = await bookingApi.checkout({
                eventId: eventId,
                ticketType: ticketType,
                quantity: totalPersons,
                attendeeDetails,
                contactEmail: email,
                address,
                city: carrier,
                partialAmount: finalAmount,
            });

            if (!checkoutRes.data.success) {
                toast.error(checkoutRes.data.message || 'Checkout failed', { id: loadToast });
                setProcessing(false);
                return;
            }

            const bookingId = checkoutRes.data.bookingId;

            // Create Razorpay Order
            const { createRazorpayOrder, verifyRazorpayPayment } = await import("../api/paymentApi");
            const orderRes = await createRazorpayOrder(finalAmount, "INR", { bookingId });
            
            if (!orderRes.data.success) {
                toast.error("Failed to create order.", { id: loadToast });
                setProcessing(false);
                return;
            }

            toast.dismiss(loadToast);

            // Open Razorpay Checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || "dummy_key",
                amount: orderRes.data.amount,
                currency: orderRes.data.currency,
                name: "IRI APEX",
                description: "Event Booking",
                order_id: orderRes.data.orderId,
                handler: async function (response) {
                    try {
                        const verifyToast = toast.loading("Verifying payment signature...");
                        
                        const verifyRes = await verifyRazorpayPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        if (verifyRes.data.success) {
                            toast.success("Payment Captured Successfully!", { id: verifyToast });
                            
                            setShowSuccess(true);
                            playSound('paymentSuccess');
                            confetti({
                                particleCount: 150,
                                spread: 70,
                                origin: { y: 0.6 },
                                colors: ['#C9A227', '#ffffff']
                            });

                            setTimeout(() => {
                                if (verifyRes.data.ticketId) {
                                    navigate(`/digital-pass/${verifyRes.data.ticketId}`);
                                } else {
                                    navigate('/my-bookings'); 
                                }
                            }, 3500);
                        } else {
                            toast.error("Signature verification failed", { id: verifyToast });
                        }
                    } catch (error) {
                        toast.error("Payment verification failed");
                        console.error(error);
                    }
                },
                prefill: {
                    name: fullName,
                    email: email,
                    contact: whatsappNumber
                },
                theme: {
                    color: "#C9A227"
                },
                modal: {
                    ondismiss: function() {
                        setProcessing(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                toast.error("Payment failed: " + response.error.description);
                setProcessing(false);
            });
            rzp.open();

        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Booking checkout error');
            setProcessing(false);
        }
    };

    if (isLoadingEvent) {
        return (
            <div className="iri-booking-page d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                <div className="text-center text-white">
                    <div className="spinner-border text-warning mb-3" role="status" />
                    <p>Loading classes and event details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="iri-booking-page">
            <AnimatePresence>
                {showSuccess && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                            background: 'rgba(5, 5, 5, 0.9)', backdropFilter: 'blur(12px)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
                        }}
                    >
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 15 }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)', padding: '40px', borderRadius: '28px',
                                width: '90%', maxWidth: '440px', textAlign: 'center',
                                boxShadow: '0 20px 50px rgba(201, 162, 39, 0.05)',
                                border: '1px solid rgba(201, 162, 39, 0.2)', color: '#F5F5F5'
                            }}
                        >
                            <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🎉</div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F5F5F5', marginBottom: '12px' }}>Booking Confirmed!</h1>
                            <p style={{ color: '#9ca3af', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
                                Your payment has been successfully processed.
                            </p>
                            <div style={{ display: 'inline-block', background: 'rgba(201, 162, 39, 0.08)', color: '#C9A227', border: '1px solid rgba(201, 162, 39, 0.2)', padding: '8px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '24px' }}>
                                📧 Tickets Dispatched via Email & WhatsApp
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '8px', fontWeight: 600 }}>
                                Generating your digital pass...
                            </p>
                            <div style={{ fontSize: '0.9rem', color: '#C9A227', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <span className="spinner-border spinner-border-sm" /> Redirecting to Dashboard
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="container">

                {/* Back */}
                <button className="ib-back-btn" onClick={() => navigate('/')}>
                    ← Back to Landing Page
                </button>

                {/* Progress Steps */}
                <div className="ib-steps">
                    <div className="ib-step active">
                        <div className="ib-step-circle">1</div>
                        <div className="ib-step-label">Details</div>
                    </div>
                    <div className="ib-step-line" />
                    <div className="ib-step">
                        <div className="ib-step-circle">2</div>
                        <div className="ib-step-label">Payment</div>
                    </div>
                    <div className="ib-step-line" />
                    <div className="ib-step">
                        <div className="ib-step-circle">3</div>
                        <div className="ib-step-label">Ticket</div>
                    </div>
                </div>

                {/* Event Strip */}
                <div className="ib-event-strip">
                    <div>
                        <div className="ib-event-name">
                            {eventDetails?.title}
                        </div>
                        <p className="ib-event-meta">
                            📍 {eventDetails?.venue} &nbsp;·&nbsp;
                            📅 {eventDetails?.date ? (
                                (new Date(eventDetails.date).getUTCDate() === 17 && new Date(eventDetails.date).getUTCMonth() === 7 && new Date(eventDetails.date).getUTCFullYear() === 2026)
                                ? '17-21 August 2026'
                                : new Date(eventDetails.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
                            ) : ''}
                        </p>
                    </div>
                    <div className="ib-plan-chip">
                        ✦ {selectedPlanName}
                    </div>
                </div>

                <div className="row g-4">
                    {/* ── LEFT: Forms ── */}
                    <div className="col-lg-8">
                        <div className="ib-card">
                            <div className="ib-card-title">
                                <div className="ib-card-title-icon">👤</div>
                                Primary Attendee Details
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="ib-label">Full Name *</label>
                                    <input
                                        className="ib-input"
                                        type="text"
                                        placeholder="As per ID proof"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="ib-label">WhatsApp Number *</label>
                                    <input
                                        className="ib-input"
                                        type="text"
                                        placeholder="10-digit mobile number"
                                        value={whatsappNumber}
                                        onChange={e => setWhatsappNumber(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="ib-label">Email Address *</label>
                                    <input
                                        className="ib-input"
                                        type="email"
                                        placeholder="Your email for tickets"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="ib-label">Carrier / Business Name</label>
                                    <input
                                        className="ib-input"
                                        type="text"
                                        placeholder="Your studio or brand name"
                                        value={carrier}
                                        onChange={e => setCarrier(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="ib-label">Pincode *</label>
                                    <input
                                        className="ib-input"
                                        type="text"
                                        placeholder="Area pincode"
                                        value={pincode}
                                        onChange={e => setPincode(e.target.value)}
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="ib-label">Full Address *</label>
                                    <textarea
                                        className="ib-input"
                                        rows={3}
                                        placeholder="House/Flat no., Street, City, State"
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        style={{ resize: 'none' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Group Members Container */}
                        <div className="ib-card">
                            <div className="ib-card-title">
                                <div className="ib-card-title-icon">👥</div>
                                Group Members
                                {members.length > 0 && (
                                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#C9A227', fontWeight: 600 }}>
                                        {members.length} member{members.length > 1 ? 's' : ''} added
                                    </span>
                                )}
                            </div>

                            {members.length === 0 && (
                                <div className="ib-empty">
                                    No members added yet. Click below to add group members.
                                </div>
                            )}

                            {members.map((member, index) => (
                                <div className="ib-member-card" key={index}>
                                    <div className="ib-member-header">
                                        <div className="ib-member-label">
                                            👤 Member {index + 1}
                                        </div>
                                        <button
                                            className="ib-member-remove"
                                            onClick={() => handleRemoveMember(index)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <label className="ib-label">Member Name *</label>
                                            <input
                                                className="ib-input"
                                                type="text"
                                                placeholder="Full name"
                                                value={member.name}
                                                onChange={e => handleMemberChange(index, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="ib-label">WhatsApp Number *</label>
                                            <input
                                                className="ib-input"
                                                type="tel"
                                                placeholder="10-digit number"
                                                value={member.whatsappNumber}
                                                onChange={e => handleMemberChange(index, 'whatsappNumber', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="ib-label">Email Address *</label>
                                            <input
                                                className="ib-input"
                                                type="email"
                                                placeholder="Email for ticket"
                                                value={member.email || ''}
                                                onChange={e => handleMemberChange(index, 'email', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button className="ib-add-member-btn" onClick={handleAddMember}>
                                + Add Another Member
                            </button>
                        </div>
                    </div>

                    {/* ── RIGHT: Order Summary Layout ── */}
                    <div className="col-lg-4">
                        <div className="ib-summary-card">
                            <div className="ib-summary-title">Order Summary</div>

                            <div className="ib-summary-row">
                                <span>{selectedPlanName}</span>
                                <span>₹{planPrice.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="ib-summary-row">
                                <span>× {totalPersons} person{totalPersons > 1 ? 's' : ''}</span>
                                <span>₹{subtotal.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="ib-summary-row total">
                                <span>Total</span>
                                <span>₹{total.toLocaleString('en-IN')}</span>
                            </div>

                            <div style={{ marginTop: 24, padding: '16px', borderRadius: 12, background: 'rgba(201,162,39,0.05)', border: '1px solid rgba(201,162,39,0.15)' }}>
                                <div style={{ fontSize: '0.78rem', color: '#d1d5db', marginBottom: 8 }}>✦ SELECTED PLAN</div>
                                <div style={{ fontWeight: 800, color: '#C9A227', fontSize: '1rem' }}>{selectedPlanName}</div>
                                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 4 }}>
                                    {totalPersons} seat{totalPersons > 1 ? 's' : ''} reserved
                                </div>
                            </div>

                            <div style={{ marginTop: 24 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>Payment Mode</div>
                                
                                <div className="d-flex gap-2 mb-3">
                                    <button
                                        className="flex-fill py-2 rounded"
                                        style={{ 
                                            background: paymentMode === 'full' ? '#C9A227' : 'transparent',
                                            color: paymentMode === 'full' ? '#000' : '#fff',
                                            border: `1px solid ${paymentMode === 'full' ? '#C9A227' : '#555'}`,
                                            fontWeight: 600, transition: '0.2s'
                                        }}
                                        onClick={() => setPaymentMode('full')}
                                    >
                                        Full Payment
                                    </button>
                                    <button
                                        className="flex-fill py-2 rounded"
                                        style={{ 
                                            background: paymentMode === 'partial' ? '#C9A227' : 'transparent',
                                            color: paymentMode === 'partial' ? '#000' : '#fff',
                                            border: `1px solid ${paymentMode === 'partial' ? '#C9A227' : '#555'}`,
                                            fontWeight: 600, transition: '0.2s'
                                        }}
                                        onClick={() => setPaymentMode('partial')}
                                    >
                                        Partial Payment
                                    </button>
                                </div>

                                {paymentMode === 'partial' && (
                                    <div className="mb-4">
                                        <label style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>Enter Partial Amount (₹)</label>
                                        <input
                                            type="number"
                                            className="ib-input"
                                            style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                                            placeholder={`Min. ₹1,000`}
                                            value={partialAmountValue}
                                            onChange={(e) => setPartialAmountValue(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                className="ib-pay-btn"
                                onClick={handlePayNow}
                                disabled={processing}
                            >
                                {processing ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                                        Processing...
                                    </>
                                ) : (
                                    `PAY ₹${paymentMode === 'partial' && partialAmountValue ? Number(partialAmountValue).toLocaleString('en-IN') : total.toLocaleString('en-IN')}`
                                )}
                            </button>

                            <p className="ib-secure-note">
                                🔒 100% Secure · Instant Ticket via Email
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}