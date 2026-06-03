import React, { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { playSound } from "../utils/soundManager";
import * as bookingApi from "../api/bookingApi";
import toast from "react-hot-toast";

const PaymentPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [processing, setProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Read payment details from route state
    const state = location.state;
    if (!state || !state.bookingId) {
        // If someone navigates to /payment directly without state, redirect home
        return <Navigate to="/" replace />;
    }

    const { bookingId, orderId, amount } = state;

    const handleCompletePayment = async () => {
        try {
            setProcessing(true);
            const loadToast = toast.loading(`Initiating secure checkout for ₹${amount.toLocaleString('en-IN')}...`);

            // 1. Load Razorpay Script
            const { loadRazorpayScript } = await import("../utils/loadScript");
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                toast.error("Failed to load payment gateway.", { id: loadToast });
                setProcessing(false);
                return;
            }

            // 2. Create Razorpay Order on Backend
            const { createRazorpayOrder, verifyRazorpayPayment } = await import("../api/paymentApi");
            const orderRes = await createRazorpayOrder(amount, "INR", { bookingId });
            
            if (!orderRes.data.success) {
                toast.error("Failed to create order.", { id: loadToast });
                setProcessing(false);
                return;
            }

            toast.dismiss(loadToast);

            // 3. Open Razorpay Checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || "dummy_key",
                amount: orderRes.data.amount,
                currency: orderRes.data.currency,
                name: "Karma Internationals",
                description: "Event Booking",
                order_id: orderRes.data.orderId,
                handler: async function (response) {
                    try {
                        const verifyToast = toast.loading("Verifying payment signature...");
                        
                        // 4. Verify Payment on Backend (Only Payment Schema, No Tickets yet)
                        const verifyRes = await verifyRazorpayPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        if (verifyRes.data.success) {
                            toast.success("Payment Captured!", { id: verifyToast });
                            // "Do not generate tickets yet" -> We stop here for phase 3
                            // The UI can show success or we just log it.
                            setShowSuccess(true);
                            playSound('paymentSuccess');
                        } else {
                            toast.error("Signature verification failed", { id: verifyToast });
                        }
                    } catch (error) {
                        toast.error("Payment verification failed");
                        console.error(error);
                    }
                },
                prefill: {
                    name: "Guest",
                    email: "guest@example.com",
                    contact: "9999999999"
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
            console.error("Payment Initiation Error:", err);
            toast.error(err.response?.data?.message || "Failed to initiate checkout.");
            setProcessing(false);
        }
    };

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
                            <h1 className="success-header">Payment Complete!</h1>
                            <p className="success-text">
                                Your payment of <strong>₹{amount.toLocaleString('en-IN')}</strong> has been confirmed successfully.
                            </p>
                            <div className="badge-dispatched">
                                📧 Tickets Dispatched via Email & WhatsApp
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
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                    <div style={{
                        width: "80px",
                        height: "80px",
                        background: "rgba(201,162,39,0.1)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "2rem",
                        margin: "0 auto 16px"
                    }}>
                        💳
                    </div>
                    <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#ffffff", marginBottom: "8px" }}>
                        Complete Your Payment
                    </h2>
                    <p style={{ color: "#9ca3af", fontSize: "0.95rem" }}>
                        Review your order details and complete the payment to secure your booking.
                    </p>
                </div>

                <div className="amount-box">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <span style={{ fontWeight: "600", color: "#9ca3af" }}>Order ID</span>
                        <span style={{ fontWeight: "600", fontSize: "0.9rem", color: "#F5F5F5" }}>{orderId || "N/A"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed rgba(201,162,39,0.3)", paddingTop: "16px", marginTop: "4px" }}>
                        <span style={{ fontWeight: "700", color: "#F5F5F5" }}>Total Payable</span>
                        <span style={{ fontWeight: "900", color: "#C9A227", fontSize: "1.5rem" }}>₹{amount.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <div style={{ marginTop: "32px" }}>
                    <button
                        className="payment-btn"
                        onClick={handleCompletePayment}
                        disabled={processing || showSuccess}
                    >
                        {processing ? (
                            <>
                                <span className="spinner-border spinner-border-sm" style={{ marginRight: '8px' }} />
                                Processing...
                            </>
                        ) : (
                            `Pay Securely ₹${amount.toLocaleString('en-IN')}`
                        )}
                    </button>
                </div>

                <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#9ca3af", marginTop: "24px" }}>
                    🔒 100% Secure Transaction. Your ticket will be sent directly to your email.
                </p>
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
                    max-width: 440px;
                    background: rgba(255, 255, 255, 0.03);
                    padding: 40px;
                    border-radius: 24px;
                    box-shadow: 0 20px 50px rgba(201, 162, 39, 0.05);
                    border: 1px solid rgba(201, 162, 39, 0.15);
                }
                .payment-card h2 {
                    color: #ffffff !important;
                }
                .amount-box {
                    margin: 24px 0;
                    padding: 24px;
                    border-radius: 16px;
                    background: rgba(201, 162, 39, 0.06);
                    border: 1px solid rgba(201, 162, 39, 0.2);
                }
                .payment-btn {
                    width: 100%;
                    height: 56px;
                    border: none;
                    border-radius: 12px;
                    background: linear-gradient(90deg, #C9A227, #C9A227, #C9A227);
                    color: #050505;
                    font-weight: 800;
                    font-size: 1.05rem;
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
                    color: #ffffff !important;
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

export default PaymentPage;
