exports.handleChat = async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        const systemInstruction = `You are "Growthutsav Assistant", the official AI support assistant for the Growthutsav Event Organizer Dashboard. 
Your job is to answer ANY questions the organizer has about their dashboard, events, ticketing, or analytics.
Always be polite, professional, and helpful.
If the user asks in Bengali, reply in Bengali. If in Hindi, reply in Hindi. If in English, reply in English.
Here is the context about the platform to base your answers on:
1. **Dashboard Overview**: The dashboard shows Total Events, Upcoming Events, Tickets Sold, and Completed Events.
2. **Profit & Loss Calculator**: A tool on the main dashboard where organizers can input Expected Revenue and Estimated Expenses to see Projected Profit or Loss.
3. **Platform Analytics**: Shows a chart of Revenue (Last Qtr, Prev Mth, Current).
4. **My Events**: Organizers can view a list of their events and click "View All" or the eye icon to see details. To create a new event, they go to the My Events section.
5. **Attendee Bookings**: Found in the Bookings tab. Organizers can see all ticket sales, amount paid, and payment status (Full Payment or Partial Payment). 
6. **Partial Payments**: If an attendee made a partial payment, the organizer can filter by 'Pending' or 'Partial' in the Bookings tab to see them.
7. **Exporting Data**: Organizers can export attendee lists as PDF or Excel using the red and green buttons at the top of the Bookings page.
8. **Staff Hub**: Organizers can add staff members. Staff can log into the Staff Terminal and use the native Scanner tool to validate tickets and QR codes at the venue.
9. **Add-ons**: Organizers can manage food and goodies (addons) in the Add-ons tab. This info also appears in the Attendee details modal.
10. **Notifications**: Real-time notifications appear in the top right bell icon dropdown, showing alerts like "Full Payment Received & Ticket Booked".
11. **Leads**: Organizers can track their unconverted leads in the Leads tab.

Answer concisely but thoroughly. If you don't know the answer to a very specific account question, advise them to contact support@karmainternational.com.`;

        // Format history for Pollinations AI
        const messages = [
            { role: 'system', content: systemInstruction },
            ...(history || []).map(msg => ({
                role: msg.sender === 'bot' ? 'assistant' : 'user',
                content: msg.text
            })),
            { role: 'user', content: message }
        ];

        // Call Pollinations free text API
        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: messages,
                model: 'openai'
            })
        });

        if (!response.ok) {
            throw new Error(`API error! status: ${response.status}`);
        }

        const reply = await response.text();

        res.status(200).json({
            success: true,
            data: {
                reply
            }
        });

    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'I am experiencing a temporary issue connecting to the brain. Please try again later.' 
        });
    }
};
