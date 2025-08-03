const express = require('express');
const { body, validationResult } = require('express-validator');
const { Testimonial } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/testimonials
// @desc    Get all public testimonials
// @access  Public
router.get('/', catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const featured = req.query.featured === 'true';

    const filter = { isPublic: true };
    if (featured) filter.featured = true;

    const skip = (page - 1) * limit;

    const testimonials = await Testimonial.find(filter)
        .populate('projectId', 'title category')
        .select('-__v')
        .sort({ featured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Testimonial.countDocuments(filter);

    res.json({
        success: true,
        data: testimonials,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// @route   GET /api/testimonials/featured
// @desc    Get featured testimonials for homepage
// @access  Public
router.get('/featured', catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 3;

    const testimonials = await Testimonial.find({ 
        isPublic: true, 
        featured: true 
    })
        .populate('projectId', 'title category')
        .select('clientName clientRole company testimonial rating avatar')
        .sort({ createdAt: -1 })
        .limit(limit);

    res.json({
        success: true,
        data: testimonials
    });
}));

// @route   GET /api/testimonials/:id
// @desc    Get single testimonial
// @access  Public (for public testimonials) / Private (for all)
router.get('/:id', catchAsync(async (req, res) => {
    const testimonial = await Testimonial.findById(req.params.id)
        .populate('projectId', 'title category description');

    if (!testimonial) {
        return res.status(404).json({
            success: false,
            message: 'Testimonial not found'
        });
    }

    // Check if testimonial is public or user is authenticated
    if (!testimonial.isPublic && !req.user) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }

    res.json({
        success: true,
        data: testimonial
    });
}));

// Admin routes

// @route   GET /api/testimonials/admin/all
// @desc    Get all testimonials for admin
// @access  Private (Admin/Manager)
router.get('/admin/all', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const isPublic = req.query.isPublic;
    const featured = req.query.featured;
    const rating = req.query.rating;

    const filter = {};
    if (isPublic !== undefined) filter.isPublic = isPublic === 'true';
    if (featured !== undefined) filter.featured = featured === 'true';
    if (rating) filter.rating = parseInt(rating);

    const skip = (page - 1) * limit;

    const testimonials = await Testimonial.find(filter)
        .populate('projectId', 'title category client.company')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Testimonial.countDocuments(filter);

    res.json({
        success: true,
        data: testimonials,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// @route   POST /api/testimonials
// @desc    Create new testimonial
// @access  Private (Admin/Manager)
router.post('/', auth, authorize(['admin', 'manager']), [
    body('clientName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Client name must be between 2 and 100 characters'),
    
    body('clientRole')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Client role cannot exceed 100 characters'),
    
    body('company')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Company name cannot exceed 100 characters'),
    
    body('testimonial')
        .trim()
        .isLength({ min: 50, max: 1000 })
        .withMessage('Testimonial must be between 50 and 1000 characters'),
    
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    
    body('projectId')
        .optional()
        .isMongoId()
        .withMessage('Invalid project ID'),
    
    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean'),
    
    body('featured')
        .optional()
        .isBoolean()
        .withMessage('featured must be a boolean')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const testimonial = new Testimonial(req.body);
    await testimonial.save();

    logger.userAction(req.user.userId, 'created_testimonial', { 
        testimonialId: testimonial._id, 
        clientName: testimonial.clientName 
    });

    res.status(201).json({
        success: true,
        message: 'Testimonial created successfully',
        data: testimonial
    });
}));

// @route   PUT /api/testimonials/:id
// @desc    Update testimonial
// @access  Private (Admin/Manager)
router.put('/:id', auth, authorize(['admin', 'manager']), [
    body('clientName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Client name must be between 2 and 100 characters'),
    
    body('clientRole')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Client role cannot exceed 100 characters'),
    
    body('company')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Company name cannot exceed 100 characters'),
    
    body('testimonial')
        .optional()
        .trim()
        .isLength({ min: 50, max: 1000 })
        .withMessage('Testimonial must be between 50 and 1000 characters'),
    
    body('rating')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    
    body('projectId')
        .optional()
        .isMongoId()
        .withMessage('Invalid project ID'),
    
    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean'),
    
    body('featured')
        .optional()
        .isBoolean()
        .withMessage('featured must be a boolean')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const testimonial = await Testimonial.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!testimonial) {
        return res.status(404).json({
            success: false,
            message: 'Testimonial not found'
        });
    }

    logger.userAction(req.user.userId, 'updated_testimonial', { 
        testimonialId: testimonial._id, 
        clientName: testimonial.clientName 
    });

    res.json({
        success: true,
        message: 'Testimonial updated successfully',
        data: testimonial
    });
}));

// @route   DELETE /api/testimonials/:id
// @desc    Delete testimonial
// @access  Private (Admin only)
router.delete('/:id', auth, authorize(['admin']), catchAsync(async (req, res) => {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);

    if (!testimonial) {
        return res.status(404).json({
            success: false,
            message: 'Testimonial not found'
        });
    }

    logger.userAction(req.user.userId, 'deleted_testimonial', { 
        testimonialId: testimonial._id, 
        clientName: testimonial.clientName 
    });

    res.json({
        success: true,
        message: 'Testimonial deleted successfully'
    });
}));

// @route   PUT /api/testimonials/:id/toggle-public
// @desc    Toggle testimonial public status
// @access  Private (Admin/Manager)
router.put('/:id/toggle-public', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
        return res.status(404).json({
            success: false,
            message: 'Testimonial not found'
        });
    }

    testimonial.isPublic = !testimonial.isPublic;
    await testimonial.save();

    logger.userAction(req.user.userId, 'toggled_testimonial_public', { 
        testimonialId: testimonial._id, 
        clientName: testimonial.clientName,
        newStatus: testimonial.isPublic 
    });

    res.json({
        success: true,
        message: `Testimonial ${testimonial.isPublic ? 'made public' : 'made private'} successfully`,
        data: testimonial
    });
}));

