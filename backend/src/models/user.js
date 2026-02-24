import mongoose from "mongoose"

//users
const participantSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        immutable: true
    },
    participant_type: {
        type: String,
        required: true,
        lowercase: true,
        enum: ['iiit', 'non-iiit'],
        immutable: true
    },
    college_org_name: {
        type: String,
        required: true
    },
    contact_number: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
    },
    year_of_study: {
        type: Number,
        required: true
    },
    selected_interests: [{
        type: String
    }],
    followed_clubs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizerDetail'
    }]
}, { timestamps: true});

const organizerDetailSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        lowercase: true,
        enum: ['club', 'council', "fest team"]
    },
    description: {
        type: String,
        required: true
    }
});

const organizerSchema = new mongoose.Schema({
    email: { 
        type: String,
        required: true,
        unique: true 
    },
    password: {
        type: String,
        required: true
    },
    organizer_details: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizerDetail',
        required: true
    },
    contact_number: {
        type: String
    },
    discord_webhook: {
        type: String
    }
}, { timestamps: true });

const adminSchema = new mongoose.Schema({
email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'admin',
        immutable: true  // Prevents role from being changed
    }
}, { timestamps: true });

//events
const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        lowercase: true,
        enum: ['normal', 'merchandise']
    },
    eligibility: {
        type: String,
        required: true
    },
    reg_deadline: {
        type: Date,
        required: true
    },
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date,
        required: true
    },
    reg_limit: {
        type: Number,
        required: false,
        default: null
    },
    reg_fee: {
        type: Number,
        required: true
    },
    organizer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organizer',
        required: true
    },
    event_tags: [{
        type: String
    }],
    registered_participants: [{
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Participant'
        },
        form_values: [{
            field_name: String,
            answer: String
        }],
        registered_at: {
            type: Date,
            default: Date.now
        },
        //for merchandise events - payment approval workflow
        payment_proof: {
            type: String,  // URL or base64 image
            default: null
        },
        payment_status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'not_required'],
            default: 'not_required'
        },
        payment_reviewed_at: {
            type: Date,
            default: null
        },
        payment_reviewed_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organizer',
            default: null
        },
        //for merchandise orders - support multiple variants in one order
        variant_orders: [{
            variant_name: String,
            quantity: Number
        }],
        //legacy fields for backwards compatibility
        variant_name: String,
        quantity: Number,
        //qr code and ticket generation
        qr_code_generated: {
            type: Boolean,
            default: false
        }
    }],

    //qr scanner and attendance tracking
    attendance: [{
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Participant',
            required: true
        },
        scanned_at: {
            type: Date,
            default: Date.now
        },
        scanned_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organizer'
        },
        scan_method: {
            type: String,
            enum: ['qr_scan', 'manual_override'],
            default: 'qr_scan'
        },
        notes: String
    }],

    //for normal events - custom registration form
    custom_form_fields: [{
        field_name: String,
        field_type: { 
            type: String, 
            enum: ['text', 'number', 'email', 'dropdown', 'checkbox', 'file upload'],
            lowercase: true
        },
        is_required: Boolean,
        options: [String]
    }],
    //for merchandise events
    merchandise_details: {
        item_name: String,
        sizes: [{ 
            type: String, 
            enum: ['xs', 's', 'm', 'l', 'xl', 'xxl'],
            lowercase: true
        }],
        colors: [String],
        variants: [{
            variant_name: String,
            price: Number,
            stock_quantity: Number
        }],
        stock_quantity: Number,
        purchase_limit_per_participant: Number
    },

    //tier b: real-time discussion forum
    discussion_forum: [{
        message_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: () => new mongoose.Types.ObjectId()
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'discussion_forum.author_type',
            required: true
        },
        author_type: {
            type: String,
            enum: ['Participant', 'Organizer'],
            required: true
        },
        message: {
            type: String,
            required: true
        },
        is_announcement: {
            type: Boolean,
            default: false
        },
        is_pinned: {
            type: Boolean,
            default: false
        },
        parent_message_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        reactions: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Participant'
            },
            emoji: String
        }],
        posted_at: {
            type: Date,
            default: Date.now
        },
        edited_at: Date,
        deleted_at: Date
    }],

    //tier c: anonymous feedback system
    feedback: [{
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            required: true,
            maxlength: 1000
        },
        submitted_at: {
            type: Date,
            default: Date.now
        },
        //track participant without storing reference
        //maintains anonymity while preventing duplicates
        participant_hash: {
            type: String,  // Hashed participant ID to check duplicates anonymously
            required: true
        }
    }]
}, { timestamps: true });

//add indexes for better query performance
eventSchema.index({ organizer_id: 1 });
eventSchema.index({ 'registered_participants.participant': 1 });
eventSchema.index({ type: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ 'registered_participants.payment_status': 1 });
eventSchema.index({ start_date: 1 });

//add custom validation
eventSchema.pre('save', async function() {
    if (this.type === 'normal') {
        //if normal event,merchandise_details should be empty
        const hasMerchandiseDetails = this.merchandise_details && 
            (this.merchandise_details.item_name || 
             (this.merchandise_details.variants && this.merchandise_details.variants.length > 0));
        
        if (hasMerchandiseDetails) {
            throw new Error('Normal events cannot have merchandise details');
        }
        //custom_form_fields are optional for normal events
    }
    
    if (this.type === 'merchandise') {
        //if merchandise event custom_form_fields should be empty
        if (this.custom_form_fields && this.custom_form_fields.length > 0) {
            throw new Error('Merchandise events cannot have custom form fields');
        }
        //require merchandise_details
        if (!this.merchandise_details || !this.merchandise_details.item_name) {
            throw new Error('Merchandise events must have merchandise details');
        }
    }
});

//also add validation for updates
eventSchema.pre('findOneAndUpdate', async function() {
    const update = this.getUpdate();
    
    if (update.type === 'normal' && update.merchandise_details) {
        throw new Error('Normal events cannot have merchandise details');
    }
    
    if (update.type === 'merchandise' && update.custom_form_fields) {
        throw new Error('Merchandise events cannot have custom form fields');
    }
});

//tier b: organizer password reset request schema
const passwordResetRequestSchema = new mongoose.Schema({
    organizer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organizer',
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    reviewed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    reviewed_at: {
        type: Date,
        default: null
    },
    admin_comment: {
        type: String,
        default: null
    },
    new_password: {
        type: String,
        default: null
    }
}, { timestamps: true });

const Participant = mongoose.model('Participant', participantSchema);
const Organizer = mongoose.model('Organizer', organizerSchema);
const OrganizerDetail = mongoose.model('OrganizerDetail', organizerDetailSchema);
const Event = mongoose.model('Event', eventSchema);
const Admin = mongoose.model('Admin', adminSchema);
const PasswordResetRequest = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);

export { Participant, Organizer, OrganizerDetail, Event, Admin, PasswordResetRequest };