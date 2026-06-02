import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Button, Spinner, Modal, Tab, Tabs } from 'react-bootstrap';
import { FaUserPlus, FaEnvelope, FaPhone, FaFire, FaCheckCircle, FaClock, FaStar, FaTimesCircle } from 'react-icons/fa';
import { getLeads, updateLead } from '../api/organizerApi';
import toast from 'react-hot-toast';

const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    card: { background: 'rgba(255,255,255,0.97)', border: '1px solid #ede8f4', borderRadius: '22px', boxShadow: '0 8px 32px rgba(100,60,180,0.07)', transition: 'all .3s ease', padding: '24px' },
    label: { fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#9ca3af', display: 'block', marginBottom: '8px' },
    input: { border: '1.5px solid #ede8f4', borderRadius: '12px', background: '#f8f7fc', padding: '10px 14px', fontSize: '0.85rem', outline: 'none', width: '100%', color: '#1e1b2e' },
};

const getStatusColor = (status) => {
    switch (status) {
        case 'new': return '#3b82f6';
        case 'calling': return '#eab308';
        case 'contacted': return '#0ea5e9';
        case 'interested': return '#22c55e';
        case 'not_interested': return '#64748b';
        case 'follow_up': return '#8b5cf6';
        case 'converted': return '#10b981';
        case 'lost': return '#ef4444';
        default: return '#94a3b8';
    }
};

