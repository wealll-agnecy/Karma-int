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
        const publicUrl = process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
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

