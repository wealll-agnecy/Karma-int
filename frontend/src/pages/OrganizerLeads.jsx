import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Table, Spinner, Tabs, Tab } from 'react-bootstrap';
import { FaUserPlus, FaFire, FaEnvelope, FaPhone, FaPhoneAlt, FaCheckCircle, FaTimesCircle, FaStar, FaClock } from 'react-icons/fa';
import { getLeads, updateLead } from '../api/organizerApi';
import toast from 'react-hot-toast';
import '../css/dashboard.css';

const getStatusColor = (statusValue) => {
    switch (statusValue) {
        case 'new': return '#3b82f6'; // Blue
        case 'calling': return '#f97316'; // Orange
        case 'interested': return '#22c55e'; // Green
        case 'follow_up': return '#a855f7'; // Purple
        case 'not_interested': return '#ef4444'; // Red
        case 'contacted': return '#06b6d4'; // Cyan
        case 'converted': return '#14b8a6'; // Teal
        case 'lost': return '#64748b'; // Gray
        default: return '#94a3b8'; // Light Gray
    }
};

const OrganizerLeads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('new');

    const [selectedLead, setSelectedLead] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [status, setStatus] = useState('new');
    const [followupDate, setFollowupDate] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchLeads = async () => {
        try {
            const res = await getLeads();
            if (res.data.success) {
                setLeads(res.data.leads || []);
            }
        } catch (err) {
            toast.error('Failed to fetch leads');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const handleManageLead = (lead) => {
        setSelectedLead(lead);
        setStatus(lead.leadStatus || 'new');
        
        if (lead.followupDate) {
            const d = new Date(lead.followupDate);
            // Format to YYYY-MM-DDTHH:mm
            const tzOffset = d.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
            setFollowupDate(localISOTime);
        } else {
            setFollowupDate('');
        }
        
        setNote('');
        setShowModal(true);
    };

    const handleSaveLead = async () => {
        if (!selectedLead) return;
        setSaving(true);
        try {
            const data = { leadStatus: status };
            if (status === 'follow_up' && followupDate) {
                data.followupDate = new Date(followupDate).toISOString();
            }
            if (note.trim()) {
                data.note = note.trim();
            }
            const res = await updateLead(selectedLead._id, data);
            if (res.data.success) {
                toast.success('Lead updated successfully');
                setShowModal(false);
                fetchLeads(); // refresh
            }
        } catch (err) {
            toast.error('Failed to update lead');
        } finally {
            setSaving(false);
        }
    };

    const newLeads = leads.filter(lead => lead.paymentStatus === 'pending' && (!lead.leadStatus || lead.leadStatus === 'new'));
    const hotLeads = leads.filter(lead => lead.paymentStatus === 'partial' && (!lead.leadStatus || lead.leadStatus === 'new'));
    const callingLeads = leads.filter(lead => lead.leadStatus === 'calling');
    const contactedLeads = leads.filter(lead => lead.leadStatus === 'contacted');
    const interestedLeads = leads.filter(lead => lead.leadStatus === 'interested');
    const notInterestedLeads = leads.filter(lead => lead.leadStatus === 'not_interested');
    const followUpLeads = leads.filter(lead => lead.leadStatus === 'follow_up' || lead.leadStatus === 'not_contacted');

    return (
        <div className="dashboard-page">
            <Container fluid className="px-md-5 pt-4 pb-5">
                <div className="dashboard-header mb-4">
                    <h2 className="dashboard-title-main mb-1 d-flex align-items-center gap-3">
                        <FaUserPlus className="text-pink" /> Leads Management
                    </h2>
                    <p className="dashboard-subtext m-0">Track attendees who initiated checkout but haven't fully paid.</p>
                </div>

                {loading ? (
                    <div className="d-flex justify-content-center py-5">
                        <Spinner animation="border" variant="pink" />
                    </div>
                ) : (
                    <Card className="dashboard-card border-0 shadow-sm">
                        <Card.Body className="p-4">
                            {/* Mobile Dropdown (Visible only on small screens) */}
                            <div className="d-md-none mb-4">
                                <label className="form-label text-muted fw-semibold small mb-2">FILTER LEADS</label>
                                <select 
                                    className="form-select border-0 shadow-sm fw-bold"
                                    style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '12px 16px' }}
                                    value={activeTab}
                                    onChange={(e) => setActiveTab(e.target.value)}
                                >
                                    <option value="new">New Leads ({newLeads.length})</option>
                                    <option value="hot">Hot Leads ({hotLeads.length})</option>
                                    <option value="calling">Calling ({callingLeads.length})</option>
                                    <option value="contacted">Contacted ({contactedLeads.length})</option>
                                    <option value="follow_up">Follow-up ({followUpLeads.length})</option>
                                    <option value="interested">Interested ({interestedLeads.length})</option>
                                    <option value="not_interested">Not Interested ({notInterestedLeads.length})</option>
                                </select>
                            </div>

                            {/* Desktop Tabs (Hidden nav on mobile) */}
                            <Tabs 
                                activeKey={activeTab}
                                onSelect={(k) => setActiveTab(k)}
                                id="leads-tabs" 
                                className="mb-4 custom-tabs leads-mobile-tabs d-none d-md-flex" 
                            >
                                <Tab 
                                    eventKey="new" 
                                    title={
                                        <span className="text-nowrap">
                                            <FaUserPlus className="me-2" /> 
                                            New Leads <Badge bg="secondary" className="ms-1">{newLeads.length}</Badge>
                                        </span>
                                    }
                                >
                                    <div style={{ whiteSpace: 'normal' }}>
                                        <LeadsTable leads={newLeads} type="new" onManage={handleManageLead} onUpdateLead={fetchLeads} />
                                    </div>
                                </Tab>
                                <Tab 
                                    eventKey="hot" 
                                    title={
                                        <span className="text-nowrap">
                                            <FaFire className="me-2 text-danger" /> 
                                            Hot Leads <Badge bg="danger" className="ms-1">{hotLeads.length}</Badge>
                                        </span>
                                    }
                                >
                                    <div style={{ whiteSpace: 'normal' }}>
                                        <LeadsTable leads={hotLeads} type="hot" onManage={handleManageLead} onUpdateLead={fetchLeads} />
                                    </div>
                                </Tab>
                                <Tab 
                                    eventKey="calling" 
                                    title={
                                        <span className="text-nowrap">
                                            <FaPhoneAlt className="me-2 text-warning" /> 
                                            Calling <Badge bg="warning" text="dark" className="ms-1">{callingLeads.length}</Badge>
                                        </span>
                                    }
                                >
                                    <div style={{ whiteSpace: 'normal' }}>
                                        <LeadsTable leads={callingLeads} type="calling" onManage={handleManageLead} onUpdateLead={fetchLeads} />
                                    </div>
                                </Tab>
                                <Tab 
                                    eventKey="contacted" 
                                    title={
                                        <span className="text-nowrap">
                                            <FaCheckCircle className="me-2 text-info" /> 
                                            Contacted <Badge bg="info" className="ms-1">{contactedLeads.length}</Badge>
                                        </span>
                                    }
                                >
                                    <div style={{ whiteSpace: 'normal' }}>
                                        <LeadsTable leads={contactedLeads} type="contacted" onManage={handleManageLead} onUpdateLead={fetchLeads} />
                                    </div>
                                </Tab>
                                <Tab 
                                    eventKey="follow_up" 
                                    title={
                                        <span className="text-nowrap">
                                            <FaClock className="me-2 text-primary" /> 
                                            Follow-up <Badge bg="primary" className="ms-1">{followUpLeads.length}</Badge>
                                        </span>
                                    }
                                >
                                    <div style={{ whiteSpace: 'normal' }}>
                                        <LeadsTable leads={followUpLeads} type="follow-up" onManage={handleManageLead} onUpdateLead={fetchLeads} />
                                    </div>
                                </Tab>
                                <Tab 
                                    eventKey="interested"  
                                    title={
                                        <span className="text-nowrap">
                                            <FaStar className="me-2 text-success" /> 
                                            Interested <Badge bg="success" className="ms-1">{interestedLeads.length}</Badge>
                                        </span>
                                    }
                                >
                                    <div style={{ whiteSpace: 'normal' }}>
                                        <LeadsTable leads={interestedLeads} type="interested" onManage={handleManageLead} onUpdateLead={fetchLeads} />
                                    </div>
                                </Tab>
                                <Tab 
                                    eventKey="not_interested" 
                                    title={
                                        <span className="text-nowrap">
                                            <FaTimesCircle className="me-2 text-secondary" /> 
                                            Not Interested <Badge bg="secondary" className="ms-1">{notInterestedLeads.length}</Badge>
                                        </span>
                                    }
                                >
                                    <div style={{ whiteSpace: 'normal' }}>
                                        <LeadsTable leads={notInterestedLeads} type="not interested" onManage={handleManageLead} onUpdateLead={fetchLeads} />
                                    </div>
                                </Tab>
                            </Tabs>
                        </Card.Body>
                    </Card>
                )}

                {/* Lead Management Modal */}
                {selectedLead && (
                    <div className={`modal fade ${showModal ? 'show d-block' : ''}`} style={{ backgroundColor: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(8px)', transition: 'opacity 0.3s ease' }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg" style={{ transform: showModal ? 'scale(1)' : 'scale(0.95)', transition: 'transform 0.3s ease' }}>
                            <div className="modal-content border-0 bg-white" style={{ borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                                <div className="modal-header border-bottom border-light px-4 py-3 bg-light" style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
                                    <h5 className="modal-title d-flex align-items-center fw-bold" style={{ color: '#111827', fontSize: '1.1rem' }}>
                                        <FaStar className="text-warning me-2" /> Lead Action Center
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                                    <div className="row g-4">
                                        {/* Left Column: Attendee Info */}
                                        <div className="col-lg-5">
                                            <div className="p-4 bg-white" style={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                                <div className="d-flex align-items-center mb-4">
                                                    <div className="d-flex align-items-center justify-content-center text-white fw-bold me-3 shadow-sm" style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fontSize: '1.2rem', flexShrink: 0 }}>
                                                        {((selectedLead.attendeeDetails?.[0]?.name || selectedLead.user?.name || 'N A').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase())}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <h4 className="mb-1 fw-bold text-truncate" style={{ fontSize: '18px', color: '#111827' }}>{selectedLead.attendeeDetails?.[0]?.name || selectedLead.user?.name || 'N/A'}</h4>
                                                        <Badge style={{ backgroundColor: getStatusColor(selectedLead.leadStatus || 'new'), color: '#fff', fontWeight: '500', letterSpacing: '0.5px' }} className="px-2 py-1">
                                                            {(selectedLead.leadStatus || 'new').replace('_', ' ').toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                
                                                <div className="mb-4">
                                                    <div className="d-flex align-items-center mb-2">
                                                        <FaEnvelope className="text-muted me-2" style={{ width: '16px' }} />
                                                        <span className="text-truncate" style={{ color: '#374151', fontSize: '0.95rem' }}>{selectedLead.attendeeDetails?.[0]?.email || selectedLead.contactEmail || selectedLead.user?.email || 'N/A'}</span>
                                                    </div>
                                                    <div className="d-flex align-items-center">
                                                        <FaPhone className="text-muted me-2" style={{ width: '16px' }} />
                                                        <span style={{ color: '#374151', fontSize: '0.95rem' }}>{selectedLead.attendeeDetails?.[0]?.phone || selectedLead.user?.phone || 'N/A'}</span>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-top" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                                                    <h6 className="text-muted fw-semibold mb-1" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Interested Event</h6>
                                                    <p className="mb-3 fw-medium" style={{ color: '#111827', fontSize: '0.95rem', lineHeight: '1.4' }}>{selectedLead.event?.title || 'N/A'}</p>
                                                    
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <div>
                                                            <h6 className="text-muted fw-semibold mb-1" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Package</h6>
                                                            <Badge bg="light" text="dark" className="border px-2 py-1 fw-medium">{selectedLead.ticketType}</Badge>
                                                        </div>
                                                        <div className="text-end">
                                                            <h6 className="text-muted fw-semibold mb-1" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Amount</h6>
                                                            <span className="fw-bold" style={{ color: '#111827', fontSize: '1.05rem' }}>₹{selectedLead.totalAmount}</span>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex align-items-center justify-content-between">
                                                        <h6 className="text-muted fw-semibold mb-0" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Payment Status</h6>
                                                        <Badge bg={selectedLead.paymentStatus === 'completed' ? 'success' : selectedLead.paymentStatus === 'partial' ? 'warning' : 'danger'} className="px-2 py-1 shadow-sm">
                                                            {selectedLead.paymentStatus?.toUpperCase() || 'PENDING'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Actions */}
                                        <div className="col-lg-7 d-flex flex-column">
                                            <div className="mb-4">
                                                <label className="form-label text-muted fw-semibold mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>UPDATE LEAD STATUS</label>
                                                <select 
                                                    className="form-select border-0 shadow-sm"
                                                    style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '0.75rem 1rem', color: '#111827', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    value={status}
                                                    onChange={(e) => setStatus(e.target.value)}
                                                >
                                                    <option value="new">New Lead</option>
                                                    <option value="calling">Calling</option>
                                                    <option value="contacted">Contacted</option>
                                                    <option value="interested">Interested</option>
                                                    <option value="not_interested">Not Interested</option>
                                                    <option value="follow_up">Follow-up Required</option>
                                                    <option value="converted">Converted (Paid)</option>
                                                    <option value="lost">Lost</option>
                                                </select>
                                            </div>

                                            <div className="mb-4">
                                                <label className="form-label text-muted fw-semibold mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>CALL NOTES</label>
                                                <textarea 
                                                    className="form-control border-0 shadow-sm" 
                                                    rows="3" 
                                                    style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '1rem', color: '#111827', resize: 'none', transition: 'all 0.2s' }}
                                                    placeholder="e.g., Requested a callback tomorrow. Seems interested in the VIP package."
                                                    value={note}
                                                    onChange={(e) => setNote(e.target.value)}
                                                ></textarea>
                                            </div>

                                            {status === 'follow_up' && (
                                                <div className="mb-4">
                                                    <label className="form-label text-muted fw-semibold mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>SCHEDULE FOLLOW-UP</label>
                                                    <input 
                                                        type="datetime-local" 
                                                        className="form-control border-0 shadow-sm"
                                                        style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '0.75rem 1rem', color: '#111827', transition: 'all 0.2s' }}
                                                        value={followupDate}
                                                        onChange={(e) => setFollowupDate(e.target.value)}
                                                    />
                                                </div>
                                            )}

                                            {selectedLead.leadNotes && selectedLead.leadNotes.length > 0 && (
                                                <div className="mt-auto">
                                                    <div className="d-flex align-items-center mb-3 pt-2">
                                                        <h6 className="text-muted fw-semibold mb-0" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Recent History</h6>
                                                        <div className="ms-3 flex-grow-1" style={{ height: '1px', backgroundColor: '#e5e7eb' }}></div>
                                                    </div>
                                                    <div className="d-flex flex-column gap-3 pe-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                        {selectedLead.leadNotes.slice().reverse().map((n, i) => (
                                                            <div key={i} className="d-flex gap-3">
                                                                <div className="mt-1">
                                                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getStatusColor(n.statusAtTime), boxShadow: '0 0 0 3px rgba(0,0,0,0.03)' }}></div>
                                                                </div>
                                                                <div className="flex-grow-1 pb-3" style={i !== selectedLead.leadNotes.length - 1 ? { borderBottom: '1px solid #f3f4f6' } : {}}>
                                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                                        <span className="fw-bold text-dark small text-capitalize">{n.statusAtTime?.replace('_', ' ') || 'Note'}</span>
                                                                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(n.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                                    </div>
                                                                    <p className="mb-0 text-secondary" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{n.note}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top px-4 py-3 bg-light sticky-bottom d-flex justify-content-end gap-2" style={{ borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px', borderColor: 'rgba(0,0,0,0.05)' }}>
                                    <button type="button" className="btn btn-outline-secondary px-4 fw-semibold" style={{ borderRadius: '12px', padding: '0.6rem 1rem', transition: 'all 0.2s' }} onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="button" className="btn text-white px-5 fw-semibold border-0 d-flex justify-content-center align-items-center" 
                                        style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)', borderRadius: '12px', padding: '0.6rem 1rem', boxShadow: '0 4px 10px rgba(244, 63, 94, 0.3)', minWidth: '140px', transition: 'all 0.2s' }} 
                                        onClick={handleSaveLead} disabled={saving}>
                                        {saving ? <Spinner size="sm" className="me-2" /> : 'Save Update'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Container>
        </div>
    );
};

const LeadsTable = ({ leads, type, onManage, onUpdateLead }) => {
    return (
        <>
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-lg-block">
                <Table hover className="align-middle text-nowrap">
                    <thead className="table-light">
                        <tr>
                            <th>Date</th>
                            <th>Attendee Name</th>
                            <th>Contact Info</th>
                            <th>Lead Status</th>
                            <th>Latest Action</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center py-5 text-muted">
                                    No {type} leads found.
                                </td>
                            </tr>
                        ) : (
                            leads.map(lead => <LeadRow key={lead._id} lead={lead} type={type} onManage={onManage} onUpdateLead={onUpdateLead} />)
                        )}
                    </tbody>
                </Table>
            </div>

            {/* Mobile List View */}
            <div className="d-block d-lg-none mt-2">
                {leads.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                        No {type} leads found.
                    </div>
                ) : (
                    <div className="list-group list-group-flush rounded-3 border border-secondary bg-dark">
                        {leads.map(lead => <LeadCard key={lead._id} lead={lead} type={type} onManage={onManage} onUpdateLead={onUpdateLead} />)}
                    </div>
                )}
            </div>
        </>
    );
};

