console.log('--- Starting routes/projects.js execution ---');

const express = require('express');
console.log('express imported in projects.js.');

const { body, validationResult, query } = require('express-validator');
console.log('express-validator imported in projects.js.');

const { Project } = require('../models'); // Ensure Project model is correctly exported
console.log('Project model imported in projects.js.');

const { auth, authorize } = require('../middleware/auth'); // Ensure auth middleware is correctly exported
console.log('Auth middleware imported in projects.js.');

const { catchAsync } = require('../middleware/errorHandler'); // Ensure errorHandler middleware is correctly exported
console.log('errorHandler (catchAsync) imported in projects.js.');

const logger = require('../utils/logger'); // Ensure logger is correctly exported
console.log('logger imported in projects.js.');

const router = express.Router();
console.log('Express Router initialized in projects.js.');

// @route   GET /api/projects
// @desc    Get all public projects (for website showcase)
// @access  Public
console.log('About to define GET /api/projects route.'); // Added this log
router.get('/', catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const featured = req.query.featured === 'true';

    // Build filter for public projects
    const filter = { isPublic: true };
    if (category) filter.category = category;
    if (featured) filter.featured = true;

    const skip = (page - 1) * limit;

    const projects = await Project.find(filter)
        .select('title description category technologies features results images projectUrl featured createdAt')
        .sort({ featured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Project.countDocuments(filter);

    res.json({
        success: true,
        data: projects,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));
console.log('GET /api/projects route defined.');

// @route   GET /api/projects/categories
// @desc    Get project categories with counts
// @access  Public
router.get('/categories', catchAsync(async (req, res) => {
    const categories = await Project.aggregate([
        { $match: { isPublic: true } },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                featured: { $sum: { $cond: ['$featured', 1, 0] } }
            }
        },
        { $sort: { count: -1 } }
    ]);

    res.json({
        success: true,
        data: categories
    });
}));
console.log('GET /api/projects/categories route defined.');

// @route   GET /api/projects/featured
// @desc    Get featured projects for homepage
// @access  Public
router.get('/featured', catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 3;

    const projects = await Project.find({ isPublic: true, featured: true })
        .select('title description category technologies results images projectUrl')
        .sort({ createdAt: -1 })
        .limit(limit);

    res.json({
        success: true,
        data: projects
    });
}));
console.log('GET /api/projects/featured route defined.');

// @route   GET /api/projects/:id
// @desc    Get single project details
// @access  Public (for public projects) / Private (for all projects)
router.get('/:id', catchAsync(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found'
        });
    }

    // Check if project is public or user is authenticated
    // Note: req.user is populated by auth middleware. If optionalAuth is used, req.user might be undefined.
    // For public access, ensure this logic handles cases where req.user is intentionally absent.
    if (!project.isPublic && !req.user) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }

    res.json({
        success: true,
        data: project
    });
}));
console.log('GET /api/projects/:id route defined.');

// Admin routes (authentication required)

// @route   GET /api/projects/admin/all
// @desc    Get all projects for admin dashboard
// @access  Private (Admin/Manager)
router.get('/admin/all', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const category = req.query.category;
    const search = req.query.search;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { 'client.company': { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (page - 1) * limit;

    const projects = await Project.find(filter)
        .populate('teamMembers.userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Project.countDocuments(filter);

    res.json({
        success: true,
        data: projects,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));
console.log('GET /api/projects/admin/all route defined.');

// @route   POST /api/projects
// @desc    Create new project
// @access  Private (Admin/Manager)
router.post('/', auth, authorize(['admin', 'manager']), [
    body('title')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Title must be between 5 and 200 characters'),
    
    body('description')
        .trim()
        .isLength({ min: 50, max: 2000 })
        .withMessage('Description must be between 50 and 2000 characters'),
    
    body('category')
        .isIn(['fullstack', 'devsecops', 'cloud', 'security', 'saas', 'design', 'blockchain', 'ai-ml'])
        .withMessage('Invalid category'),
    
    body('technologies')
        .isArray({ min: 1 })
        .withMessage('At least one technology must be specified'),
    
    body('features')
        .optional()
        .isArray()
        .withMessage('Features must be an array'),
    
    body('client.name')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Client name cannot exceed 100 characters'),
    
    body('client.email')
        .optional()
        .isEmail()
        .withMessage('Invalid client email')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const projectData = {
        ...req.body,
        teamMembers: req.body.teamMembers || [{
            name: req.user.name,
            role: 'Project Manager',
            userId: req.user.userId
        }]
    };

    const project = new Project(projectData);
    await project.save();

    logger.userAction(req.user.userId, 'created_project', { projectId: project._id, title: project.title });

    res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project
    });
}));
console.log('POST /api/projects route defined.');

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private (Admin/Manager)
router.put('/:id', auth, authorize(['admin', 'manager']), [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Title must be between 5 and 200 characters'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ min: 50, max: 2000 })
        .withMessage('Description must be between 50 and 2000 characters'),
    
    body('category')
        .optional()
        .isIn(['fullstack', 'devsecops', 'cloud', 'security', 'saas', 'design', 'blockchain', 'ai-ml'])
        .withMessage('Invalid category'),
    
    body('status')
        .optional()
        .isIn(['planning', 'in-progress', 'completed', 'on-hold'])
        .withMessage('Invalid status')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const project = await Project.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found'
        });
    }

    logger.userAction(req.user.userId, 'updated_project', { projectId: project._id, title: project.title });

    res.json({
        success: true,
        message: 'Project updated successfully',
        data: project
    });
}));
console.log('PUT /api/projects/:id route defined.');

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private (Admin only)
router.delete('/:id', auth, authorize(['admin']), catchAsync(async (req, res) => {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found'
        });
    }

    logger.userAction(req.user.userId, 'deleted_project', { projectId: project._id, title: project.title });

    res.json({
        success: true,
        message: 'Project deleted successfully'
    });
}));
console.log('DELETE /api/projects/:id route defined.');

