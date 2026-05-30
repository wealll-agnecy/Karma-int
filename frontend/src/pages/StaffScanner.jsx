import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import apiClient from '../api/apiClient';
import { playSound } from '../utils/soundManager';
import { Container, Button, Badge, Form } from 'react-bootstrap';
import { FaCheckCircle, FaTimesCircle, FaBackward, FaQrcode } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './StaffScanner.css';
import { useAuth } from '../context/AuthContext';
import firebaseRealtimeService from '../utils/socketService';

const StaffScanner = () => {
    const { user } = useAuth();
    const [scanResult, setScanResult] = useState(null);
    const [isScanning, setIsScanning] = useState(true);
    const [loading, setLoading] = useState(false);
    const [scannerError, setScannerError] = useState(null);
    const isProcessingRef = useRef(false);
    
    const [updating, setUpdating] = useState(false);
    const ticketUnsubscribeRef = useRef(null);

    const role = user?.staffCheckRole || 'ENTRY';
    const customAddons = user?.customAddonItemNames || [];

    useEffect(() => {
        return () => {
            if (ticketUnsubscribeRef.current) {
                ticketUnsubscribeRef.current();
            }
        };
    }, []);

    const toggleAction = async (endpoint, payload, successMessage) => {
        if (!scanResult || !scanResult.ticket) return;
        setUpdating(true);
        try {
            const res = await apiClient.post(endpoint, payload);
            if (res.data.success) {
                toast.success(successMessage);
                // The Firebase listener will automatically update the UI state
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed.');
        } finally {
            setUpdating(false);
        }
    };

    const handleEntryToggleUpdate = () => {
        toggleAction('/api/v1/tickets/update-entry', { ticketId: scanResult.ticket._id }, 'Entry marked successfully!');
    };

    const handleFoodToggleUpdate = () => {
        toggleAction('/api/v1/tickets/update-food', { ticketId: scanResult.ticket._id }, 'Food access marked as taken!');
    };

    const handleParkingToggleUpdate = () => {
        toggleAction('/api/v1/tickets/update-parking', { ticketId: scanResult.ticket._id }, 'Parking access marked as used!');
    };

    const handleAddonToggleUpdate = (itemName) => {
        toggleAction('/api/v1/tickets/update-addons', { ticketId: scanResult.ticket._id, itemName }, `${itemName} marked as claimed!`);
    };

    const onScanSuccess = useCallback(async (result) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        handleVerification(result);
    }, []);

    const onScanError = useCallback((err) => {
        // Continuous scanning
    }, []);

    const handleVerification = async (qrUrl) => {
        setLoading(true);
        setIsScanning(false);
        try {
            const segments = qrUrl.split('/');
            const ticketId = segments[segments.length - 1] || segments[segments.length - 2];
            
            const res = await apiClient.post('/api/v1/tickets/verify-scan', { ticketId });
            const data = res.data;

            if (data.status === 'GRANTED') {
                playSound('scanSuccess');
                try {
                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                } catch (vErr) {}

                // Setup Firebase listener for this specific ticket
                if (ticketUnsubscribeRef.current) {
                    ticketUnsubscribeRef.current();
                }
                const eventId = data.ticket?.eventId;
                if (eventId && data.ticket?._id) {
                    ticketUnsubscribeRef.current = firebaseRealtimeService.listenToTicket(eventId, data.ticket._id, (updatedTicket) => {
                        console.log("Firebase Ticket Update:", updatedTicket);
                        setScanResult(prev => {
                            if (!prev || !prev.ticket) return prev;
                            // Merge the updated boolean flags from Firebase
                            return {
                                ...prev,
                                ticket: {
                                    ...prev.ticket,
                                    ...updatedTicket // Overwrites isScanned, foodTaken, parkingUsed, addonStatuses etc.
                                }
                            };
                        });
                        setUpdating(false); // Enable UI again if it was blocked by updating
                    });
                }
            } else {
                playSound('scanDenied');
                try {
                    if (navigator.vibrate) navigator.vibrate(300);
                } catch (vErr) {}
            }

            setScanResult(data);
        } catch (err) {
            console.error("Verification Error:", err);
            playSound('error');
            setScanResult({ 
                status: 'DENIED', 
                reason: 'False Ticket',
                message: err.response?.data?.message || 'Verification system failure.' 
            });
        } finally {
            setLoading(false);
        }
    };

    const resetScanner = () => {
        isProcessingRef.current = false;
        if (ticketUnsubscribeRef.current) {
            ticketUnsubscribeRef.current();
            ticketUnsubscribeRef.current = null;
        }
        setScanResult(null);
        setIsScanning(true);
    };

    // Render Role UI Dynamically
    const renderRoleSpecificUI = () => {
        if (!scanResult || !scanResult.ticket || scanResult.status !== 'GRANTED') return null;
        const ticket = scanResult.ticket;

        if (role === 'ENTRY') {
            return (
                <div className="d-flex justify-content-between align-items-center bg-light p-3 rounded-3 border mt-4">
                    <div className="d-flex align-items-center gap-3">
                        <div className={`d-flex justify-content-center align-items-center rounded-circle ${ticket.isScanned ? 'bg-secondary text-white' : 'bg-primary text-white'}`} style={{ width: '36px', height: '36px' }}>
                            <span style={{ fontSize: '16px' }}>🎟️</span>
                        </div>
                        <div className="d-flex flex-column text-start">
                            <span className="fw-bold small text-dark">Entry Check</span>
                            <span className={`x-small fw-bold ${ticket.isScanned ? 'text-danger' : 'text-success'}`}>
                                {ticket.isScanned ? 'Entry already marked' : 'Clear for Entry'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <Form.Check 
                            type="switch"
                            id="entry-access-toggle"
                            checked={ticket.isScanned}
                            disabled={ticket.isScanned || updating}
                            onChange={handleEntryToggleUpdate}
                        />
                    </div>
                </div>
            );
        }

        if (role === 'FOOD') {
            return (
                <div className="d-flex justify-content-between align-items-center bg-light p-3 rounded-3 border mt-4">
                    <div className="d-flex align-items-center gap-3">
                        <div className={`d-flex justify-content-center align-items-center rounded-circle ${ticket.foodTaken ? 'bg-secondary text-white' : 'bg-pink text-white'}`} style={{ width: '36px', height: '36px' }}>
                            <span style={{ fontSize: '16px' }}>🍔</span>
                        </div>
                        <div className="d-flex flex-column text-start">
                            <span className="fw-bold small text-dark">Food</span>
                            <span className={`x-small fw-bold ${ticket.foodTaken ? 'text-secondary' : 'text-success'}`}>
                                {ticket.foodTaken ? 'Food is already taken' : 'Food Available'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <Form.Check 
                            type="switch"
                            id="food-access-toggle"
                            checked={ticket.foodTaken}
                            disabled={ticket.foodTaken || updating}
                            onChange={handleFoodToggleUpdate}
                        />
                    </div>
                </div>
            );
        }

        if (role === 'PARKING') {
            return (
                <div className="d-flex justify-content-between align-items-center bg-light p-3 rounded-3 border mt-4">
                    <div className="d-flex align-items-center gap-3">
                        <div className={`d-flex justify-content-center align-items-center rounded-circle ${ticket.parkingUsed ? 'bg-secondary text-white' : 'bg-info text-white'}`} style={{ width: '36px', height: '36px' }}>
                            <span style={{ fontSize: '16px' }}>🚗</span>
                        </div>
                        <div className="d-flex flex-column text-start">
                            <span className="fw-bold small text-dark">Parking</span>
                            <span className={`x-small fw-bold ${ticket.parkingUsed ? 'text-secondary' : 'text-success'}`}>
                                {ticket.parkingUsed ? 'Parking already used' : 'Parking Available'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <Form.Check 
                            type="switch"
                            id="parking-access-toggle"
                            checked={ticket.parkingUsed}
                            disabled={ticket.parkingUsed || updating}
                            onChange={handleParkingToggleUpdate}
                        />
                    </div>
                </div>
            );
        }

        if (role === 'CUSTOM_ADDON') {
            return (
                <div className="mt-4 d-flex flex-column gap-3">
                    {customAddons.map((item, idx) => {
                        const isClaimed = ticket.addonStatuses && ticket.addonStatuses[item];
                        return (
                            <div key={idx} className="d-flex justify-content-between align-items-center bg-light p-3 rounded-3 border">
                                <div className="d-flex align-items-center gap-3">
                                    <div className={`d-flex justify-content-center align-items-center rounded-circle ${isClaimed ? 'bg-secondary text-white' : 'bg-warning text-dark'}`} style={{ width: '36px', height: '36px' }}>
                                        <span style={{ fontSize: '16px' }}>🎁</span>
                                    </div>
                                    <div className="d-flex flex-column text-start">
                                        <span className="fw-bold small text-dark">{item}</span>
                                        <span className={`x-small fw-bold ${isClaimed ? 'text-secondary' : 'text-success'}`}>
                                            {isClaimed ? 'Already claimed' : 'Available'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <Form.Check 
                                        type="switch"
                                        id={`addon-toggle-${idx}`}
                                        checked={isClaimed || false}
                                        disabled={isClaimed || updating}
                                        onChange={() => handleAddonToggleUpdate(item)}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        return <div className="mt-4 text-center text-muted">No specific module assigned.</div>;
    };

    return (
        <div className="scanner-page">
            <Container>
                <div className="d-flex justify-content-between align-items-center w-100 max-w-500 mx-auto mb-4">
                    <Link to="/staff/dashboard" className="text-decoration-none text-muted small fw-bold">
                        <FaBackward className="me-2" /> EXIT
                    </Link>
                    <Badge bg={isScanning ? "success" : "secondary"} className="rounded-pill px-3 py-2">
                        {isScanning ? `${role} SENSOR ACTIVE` : "PAUSED"}
                    </Badge>
                </div>

                <h2 className="scanner-title text-center">Scan Ticket</h2>

                <AnimatePresence mode="wait">
                    {!scanResult ? (
                        <motion.div 
                            key="scanner"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-100 d-flex justify-content-center"
                        >
                            <ScannerView 
                                onScanSuccess={onScanSuccess} 
                                onScanError={onScanError}
                                scannerError={scannerError}
                                setScannerError={setScannerError}
                            />
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="result"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="scan-result-wrapper"
                        >
                            <div className="scan-status">
                                <h2 className={scanResult.status === 'GRANTED' ? 'green' : 'red'}>
                                    {scanResult.status === 'GRANTED' ? (
                                        <><FaCheckCircle /> {scanResult.message}</>
                                    ) : (
                                        <><FaTimesCircle /> {scanResult.message}</>
                                    )}
                                </h2>
                            </div>

                            <div className="attendee-card">
                                <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <h3 className="text-truncate mb-0 text-start" style={{ fontSize: '20px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            {scanResult.ticket?.name || 'Unknown Attendee'}
                                        </h3>
                                    </div>
                                    {(scanResult.reason || scanResult.status) && (
                                        <div className={`scan-reason ${scanResult.reason ? scanResult.reason.toLowerCase().replace(/ /g, '-') : (scanResult.status === 'GRANTED' ? 'valid-ticket' : 'false-ticket')}`}>
                                            {scanResult.reason || (scanResult.status === 'GRANTED' ? 'Valid' : 'Denied')}
                                        </div>
                                    )}
                                </div>

                                <div className="info-row">
                                    <span>Event</span>
                                    <b>{scanResult.ticket?.eventName || 'N/A'}</b>
                                </div>
                                
                                {role === 'ENTRY' && scanResult.ticket?.ticketTier && (
                                    <div className="info-row">
                                        <span>Plan</span>
                                        <b className="text-pink">{scanResult.ticket.ticketTier}</b>
                                    </div>
                                )}

                                {scanResult.ticket && (() => {
                                    const t = scanResult.ticket;
                                    const amountPaid = t.amountPaid || 0;
                                    const totalAmount = t.totalAmount || 0;
                                    const remainingAmount = t.remainingAmount || 0;
                                    const paymentStatus = (t.paymentStatus || 'PENDING').toUpperCase();
                                    const isFullyPaid = amountPaid >= totalAmount || paymentStatus === 'COMPLETED' || paymentStatus === 'PAID';

                                    return (
                                        <>
                                            <div className="info-row mt-2">
                                                <span>Payment Status</span>
                                                <Badge bg={isFullyPaid ? 'success' : paymentStatus === 'PARTIAL' ? 'warning' : 'danger'} className="text-uppercase fw-bold px-2 py-1">
                                                    {isFullyPaid ? 'Paid' : paymentStatus === 'PARTIAL' ? 'Partial' : 'Pending'}
                                                </Badge>
                                            </div>
                                            {!isFullyPaid && (
                                                <div className="info-row mt-2 fw-bold" style={{ color: '#dc3545' }}>
                                                    <span>Remaining Balance</span>
                                                    <span>₹{remainingAmount}</span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}

                                {/* Render Specific UI Controls */}
                                {scanResult.ticket && renderRoleSpecificUI()}

                                {scanResult.ticket && (() => {
                                    const t = scanResult.ticket;
                                    const amountPaid = t.amountPaid || 0;
                                    const totalAmount = t.totalAmount || 0;
                                    const remainingAmount = t.remainingAmount || 0;
                                    const paymentStatus = (t.paymentStatus || 'PENDING').toUpperCase();
                                    const isFullyPaid = amountPaid >= totalAmount || paymentStatus === 'COMPLETED' || paymentStatus === 'PAID';

                                    if (!isFullyPaid) {
                                        return (
                                            <div className="payment-warning-strip mt-3 p-3 rounded text-danger border d-flex align-items-center gap-2" style={{ backgroundColor: '#fff5f5', borderColor: '#ffc1c1' }}>
                                                <FaTimesCircle className="flex-shrink-0" style={{ color: '#dc3545' }} />
                                                <div className="text-start">
                                                    <strong style={{ color: '#dc3545' }}>ENTRY BLOCKED:</strong> Remaining payment of ₹{remainingAmount} is required.
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {!scanResult.ticket && (
                                    <div className="mt-3 text-center">
                                        <p className="text-danger small fw-bold">{scanResult.message}</p>
                                    </div>
                                )}

                                <button className="next-btn mt-4" onClick={resetScanner}>
                                    Next Scan
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="text-center mt-5 opacity-25">
                    <FaQrcode size={40} />
                    <div className="x-small fw-bold mt-2 uppercase tracking-widest">GrowthUtsav Terminal v2.0</div>
                </div>
            </Container>
        </div>
    );
};

export default StaffScanner;

// --- Helper Components ---
const ScannerView = ({ onScanSuccess, onScanError, scannerError, setScannerError }) => {
    const scannerRef = useRef(null);
    const hasInitializedRef = useRef(false);

    useEffect(() => {
        if (hasInitializedRef.current) return;
        
        const readerElement = document.getElementById('reader');
        if (!readerElement) {
            console.warn("Scanner reader element not found in DOM");
            return;
        }

        let html5QrCode;
        try {
            html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;
            hasInitializedRef.current = true;
        } catch (e) {
            console.error("Failed to create Html5Qrcode instance", e);
            return;
        }

        const startScanner = async () => {
            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    onScanSuccess,
                    onScanError
                );
            } catch (err) {
                console.error("Scanner start error:", err);
                try {
                    await html5QrCode.start(
                        { facingMode: "user" },
                        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                        onScanSuccess,
                        onScanError
                    );
                } catch (fallbackErr) {
                    console.error("Total scanner failure:", fallbackErr);
                    setScannerError("Camera access failed. Please ensure permissions are granted and you are using HTTPS.");
                }
            }
        };

        const timer = setTimeout(startScanner, 300);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current) {
                const scannerInstance = scannerRef.current;
                const stopScanner = async () => {
                    try {
                        if (scannerInstance.isScanning) {
                            await scannerInstance.stop();
                        }
                    } catch (e) {
                        console.warn("Scanner cleanup stop failed", e);
                    }
                };
                stopScanner();
                scannerRef.current = null;
                hasInitializedRef.current = false;
            }
        };
    }, [onScanSuccess, onScanError, setScannerError]);

    return (
        <div className="scanner-box">
            <div className="scanner-corner top-left"></div>
            <div className="scanner-corner top-right"></div>
            <div className="scanner-corner bottom-left"></div>
            <div className="scanner-corner bottom-right"></div>
            
            {scannerError ? (
                <div className="scanner-error-overlay">
                    <FaTimesCircle size={40} className="mb-3 text-danger" />
                    <p>{scannerError}</p>
                    <Button variant="outline-light" size="sm" onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </div>
            ) : (
                <div id="reader" style={{ width: '100%' }}></div>
            )}
        </div>
    );
};