const LeadRow = ({ lead, type, onManage, onUpdateLead }) => {
    const [status, setStatus] = useState(lead.leadStatus || 'new');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const name = lead.attendeeDetails?.[0]?.name || lead.user?.name || 'N/A';
    const email = lead.attendeeDetails?.[0]?.email || lead.contactEmail || lead.user?.email || 'N/A';
    const phone = lead.attendeeDetails?.[0]?.phone || lead.user?.phone || 'N/A';

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = { leadStatus: status };
            if (note.trim()) {
                data.note = note.trim();
            }
            const res = await updateLead(lead._id, data);
            if (res.data.success) {
                toast.success('Lead updated successfully');
                if (onUpdateLead) onUpdateLead();
            }
        } catch (err) {
            toast.error('Failed to update lead');
        } finally {
            setSaving(false);
        }
    };

    return (
        <tr>
            <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
            <td className="fw-semibold">{name}</td>
            <td>
                <div className="small"><FaEnvelope className="me-1 text-muted" /> {email}</div>
                <div className="small"><FaPhone className="me-1 text-muted" /> {phone}</div>
            </td>
            <td>
                <Badge bg="secondary" className="px-3 py-2 text-capitalize">{lead.leadStatus?.replace('_', ' ') || 'New'}</Badge>
            </td>
            <td>
                <div className="text-truncate text-muted small" style={{ maxWidth: '180px' }} title={lead.leadNotes?.[lead.leadNotes.length - 1]?.note || 'No action yet'}>
                    {lead.leadNotes?.[lead.leadNotes.length - 1]?.note || 'No action yet'}
                </div>
            </td>
            <td className="text-end">
                <button 
                    className="btn btn-sm btn-pink text-white rounded px-4 fw-bold shadow-sm"
                    onClick={() => onManage(lead)}
                >
                    UPDATE
                </button>
            </td>
        </tr>
    );
};

