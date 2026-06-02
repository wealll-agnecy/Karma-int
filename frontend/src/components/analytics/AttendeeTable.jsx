import React, { useState } from 'react';
import { Table, Form, InputGroup, Badge, Button } from 'react-bootstrap';
import { FaSearch, FaDownload, FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/formatUtils';
import PremiumSearchBar from '../common/PremiumSearchBar';

const AttendeeTable = ({ attendees, exportToCSV }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredAttendees = (attendees || []).filter(a =>
        (a?.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a?.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a?._id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="attendee-management">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-4 mb-4">
                <div className="flex-grow-1">
                    <PremiumSearchBar 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ maxWidth: '400px' }}
                    />
                </div>
                <Button
                    variant="success"
                    className="rounded-pill d-flex align-items-center gap-3 btn fw-medium px-4 py-2"
                    onClick={exportToCSV}
                    disabled={attendees.length === 0}
                >
                    <FaDownload /> EXPORT CSV
                </Button>
            </div>

            <div className="table-responsive rounded-5 glass-panel border-white/5 overflow-hidden shadow-2xl">
                <Table hover variant="dark" className="m-0 align-middle bg-transparent">
                    <thead className="bg-white/5 border-bottom border-white/10">
                        <tr className="small text-uppercase fw-black text-white-50 tracking-widest">
                            <th className="px-5 py-4">Node / Guest</th>
                            <th className="py-4">Digital Identity</th>
                            <th className="py-4">Ticket Clearance</th>
                            <th className="py-4">Protocol Status</th>
                            <th className="text-end px-5 py-4">Total</th>
                        </tr>
                    </thead>
                    <tbody className="border-0">
                        {filteredAttendees.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="text-center py-5 text-white-50 fw-black italic opacity-30">
                                    {searchTerm ? 'No matches found in this sector.' : 'Sensors detect zero lifeforms in this node.'}
                                </td>
                            </tr>
                        ) : (
                            filteredAttendees.map((a, idx) => (
                                <motion.tr
                                    key={a._id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="border-bottom border-white/5 hover-bg-white/5 transition-all"
                                >
                                    <td className="px-5 py-4">
                                        <div className="fw-black text-white fs-5">{a.user.name}</div>
                                        <div className="text-white-50 small tracking-tighter uppercase opacity-40 font-monospace">#{a._id.slice(-8).toUpperCase()}</div>
                                    </td>
                                    <td className="text-white-50 opacity-80 fw-medium font-monospace">{a.user.email}</td>
                                    <td>
                                        <Badge bg="primary-subtle" text="primary" className="fw-black text-uppercase px-3 py-2 border border-primary/20">
                                            {a.ticketType}
                                        </Badge>
                                        <div className="mt-1 small text-white-50 opacity-60">Qty: {a.quantity}</div>
                                    </td>
                                    <td>
                                        {a.checkedIn ? (
                                            <Badge bg="success-subtle" text="success" className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-black uppercase tracking-widest">
                                                <FaCheckCircle size={10} /> Validated
                                            </Badge>
                                        ) : (
                                            <Badge bg="warning-subtle" text="warning" className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-black uppercase tracking-widest">
                                                <FaClock size={10} /> Pending
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="text-end px-5 py-4 fw-black text-primary gradient-text h4">{formatCurrency(a.totalAmount)}</td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </div>
        </div>
    );
};

export default AttendeeTable;
