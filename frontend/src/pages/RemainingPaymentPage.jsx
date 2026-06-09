import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import * as bookingApi from "../api/bookingApi";
import toast from "react-hot-toast";
import { playSound } from "../utils/soundManager";
import { formatCurrency } from "../utils/formatUtils";

const RemainingPaymentPage = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();

    const [booking, setBooking] = useState(null);
    const [partialAmount, setPartialAmount] = useState("");
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successAmount, setSuccessAmount] = useState(0);

    useEffect(() => {
        const fetchBookingData = async () => {
            try {
                setLoading(true);
                const res = await bookingApi.getMyBookings();
                const found = res.data.data.find(b => b._id === bookingId);
                if (!found) {
                    toast.error("Booking node not found");
                    navigate('/my-bookings');
                    return;
                }
                setBooking(found);
            } catch (err) {
                console.error("Booking Fetch Error:", err);
                toast.error("Failed to synchronize booking data");
            } finally {
                setLoading(false);
            }
        };
        fetchBookingData();
    }, [bookingId, navigate]);

    const initiatePaymentFlow = async (amount) => {
        try {
            setProcessing(true);
            const loadToast = toast.loading(`Initiating secure checkout for ${formatCurrency(amount)}...`);

            // 1. Load Razorpay Script
            const { loadRazorpayScript } = await import("../utils/loadScript");
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                toast.error("Failed to load payment gateway.", { id: loadToast });
                setProcessing(false);
                return;
            }

            // 2. Initiate Order (Existing behavior)
            await bookingApi.initiateInstallment(bookingId, amount);

            // 3. Create Razorpay Order on Backend
            const { createRazorpayOrder, verifyRazorpayPayment } = await import("../api/paymentApi");
            const orderRes = await createRazorpayOrder(amount, "INR", { bookingId });
            
            if (!orderRes.data.success) {
                toast.error("Failed to create order.", { id: loadToast });
                setProcessing(false);
                return;
            }

            toast.dismiss(loadToast);

            // 4. Open Razorpay Checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || "dummy_key",
                amount: orderRes.data.amount,
                currency: orderRes.data.currency,
                name: "MAKEUP CONCLAVE 1.0",
                description: "Installment Payment",
                order_id: orderRes.data.orderId,
                handler: async function (response) {
                    try {
                        const verifyToast = toast.loading("Verifying payment signature...");
                        
                        // 5. Verify Payment on Backend (Only Payment Schema, No Ticket/Booking Changes yet)
                        const verifyRes = await verifyRazorpayPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        if (verifyRes.data.success) {
                            toast.success("Payment Captured!", { id: verifyToast });
                            
                            // For Phase 3, we stop here and just show success without running verifyInstallment
                            setSuccessAmount(amount);
                            const isFullyPaidNow = (booking.amountPaid + amount) >= booking.totalAmount;
                            
                            if (isFullyPaidNow) {
                                setShowSuccess(true);
                                playSound('paymentSuccess');
                            } else {
                                toast.success("Partial payment captured successfully!");
                                setTimeout(() => window.location.reload(), 1500);
                            }
                        } else {
                            toast.error("Signature verification failed", { id: verifyToast });
                        }
                    } catch (error) {
                        toast.error("Payment verification failed");
                        console.error(error);
                    }
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
            console.error("Payment Flow Error:", err);
            toast.error(err.response?.data?.message || "Payment protocol failed");
            setProcessing(false);
        }
    };

    const handleFullPayment = () => {
        const due = Math.max((booking.totalAmount || 0) - (booking.amountPaid || 0), 0);
        if (due <= 0) {
            toast.error("No outstanding balance detected");
            return;
        }
        initiatePaymentFlow(due);
    };

    const handlePartialPayment = () => {
        const amount = Number(partialAmount);
        const due = Math.max((booking.totalAmount || 0) - (booking.amountPaid || 0), 0);

        if (!amount || amount <= 0) {
            toast.error("Please enter a valid partial amount");
            return;
        }

        if (amount > due) {
            toast.error(`Amount exceeds the remaining due of ${formatCurrency(due)}`);
            return;
        }

        initiatePaymentFlow(amount);
    };

    if (loading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#050505", fontFamily: "Inter, sans-serif" }}>
                <div style={{ fontWeight: "800", color: "#C9A227", letterSpacing: "0.1em" }}>SYNCHRONIZING PAYMENT NODE...</div>
            </div>
        );
    }

    if (!booking) return null;

    const totalAmount = booking.totalAmount || 0;
    const paidAmount = booking.amountPaid || 0;
    const dueAmount = Math.max(totalAmount - paidAmount, 0);

    return (
        <div className="payment-page">
            <AnimatePresence>
                {showSuccess && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="success-overlay"
                    >
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 15 }}
                            className="success-modal"
                        >
                            <div className="success-icon">🎉</div>
                            <h1 className="success-header">Balance Settle Successful!</h1>
                            <p className="success-text">
                                Your final installment of <strong>{formatCurrency(successAmount)}</strong> has been settled. Your pass is now active for entry.
                            </p>
                            <div className="badge-dispatched">
                                📧 Updated Tickets Dispatched via Email & WhatsApp
                            </div>
                            <p className="redirect-countdown">
                                Synchronizing digital clearance node...
                            </p>
                            <div className="redirect-spinner">
                                <span className="spinner-border spinner-border-sm" /> Redirecting to Digital Pass
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="payment-card">
                <button 
                    onClick={() => navigate(-1)} 
                    style={{ background: "none", border: "none", color: "#9ca3af", marginBottom: "20px", fontWeight: "600", cursor: "pointer" }}
                >
                    ← Back
                </button>

                <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#F5F5F5", marginBottom: "8px" }}>
                    Complete Your Remaining Payment
                </h2>
                <p style={{ color: "#9ca3af", marginBottom: "24px" }}>
                    Choose how you want to settle your outstanding balance.
                </p>

                <div className="amount-box">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontWeight: "600", color: "#9ca3af" }}>Total Amount:</span>
                        <span style={{ fontWeight: "800", color: "#F5F5F5" }}>{formatCurrency(totalAmount)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontWeight: "600", color: "#9ca3af" }}>Paid So Far:</span>
                        <span style={{ fontWeight: "800", color: "#10b981" }}>{formatCurrency(paidAmount)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed rgba(201,162,39,0.3)", paddingTop: "12px", marginTop: "4px" }}>
                        <span style={{ fontWeight: "700", color: "#F5F5F5" }}>Remaining Due:</span>
                        <span style={{ fontWeight: "900", color: "#ef4444", fontSize: "1.2rem" }}>{formatCurrency(dueAmount)}</span>
                    </div>
                </div>

                <div style={{ marginTop: "32px" }}>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: "700", color: "#9ca3af", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Option 1: Full Payment
                    </h4>
                    <button 
                        className="payment-btn" 
                        onClick={handleFullPayment}
                        disabled={processing || dueAmount <= 0 || showSuccess}
                    >
                        {processing ? "Processing..." : `Pay Full Due Amount (${formatCurrency(dueAmount)})`}
                    </button>
                </div>

                <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: "700", color: "#9ca3af", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Option 2: Partial Payment
                    </h4>
                    
                    <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontWeight: "bold", color: "#9ca3af" }}>₹</span>
                        <input
                            type="number"
                            placeholder="Enter amount"
                            value={partialAmount}
                            onChange={(e) => setPartialAmount(e.target.value)}
                            style={{ 
                                width: "100%", 
                                height: "54px", 
                                padding: "0 16px 0 45px", 
                                borderRadius: "16px", 
                                border: "1px solid rgba(255,255,255,0.1)", 
                                background: "rgba(255,255,255,0.04)",
                                fontSize: "1rem",
                                fontWeight: "600",
                                outline: "none",
                                color: "#F5F5F5",
                                transition: "0.2s"
                            }}
                            onFocus={(e) => e.target.style.borderColor = "rgba(201,162,39,0.5)"}
                            onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                        />
                    </div>

                    <button 
                        className="payment-btn partial-btn" 
                        style={{ marginTop: "16px" }}
                        onClick={handlePartialPayment}
                        disabled={processing || !partialAmount || showSuccess}
                    >
                        {processing ? "Processing..." : "Pay Partial Amount"}
                    </button>
                </div>
            </div>

            <style>{`
                .payment-page {
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: #050505;
                    padding: 20px;
                    font-family: 'Inter', sans-serif;
                }
                .payment-card {
                    width: 100%;
                    max-width: 480px;
                    background: rgba(255, 255, 255, 0.03);
                    padding: 40px;
                    border-radius: 32px;
                    box-shadow: 0 20px 50px rgba(201, 162, 39, 0.05);
                    border: 1px solid rgba(201, 162, 39, 0.15);
                }
                .amount-box {
                    margin: 24px 0;
                    padding: 24px;
                    border-radius: 20px;
                    background: rgba(201, 162, 39, 0.06);
                    border: 1px solid rgba(201, 162, 39, 0.2);
                }
                .payment-btn {
                    width: 100%;
                    height: 56px;
                    border: none;
                    border-radius: 16px;
                    background: linear-gradient(90deg, #C9A227, #C9A227, #C9A227);
                    color: #050505;
                    font-weight: 800;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    box-shadow: 0 0 30px rgba(201, 162, 39, 0.25);
                }
                .payment-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(201, 162, 39, 0.4);
                }
                .payment-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .partial-btn {
                    background: transparent !important;
                    color: #C9A227 !important;
                    border: 1px solid rgba(201, 162, 39, 0.4) !important;
                }
                .partial-btn:hover:not(:disabled) {
                    background: rgba(201, 162, 39, 0.05) !important;
                    border-color: rgba(201, 162, 39, 0.8) !important;
                    box-shadow: none !important;
                }
                .success-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(5, 5, 5, 0.9);
                    backdrop-filter: blur(12px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 99999;
                }
                .success-modal {
                    background: rgba(255, 255, 255, 0.03);
                    padding: 40px;
                    border-radius: 28px;
                    width: 90%;
                    max-width: 440px;
                    text-align: center;
                    box-shadow: 0 20px 50px rgba(201, 162, 39, 0.05);
                    border: 1px solid rgba(201, 162, 39, 0.2);
                    position: relative;
                    overflow: hidden;
                    color: #F5F5F5;
                }
                .success-icon {
                    font-size: 3.5rem;
                    margin-bottom: 20px;
                }
                .success-header {
                    font-size: 1.75rem;
                    font-weight: 800;
                    color: #F5F5F5;
                    margin-bottom: 12px;
                }
                .success-text {
                    color: #9ca3af;
                    font-size: 0.95rem;
                    line-height: 1.6;
                    margin-bottom: 24px;
                }
                .badge-dispatched {
                    display: inline-block;
                    background: rgba(201, 162, 39, 0.08);
                    color: #C9A227;
                    border: 1px solid rgba(201, 162, 39, 0.2);
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 700;
                    margin-bottom: 24px;
                }
                .redirect-countdown {
                    font-size: 0.85rem;
                    color: #9ca3af;
                    margin-bottom: 8px;
                    font-weight: 600;
                }
                .redirect-spinner {
                    font-size: 0.9rem;
                    color: #C9A227;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .spinner-border-sm {
                    width: 1rem;
                    height: 1rem;
                    border-width: 0.15em;
                }
            `}</style>
        </div>
    );
};

export default RemainingPaymentPage;
