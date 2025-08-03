const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

console.log('--- Starting models/index.js execution ---');

// Contact Form Schema
const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    company: {
        type: String,
        trim: true,
        maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    service: {
        type: String,
        enum: ['fullstack', 'devsecops', 'cloud', 'security', 'saas', 'design', 'blockchain', 'ai-ml', 'consultation', ''],
        default: ''
    },
    budget: {
        type: String,
        enum: ['under-5', '5-15', '15-50', 'above-50', ''],
        default: ''
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    aiSuggestions: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['new', 'contacted', 'in-progress', 'closed'],
        default: 'new'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});
console.log('contactSchema defined.');

// User Schema (for admin dashboard)
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters']
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'employee'],
        default: 'employee'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    refreshTokens: [{
        token: String,
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 604800 // 7 days
        }
    }]
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const saltRounds = 12;
        this.password = await bcrypt.hash(this.password, saltRounds);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
    return jwt.sign(
        { 
            userId: this._id, 
            email: this.email, 
            role: this.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function() {
    const refreshToken = jwt.sign(
        { userId: this._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
    
    this.refreshTokens.push({ token: refreshToken });
    return refreshToken;
};
console.log('userSchema defined.');

// Project Schema
const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Project title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Project description is required']
    },
    client: {
        name: String,
        company: String,
        email: String
    },
    category: {
        type: String,
        enum: ['fullstack', 'devsecops', 'cloud', 'security', 'saas', 'design', 'blockchain', 'ai-ml'],
        required: true
    },
    technologies: [String],
    features: [String],
    challenges: String,
    solutions: String,
    results: [String],
    images: [String],
    projectUrl: String,
    githubUrl: String,
    status: {
        type: String,
        enum: ['planning', 'in-progress', 'completed', 'on-hold'],
        default: 'planning'
    },
    startDate: Date,
    endDate: Date,
    teamMembers: [{
        name: String,
        role: String,
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    isPublic: {
        type: Boolean,
        default: false
    },
    featured: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
console.log('projectSchema defined.');

// Service Schema
const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Service name is required'],
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: [true, 'Service description is required']
    },
    features: [String],
    technologies: [String],
    pricing: {
        startingPrice: Number,
        currency: {
            type: String,
            default: 'INR'
        },
        pricingModel: {
            type: String,
            enum: ['fixed', 'hourly', 'project-based', 'subscription'],
            default: 'project-based'
        }
    },
    icon: String,
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});
console.log('serviceSchema defined.');

// Team Member Schema
const teamMemberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    role: {
        type: String,
        required: [true, 'Role is required']
    },
    bio: String,
    avatar: String,
    skills: [String],
    experience: {
        years: Number,
        description: String
    },
    social: {
        linkedin: String,
        github: String,
        twitter: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});
console.log('teamMemberSchema defined.');

// Testimonial Schema
const testimonialSchema = new mongoose.Schema({
    clientName: {
        type: String,
        required: [true, 'Client name is required']
    },
    clientRole: String,
    company: String,
    testimonial: {
        type: String,
        required: [true, 'Testimonial text is required']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 5
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    avatar: String,
    isPublic: {
        type: Boolean,
        default: false
    },
    featured: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
console.log('testimonialSchema defined.');

// Newsletter Schema
const newsletterSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    name: String,
    interests: [String],
    isActive: {
        type: Boolean,
        default: true
    },
    source: {
        type: String,
        default: 'website'
    }
}, {
    timestamps: true
});
console.log('newsletterSchema defined.');

// Analytics Schema
const analyticsSchema = new mongoose.Schema({
    event: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    label: String,
    value: Number,
    userId: String,
    sessionId: String,
    ipAddress: String,
    userAgent: String,
    referrer: String,
    page: String,
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});
console.log('analyticsSchema defined.');

// Blog Post Schema (for future content marketing)
const blogPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required']
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    excerpt: String,
    content: {
        type: String,
        required: [true, 'Content is required']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: String,
    tags: [String],
    featuredImage: String,
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    publishedAt: Date,
    views: {
        type: Number,
        default: 0
    },
    seo: {
        metaTitle: String,
        metaDescription: String,
        keywords: [String]
    }
}, {
    timestamps: true
});
console.log('blogPostSchema defined.');

// Create indexes for better performance
contactSchema.index({ createdAt: -1, status: 1 });
// userSchema.index({ email: 1 });
projectSchema.index({ category: 1, status: 1, featured: -1 });
serviceSchema.index({ isActive: 1, order: 1 });
teamMemberSchema.index({ isActive: 1, order: 1 });
testimonialSchema.index({ isPublic: 1, featured: -1 });
analyticsSchema.index({ createdAt: -1, event: 1, category: 1 });
blogPostSchema.index({ status: 1, publishedAt: -1 });
console.log('Schemas indexed.');

// Export models
const models = {
    Contact: mongoose.model('Contact', contactSchema),
    User: mongoose.model('User', userSchema),
    Project: mongoose.model('Project', projectSchema),
    Service: mongoose.model('Service', serviceSchema),
    TeamMember: mongoose.model('TeamMember', teamMemberSchema),
    Testimonial: mongoose.model('Testimonial', testimonialSchema),
    Newsletter: mongoose.model('Newsletter', newsletterSchema),
    Analytics: mongoose.model('Analytics', analyticsSchema),
    BlogPost: mongoose.model('BlogPost', blogPostSchema)
};

console.log('Models created and ready for export.');
module.exports = models;
console.log('--- End of models/index.js execution ---');