const OrganizerLeads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('new');
    const [selectedLead, setSelectedLead] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [status, setStatus] = useState('new');
    const [note, setNote] = useState('');
    const [followupDate, setFollowupDate] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const res = await getLeads();
            if (res.data.success) {
                setLeads(res.data.data || res.data.leads || []);
            }
        } catch (err) {
            toast.error('Failed to load leads data');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchLeads(); }, []);

    const handleManageLead = (lead) => {
        setSelectedLead(lead);
        setStatus(lead.leadStatus || 'new');
        setNote('');
        if (lead.followupDate) {
            const d = new Date(lead.followupDate);
            const tzOffset = d.getTimezoneOffset() * 60000;
            const localISOTime = new Date(d - tzOffset).toISOString().slice(0, 16);
            setFollowupDate(localISOTime);
        } else {
            setFollowupDate('');
        }
        setShowModal(true);
    };

    const handleSaveLead = async () => {
        setSaving(true);
        try {
            const data = { leadStatus: status };
            if (note.trim()) data.note = note.trim();
            if (status === 'follow_up' && followupDate) data.followupDate = new Date(followupDate).toISOString();
            const res = await updateLead(selectedLead._id, data);
            if (res.data.success) {
                toast.success('Lead updated successfully');
                setShowModal(false);
                fetchLeads();
            }
        } catch (err) { toast.error('Failed to update lead'); } finally { setSaving(false); }
    };

    const newLeads = leads.filter(lead => lead.paymentStatus === 'pending' && (!lead.leadStatus || lead.leadStatus === 'new'));
    const hotLeads = leads.filter(lead => lead.paymentStatus === 'partial' && (!lead.leadStatus || lead.leadStatus === 'new'));
    const callingLeads = leads.filter(lead => lead.leadStatus === 'calling');
    const contactedLeads = leads.filter(lead => lead.leadStatus === 'contacted');
    const interestedLeads = leads.filter(lead => lead.leadStatus === 'interested');
    const notInterestedLeads = leads.filter(lead => lead.leadStatus === 'not_interested');
    const followUpLeads = leads.filter(lead => lead.leadStatus === 'follow_up' || lead.leadStatus === 'not_contacted');

    return (
        <div style={P.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>
                <div style={{ padding: '40px 0 28px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '8px' }}>Organizer Portal</div>
                    <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-1.5px', color: '#1e1b2e', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FaUserPlus color="#d946ef" size={28} /> Leads Management
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: '6px', marginBottom: 0, fontSize: '0.9rem' }}>
                        Track attendees who initiated checkout but haven't fully paid.
                    </p>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                        <Spinner animation="border" style={{ color: '#8b5cf6', width: '2.5rem', height: '2.5rem' }} />
                    </div>
                ) : (
                    <div style={{ ...P.card, padding: 0 }}>
                        <div className="d-md-none" style={{ padding: '20px' }}>
                            <label style={P.label}>FILTER LEADS</label>
                            <select style={P.input} value={activeTab} onChange={(e) => setActiveTab(e.target.value)}>
                                <option value="new">New Leads ({newLeads.length})</option>
                                <option value="hot">Hot Leads ({hotLeads.length})</option>
                                <option value="calling">Calling ({callingLeads.length})</option>
                                <option value="contacted">Contacted ({contactedLeads.length})</option>
                                <option value="follow_up">Follow-up ({followUpLeads.length})</option>
                                <option value="interested">Interested ({interestedLeads.length})</option>
                                <option value="not_interested">Not Interested ({notInterestedLeads.length})</option>
                            </select>
                        </div>

                        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="d-none d-md-flex custom-premium-tabs px-4 pt-4" style={{ borderBottom: '1.5px solid #ede8f4' }}>
                            <Tab eventKey="new" title={<span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}><FaUserPlus /> New <Badge bg="secondary" style={{ borderRadius: '6px' }}>{newLeads.length}</Badge></span>}>
                                <LeadsTable leads={newLeads} onManage={handleManageLead} onUpdateLead={fetchLeads} />
                            </Tab>
                            <Tab eventKey="hot" title={<span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', color: '#ef4444' }}><FaFire /> Hot <Badge bg="danger" style={{ borderRadius: '6px' }}>{hotLeads.length}</Badge></span>}>
                                <LeadsTable leads={hotLeads} onManage={handleManageLead} onUpdateLead={fetchLeads} />
                            </Tab>
                            <Tab eventKey="calling" title={<span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', color: '#eab308' }}><FaPhone /> Calling <Badge bg="warning" text="dark" style={{ borderRadius: '6px' }}>{callingLeads.length}</Badge></span>}>
                                <LeadsTable leads={callingLeads} onManage={handleManageLead} onUpdateLead={fetchLeads} />
                            </Tab>
                            <Tab eventKey="contacted" title={<span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', color: '#0ea5e9' }}><FaCheckCircle /> Contacted <Badge bg="info" style={{ borderRadius: '6px' }}>{contactedLeads.length}</Badge></span>}>
                                <LeadsTable leads={contactedLeads} onManage={handleManageLead} onUpdateLead={fetchLeads} />
                            </Tab>
                            <Tab eventKey="follow_up" title={<span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', color: '#8b5cf6' }}><FaClock /> Follow-up <Badge bg="primary" style={{ borderRadius: '6px' }}>{followUpLeads.length}</Badge></span>}>
                                <LeadsTable leads={followUpLeads} onManage={handleManageLead} onUpdateLead={fetchLeads} />
                            </Tab>
                            <Tab eventKey="interested" title={<span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', color: '#22c55e' }}><FaStar /> Interested <Badge bg="success" style={{ borderRadius: '6px' }}>{interestedLeads.length}</Badge></span>}>
                                <LeadsTable leads={interestedLeads} onManage={handleManageLead} onUpdateLead={fetchLeads} />
                            </Tab>
                            <Tab eventKey="not_interested" title={<span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', color: '#64748b' }}><FaTimesCircle /> Not Interested <Badge bg="secondary" style={{ borderRadius: '6px' }}>{notInterestedLeads.length}</Badge></span>}>
                                <LeadsTable leads={notInterestedLeads} onManage={handleManageLead} onUpdateLead={fetchLeads} />
                            </Tab>
                        </Tabs>

                        {/* Mobile Lists corresponding to activeTab */}
                        <div className="d-block d-md-none p-3">
                            {activeTab === 'new' && <LeadsListMobile leads={newLeads} onManage={handleManageLead} />}
                            {activeTab === 'hot' && <LeadsListMobile leads={hotLeads} onManage={handleManageLead} />}
                            {activeTab === 'calling' && <LeadsListMobile leads={callingLeads} onManage={handleManageLead} />}
                            {activeTab === 'contacted' && <LeadsListMobile leads={contactedLeads} onManage={handleManageLead} />}
                            {activeTab === 'follow_up' && <LeadsListMobile leads={followUpLeads} onManage={handleManageLead} />}
                            {activeTab === 'interested' && <LeadsListMobile leads={interestedLeads} onManage={handleManageLead} />}
                            {activeTab === 'not_interested' && <LeadsListMobile leads={notInterestedLeads} onManage={handleManageLead} />}
                        </div>
                    </div>
                )}

                {/* Lead Action Modal */}
                <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                    <Modal.Header closeButton style={{ borderBottom: '1px solid #ede8f4', padding: '24px' }}>
                        <Modal.Title style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1e1b2e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FaStar color="#eab308" /> Lead Action Center
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ padding: '0', background: '#fdf7ff' }}>
                        {selectedLead && (
                            <div className="d-flex flex-column flex-lg-row">
                                <div style={{ flex: 1, padding: '24px', borderRight: '1px solid #ede8f4', background: '#fff' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6d28d9', fontWeight: 800, fontSize: '1.4rem' }}>
                                            {((selectedLead.attendeeDetails?.[0]?.name || selectedLead.user?.name || 'N A')[0]).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 style={{ fontWeight: 800, color: '#1e1b2e', margin: '0 0 4px 0', fontSize: '1.1rem' }}>
                                                {selectedLead.attendeeDetails?.[0]?.name || selectedLead.user?.name || 'N/A'}
                                            </h4>
                                            <Badge style={{ background: getStatusColor(selectedLead.leadStatus || 'new'), fontSize: '0.65rem', padding: '4px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                {(selectedLead.leadStatus || 'new').replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4b5563', fontSize: '0.85rem' }}>
                                            <FaEnvelope color="#8b5cf6" /> {selectedLead.attendeeDetails?.[0]?.email || selectedLead.contactEmail || selectedLead.user?.email || 'N/A'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4b5563', fontSize: '0.85rem' }}>
                                            <FaPhone color="#8b5cf6" /> {selectedLead.attendeeDetails?.[0]?.phone || selectedLead.user?.phone || 'N/A'}
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1px solid #ede8f4', paddingTop: '20px' }}>
                                        <h6 style={P.label}>Interested Event</h6>
                                        <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.9rem', marginBottom: '16px' }}>{selectedLead.event?.title || 'N/A'}</div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', background: '#f8f7fc', padding: '12px', borderRadius: '12px' }}>
                                            <div>
                                                <div style={P.label}>Package</div>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#4b5563' }}>{selectedLead.ticketType}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={P.label}>Amount</div>
                                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e1b2e' }}>₹{selectedLead.totalAmount}</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={P.label}>Payment Status</div>
                                            <Badge bg={selectedLead.paymentStatus === 'completed' ? 'success' : selectedLead.paymentStatus === 'partial' ? 'warning' : 'danger'} style={{ fontSize: '0.65rem', padding: '4px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                {selectedLead.paymentStatus || 'PENDING'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ flex: 1.2, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={P.label}>Update Lead Status</label>
                                        <select style={P.input} value={status} onChange={(e) => setStatus(e.target.value)}>
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

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={P.label}>Call Notes</label>
                                        <textarea style={{ ...P.input, resize: 'none' }} rows="3" placeholder="e.g., Requested a callback tomorrow." value={note} onChange={(e) => setNote(e.target.value)} />
                                    </div>

                                    {status === 'follow_up' && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <label style={P.label}>Schedule Follow-up</label>
                                            <input type="datetime-local" style={P.input} value={followupDate} onChange={(e) => setFollowupDate(e.target.value)} />
                                        </div>
                                    )}

                                    {selectedLead.leadNotes && selectedLead.leadNotes.length > 0 && (
                                        <div style={{ marginTop: 'auto' }}>
                                            <h6 style={{ ...P.label, borderBottom: '1px solid #ede8f4', paddingBottom: '8px', marginBottom: '12px' }}>Recent History</h6>
                                            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {selectedLead.leadNotes.slice().reverse().map((n, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: '12px' }}>
                                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: getStatusColor(n.statusAtTime), marginTop: '4px', flexShrink: 0 }} />
                                                        <div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e1b2e', textTransform: 'capitalize' }}>{n.statusAtTime?.replace('_', ' ') || 'Note'}</span>
                                                                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{new Date(n.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.4 }}>{n.note}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer style={{ borderTop: '1px solid #ede8f4', padding: '16px 24px', background: '#fff' }}>
                        <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: '1.5px solid #ede8f4', borderRadius: '12px', color: '#6b7280', fontWeight: 600, fontSize: '0.85rem', padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleSaveLead} disabled={saving} style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '10px 28px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(139,92,246,.25)' }}>
                            {saving ? <Spinner size="sm" /> : 'Save Update'}
                        </button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

const LeadsTable = ({ leads, onManage }) => (
    <div className="d-none d-md-block">
        {leads.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>No leads found in this category.</div>
        ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f8f7fc', borderBottom: '1.5px solid #ede8f4' }}>
                        <th style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', textAlign: 'left' }}>Attendee</th>
                        <th style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', textAlign: 'left' }}>Contact Info</th>
                        <th style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', textAlign: 'left' }}>Latest Action</th>
                        <th style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', textAlign: 'right' }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map(lead => (
                        <tr key={lead._id} style={{ borderTop: '1px solid #f3f4f6', transition: 'background .2s' }} onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#4b5563', fontWeight: 600 }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#1e1b2e', fontWeight: 700 }}>{lead.attendeeDetails?.[0]?.name || lead.user?.name || 'N/A'}</td>
                            <td style={{ padding: '16px 20px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><FaEnvelope color="#a78bfa" /> {lead.attendeeDetails?.[0]?.email || lead.contactEmail || lead.user?.email || 'N/A'}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}><FaPhone color="#a78bfa" /> {lead.attendeeDetails?.[0]?.phone || lead.user?.phone || 'N/A'}</div>
                            </td>
                            <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                <Badge style={{ background: getStatusColor(lead.leadStatus || 'new'), fontSize: '0.65rem', padding: '6px 12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    {(lead.leadStatus || 'new').replace('_', ' ')}
                                </Badge>
                            </td>
                            <td style={{ padding: '16px 20px', fontSize: '0.8rem', color: '#6b7280', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {lead.leadNotes?.[lead.leadNotes.length - 1]?.note || 'No action yet'}
                            </td>
                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                <button onClick={() => onManage(lead)} style={{ background: 'transparent', border: '1.5px solid #d946ef', borderRadius: '8px', color: '#d946ef', fontWeight: 700, fontSize: '0.75rem', padding: '6px 14px', cursor: 'pointer', transition: 'all .2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fdf4ff'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    UPDATE
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
    </div>
);

const LeadsListMobile = ({ leads, onManage }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {leads.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No leads found.</div>
        ) : (
            leads.map(lead => (
                <div key={lead._id} style={{ background: '#fff', border: '1.5px solid #ede8f4', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                            <div style={{ fontWeight: 800, color: '#1e1b2e', fontSize: '0.95rem' }}>{lead.attendeeDetails?.[0]?.name || lead.user?.name || 'N/A'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{new Date(lead.createdAt).toLocaleDateString()}</div>
                        </div>
                        <Badge style={{ background: getStatusColor(lead.leadStatus || 'new'), fontSize: '0.6rem', padding: '4px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            {(lead.leadStatus || 'new').replace('_', ' ')}
                        </Badge>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}><FaEnvelope color="#a78bfa" /> {lead.attendeeDetails?.[0]?.email || lead.contactEmail || lead.user?.email || 'N/A'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}><FaPhone color="#a78bfa" /> {lead.attendeeDetails?.[0]?.phone || lead.user?.phone || 'N/A'}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px dashed #ede8f4' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lead.leadNotes?.[lead.leadNotes.length - 1]?.note || 'No action yet'}
                        </div>
                        <button onClick={() => onManage(lead)} style={{ background: '#fdf4ff', border: '1px solid #fbcfe8', borderRadius: '8px', color: '#d946ef', fontWeight: 700, fontSize: '0.75rem', padding: '6px 14px', cursor: 'pointer' }}>
                            UPDATE
                        </button>
                    </div>
                </div>
            ))
        )}
    </div>
);

export default OrganizerLeads;
