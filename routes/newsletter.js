const express = require('express');
const { body, validationResult } = require('express-validator');
const { Newsletter } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

const router = express.Router();

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/subscribe', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    
    body('interests')
        .optional()
        .isArray()
        .withMessage('Interests must be an array')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const { email, name, interests } = req.body;

    // Check if already subscribed
    const existingSubscription = await Newsletter.findOne({ email });
    if (existingSubscription) {
        if (existingSubscription.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Email is already subscribed to our newsletter'
            });
        } else {
            // Reactivate subscription
            existingSubscription.isActive = true;
            existingSubscription.name = name || existingSubscription.name;
            existingSubscription.interests = interests || existingSubscription.interests;
            await existingSubscription.save();

            // Send welcome email
            try {
                await sendEmail({
                    to: email,
                    subject: 'Welcome back to InoxDev Newsletter!',
                    template: 'newsletter-welcome',
                    data: { name: name || 'Subscriber' }
                });
            } catch (emailError) {
                logger.error('Newsletter welcome email failed:', emailError);
            }

            return res.json({
                success: true,
                message: 'Successfully resubscribed to newsletter!'
            });
        }
    }

    // Create new subscription
    const subscription = new Newsletter({
        email,
        name,
        interests,
        source: 'website'
    });

    await subscription.save();

    // Send welcome email
    try {
        await sendEmail({
            to: email,
            subject: 'Welcome to InoxDev Newsletter!',
            template: 'newsletter-welcome',
            data: { name: name || 'Subscriber' }
        });
    } catch (emailError) {
        logger.error('Newsletter welcome email failed:', emailError);
    }

    logger.info(`New newsletter subscription: ${email}`);

    res.status(201).json({
        success: true,
        message: 'Successfully subscribed to newsletter!'
    });
}));

// @route   POST /api/newsletter/unsubscribe
// @desc    Unsubscribe from newsletter
// @access  Public
router.post('/unsubscribe', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const { email } = req.body;

    const subscription = await Newsletter.findOneAndUpdate(
        { email },
        { isActive: false },
        { new: true }
    );

    if (!subscription) {
        return res.status(404).json({
            success: false,
            message: 'Email not found in our newsletter list'
        });
    }

    logger.info(`Newsletter unsubscription: ${email}`);

    res.json({
        success: true,
        message: 'Successfully unsubscribed from newsletter'
    });
}));

// Admin routes

// @route   GET /api/newsletter/admin/subscribers
// @desc    Get all newsletter subscribers
// @access  Private (Admin/Manager)
router.get('/admin/subscribers', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const isActive = req.query.isActive;
    const source = req.query.source;

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (source) filter.source = source;

    const skip = (page - 1) * limit;

    const subscribers = await Newsletter.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Newsletter.countDocuments(filter);

    res.json({
        success: true,
        data: subscribers,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// @route   GET /api/newsletter/admin/stats
// @desc    Get newsletter statistics
// @access  Private (Admin/Manager)
router.get('/admin/stats', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const totalSubscribers = await Newsletter.countDocuments();
    const activeSubscribers = await Newsletter.countDocuments({ isActive: true });
    const inactiveSubscribers = await Newsletter.countDocuments({ isActive: false });

    // Subscriptions by source
    const sourceStats = await Newsletter.aggregate([
        {
            $group: {
                _id: '$source',
                count: { $sum: 1 },
                active: { $sum: { $cond: ['$isActive', 1, 0] } }
            }
        },
        { $sort: { count: -1 } }
    ]);

    // Recent subscriptions (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSubscriptions = await Newsletter.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
        isActive: true
    });

    res.json({
        success: true,
        data: {
            totalSubscribers,
            activeSubscribers,
            inactiveSubscribers,
            sourceStats,
            recentSubscriptions
        }
    });
}));

module.exports = router;