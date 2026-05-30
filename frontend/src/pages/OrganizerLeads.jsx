import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Table, Spinner, Tabs, Tab } from 'react-bootstrap';
import { FaUserPlus, FaFire, FaEnvelope, FaPhone, FaPhoneAlt, FaCheckCircle, FaTimesCircle, FaStar, FaClock } from 'react-icons/fa';
import { getLeads, updateLead } from '../api/organizerApi';
import toast from 'react-hot-toast';
import '../css/dashboard.css';

const OrganizerLeads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

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
                            <Tabs 
                                defaultActiveKey="new" 
                                id="leads-tabs" 
                                className="mb-4 custom-tabs flex-nowrap overflow-auto" 
                                style={{ whiteSpace: 'nowrap', paddingBottom: '5px' }}
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
                                    <LeadsTable leads={newLeads} type="new" onManage={handleManageLead} onUpdateLead={fetchLeads} />
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
                                    <LeadsTable leads={hotLeads} type="hot" onManage={handleManageLead} onUpdateLead={fetchLeads} />
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
                                    <LeadsTable leads={callingLeads} type="calling" onManage={handleManageLead} onUpdateLead={fetchLeads} />
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
                                    <LeadsTable leads={contactedLeads} type="contacted" onManage={handleManageLead} onUpdateLead={fetchLeads} />
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
                                    <LeadsTable leads={followUpLeads} type="follow-up" onManage={handleManageLead} onUpdateLead={fetchLeads} />
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
                                    <LeadsTable leads={interestedLeads} type="interested" onManage={handleManageLead} onUpdateLead={fetchLeads} />
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
                                    <LeadsTable leads={notInterestedLeads} type="not interested" onManage={handleManageLead} onUpdateLead={fetchLeads} />
                                </Tab>
                            </Tabs>
                        </Card.Body>
                    </Card>
                )}

                {/* Lead Management Modal */}
                {selectedLead && (
                    <div className={`modal fade ${showModal ? 'show d-block' : ''}`} style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
                        <div className="modal-dialog modal-fullscreen">
                            <div className="modal-content bg-dark text-white border-0">
                                <div className="modal-header border-bottom border-secondary">
                                    <h5 className="modal-title d-flex align-items-center gap-2">
                                        <FaPhone className="text-pink" /> Lead Action Center
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body p-4">
                                    <div className="row g-4">
                                        <div className="col-md-5">
                                            <div className="p-3 bg-secondary bg-opacity-10 rounded-3 h-100">
                                                <h6 className="text-uppercase text-muted small fw-bold mb-3">Attendee Info</h6>
                                                <p className="mb-1 fw-bold">{selectedLead.attendeeDetails?.[0]?.name || selectedLead.user?.name || 'N/A'}</p>
                                                <p className="mb-1 small text-muted"><FaPhone className="me-2" /> {selectedLead.attendeeDetails?.[0]?.phone || selectedLead.user?.phone || 'N/A'}</p>
                                                <p className="mb-3 small text-muted"><FaEnvelope className="me-2" /> {selectedLead.attendeeDetails?.[0]?.email || selectedLead.contactEmail || selectedLead.user?.email || 'N/A'}</p>
                                                
                                                <h6 className="text-uppercase text-muted small fw-bold mb-2">Interested In</h6>
                                                <p className="mb-1 small">{selectedLead.event?.title}</p>
                                                <p className="mb-0 small"><Badge bg="light" text="dark">{selectedLead.ticketType}</Badge> - ₹{selectedLead.totalAmount}</p>
                                            </div>
                                        </div>
                                        <div className="col-md-7">
                                            <div className="mb-3">
                                                <label className="form-label small fw-bold text-muted">Update Lead Status</label>
                                                <select 
                                                    className="form-select bg-dark text-white border-secondary"
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

                                            {status === 'follow_up' && (
                                                <div className="mb-3">
                                                    <label className="form-label small fw-bold text-muted">Schedule Follow-up</label>
                                                    <input 
                                                        type="datetime-local" 
                                                        className="form-control bg-dark text-white border-secondary"
                                                        value={followupDate}
                                                        onChange={(e) => setFollowupDate(e.target.value)}
                                                    />
                                                </div>
                                            )}

                                            <div className="mb-3">
                                                <label className="form-label small fw-bold text-muted">Add Call Note</label>
                                                <textarea 
                                                    className="form-control bg-dark text-white border-secondary" 
                                                    rows="3" 
                                                    placeholder="e.g., Requested a callback tomorrow..."
                                                    value={note}
                                                    onChange={(e) => setNote(e.target.value)}
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {selectedLead.leadNotes && selectedLead.leadNotes.length > 0 && (
                                        <div className="mt-4 pt-3 border-top border-secondary">
                                            <h6 className="text-uppercase text-muted small fw-bold mb-3">Call History</h6>
                                            <div className="d-flex flex-column gap-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                                {selectedLead.leadNotes.slice().reverse().map((n, i) => (
                                                    <div key={i} className="p-2 bg-secondary bg-opacity-10 rounded">
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <Badge bg="dark" className="border border-secondary text-capitalize">{n.statusAtTime?.replace('_', ' ') || 'Note'}</Badge>
                                                            <span className="small text-muted" style={{ fontSize: '0.75rem' }}>{new Date(n.date).toLocaleString()}</span>
                                                        </div>
                                                        <p className="mb-0 small text-light">{n.note}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer border-top border-secondary">
                                    <button type="button" className="btn btn-dark" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="button" className="btn btn-primary bg-pink border-0 px-4" onClick={handleSaveLead} disabled={saving}>
                                        {saving ? <Spinner size="sm" /> : 'Save Update'}
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
                    className="btn btn-sm bg-pink text-white rounded px-4 fw-bold shadow-sm"
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
        <div className="list-group-item bg-dark text-white border-secondary py-3 px-2">
            <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <div className="fw-bold">{name}</div>
                    <div className="small text-muted d-flex align-items-center gap-2 mt-1">
                        <span><FaPhone size={10} className="me-1"/>{phone}</span>
                        <span><FaEnvelope size={10} className="me-1"/>{email}</span>
                    </div>
                </div>
                <div className="text-end">
                    <div className="small text-muted" style={{fontSize: '0.7rem'}}>{new Date(lead.createdAt).toLocaleDateString()}</div>
                </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary">
                <div className="d-flex flex-column gap-1">
                    <Badge bg="secondary" className="text-capitalize align-self-start px-2 py-1">{lead.leadStatus?.replace('_', ' ') || 'New'}</Badge>
                    <span className="text-truncate text-muted small" style={{ maxWidth: '160px' }} title={lead.leadNotes?.[lead.leadNotes.length - 1]?.note || 'No action yet'}>
                        {lead.leadNotes?.[lead.leadNotes.length - 1]?.note || 'No action yet'}
                    </span>
                </div>
                <button 
                    className="btn btn-sm bg-pink text-white px-4 py-2 fw-bold rounded shadow-sm"
                    onClick={() => onManage(lead)}
                >
                    UPDATE
                </button>
            </div>
        </div>
    );
};

export default OrganizerLeads;