const LeadCard = ({ lead, type, onManage, onUpdateLead }) => {
    const [status, setStatus] = useState(lead.leadStatus || 'new');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const name = lead.attendeeDetails?.[0]?.name || lead.user?.name || 'N/A';
    const email = lead.attendeeDetails?.[0]?.email || lead.contactEmail || lead.user?.email || 'N/A';
    const phone = lead.attendeeDetails?.[0]?.phone || lead.user?.phone || 'N/A';

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = { leadStatus: status };
            if (note.trim()) {
                data.note = note.trim();
            }
            const res = await updateLead(lead._id, data);
            if (res.data.success) {
                toast.success('Lead updated successfully');
                if (onUpdateLead) onUpdateLead();
            }
        } catch (err) {
            toast.error('Failed to update lead');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="list-group-item bg-white text-dark border-light shadow-sm mb-2 rounded-3 py-3 px-3">
            <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="fw-bold text-truncate">{name}</div>
                    <div className="small text-muted mt-1 d-flex flex-column gap-1">
                        <span className="text-truncate"><FaPhone size={10} className="me-1"/>{phone}</span>
                        <span className="text-truncate"><FaEnvelope size={10} className="me-1"/>{email}</span>
                    </div>
                </div>
                <div className="text-end flex-shrink-0">
                    <div className="small text-muted" style={{fontSize: '0.7rem'}}>{new Date(lead.createdAt).toLocaleDateString()}</div>
                </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary gap-2">
                <div className="d-flex flex-column gap-1" style={{ minWidth: 0 }}>
                    <Badge bg="secondary" className="text-capitalize align-self-start px-2 py-1">{lead.leadStatus?.replace('_', ' ') || 'New'}</Badge>
                    <span className="text-truncate text-muted small" title={lead.leadNotes?.[lead.leadNotes.length - 1]?.note || 'No action yet'}>
                        {lead.leadNotes?.[lead.leadNotes.length - 1]?.note || 'No action yet'}
                    </span>
                </div>
                <button 
                    className="btn btn-sm btn-pink text-white px-3 py-1 fw-bold rounded shadow-sm flex-shrink-0"
                    onClick={() => onManage(lead)}
                >
                    UPDATE
                </button>
            </div>
        </div>
    );
};

export default OrganizerLeads;
