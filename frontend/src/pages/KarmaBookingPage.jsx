import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as bookingApi from '../api/bookingApi';
import api from '../api/apiClient';
import toast from 'react-hot-toast';
import './KarmaBookingPage.css';

export default function KarmaBookingPage() {
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

    const [paymentMode, setPaymentMode] = useState('full');
    const [partialAmountValue, setPartialAmountValue] = useState('');

    // Plan pricing map
    const planPrices = {
        'Package 1': 20000,
        'Package 2': 30000,
        'Delegate Pass': 4999,
        'VIP Pass': 9999,
        'Elite Pass': 19999,
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
                    console.warn('Backend responded but did not return a valid events list array. Using fallback schema.');
                    setEventDetails({
                        _id: VALID_FALLBACK_ID,
                        title: "Karma International Basic to Advanced Master Class 2026",
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
                    title: "Karma International Basic to Advanced Master Class 2026",
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

            // Save to Karma DB
            await api.post('/karma', {
                fullName, whatsappNumber, email, carrier, address, pincode,
                members, eventId: eventId,
            }).catch(e => console.warn('Karma DB save skipped/handled downstream:', e));

            // Standard backend checkout logic call
            const checkoutRes = await bookingApi.checkout({
                eventId: eventId,
                ticketType: ticketType,
                quantity: totalPersons,
                attendeeDetails,
                contactEmail: email,
                address,
                city: carrier,
                partialAmount: paymentMode === 'partial' ? Number(partialAmountValue) : total,
            });

            if (!checkoutRes.data.success) throw new Error(checkoutRes.data.message || 'Checkout failed');

            navigate('/payment', {
                state: {
                    bookingId: checkoutRes.data.bookingId,
                    orderId: checkoutRes.data.order.id,
                    amount: checkoutRes.data.order.amount / 100
                }
            });

        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Booking checkout redirection error');
            setProcessing(false);
        }
    };

    if (isLoadingEvent) {
        return (
            <div className="karma-booking-page d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                <div className="text-center text-white">
                    <div className="spinner-border text-warning mb-3" role="status" />
                    <p>Loading classes and event details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="karma-booking-page">
            <div className="container">

                {/* Back */}
                <button className="kb-back-btn" onClick={() => navigate('/')}>
                    ← Back to Landing Page
                </button>

                {/* Progress Steps */}
                <div className="kb-steps">
                    <div className="kb-step active">
                        <div className="kb-step-circle">1</div>
                        <div className="kb-step-label">Details</div>
                    </div>
                    <div className="kb-step-line" />
                    <div className="kb-step">
                        <div className="kb-step-circle">2</div>
                        <div className="kb-step-label">Payment</div>
                    </div>
                    <div className="kb-step-line" />
                    <div className="kb-step">
                        <div className="kb-step-circle">3</div>
                        <div className="kb-step-label">Ticket</div>
                    </div>
                </div>

                {/* Event Strip */}
                <div className="kb-event-strip">
                    <div>
                        <div className="kb-event-name">
                            {eventDetails?.title}
                        </div>
                        <p className="kb-event-meta">
                            📍 {eventDetails?.venue} &nbsp;·&nbsp;
                            📅 {eventDetails?.date ? (
                                (new Date(eventDetails.date).getDate() === 17 && new Date(eventDetails.date).getMonth() === 7 && new Date(eventDetails.date).getFullYear() === 2026)
                                ? '17-21 August 2026'
                                : new Date(eventDetails.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                            ) : ''}
                        </p>
                    </div>
                    <div className="kb-plan-chip">
                        ✦ {selectedPlanName}
                    </div>
                </div>

                <div className="row g-4">
                    {/* ── LEFT: Forms ── */}
                    <div className="col-lg-8">
                        <div className="kb-card">
                            <div className="kb-card-title">
                                <div className="kb-card-title-icon">👤</div>
                                Primary Attendee Details
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="kb-label">Full Name *</label>
                                    <input
                                        className="kb-input"
                                        type="text"
                                        placeholder="As per ID proof"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="kb-label">WhatsApp Number *</label>
                                    <input
                                        className="kb-input"
                                        type="text"
                                        placeholder="10-digit mobile number"
                                        value={whatsappNumber}
                                        onChange={e => setWhatsappNumber(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="kb-label">Email Address *</label>
                                    <input
                                        className="kb-input"
                                        type="email"
                                        placeholder="Your email for tickets"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="kb-label">Carrier / Business Name</label>
                                    <input
                                        className="kb-input"
                                        type="text"
                                        placeholder="Your studio or brand name"
                                        value={carrier}
                                        onChange={e => setCarrier(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="kb-label">Pincode *</label>
                                    <input
                                        className="kb-input"
                                        type="text"
                                        placeholder="Area pincode"
                                        value={pincode}
                                        onChange={e => setPincode(e.target.value)}
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="kb-label">Full Address *</label>
                                    <textarea
                                        className="kb-input"
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
                        <div className="kb-card">
                            <div className="kb-card-title">
                                <div className="kb-card-title-icon">👥</div>
                                Group Members
                                {members.length > 0 && (
                                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#C9A227', fontWeight: 600 }}>
                                        {members.length} member{members.length > 1 ? 's' : ''} added
                                    </span>
                                )}
                            </div>

                            {members.length === 0 && (
                                <div className="kb-empty">
                                    No members added yet. Click below to add group members.
                                </div>
                            )}

                            {members.map((member, index) => (
                                <div className="kb-member-card" key={index}>
                                    <div className="kb-member-header">
                                        <div className="kb-member-label">
                                            👤 Member {index + 1}
                                        </div>
                                        <button
                                            className="kb-member-remove"
                                            onClick={() => handleRemoveMember(index)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <label className="kb-label">Member Name *</label>
                                            <input
                                                className="kb-input"
                                                type="text"
                                                placeholder="Full name"
                                                value={member.name}
                                                onChange={e => handleMemberChange(index, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="kb-label">WhatsApp Number *</label>
                                            <input
                                                className="kb-input"
                                                type="tel"
                                                placeholder="10-digit number"
                                                value={member.whatsappNumber}
                                                onChange={e => handleMemberChange(index, 'whatsappNumber', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="kb-label">Email Address *</label>
                                            <input
                                                className="kb-input"
                                                type="email"
                                                placeholder="Email for ticket"
                                                value={member.email || ''}
                                                onChange={e => handleMemberChange(index, 'email', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button className="kb-add-member-btn" onClick={handleAddMember}>
                                + Add Another Member
                            </button>
                        </div>
                    </div>

                    {/* ── RIGHT: Order Summary Layout ── */}
                    <div className="col-lg-4">
                        <div className="kb-summary-card">
                            <div className="kb-summary-title">Order Summary</div>

                            <div className="kb-summary-row">
                                <span>{selectedPlanName}</span>
                                <span>₹{planPrice.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="kb-summary-row">
                                <span>× {totalPersons} person{totalPersons > 1 ? 's' : ''}</span>
                                <span>₹{subtotal.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="kb-summary-row total">
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
                                            className="kb-input"
                                            style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                                            placeholder={`Min. ₹1,000`}
                                            value={partialAmountValue}
                                            onChange={(e) => setPartialAmountValue(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                className="kb-pay-btn"
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

                            <p className="kb-secure-note">
                                🔒 100% Secure · Instant Ticket via Email
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}