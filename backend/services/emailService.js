const { sendTicketMail } = require('../utils/sendEmail');

/**
 * Send booking confirmation email with attached ticket
 * @param {Object} user - User object { name, email }
 * @param {Object} event - Event object { title, date, venue }
 * @param {Buffer} pdfBuffer - Generated PDF ticket buffer
 * @param {Object} bookingDetails - Booking info { ticketType, quantity, totalAmount, ticketId }
 */
exports.sendBookingConfirmation = async (user, event, pdfBuffer, bookingDetails) => {
    try {
        const publicUrl = process.env.PUBLIC_URL || (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0].trim() : 'http://localhost:5173');
        const downloadUrl = `${publicUrl}/api/ticket/download/${bookingDetails.ticketId}`;

        const emailMessage = `
            <div style="font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; color: #1f2937; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #AD1457 0%, #6366f1 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Booking Confirmed</h1>
                    <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;">See you at the event!</p>
                </div>
                
                <div style="padding: 40px;">
                    <p style="font-size: 16px; margin-bottom: 24px;">Hi <strong>${user.name}</strong>,</p>
                    <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">Great news! Your registration for <strong>${event.title}</strong> is complete. We've attached your digital entry pass to this email.</p>
                    
                    <!-- GROUP TICKET NOTIFICATION -->
                    ${bookingDetails.quantity > 1 ? `
                    <div style="background-color: #ecfdf5; border: 1px solid #86efac; border-radius: 12px; padding: 16px; margin: 24px 0;">
                        <p style="margin: 0; font-size: 14px; color: #166534; font-weight: 600;">
                            <strong>👥 Group Booking:</strong> This ticket is valid for <strong>${bookingDetails.quantity} persons</strong> entry
                        </p>
                    </div>
                    ` : ''}
                    
                    <!-- Event Card -->
                    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 32px 0;">
                        <h3 style="margin-top: 0; color: #AD1457; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Event Details</h3>
                        
                        <div style="margin-top: 16px;">
                            <div style="margin-bottom: 12px;">
                                <span style="color: #6b7280; font-size: 13px; display: block;">EVENT</span>
                                <span style="font-weight: 700; font-size: 16px;">${event.title}</span>
                            </div>
                            
                            <div style="margin-bottom: 12px;">
                                <span style="color: #6b7280; font-size: 13px; display: block;">DATE & TIME</span>
                                <span style="font-weight: 600;">${new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            
                            <div style="margin-bottom: 12px;">
                                <span style="color: #6b7280; font-size: 13px; display: block;">LOCATION</span>
                                <span style="font-weight: 600;">${event.venue}</span>
                            </div>
                            
                            <div style="margin-bottom: 0;">
                                <span style="color: #6b7280; font-size: 13px; display: block;">PASS TYPE</span>
                                <span style="font-weight: 600; color: #AD1457;">${bookingDetails.ticketType} (x${bookingDetails.quantity})</span>
                            </div>
                        </div>
                    </div>
                    

                    <p style="font-size: 14px; font-weight: bold; color: #b91c1c; text-align: center; margin-top: 20px;">
                        This ticket is valid for entry on ${new Date(event.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.
                    </p>
                    <p style="font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.5;">
                        Please ensure you have the attached QR code ready at the entrance for a seamless entry process.
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                    &copy; 2026 Growth Utsav. All rights reserved.<br>
                    Secured by Growth Utsav Digital Infrastructure.
                </div>
            </div>
        `;

        await sendTicketMail({
            to: user.email,
            subject: `Confirmed: Your Ticket for ${event.title}`,
            html: emailMessage,
            pdfBuffer: pdfBuffer
        });

        console.log(`✅ Confirmation email sent to ${user.email}`);
    } catch (err) {
        console.error("âŒ [EMAIL SERVICE ERROR]:", {
            message: err.message,
            stack: err.stack,
            recipient: user.email,
            event: event.title
        });
        throw new Error(`Email delivery failed for ${user.email}: ${err.message}`);
    }
};

/**
 * Send partial payment confirmation email with Digital QR Pass and Due Amount
 * @param {Object} user - User object { name, email }
 * @param {Object} event - Event object { title, date, venue }
 * @param {String} qrDataUrl - Base64 QR Code string
 * @param {Object} bookingDetails - Booking info { ticketType, quantity, totalAmount, paidAmount, dueAmount, bookingId, ticketId }
 */
exports.sendPartialPaymentConfirmation = async (user, event, qrDataUrl, bookingDetails) => {
    try {
        const publicUrl = process.env.PUBLIC_URL || (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0].trim() : 'http://localhost:5173');
        const paymentUrl = `${publicUrl}/remaining-payment/${bookingDetails.bookingId}`;

        const emailMessage = `
            <div style="font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; color: #1f2937; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Partial Payment Confirmed</h1>
                    <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;">Action Required for Final Entry Pass</p>
                </div>
                
                <div style="padding: 40px;">
                    <p style="font-size: 16px; margin-bottom: 24px;">Hi <strong>${user.name}</strong>,</p>
                    <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">Your partial payment for <strong>${event.title}</strong> has been received successfully. Below is your Digital Entry QR Pass. <strong>Please note that you must complete the remaining payment to gain entry to the event.</strong></p>
                    
                    <!-- QR Pass Section -->
                    <div style="text-align: center; margin: 32px 0;">
                        <img src="${qrDataUrl}" alt="Ticket QR Code" style="width: 200px; height: 200px; border-radius: 8px; border: 1px solid #e5e7eb; padding: 10px;" />
                        <p style="font-size: 14px; font-weight: bold; color: #f59e0b; margin-top: 12px; text-transform: uppercase;">Payment Status: PARTIAL</p>
                    </div>

                    <!-- Payment Details Card -->
                    <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 24px; margin: 32px 0;">
                        <h3 style="margin-top: 0; color: #a16207; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Payment Summary</h3>
                        
                        <div style="margin-top: 16px;">
                            <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                                <span style="color: #713f12; font-size: 14px;">Total Amount</span>
                                <span style="font-weight: 600; color: #713f12;">₹${bookingDetails.totalAmount}</span>
                            </div>
                            <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                                <span style="color: #713f12; font-size: 14px;">Paid Amount</span>
                                <span style="font-weight: 600; color: #166534;">₹${bookingDetails.paidAmount}</span>
                            </div>
                            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; border-top: 1px dashed #fde047; padding-top: 12px;">
                                <span style="color: #991b1b; font-size: 14px; font-weight: bold;">Due Amount</span>
                                <span style="font-weight: 800; color: #991b1b;">₹${bookingDetails.dueAmount}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Button -->
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${paymentUrl}" style="background-color: #000000; color: #ffffff; padding: 16px 32px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">Complete Remaining Payment</a>
                    </div>
                    
                    <p style="font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.5;">
                        Once the remaining payment is completed, you will receive the final PDF ticket which guarantees your entry.
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                    &copy; ${new Date().getFullYear()} Growth Utsav. All rights reserved.<br>
                    Secured by Growth Utsav Digital Infrastructure.
                </div>
            </div>
        `;

        await sendTicketMail({
            to: user.email,
            subject: `Action Required: Partial Payment Received for ${event.title}`,
            html: emailMessage
            // Notice: No pdfBuffer attached here
        });

        console.log(`✅ Partial confirmation email sent to ${user.email}`);
    } catch (err) {
        console.error("❌ [EMAIL SERVICE ERROR]:", {
            message: err.message,
            recipient: user.email,
            event: event.title
        });
        throw new Error(`Email delivery failed for ${user.email}: ${err.message}`);
    }
};
