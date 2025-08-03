const express = require('express');
const { body, validationResult } = require('express-validator');
const { Service } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/services
// @desc    Get all active services
// @access  Public
router.get('/', catchAsync(async (req, res) => {
    const services = await Service.find({ isActive: true })
        .select('-__v')
        .sort({ order: 1, createdAt: 1 });

    res.json({
        success: true,
        data: services
    });
}));

// @route   GET /api/services/:slug
// @desc    Get service by slug
// @access  Public
router.get('/:slug', catchAsync(async (req, res) => {
    const service = await Service.findOne({ 
        slug: req.params.slug, 
        isActive: true 
    }).select('-__v');

    if (!service) {
        return res.status(404).json({
            success: false,
            message: 'Service not found'
        });
    }

    res.json({
        success: true,
        data: service
    });
}));

// Admin routes

// @route   GET /api/services/admin/all
// @desc    Get all services for admin
// @access  Private (Admin/Manager)
router.get('/admin/all', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const services = await Service.find()
        .sort({ order: 1, createdAt: 1 });

    res.json({
        success: true,
        data: services
    });
}));

// @route   POST /api/services
// @desc    Create new service
// @access  Private (Admin)
router.post('/', auth, authorize(['admin']), [
    body('name')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Service name must be between 3 and 100 characters'),
    
    body('slug')
        .trim()
        .isLength({ min: 3, max: 100 })
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    
    body('description')
        .trim()
        .isLength({ min: 50, max: 1000 })
        .withMessage('Description must be between 50 and 1000 characters'),
    
    body('features')
        .isArray({ min: 1 })
        .withMessage('At least one feature must be specified'),
    
    body('technologies')
        .isArray({ min: 1 })
        .withMessage('At least one technology must be specified'),
    
    body('pricing.startingPrice')
        .optional()
        .isNumeric()
        .withMessage('Starting price must be a number'),
    
    body('pricing.pricingModel')
        .optional()
        .isIn(['fixed', 'hourly', 'project-based', 'subscription'])
        .withMessage('Invalid pricing model')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    // Check if slug already exists
    const existingService = await Service.findOne({ slug: req.body.slug });
    if (existingService) {
        return res.status(400).json({
            success: false,
            message: 'Service with this slug already exists'
        });
    }

    const service = new Service(req.body);
    await service.save();

    logger.userAction(req.user.userId, 'created_service', { 
        serviceId: service._id, 
        name: service.name 
    });

    res.status(201).json({
        success: true,
        message: 'Service created successfully',
        data: service
    });
}));

// @route   PUT /api/services/:id
// @desc    Update service
// @access  Private (Admin)
router.put('/:id', auth, authorize(['admin']), [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Service name must be between 3 and 100 characters'),
    
    body('slug')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ min: 50, max: 1000 })
        .withMessage('Description must be between 50 and 1000 characters'),
    
    body('features')
        .optional()
        .isArray({ min: 1 })
        .withMessage('At least one feature must be specified'),
    
    body('technologies')
        .optional()
        .isArray({ min: 1 })
        .withMessage('At least one technology must be specified'),
    
    body('pricing.startingPrice')
        .optional()
        .isNumeric()
        .withMessage('Starting price must be a number'),
    
    body('pricing.pricingModel')
        .optional()
        .isIn(['fixed', 'hourly', 'project-based', 'subscription'])
        .withMessage('Invalid pricing model'),
    
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean'),
    
    body('order')
        .optional()
        .isNumeric()
        .withMessage('Order must be a number')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    // If updating slug, check if new slug already exists
    if (req.body.slug) {
        const existingService = await Service.findOne({ 
            slug: req.body.slug,
            _id: { $ne: req.params.id }
        });
        
        if (existingService) {
            return res.status(400).json({
                success: false,
                message: 'Service with this slug already exists'
            });
        }
    }

    const service = await Service.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!service) {
        return res.status(404).json({
            success: false,
            message: 'Service not found'
        });
    }

    logger.userAction(req.user.userId, 'updated_service', { 
        serviceId: service._id, 
        name: service.name 
    });

    res.json({
        success: true,
        message: 'Service updated successfully',
        data: service
    });
}));

// @route   DELETE /api/services/:id
// @desc    Delete service
// @access  Private (Admin only)
router.delete('/:id', auth, authorize(['admin']), catchAsync(async (req, res) => {
    const service = await Service.findByIdAndDelete(req.params.id);

    if (!service) {
        return res.status(404).json({
            success: false,
            message: 'Service not found'
        });
    }

    logger.userAction(req.user.userId, 'deleted_service', { 
        serviceId: service._id, 
        name: service.name 
    });

    res.json({
        success: true,
        message: 'Service deleted successfully'
    });
}));

// @route   PUT /api/services/:id/toggle
// @desc    Toggle service active status
// @access  Private (Admin)
router.put('/:id/toggle', auth, authorize(['admin']), catchAsync(async (req, res) => {
    const service = await Service.findById(req.params.id);

    if (!service) {
        return res.status(404).json({
            success: false,
            message: 'Service not found'
        });
    }

    service.isActive = !service.isActive;
    await service.save();

    logger.userAction(req.user.userId, 'toggled_service_status', { 
        serviceId: service._id, 
        name: service.name,
        newStatus: service.isActive 
    });

    res.json({
        success: true,
        message: `Service ${service.isActive ? 'activated' : 'deactivated'} successfully`,
        data: service
    });
}));

// @route   PUT /api/services/reorder
// @desc    Reorder services
// @access  Private (Admin)
router.put('/reorder', auth, authorize(['admin']), [
    body('services')
        .isArray({ min: 1 })
        .withMessage('Services array is required'),
    
    body('services.*.id')
        .isMongoId()
        .withMessage('Invalid service ID'),
    
    body('services.*.order')
        .isNumeric()
        .withMessage('Order must be a number')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const { services } = req.body;

    // Update each service's order
    const updatePromises = services.map(({ id, order }) =>
        Service.findByIdAndUpdate(id, { order }, { new: true })
    );

    await Promise.all(updatePromises);

    logger.userAction(req.user.userId, 'reordered_services', { 
        serviceCount: services.length 
    });

    res.json({
        success: true,
        message: 'Services reordered successfully'
    });
}));

// @route   GET /api/services/stats/overview
// @desc    Get service statistics
// @access  Private (Admin/Manager)
router.get('/stats/overview', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const totalServices = await Service.countDocuments();
    const activeServices = await Service.countDocuments({ isActive: true });
    const inactiveServices = await Service.countDocuments({ isActive: false });

    // Get services with pricing info
    const servicesWithPricing = await Service.countDocuments({
        'pricing.startingPrice': { $exists: true, $gt: 0 }
    });

    // Get average starting price
    const pricingStats = await Service.aggregate([
        { $match: { 'pricing.startingPrice': { $exists: true, $gt: 0 } } },
        {
            $group: {
                _id: null,
                averagePrice: { $avg: '$pricing.startingPrice' },
                minPrice: { $min: '$pricing.startingPrice' },
                maxPrice: { $max: '$pricing.startingPrice' }
            }
        }
    ]);

    const avgPricing = pricingStats.length > 0 ? pricingStats[0] : null;

    res.json({
        success: true,
        data: {
            totalServices,
            activeServices,
            inactiveServices,
            servicesWithPricing,
            averagePricing: avgPricing
        }
    });
}));

module.exports = router;