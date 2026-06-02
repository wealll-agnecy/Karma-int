import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import { Container, Row, Col, Card, Badge, Spinner, Button, Alert, Modal } from "react-bootstrap";
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaClock, FaEye, FaTrash, FaSearch, FaInbox, FaPhone } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../utils/soundManager';
import PremiumSearchBar from '../components/common/PremiumSearchBar';
import '../css/admin-pages.css';
import '../css/AdminStyles.css';

export default function AdminEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
        const res = await apiClient.get("/api/v1/enquiries");
        setEnquiries(res.data.data || res.data || []);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this enquiry?')) return;
    try {
        await apiClient.delete(`/api/v1/enquiries/${id}`);
        playSound('delete');
        setToast({ msg: 'Enquiry deleted', type: 'success' });
        fetchEnquiries();
        setShowModal(false);
    } catch (err) {
        setToast({ msg: 'Failed to delete', type: 'danger' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleShowDetails = (enquiry) => {
      setSelectedEnquiry(enquiry);
      setShowModal(true);
  };

  const filtered = enquiries.filter(e => 
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.message?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-page-container enquiries-wrapper">
      <Container fluid>
        <AnimatePresence>
            {toast && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
                    <Alert variant={toast.type} className="border-0 shadow-lg">{toast.msg}</Alert>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="admin-page-header">
            <div>
                <h1 className="enquiries-title d-flex align-items-center gap-3">
                    <FaInbox className="text-pink d-none d-lg-inline-flex" /> General Enquiries
                </h1>
                <p className="dashboard-subtext enquiries-subtitle">Incoming customer messages and signals</p>
            </div>
            <div className="d-flex gap-3">
                <PremiumSearchBar 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ minWidth: '300px' }}
                />
            </div>
        </div>

        <div className="admin-card enquiries-table border-0">
            {loading ? (
                <div className="loading-skeleton">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-row" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><FaInbox /></div>
                    <h3>Inbox Clear</h3>
                    <p>{search ? `No messages matching "${search}"` : 'No incoming enquiries recorded.'}</p>
                </div>
            ) : (
                <>
                    {/* Desktop View: Table */}
                    <div className="admin-table-wrapper d-none d-lg-block">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>SENDER</th>
                                    <th>MESSAGE PREVIEW</th>
                                    <th>DATE</th>
                                    <th>STATUS</th>
                                    <th className="text-end">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(e => (
                                    <tr key={e._id}>
                                        <td>
                                            <div className="fw-bold">{e.name}</div>
                                            <div className="small text-muted">{e.email}</div>
                                        </td>
                                        <td style={{ maxWidth: '300px' }}>
                                            <div className="text-truncate small opacity-75">{e.message}</div>
                                        </td>
                                        <td>{new Date(e.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`admin-badge badge-${e.status?.toLowerCase() === 'read' ? 'resolved' : 'pending'}`}>
                                                {e.status || 'New'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-btn-group justify-content-end">
                                                <button className="btn btn-pink-outline" onClick={() => navigate(`/admin/enquiries/${e._id}`)}>
                                                    <FaEye />
                                                </button>
                                                <button className="btn btn-pink" onClick={() => handleDelete(e._id)}>
                                                    <FaTrash size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View: Minimal — only name + eye icon */}
                    <div className="d-lg-none d-flex flex-column gap-2 p-3">
                        {filtered.map(e => (
                            <div
                                key={e._id}
                                className="d-flex align-items-center justify-content-between bg-white rounded-4 shadow-sm px-4 py-3"
                            >
                                <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>{e.name}</span>
                                <button
                                    className="btn btn-link p-0 text-pink"
                                    onClick={() => handleShowDetails(e)}
                                    title="View Full Details"
                                >
                                    <FaEye size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
      </Container>

      {/* Mobile Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="d-lg-none">
          <Modal.Header closeButton className="border-bottom-0 pb-0">
              <Modal.Title className="fw-bold fs-5">Enquiry Details</Modal.Title>
          </Modal.Header>
          <Modal.Body className="pt-2 pb-4 px-4">
              {selectedEnquiry && (
                  <div className="d-flex flex-column gap-3">
                      <div>
                          <h5 className="fw-black text-dark mb-0">{selectedEnquiry.name}</h5>
                          <Badge className={`mt-2 admin-badge badge-${selectedEnquiry.status?.toLowerCase() === 'read' ? 'resolved' : 'pending'}`}>
                              {selectedEnquiry.status || 'New'}
                          </Badge>
                      </div>
                      
                      <div className="d-flex flex-column gap-2 bg-slate-50 p-3 rounded-3 mt-2">
                          <div className="d-flex align-items-center gap-2">
                              <FaEnvelope className="text-pink" size={14} />
                              <span className="small fw-medium text-dark">{selectedEnquiry.email}</span>
                          </div>
                          {selectedEnquiry.phone && (
                              <div className="d-flex align-items-center gap-2">
                                  <FaPhone className="text-pink" size={14} />
                                  <span className="small fw-medium text-dark">{selectedEnquiry.phone}</span>
                              </div>
                          )}
                          <div className="d-flex align-items-center gap-2">
                              <FaClock className="text-pink" size={14} />
                              <span className="small fw-medium text-secondary">{new Date(selectedEnquiry.createdAt).toLocaleString()}</span>
                          </div>
                      </div>

                      <div className="mt-1">
                          <span className="text-secondary small fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Full Message</span>
                          <p className="text-dark small lh-lg m-0" style={{ whiteSpace: 'pre-wrap' }}>
                              {selectedEnquiry.message}
                          </p>
                      </div>
                  </div>
              )}
          </Modal.Body>
          <Modal.Footer className="border-top-0 pt-0 justify-content-between px-4 pb-4">
              <Button variant="light" className="fw-bold rounded-pill border" onClick={() => setShowModal(false)}>
                  Close
              </Button>
              {selectedEnquiry && (
                  <Button variant="pink" className="fw-bold rounded-pill d-flex align-items-center gap-2" onClick={() => handleDelete(selectedEnquiry._id)}>
                      <FaTrash size={12} /> Delete
                  </Button>
              )}
          </Modal.Footer>
      </Modal>
    </div>
  );
}
