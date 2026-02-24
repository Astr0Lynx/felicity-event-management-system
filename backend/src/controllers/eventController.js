import { Event, Organizer } from "../models/user.js"
import axios from 'axios';


export async function createEvent (req, res) {
    try {
        const { name, 
            description, 
            type, 
            eligibility,
            reg_deadline,
            start_date,
            end_date,
            reg_limit,
            reg_fee,
            event_tags,
            registered_participants,
            custom_form_fields,
            merchandise_details } = req.body;

        if(type === 'normal' && merchandise_details){
            console.error("Normal type event cannot have merchandise details");
            return res.status(400).json({
                success: false,
                message: "Normal type event cannot have merchandise details"
            });
        }
        if(type === 'merchandise' && custom_form_fields && custom_form_fields.length > 0) {
            console.error("Merch type event cannot have custom form fields");
            return res.status(400).json({
                success: false,
                message: "Merch type event cannot have custom form fields"
            });
        }

        //build the event data stuff
        const eventData = {
            name, 
            description, 
            type, 
            eligibility,
            reg_deadline,
            start_date,
            end_date,
            reg_limit,
            reg_fee,
            event_tags,
            organizer_id: req.user.id
        };

        //add type specific stuff
        if (type === 'normal' && custom_form_fields) {
            eventData.custom_form_fields = custom_form_fields;
        } else if (type === 'merchandise' && merchandise_details) {
            eventData.merchandise_details = merchandise_details;
        }

        const newEvent = new Event(eventData);

        const savedEvent = await newEvent.save();

        //send discord notification
        try {
            const organizer = await Organizer.findById(req.user.id).populate('organizer_details');
            
            if (organizer && organizer.discord_webhook) {
                //format dates
                const formatDate = (date) => new Date(date).toLocaleString('en-IN', { 
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });

                //discord embed message
                const discordMessage = {
                    username: 'Felicity Events',
                    embeds: [{
                        title: `🎉 New Event Created: ${name}`,
                        description: description || 'No description provided',
                        color: 0x5865F2, // Discord Blurple color
                        fields: [
                            {
                                name: '📅 Event Dates',
                                value: `**Start:** ${formatDate(start_date)}\n**End:** ${formatDate(end_date)}`,
                                inline: true
                            },
                            {
                                name: '📝 Registration',
                                value: `**Deadline:** ${formatDate(reg_deadline)}\n**Limit:** ${reg_limit || 'Unlimited'}`,
                                inline: true
                            },
                            {
                                name: '💰 Registration Fee',
                                value: reg_fee ? `₹${reg_fee}` : 'Free',
                                inline: true
                            },
                            {
                                name: '🎯 Event Type',
                                value: type.charAt(0).toUpperCase() + type.slice(1),
                                inline: true
                            },
                            {
                                name: '👥 Eligibility',
                                value: eligibility.charAt(0).toUpperCase() + eligibility.slice(1),
                                inline: true
                            },
                            {
                                name: '🏢 Organizer',
                                value: organizer.organizer_details?.name || 'Unknown',
                                inline: true
                            }
                        ],
                        footer: {
                            text: `Event ID: ${savedEvent._id}`
                        },
                        timestamp: new Date().toISOString()
                    }]
                };

                //add tags if there
                if (event_tags && event_tags.length > 0) {
                    discordMessage.embeds[0].fields.push({
                        name: '🏷️ Tags',
                        value: event_tags.join(', '),
                        inline: false
                    });
                }

                await axios.post(organizer.discord_webhook, discordMessage);
                console.log(`Discord notification sent for event: ${name}`);
            }
        } catch (webhookError) {
            //dont fail if webhook breaks
            console.error('Failed to send Discord webhook:', webhookError.message);
        }

        return res.status(201).json({
            success: true,
        message: "Event created successfully"
        });

    } catch (error) {
        console.error("Error in createEvent:", error);
        res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
    
}

//get all events
export async function getAllEvents(req, res) {
    try {
        const { search, type, startDate, endDate } = req.query;

        let query = {};

        //search by name or tags
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { event_tags: { $regex: search, $options: 'i' } }
            ];
        }

        if (type) {
            query.type = type;
        }

        //filter by dates
        if (startDate || endDate) {
            query.start_date = {};
            if (startDate) query.start_date.$gte = new Date(startDate);
            if (endDate) query.start_date.$lte = new Date(endDate);
        }

        //fetch from db
        //.populate() replaces organizer_id with actual data
        //exclude payment proofs for performance
        const events = await Event.find(query)
            .select('-registered_participants.payment_proof -attendance')
            .populate({
                path: 'organizer_id',
                select: 'email organizer_details',
                populate: {
                    path: 'organizer_details',
                    select: 'name category'
                }
            })
            .lean()
            .sort({ createdAt: -1 });

        res.status(200).json(events);

    } catch (error) {
        console.error("Error in getAllEvents:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}

//register for event endpoint
export async function registerForEvent(req, res) {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        //optimized: exclude payment_proof for fast loading
        const event = await Event.findById(eventId)
            .select('-registered_participants.payment_proof');
        if (!event) {
            return res.status(404).json({ 
                success: false, 
                message: "Event not found" 
            });
        }

        //check if event ended
        if (new Date(event.end_date) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "Event has ended"
            });
        }

        //race condition fix: check existing registration atomically
        const existingRegistration = event.registered_participants.find(
            rp => rp.participant && rp.participant.toString() === userId
        );
        
        if (existingRegistration) {
            return res.status(400).json({
                success: false,
                message: "You are already registered for this event"
            });
        }

        //initialize registration data
        const registrationData = {
            participant: userId,
            form_values: [],
            registered_at: new Date()
        };

        if (event.type === 'normal') {
            //only check reg_limit if its a positive number
            if (event.reg_limit && event.reg_limit > 0 && event.registered_participants.length >= event.reg_limit) {
                return res.status(400).json({
                    success: false,
                    message: "Registration full!"
                });
            }
            
            const { form_answers } = req.body;
            
            //map for easy lookup
            const userAnswers = new Map();
            if (form_answers) {
                form_answers.forEach(a => userAnswers.set(a.field_name, a.answer));
            }

            for (const field of event.custom_form_fields) {
                const providedAnswer = userAnswers.get(field.field_name);

                if (field.is_required && !providedAnswer) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Field '${field.field_name}' is required` 
                    });
                }

                if (providedAnswer) {
                    registrationData.form_values.push({
                        field_name: field.field_name,
                        answer: providedAnswer
                    });
                }
            }
        }

        else if (event.type === 'merchandise') {
            const { variant_orders } = req.body;

            //validate at least one variant selected
            if (!variant_orders || variant_orders.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Please select at least one variant"
                });
            }

            //validate each variant and stock
            let totalPrice = 0;
            for (const order of variant_orders) {
                if (!order.variant_name || order.variant_name.trim() === '') {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid variant selected"
                    });
                }

                if (!order.quantity || order.quantity < 1) {
                    return res.status(400).json({
                        success: false,
                        message: "Quantity must be at least 1"
                    });
                }

                const variant = event.merchandise_details.variants.find(
                    v => v.variant_name === order.variant_name
                );

                if (!variant) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid variant: ${order.variant_name}`
                    });
                }

                if (variant.stock_quantity < order.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Variant ${order.variant_name} only has ${variant.stock_quantity} items in stock`
                    });
                }

                totalPrice += variant.price * order.quantity;
            }

            //store variant orders
            registrationData.variant_orders = variant_orders;
            
            //legacy support for old fields
            registrationData.variant_name = variant_orders[0].variant_name;
            registrationData.quantity = variant_orders[0].quantity;

            //set payment to pending, dont decrement stock yet
            registrationData.payment_status = 'pending';
            registrationData.qr_code_generated = false;

            //note: stock decremented only when payment approved
        }

        //register user with atomic operation to prevent race conditions
        const result = await Event.findOneAndUpdate(
            { 
                _id: eventId,
                'registered_participants.participant': { $ne: userId }
            },
            { 
                $push: { registered_participants: registrationData } 
            },
            { 
                new: true,
                select: '_id registered_participants'
            }
        );

        //if null then user was already registered
        if (!result) {
            return res.status(400).json({
                success: false,
                message: "You are already registered for this event (duplicate request detected)"
            });
        }

        res.status(200).json({
            success: true,
            message: event.type === 'merchandise' ? "Purchase successful!" : "Registration successful!",
            data: {
                eventId: result._id,
                remaining_spots: event.type === 'normal' && event.reg_limit && event.reg_limit > 0
                    ? event.reg_limit - result.registered_participants.length
                    : null
            }
        });

    } catch (error) {
        console.error("Error in registerForEvent:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message 
        });
    }
}


//get organizer events
//for organizers to see their own events
export async function getOrganizerEvents(req, res) {
    try {
        //exclude heavy payment_proof images for list view
        const events = await Event.find({ organizer_id: req.user.id })
            .select('-registered_participants.payment_proof -attendance')
            .lean()
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: events.length,
            data: events
        });
    } catch (error) {
        console.error("Error in getOrganizerEvents:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}

//get participant events
//for participants to see what they signed up for
export async function getParticipantEvents(req, res) {
    try {
        const events = await Event.find({
            "registered_participants.participant": req.user.id
        })
        .select('-registered_participants.payment_proof -attendance')
        .populate("organizer_id", "email")
        .lean()
        .sort({ start_date: 1 });

        //add registration details for each event
        const eventsWithRegistration = events.map(event => {
            const registration = event.registered_participants.find(
                rp => rp.participant.toString() === req.user.id
            );
            event.my_registration = registration;
            return event;
        });

        res.status(200).json({
            success: true,
            count: events.length,
            data: eventsWithRegistration
        });
    } catch (error) {
        console.error("Error in getParticipantEvents:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}

//get event ticket
//ticket details for specific event registration
export async function getEventTicket(req, res) {
    try {
        const eventId = req.params.eventId;
        const userId = req.user.id;

        //optimized: only select needed fields
        const event = await Event.findById(eventId)
            .select('name type start_date end_date organizer_id registered_participants')
            .populate("organizer_id", "email")
            .lean();

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found"
            });
        }

        const registration = event.registered_participants.find(
            rp => rp.participant && rp.participant.toString() === userId
        );

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: "You are not registered for this event"
            });
        }

        //for merchandise events check payment approval before ticket access
        if (event.type === 'merchandise') {
            if (registration.payment_status !== 'approved') {
                return res.status(403).json({
                    success: false,
                    message: "Ticket unavailable: Payment must be approved first",
                    payment_status: registration.payment_status
                });
            }
        }

        //import participant model and get only needed fields
        const { Participant } = await import('../models/user.js');
        const participant = await Participant.findById(userId)
            .select('first_name last_name email participant_type')
            .lean();

        const ticketData = {
            ticket_id: `${event._id.toString().slice(-8).toUpperCase()}-${userId.toString().slice(-6).toUpperCase()}`,
            event: {
                name: event.name,
                type: event.type,
                start_date: event.start_date,
                end_date: event.end_date,
                organizer: event.organizer_id
            },
            participant: {
                id: participant._id,
                name: `${participant.first_name} ${participant.last_name}`,
                email: participant.email,
                participant_type: participant.participant_type
            },
            registration: {
                registered_at: registration.registered_at,
                form_values: registration.form_values,
                variant_name: registration.variant_name,
                quantity: registration.quantity,
                payment_status: registration.payment_status,
                status: new Date(event.end_date) < new Date() ? 'Completed' : 'Active'
            }
        };

        res.status(200).json({
            success: true,
            data: ticketData
        });
    } catch (error) {
        console.error("Error in getEventTicket:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server Error",
            error: error.message 
        });
    }
}

//update event (organizer only)
export async function updateEvent(req, res) {
    try {
        const eventId = req.params.id;
        const organizerId = req.user.id;
        const { description, reg_deadline, reg_limit } = req.body;

        const event = await Event.findById(eventId);
        
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        //check if organizer owns this event
        if (event.organizer_id.toString() !== organizerId) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this event'
            });
        }

        //update allowed fields
        if (description) event.description = description;
        if (reg_deadline) event.reg_deadline = new Date(reg_deadline);
        if (reg_limit !== undefined) event.reg_limit = reg_limit;

        await event.save();

        res.status(200).json({
            success: true,
            message: 'Event updated successfully',
            data: event
        });
    } catch (error) {
        console.error('Error in updateEvent:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//tier a: qr scanner and attendance tracking

//scan attendance endpoint
//scan qr and mark attendance
export async function scanAttendance(req, res) {
    try {
        const eventId = req.params.id;
        const { participant_id, scan_method = 'qr_scan', notes } = req.body;

        //optimized: only select needed fields
        const event = await Event.findById(eventId)
            .select('name type registered_participants attendance');

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        //check if participant is registered
        const registration = event.registered_participants.find(
            r => r.participant.toString() === participant_id
        );

        if (!registration) {
            return res.status(400).json({
                success: false,
                message: 'Participant not registered for this event'
            });
        }

        //for merchandise events check payment status
        if (event.type === 'merchandise' && registration.payment_status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Payment not approved for this participant'
            });
        }

        //check if already scanned
        const alreadyScanned = event.attendance.find(
            a => a.participant.toString() === participant_id
        );

        if (alreadyScanned) {
            return res.status(400).json({
                success: false,
                message: 'Attendance already marked for this participant',
                data: {
                    scanned_at: alreadyScanned.scanned_at
                }
            });
        }

        //mark attendance
        event.attendance.push({
            participant: participant_id,
            scanned_by: req.user.id,
            scan_method,
            notes
        });

        await event.save();

        res.status(200).json({
            success: true,
            message: 'Attendance marked successfully',
            data: {
                total_registered: event.registered_participants.length,
                total_scanned: event.attendance.length
            }
        });
    } catch (error) {
        console.error('Error in scanAttendance:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//get attendance for event
export async function getAttendance(req, res) {
    try {
        const eventId = req.params.id;

        //optimized: select only needed fields
        const event = await Event.findById(eventId)
            .select('name registered_participants attendance')
            .populate('registered_participants.participant', 'first_name last_name email')
            .populate('attendance.participant', 'first_name last_name email')
            .populate('attendance.scanned_by', 'email')
            .lean();

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        //create attendance report
        const attendanceReport = event.registered_participants.map(reg => {
            const attendanceRecord = event.attendance.find(
                a => a.participant._id.toString() === reg.participant._id.toString()
            );

            return {
                participant_id: reg.participant._id,
                participant_name: `${reg.participant.first_name} ${reg.participant.last_name}`,
                participant_email: reg.participant.email,
                registered_at: reg.registered_at,
                attendance_status: attendanceRecord ? 'Present' : 'Absent',
                scanned_at: attendanceRecord?.scanned_at || null,
                scan_method: attendanceRecord?.scan_method || null,
                scanned_by: attendanceRecord?.scanned_by?.email || null,
                notes: attendanceRecord?.notes || null
            };
        });

        res.status(200).json({
            success: true,
            data: {
                event_name: event.name,
                total_registered: event.registered_participants.length,
                total_present: event.attendance.length,
                total_absent: event.registered_participants.length - event.attendance.length,
                attendance_report: attendanceReport
            }
        });
    } catch (error) {
        console.error('Error in getAttendance:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//export attendance as csv
export async function exportAttendanceCSV(req, res) {
    try {
        const eventId = req.params.id;

        //optimized: select only needed fields
        const event = await Event.findById(eventId)
            .select('name registered_participants attendance')
            .populate('registered_participants.participant', 'first_name last_name email contact_number')
            .populate('attendance.participant', 'first_name last_name email')
            .lean();

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        //create csv data
        const csvRows = [];
        csvRows.push(['Name', 'Email', 'Contact', 'Registered At', 'Status', 'Scanned At'].join(','));

        event.registered_participants.forEach(reg => {
            const attendanceRecord = event.attendance.find(
                a => a.participant._id.toString() === reg.participant._id.toString()
            );

            const row = [
                `${reg.participant.first_name} ${reg.participant.last_name}`,
                reg.participant.email,
                reg.participant.contact_number || 'N/A',
                new Date(reg.registered_at).toLocaleString(),
                attendanceRecord ? 'Present' : 'Absent',
                attendanceRecord ? new Date(attendanceRecord.scanned_at).toLocaleString() : 'N/A'
            ];

            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendance_${event.name.replace(/ /g, '_')}_${Date.now()}.csv`);
        res.status(200).send(csvContent);
    } catch (error) {
        console.error('Error in exportAttendanceCSV:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//tier a: merchandise payment approval workflow

//upload payment proof
//for merchandise orders
export async function uploadPaymentProof(req, res) {
    try {
        const eventId = req.params.id;
        const participantId = req.user.id;
        const { payment_proof } = req.body;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        if (event.type !== 'merchandise') {
            return res.status(400).json({
                success: false,
                message: 'This is not a merchandise event'
            });
        }

        //find registration
        const registration = event.registered_participants.find(
            r => r.participant.toString() === participantId
        );

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        //update payment proof
        registration.payment_proof = payment_proof;
        registration.payment_status = 'pending';

        await event.save();

        res.status(200).json({
            success: true,
            message: 'Payment proof uploaded successfully. Waiting for organizer approval.',
            data: {
                payment_status: 'pending'
            }
        });
    } catch (error) {
        console.error('Error in uploadPaymentProof:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//get pending payments
//all pending payment approvals for organizer events
export async function getPendingPayments(req, res) {
    try {
        const organizerId = req.user.id;

        //optimized: exclude payment_proof for instant list loading
        const events = await Event.find({
            organizer_id: organizerId,
            type: 'merchandise',
            'registered_participants.payment_status': 'pending'
        })
        .select('-registered_participants.payment_proof')
        .populate('registered_participants.participant', 'first_name last_name email contact_number')
        .lean();

        //extract all pending payments without payment proofs
        const pendingPayments = [];
        
        events.forEach(event => {
            event.registered_participants.forEach(reg => {
                if (reg.payment_status === 'pending') {
                    //calculate total price for all variants
                    let totalPrice = 0;
                    let variantOrdersDisplay = [];
                    
                    if (reg.variant_orders && reg.variant_orders.length > 0) {
                        //new multi-variant format
                        reg.variant_orders.forEach(order => {
                            const variant = event.merchandise_details.variants.find(
                                v => v.variant_name === order.variant_name
                            );
                            if (variant) {
                                totalPrice += variant.price * order.quantity;
                                variantOrdersDisplay.push({
                                    variant_name: order.variant_name,
                                    quantity: order.quantity,
                                    price: variant.price
                                });
                            }
                        });
                    } else if (reg.variant_name) {
                        // Legacy single-variant format
                        const variant = event.merchandise_details.variants.find(
                            v => v.variant_name === reg.variant_name
                        );
                        if (variant) {
                            totalPrice = variant.price * (reg.quantity || 1);
                            variantOrdersDisplay.push({
                                variant_name: reg.variant_name,
                                quantity: reg.quantity || 1,
                                price: variant.price
                            });
                        }
                    }

                    pendingPayments.push({
                        registration_id: reg._id,
                        event_id: event._id,
                        event_name: event.name,
                        participant: {
                            id: reg.participant._id,
                            name: `${reg.participant.first_name} ${reg.participant.last_name}`,
                            email: reg.participant.email,
                            contact: reg.participant.contact_number
                        },
                        variant_orders: variantOrdersDisplay,
                        //legacy fields for backwards compatibility
                        variant_name: reg.variant_name,
                        quantity: reg.quantity,
                        total_price: totalPrice || event.reg_fee * (reg.quantity || 1),
                        has_payment_proof: !!reg.payment_proof,
                        registered_at: reg.registered_at
                    });
                }
            });
        });

        res.status(200).json({
            success: true,
            count: pendingPayments.length,
            data: pendingPayments
        });
    } catch (error) {
        console.error('Error in getPendingPayments:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//get individual payment proof (on-demand)
export async function getPaymentProof(req, res) {
    try {
        const { eventId, registrationId } = req.params;
        const organizerId = req.user.id;

        const event = await Event.findOne({
            _id: eventId,
            organizer_id: organizerId
        })
        .select('registered_participants')
        .lean();

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found or unauthorized'
            });
        }

        const registration = event.registered_participants.find(
            reg => reg._id.toString() === registrationId
        );

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        if (!registration.payment_proof) {
            return res.status(404).json({
                success: false,
                message: 'No payment proof uploaded'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                payment_proof: registration.payment_proof
            }
        });
    } catch (error) {
        console.error('Error in getPaymentProof:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//approve payment
export async function approvePayment(req, res) {
    try {
        const { eventId, registrationId } = req.params;
        const organizerId = req.user.id;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Verify organizer owns this event
        if (event.organizer_id.toString() !== organizerId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Find registration
        const registration = event.registered_participants.id(registrationId);
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        if (registration.payment_status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Payment is not in pending state'
            });
        }

        //handle multiple variant orders or legacy single variant
        const variantOrders = registration.variant_orders && registration.variant_orders.length > 0
            ? registration.variant_orders
            : [{ variant_name: registration.variant_name, quantity: registration.quantity || 1 }];

        //check stock availability for all variants
        for (const order of variantOrders) {
            const variant = event.merchandise_details.variants.find(
                v => v.variant_name === order.variant_name
            );
            
            if (!variant) {
                return res.status(400).json({
                    success: false,
                    message: `Variant ${order.variant_name} not found`
                });
            }

            if (variant.stock_quantity < order.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${order.variant_name} (available: ${variant.stock_quantity}, requested: ${order.quantity})`
                });
            }
        }

        //decrement stock for all variants
        let totalQuantity = 0;
        for (const order of variantOrders) {
            const variant = event.merchandise_details.variants.find(
                v => v.variant_name === order.variant_name
            );
            if (variant) {
                variant.stock_quantity -= order.quantity;
                totalQuantity += order.quantity;
            }
        }

        //decrement total stock
        event.merchandise_details.stock_quantity -= totalQuantity;

        //update payment status
        registration.payment_status = 'approved';
        registration.payment_reviewed_at = new Date();
        registration.payment_reviewed_by = organizerId;
        registration.qr_code_generated = true;

        await event.save();

        res.status(200).json({
            success: true,
            message: 'Payment approved successfully. QR code generated.',
            data: {
                registration_id: registration._id,
                payment_status: 'approved'
            }
        });
    } catch (error) {
        console.error('Error in approvePayment:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//reject payment
export async function rejectPayment(req, res) {
    try {
        const { eventId, registrationId } = req.params;
        const { reason } = req.body;
        const organizerId = req.user.id;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Verify organizer owns this event
        if (event.organizer_id.toString() !== organizerId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Find registration
        const registration = event.registered_participants.id(registrationId);
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        // Update payment status
        registration.payment_status = 'rejected';
        registration.payment_reviewed_at = new Date();
        registration.payment_reviewed_by = organizerId;
        registration.qr_code_generated = false;

        await event.save();

        res.status(200).json({
            success: true,
            message: 'Payment rejected',
            data: {
                registration_id: registration._id,
                payment_status: 'rejected',
                reason: reason || 'Payment proof not valid'
            }
        });
    } catch (error) {
        console.error('Error in rejectPayment:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

// Get single event by ID
export async function getEventById(req, res) {
    try {
        const eventId = req.params.id;

        // Exclude heavy payment_proof images for general event viewing
        const event = await Event.findById(eventId)
            .select('-registered_participants.payment_proof')
            .populate('organizer_id', 'email')
            .populate({
                path: 'organizer_id',
                populate: {
                    path: 'organizer_details',
                    select: 'name category'
                }
            })
            .populate('registered_participants.participant', 'first_name last_name email participant_type college_org_name')
            .lean();

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        res.status(200).json(event);
    } catch (error) {
        console.error('Error in getEventById:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}