// @route   PUT /api/testimonials/:id/toggle-featured
// @desc    Toggle testimonial featured status
// @access  Private (Admin/Manager)
router.put('/:id/toggle-featured', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
        return res.status(404).json({
            success: false,
            message: 'Testimonial not found'
        });
    }

    testimonial.featured = !testimonial.featured;
    await testimonial.save();

    logger.userAction(req.user.userId, 'toggled_testimonial_featured', { 
        testimonialId: testimonial._id, 
        clientName: testimonial.clientName,
        newStatus: testimonial.featured 
    });

    res.json({
        success: true,
        message: `Testimonial ${testimonial.featured ? 'featured' : 'unfeatured'} successfully`,
        data: testimonial
    });
}));

// @route   GET /api/testimonials/stats/overview
// @desc    Get testimonial statistics
// @access  Private (Admin/Manager)
router.get('/stats/overview', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const totalTestimonials = await Testimonial.countDocuments();
    const publicTestimonials = await Testimonial.countDocuments({ isPublic: true });
    const featuredTestimonials = await Testimonial.countDocuments({ featured: true });

    // Rating distribution
    const ratingStats = await Testimonial.aggregate([
        {
            $group: {
                _id: '$rating',
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Average rating
    const avgRatingResult = await Testimonial.aggregate([
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalRatings: { $sum: 1 }
            }
        }
    ]);

    const averageRating = avgRatingResult.length > 0 ? avgRatingResult[0].averageRating : 0;

    // Recent testimonials
    const recentTestimonials = await Testimonial.find()
        .select('clientName company rating createdAt')
        .sort({ createdAt: -1 })
        .limit(5);

    res.json({
        success: true,
        data: {
            totalTestimonials,
            publicTestimonials,
            featuredTestimonials,
            averageRating: Math.round(averageRating * 10) / 10,
            ratingStats,
            recentTestimonials
        }
    });
}));

module.exports = router;