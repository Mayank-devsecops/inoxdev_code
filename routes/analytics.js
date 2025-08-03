const express = require('express');
const { body, validationResult } = require('express-validator');
const { Analytics } = require('../models'); // Assuming Analytics model is correctly exported from ../models/index.js
const { auth, authorize, optionalAuth } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const analyticsRouter = express.Router();

// @route   POST /api/analytics/event
// @desc    Track analytics event
// @access  Public
analyticsRouter.post('/event', optionalAuth, [
    body('event')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Event name is required and cannot exceed 100 characters'),
    
    body('category')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Category is required and cannot exceed 50 characters'),
    
    body('label')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Label cannot exceed 100 characters'),
    
    body('value')
        .optional()
        .isNumeric()
        .withMessage('Value must be a number'),
    
    body('page')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Page cannot exceed 200 characters')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const { event, category, label, value, page, metadata } = req.body;

    // Get client information
    // Note: req.ip might not always be the true client IP if behind proxies.
    // Consider using a library like 'request-ip' or checking 'x-forwarded-for' header in production.
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const referrer = req.get('Referrer') || '';

    // Generate session ID if not provided. req.sessionID requires 'express-session' middleware.
    // If you're not using express-session, this will always generate a new one.
    const sessionId = req.sessionID || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const analyticsEvent = new Analytics({
        event,
        category,
        label,
        value,
        userId: req.user?.userId, // Assumes req.user is populated by optionalAuth middleware
        sessionId,
        ipAddress,
        userAgent,
        referrer,
        page,
        metadata: metadata || {}
    });

    await analyticsEvent.save();

    res.status(201).json({
        success: true,
        message: 'Event tracked successfully'
    });
}));

// @route   GET /api/analytics/dashboard
// @desc    Get analytics dashboard data
// @access  Private (Admin/Manager)
analyticsRouter.get('/dashboard', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Total events
    const totalEvents = await Analytics.countDocuments({
        createdAt: { $gte: startDate }
    });

    // Unique visitors
    // .distinct() returns an array, so .length is correct here
    const uniqueVisitors = (await Analytics.distinct('sessionId', {
        createdAt: { $gte: startDate }
    })).length;

    // Top events
    const topEvents = await Analytics.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: '$event',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    // Top pages
    const topPages = await Analytics.aggregate([
        { 
            $match: { 
                createdAt: { $gte: startDate },
                page: { $exists: true, $ne: '' } // Ensure page field exists and is not empty
            }
        },
        {
            $group: {
                _id: '$page',
                views: { $sum: 1 },
                uniqueViews: { $addToSet: '$sessionId' } // Collect unique session IDs for unique views
            }
        },
        {
            $project: {
                page: '$_id', // Rename _id to page
                views: 1,
                uniqueViews: { $size: '$uniqueViews' } // Count unique session IDs
            }
        },
        { $sort: { views: -1 } },
        { $limit: 10 }
    ]);

    // Events by category
    const categoryStats = await Analytics.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);

    // Daily events (for chart)
    const dailyEvents = await Analytics.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                events: { $sum: 1 },
                uniqueVisitors: { $addToSet: '$sessionId' }
            }
        },
        {
            $project: {
                date: {
                    $dateFromParts: {
                        year: '$_id.year',
                        month: '$_id.month',
                        day: '$_id.day'
                    }
                },
                events: 1,
                uniqueVisitors: { $size: '$uniqueVisitors' }
            }
        },
        { $sort: { date: 1 } }
    ]);

    res.json({
        success: true,
        data: {
            totalEvents,
            uniqueVisitors,
            topEvents,
            topPages,
            categoryStats,
            dailyEvents
        }
    });
}));

// @route   GET /api/analytics/events
// @desc    Get analytics events with filters
// @access  Private (Admin/Manager)
analyticsRouter.get('/events', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const event = req.query.event;
    const category = req.query.category;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const filter = {};
    if (event) filter.event = event;
    if (category) filter.category = category;
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const events = await Analytics.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Analytics.countDocuments(filter);

    res.json({
        success: true,
        data: events,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// @route   DELETE /api/analytics/cleanup
// @desc    Clean up old analytics data
// @access  Private (Admin only)
analyticsRouter.delete('/cleanup', auth, authorize(['admin']), catchAsync(async (req, res) => {
    const days = parseInt(req.query.days) || 90;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await Analytics.deleteMany({
        createdAt: { $lt: cutoffDate }
    });

    logger.userAction(req.user.userId, 'cleaned_analytics_data', {
        deletedCount: result.deletedCount,
        daysCutoff: days
    });

    res.json({
        success: true,
        message: `Cleaned up ${result.deletedCount} analytics records older than ${days} days`
    });
}));

module.exports = analyticsRouter; // Corrected export: only export analyticsRouter
