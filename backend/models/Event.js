const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add an event title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },

    description: {
        type: String,
        required: [true, 'Please add a description']
    },

    benefits: {
        type: [String],
        default: []
    },

    whatYouLearn: {
        type: [String],
        default: []
    },

    bannerImage: {
        type: String,
        default: 'no-photo.jpg'
    },

    eventImage: {
        type: String
    },

    venue: {
        type: String,
        required: [true, 'Please add a venue']
    },

    date: {
        type: Date,
        required: [true, 'Please add an event date']
    },

    time: {
        type: String,
        required: [true, 'Please add an event time']
    },

    category: {
        type: String,
        required: [true, 'Please select a category'],
        enum: ['Seminar', 'Makeup Event', 'Carnival', 'Beauty Expo', 'Exhibition', 'Other']
    },

    ticketTypes: [
        {
            name: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true },
            sold: { type: Number, default: 0 }
        }
    ],

    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected', 'live', 'completed'],
        default: 'pending'
    },

    organizer: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },

    isMultiDay: {
        type: Boolean,
        default: false
    },

    multiDayPlan: [
        {
            date: { type: Date, required: true },
            plans: [
                {
                    name: { type: String, required: true },
                    price: { type: Number, required: true },
                    quantity: { type: Number, default: 100 },
                    sold: { type: Number, default: 0 }
                }
            ]
        }
    ],

    createdAt: {
        type: Date,
        default: Date.now
    },

    isLive: {
        type: Boolean,
        default: false
    },

    endDate: {
        type: Date
    },

    // =========================
    // FOOD SETTINGS
    // =========================
    foodSettings: {
        foodType: {
            type: String,
            enum: ['compulsory', 'multiple'],
            default: 'multiple'
        },

        options: [
            {
                itemName: {
                    type: String
                },

                type: {
                    type: String,
                    enum: ['veg', 'non-veg'],
                    default: 'veg'
                },

                category: {
                    type: String,
                    enum: [
                        'Breakfast',
                        'Lunch',
                        'Tiffin/Snacks',
                        'Dinner',
                        'Full Day Menu'
                    ],
                    default: 'Lunch'
                },

                distributionTime: {
                    type: String
                },

                isPaid: {
                    type: Boolean,
                    default: false
                },

                price: {
                    type: Number,
                    default: 0
                }
            }
        ]
    },

    // =========================
    // CUSTOM ADDONS SETTINGS
    // =========================
    addonsSettings: {
        addonType: {
            type: String,
            enum: ['compulsory', 'multiple'],
            default: 'multiple'
        },

        options: [
            {
                itemName: {
                    type: String,
                    required: true
                },

                // organizer can write anything
                type: {
                    type: String,
                    default: 'custom'
                },

                category: {
                    type: String,
                    default: 'Custom Addon'
                },

                distributionTime: {
                    type: String,
                    default: ''
                },

                isPaid: {
                    type: Boolean,
                    default: false
                },

                price: {
                    type: Number,
                    default: 0
                }
            }
        ]
    },

    // =========================
    // STAFF ROLE ASSIGNMENTS (Event-Specific)
    // =========================
    staffAssignments: {
        entry: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            default: null
        },
        food: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            default: null
        },
        parking: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            default: null
        },
        customAddons: {
            type: Map,
            of: mongoose.Schema.ObjectId,
            default: {}
        }
    },

    // =========================
    // LANDING PAGE CMS CONFIG
    // =========================
    landingPageConfig: {
        hero: {
            title: { type: String, default: '' },
            subtitle: { type: String, default: '' },
            description: { type: String, default: '' },
            buttonText: { type: String, default: 'Get Tickets' },
            bannerImage: { type: String, default: '' },
            videoUrl: { type: String, default: '' }
        },
        theme: {
            primaryColor: { type: String, default: '#e91e63' },
            fontFamily: { type: String, default: 'Inter, sans-serif' }
        },
        sections: {
            speakers: { 
                isVisible: { type: Boolean, default: true }, 
                items: [{ name: String, role: String, company: String, image: String, bio: String }] 
            },
            schedule: { 
                isVisible: { type: Boolean, default: true }, 
                items: [{ time: String, title: String, description: String }] 
            },
            faq: { 
                isVisible: { type: Boolean, default: true }, 
                items: [{ question: String, answer: String }] 
            },
            testimonials: { 
                isVisible: { type: Boolean, default: true }, 
                items: [{ name: String, text: String, role: String, image: String }] 
            }
        },
        seo: {
            metaTitle: { type: String, default: '' },
            metaDescription: { type: String, default: '' },
            keywords: { type: String, default: '' }
        }
    }
});

// =========================
// OPTIMIZATION INDEXES
// =========================
EventSchema.index({ status: 1 });
EventSchema.index({ date: 1 });
EventSchema.index({ organizer: 1 });
EventSchema.index({ isLive: 1 });
EventSchema.index({ category: 1 });

module.exports = mongoose.model('Event', EventSchema);