// @route   PUT /api/projects/:id/status
// @desc    Update project status
// @access  Private (Admin/Manager/Employee - if team member)
router.put('/:id/status', auth, [
    body('status')
        .isIn(['planning', 'in-progress', 'completed', 'on-hold'])
        .withMessage('Invalid status'),
    
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found'
        });
    }

    // Check permissions
    const isTeamMember = project.teamMembers.some(member => member.userId?.toString() === req.user.userId);
    const hasPermission = ['admin', 'manager'].includes(req.user.role) || isTeamMember;

    if (!hasPermission) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
        });
    }

    project.status = req.body.status;
    if (req.body.status === 'completed') {
        project.endDate = new Date();
    }

    await project.save();

    logger.userAction(req.user.userId, 'updated_project_status', {
        projectId: project._id,
        oldStatus: project.status,
        newStatus: req.body.status
    });

    res.json({
        success: true,
        message: 'Project status updated successfully',
        data: project
    });
}));
console.log('PUT /api/projects/:id/status route defined.');

// @route   PUT /api/projects/:id/team
// @desc    Update project team members
// @access  Private (Admin/Manager)
router.put('/:id/team', auth, authorize(['admin', 'manager']), [
    body('teamMembers')
        .isArray({ min: 1 })
        .withMessage('At least one team member is required'),
    
    body('teamMembers.*.name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Team member name must be between 2 and 50 characters'),
    
    body('teamMembers.*.role')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Team member role must be between 2 and 50 characters')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const project = await Project.findByIdAndUpdate(
        req.params.id,
        { teamMembers: req.body.teamMembers },
        { new: true, runValidators: true }
    );

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found'
        });
    }

    logger.userAction(req.user.userId, 'updated_project_team', { projectId: project._id });

    res.json({
        success: true,
        message: 'Project team updated successfully',
        data: project
    });
}));
console.log('PUT /api/projects/:id/team route defined.');

// @route   GET /api/projects/stats/overview
// @desc    Get project statistics
// @access  Private (Admin/Manager)
router.get('/stats/overview', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const totalProjects = await Project.countDocuments();
    const activeProjects = await Project.countDocuments({ status: 'in-progress' });
    const completedProjects = await Project.countDocuments({ status: 'completed' }); // Corrected typo here
    const planningProjects = await Project.countDocuments({ status: 'planning' });
    const onHoldProjects = await Project.countDocuments({ status: 'on-hold' });

    // Projects by category
    const categoryStats = await Project.aggregate([
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
            }
        },
        { $sort: { count: -1 } }
    ]);

    // Recent projects
    const recentProjects = await Project.find()
        .select('title status category createdAt')
        .sort({ createdAt: -1 })
        .limit(5);

    res.json({
        success: true,
        data: {
            totalProjects,
            activeProjects,
            completedProjects,
            planningProjects,
            onHoldProjects,
            categoryStats,
            recentProjects
        }
    });
}));
console.log('GET /api/projects/stats/overview route defined.');

module.exports = router;
console.log('--- End of routes/projects.js execution ---');
