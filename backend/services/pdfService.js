const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const Ticket = require('../models/Ticket');
const path = require('path');

const getFormattedDateRange = (start, end) => {
    if (!start) return '';
    const s = new Date(start);
    const e = end ? new Date(end) : s;
    
    const startDay = s.getDate();
    const startMonth = s.toLocaleString('en-US', { month: 'short' });
    
    if (s.toDateString() === e.toDateString()) {
        return `${startDay} ${startMonth}`;
    }
    
    const endDay = e.getDate();
    const endMonth = e.toLocaleString('en-US', { month: 'short' });
    
    return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
};

/**
 * Generate a professional PDF ticket buffer
 * @param {string} ticketId - MongoDB ID of the ticket
 * @returns {Promise<Buffer>}
 */
exports.generateTicketPDF = async (ticketId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const ticket = await Ticket.findById(ticketId)
                .populate('event')
                .populate('booking')
                .populate('user', 'name email');

            if (!ticket) return reject(new Error('Ticket not found in database'));

            const doc = new PDFDocument({ 
                size: 'A4',
                margin: 0,
                info: {
                    Title: `Ticket - ${ticket.event.title}`,
                    Author: 'Growth Utsav',
                }
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            // --- PREMIUM DESIGN (White + Maroon/Crimson + Charcoal) ---
            
            const primaryColor = '#800000'; // Deep Maroon / Crimson
            const textColor = '#333333'; // Charcoal Black
            const lightText = '#6b7280';
            const dividerColor = '#e5e7eb';

            // 1. Luxury Minimalist Background
            doc.rect(0, 0, 595.28, 841.89).fill('#ffffff');

            // 2. Premium Top Strip
            doc.rect(0, 0, 595.28, 12).fill(primaryColor);

            // 3. Event Header Section (STATIC CONTENT)
            doc.fillColor(primaryColor)
               .font('Helvetica-Bold')
               .fontSize(24)
               .text('KARMA INTERNATIONAL BASIC TO ADVANCED MASTER CLASS', 50, 60, { width: 495, align: 'left', lineGap: 6 });
            
            // Event Logistics
            doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('EVENT LOGISTICS', 50, 150);
            
            // Venue
            doc.fillColor(lightText).font('Helvetica').fontSize(10).text('VENUE', 50, 180);
            doc.fillColor(textColor).font('Helvetica-Bold').fontSize(12).text('ALTAIR BOUTIQUE HOTEL, SALT LAKE', 50, 195, { width: 400 });
            
            // Date & Time
            doc.fillColor(lightText).font('Helvetica').fontSize(10).text('DATE RANGE', 50, 235);
            doc.fillColor(textColor).font('Helvetica-Bold').fontSize(12).text('17 Aug – 21 Aug (Total Duration: 5 Days)', 50, 250);

            doc.fillColor(lightText).font('Helvetica').fontSize(10).text('TIME', 350, 235);
            doc.fillColor(textColor).font('Helvetica-Bold').fontSize(12).text('10:00 AM', 350, 250);

            // 5. Muted Divider
            doc.moveTo(50, 290).lineTo(545, 290).lineWidth(1).stroke(dividerColor);

            // Calculate Dates for Attendee (DYNAMIC)
            let dateListText = "";
            if (ticket.selectedDays && ticket.selectedDays.length > 0) {
                dateListText = ticket.selectedDays.map(d => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })).join(', ');
            } else {
                dateListText = new Date(ticket.selectedDate || ticket.event.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            }

            // 6. Attendee & Verification Section
            doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('ATTENDEE VERIFICATION', 50, 330);
            
            // Name
            doc.fillColor(lightText).font('Helvetica').fontSize(10).text('NAME', 50, 360);
            doc.fillColor(textColor).font('Helvetica-Bold').fontSize(13).text(ticket.name.toUpperCase(), 50, 375);
            
            // Email
            doc.fillColor(lightText).font('Helvetica').fontSize(10).text('EMAIL', 50, 410);
            doc.fillColor(textColor).font('Helvetica-Bold').fontSize(11).text(ticket.email, 50, 425);
            
            // Booked Dates
            doc.fillColor(lightText).font('Helvetica').fontSize(10).text('BOOKED DATES', 50, 460);
            doc.fillColor(textColor).font('Helvetica-Bold').fontSize(11).text(dateListText, 50, 475, { width: 280 });

            // Payment Status
            doc.fillColor(lightText).font('Helvetica').fontSize(10).text('PAYMENT STATUS', 240, 460);
            doc.fillColor('#16a34a').font('Helvetica-Bold').fontSize(11).text('SUCCESS', 240, 475);

            // Pass Type Badge Concept
            const badgeWidth = 180;
            const ticketTypeName = ticket.ticketType ? ticket.ticketType.toUpperCase() : 'STANDARD';
            doc.roundedRect(50, 515, badgeWidth, 32, 16).fill(primaryColor);
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11).text(`${ticketTypeName} PASS`, 50, 526, { width: badgeWidth, align: 'center' });

            // Entry Rules & Duration
            const entryQty = (ticket.quantity) ? ticket.quantity : ((ticket.booking && ticket.booking.quantity) ? ticket.booking.quantity : 1);
            const dayCount = (ticket.selectedDays && ticket.selectedDays.length > 0) ? ticket.selectedDays.length : 1;
            
            const validityTitle = `VALID FOR 5 DAYS`;
            const entryLabel = `Valid for ${entryQty} Person${entryQty > 1 ? 's' : ''} Entry`;
            const staticValidityText = "This ticket is valid for 5 days only, from 17 August to 21 August.";
            
            doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text(validityTitle, 50, 565);
            doc.fillColor(lightText).font('Helvetica').fontSize(10).text(entryLabel, 50, 580);
            doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(10).text(staticValidityText, 50, 595);

            // Complimentary / Selected Catering Meals
            let foodTextToShow = "";
            if (ticket.booking && ticket.booking.selectedFood && ticket.booking.selectedFood.length > 0) {
                foodTextToShow = ticket.booking.selectedFood.map(f => `• ${f.itemName} (${f.type.toUpperCase()}) x${f.quantity || entryQty}`).join('\n');
            } else if (ticket.event && ticket.event.foodSettings && (ticket.event.foodSettings.foodType === 'compulsory' || ticket.event.foodSettings.type === 'compulsory') && ticket.event.foodSettings.options?.length > 0) {
                foodTextToShow = ticket.event.foodSettings.options.map(f => `• [INCLUDED] ${f.itemName} (${f.type.toUpperCase()})`).join('\n');
            }

            if (foodTextToShow) {
                doc.fillColor(lightText).font('Helvetica').fontSize(10).text('CATERING & MEALS', 50, 620);
                doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10).text(foodTextToShow, 50, 635, { width: 300, lineGap: 3 });
            }

            // Custom Addons / Items Section
            let addonsTextToShow = "";
            if (ticket.booking && ticket.booking.selectedAddons && ticket.booking.selectedAddons.length > 0) {
                addonsTextToShow = ticket.booking.selectedAddons.map(a => `• ${a.itemName} (${(a.type || 'Item').toUpperCase()}) x${a.quantity || entryQty}`).join('\n');
            } else if (ticket.event && ticket.event.addonsSettings && (ticket.event.addonsSettings.addonType === 'compulsory') && ticket.event.addonsSettings.options?.length > 0) {
                addonsTextToShow = ticket.event.addonsSettings.options.map(a => `• [INCLUDED] ${a.itemName} (${(a.type || 'Item').toUpperCase()})`).join('\n');
            }

            if (addonsTextToShow) {
                const addonsY = foodTextToShow ? 680 : 620;
                doc.fillColor(lightText).font('Helvetica').fontSize(10).text('CUSTOM INCLUSIONS', 50, addonsY);
                doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10).text(addonsTextToShow, 50, addonsY + 15, { width: 300, lineGap: 3 });
            }

            // 7. QR Code Section (Right Side)
            const qrSize = 140;
            const qrX = 380;
            const qrY = 340;
            
            const baseUrl = process.env.PUBLIC_URL || 'https://growthutsav.com'; 
            const verificationUrl = `${baseUrl}/ticket/${ticket.uuid}`;
            
            const qrBuffer = await QRCode.toBuffer(verificationUrl, { 
                width: qrSize,
                margin: 0,
                color: { dark: '#000000', light: '#ffffff' }
            });
            
            doc.image(qrBuffer, qrX, qrY, { width: qrSize });
            doc.fontSize(8).fillColor(lightText).font('Helvetica').text('SCAN TO VERIFY AUTHENTICITY', qrX, qrY + qrSize + 15, { width: qrSize, align: 'center' });

            // 8. Minimalist Footer Section
            doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text(`Ticket ID: ${ticket.ticketCode}`, 50, 770);
            
            // Bottom Branding
            doc.rect(0, 795, 595.28, 46.89).fill('#fafafa');
            doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10).text('KARMA INTERNATIONAL • SECURE EVENT SERVICES', 0, 815, { align: 'center', letterSpacing: 1 });

            doc.end();
        } catch (err) {
            console.error("PDF Service Error:", err);
            reject(err);
        }
    });
};

