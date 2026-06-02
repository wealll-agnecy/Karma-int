import React, { useState, useEffect } from 'react';
import { Container, Spinner, Badge, Row, Col } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { FaArrowLeft, FaEnvelope, FaPhone, FaClock, FaTrash, FaUser, FaInfoCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    card: { background: 'rgba(255,255,255,0.97)', border: '1px solid #ede8f4', borderRadius: '22px', boxShadow: '0 8px 32px rgba(100,60,180,0.07)', transition: 'all .3s ease', overflow: 'hidden' },
    label: { fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#9ca3af', display: 'block', marginBottom: '8px' },
};

const AdminEnquiryDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [enquiry, setEnquiry] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id || id === 'undefined') {
            console.error("[CLIENT]: Detected invalid 'undefined' ID in URL");
            setLoading(false);
            return;
        }

        const fetchEnquiry = async () => {
            try {
                const res = await apiClient.get(`/api/v1/enquiries/${id}`);
                setEnquiry(res.data);
            } catch (err) {
                toast.error('Failed to load enquiry details');
                navigate('/admin/enquiries');
            } finally {
                setLoading(false);
            }
        };
        fetchEnquiry();
    }, [id, navigate]);

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this enquiry?')) return;
        try {
            await apiClient.delete(`/api/v1/enquiries/${id}`);
            toast.success('Enquiry deleted successfully');
            navigate('/admin/enquiries');
        } catch (err) {
            toast.error('Failed to delete enquiry');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fdf7ff' }}>
                <Spinner animation="border" style={{ color: '#8b5cf6', width: '2.5rem', height: '2.5rem' }} />
            </div>
        );
    }

    if (!enquiry) return null;

    return (
        <div style={P.page}>
            <Container fluid style={{ maxWidth: '1000px', padding: '0 24px' }}>
                {/* Header */}
                <div style={{ padding: '40px 0 28px', display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                    <Link to="/admin/enquiries"
                        style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0, boxShadow: '0 6px 20px rgba(139,92,246,.25)', transition: 'all .2s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(139,92,246,.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(139,92,246,.25)'; }}
                    >
                        <FaArrowLeft color="#fff" size={18} />
                    </Link>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '6px' }}>Enquiry Record</div>
                        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 800, letterSpacing: '-1px', color: '#1e1b2e', margin: '0 0 12px 0' }}>{enquiry.name}</h1>
                        
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ background: enquiry.status === 'New' ? '#fef3c7' : '#e0f2fe', color: enquiry.status === 'New' ? '#d97706' : '#0284c7', padding: '6px 14px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {enquiry.status || 'New'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>
                                <FaClock color="#a78bfa" /> {new Date(enquiry.createdAt).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <button onClick={handleDelete}
                        style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', padding: '10px 20px', cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ffe4e6'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; }}
                    >
                        <FaTrash size={12} /> Terminate
                    </button>
                </div>

                <div style={P.card}>
                    <div style={{ padding: '32px' }}>
                        <Row className="gy-4">
                            <Col md={5}>
                                <div style={{ background: '#f8f7fc', border: '1.5px solid #ede8f4', borderRadius: '16px', padding: '24px' }}>
                                    <label style={P.label}>Contact Profile</label>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', marginTop: '16px' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6d28d9' }}>
                                            <FaUser size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px' }}>Identity</div>
                                            <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.95rem' }}>{enquiry.name}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fff', border: '1.5px solid #ede8f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', boxShadow: '0 4px 12px rgba(139,92,246,0.05)' }}>
                                            <FaEnvelope size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px' }}>Email Link</div>
                                            <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.95rem' }}>{enquiry.email}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fff', border: '1.5px solid #ede8f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', boxShadow: '0 4px 12px rgba(139,92,246,0.05)' }}>
                                            <FaPhone size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px' }}>Mobile Network</div>
                                            <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.95rem' }}>{enquiry.phone}</div>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                            <Col md={7}>
                                <div style={{ background: '#fff', border: '1.5px solid #ede8f4', borderRadius: '16px', padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ ...P.label, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FaInfoCircle size={12} /> Enquiry Message
                                    </label>
                                    <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#374151', whiteSpace: 'pre-wrap', flex: 1, background: '#f8f7fc', padding: '20px', borderRadius: '12px', border: '1px dashed #e5e7eb' }}>
                                        {enquiry.message}
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default AdminEnquiryDetails;
