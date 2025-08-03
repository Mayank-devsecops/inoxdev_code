const express = require('express');
const { body, validationResult } = require('express-validator');
const { Contact } = require('../models');
const { sendEmail } = require('../utils/email');
const { generateProjectSuggestions } = require('../utils/gemini');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Validation rules for contact form
const contactValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),
    
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('company')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Company name cannot exceed 100 characters'),
    
    body('service')
        .optional()
        .isIn(['fullstack', 'devsecops', 'cloud', 'security', 'saas', 'design', 'blockchain', 'ai-ml', 'consultation', ''])
        .withMessage('Invalid service selection'),
    
    body('budget')
        .optional()
        .isIn(['under-5', '5-15', '15-50', 'above-50', ''])
        .withMessage('Invalid budget range'),
    
    body('message')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Message must be between 10 and 2000 characters')
];

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post('/', contactValidation, async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email, company, service, budget, message } = req.body;
        
        // Get client IP and user agent
        const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        const userAgent = req.get('User-Agent') || 'Unknown';

        // Create contact entry
        const contact = new Contact({
            name,
            email,
            company,
            service,
            budget,
            message,
            ipAddress,
            userAgent
        });

        await contact.save();

        // Send notification emails
        try {
            // Email to admin
            await sendEmail({
                to: process.env.ADMIN_EMAIL || 'hello@inoxdev.com',
                subject: `New Contact Form Submission - ${name}`,
                template: 'contact-notification',
                data: {
                    name,
                    email,
                    company,
                    service,
                    budget,
                    message,
                    submittedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                }
            });

            // Auto-reply to client
            await sendEmail({
                to: email,
                subject: 'Thank you for contacting InoxDev - We\'ll be in touch soon!',
                template: 'contact-auto-reply',
                data: {
                    name,
                    service: service || 'General Inquiry',
                    contactId: contact._id
                }
            });

        } catch (emailError) {
            logger.error('Email sending failed:', emailError);
            // Don't fail the request if email fails
        }

        // Log the contact submission
        logger.info(`New contact form submission from ${email} - ${name}`);

        res.status(201).json({
            success: true,
            message: 'Thank you for your message! We\'ll get back to you within 24 hours.',
            contactId: contact._id
        });

    } catch (error) {
        logger.error('Contact form submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   POST /api/contact/suggestions
// @desc    Get AI-powered project suggestions
// @access  Public
router.post('/suggestions', [
    body('projectDetails')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Project details must be between 10 and 2000 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { projectDetails } = req.body;

        // Generate suggestions using Gemini API
        const suggestions = await generateProjectSuggestions(projectDetails);

        res.json({
            success: true,
            suggestions
        });

    } catch (error) {
        logger.error('Project suggestions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate suggestions. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/contact
// @desc    Get all contact submissions (Admin only)
// @access  Private (Admin)
router.get('/', auth, authorize(['admin', 'manager']), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const priority = req.query.priority;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        // Build filter object
        const filter = {};
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;

        const contacts = await Contact.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-__v');

        const total = await Contact.countDocuments(filter);

        res.json({
            success: true,
            data: contacts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Get contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contacts',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/contact/:id
// @desc    Get single contact submission
// @access  Private (Admin)
router.get('/:id', auth, authorize(['admin', 'manager']), async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.json({
            success: true,
            data: contact
        });

    } catch (error) {
        logger.error('Get contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contact',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   PUT /api/contact/:id
// @desc    Update contact status/priority
// @access  Private (Admin)
router.put('/:id', auth, authorize(['admin', 'manager']), [
    body('status')
        .optional()
        .isIn(['new', 'contacted', 'in-progress', 'closed'])
        .withMessage('Invalid status'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('Invalid priority')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { status, priority, notes } = req.body;
        const updateData = {};
        
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;
        if (notes) updateData.notes = notes;

        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        logger.info(`Contact ${contact._id} updated by ${req.user.email}`);

        res.json({
            success: true,
            data: contact,
            message: 'Contact updated successfully'
        });

    } catch (error) {
        logger.error('Update contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update contact',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   DELETE /api/contact/:id
// @desc    Delete contact submission
// @access  Private (Admin only)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
    try {
        const contact = await Contact.findByIdAndDelete(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        logger.info(`Contact ${contact._id} deleted by ${req.user.email}`);

        res.json({
            success: true,
            message: 'Contact deleted successfully'
        });

    } catch (error) {
        logger.error('Delete contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete contact',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/contact/stats/overview
// @desc    Get contact statistics
// @access  Private (Admin)
router.get('/stats/overview', auth, authorize(['admin', 'manager']), async (req, res) => {
    try {
        const totalContacts = await Contact.countDocuments();
        const newContacts = await Contact.countDocuments({ status: 'new' });
        const inProgress = await Contact.countDocuments({ status: 'in-progress' });
        const closed = await Contact.countDocuments({ status: 'closed' });
        
        // Get contacts from last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentContacts = await Contact.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        // Get popular services
        const serviceStats = await Contact.aggregate([
            { $match: { service: { $ne: '' } } },
            { $group: { _id: '$service', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            success: true,
            data: {
                totalContacts,
                newContacts,
                inProgress,
                closed,
                recentContacts,
                serviceStats
            }
        });

    } catch (error) {
        logger.error('Contact stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contact statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;