const express = require('express');
const { body, validationResult } = require('express-validator');
const { TeamMember } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/team
// @desc    Get all active team members
// @access  Public
router.get('/', catchAsync(async (req, res) => {
    const teamMembers = await TeamMember.find({ isActive: true })
        .select('-__v')
        .sort({ order: 1, createdAt: 1 });

    res.json({
        success: true,
        data: teamMembers
    });
}));

// @route   GET /api/team/:id
// @desc    Get single team member
// @access  Public
router.get('/:id', catchAsync(async (req, res) => {
    const teamMember = await TeamMember.findOne({ 
        _id: req.params.id,
        isActive: true 
    }).select('-__v');

    if (!teamMember) {
        return res.status(404).json({
            success: false,
            message: 'Team member not found'
        });
    }

    res.json({
        success: true,
        data: teamMember
    });
}));

// Admin routes

// @route   GET /api/team/admin/all
// @desc    Get all team members for admin
// @access  Private (Admin/Manager)
router.get('/admin/all', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const teamMembers = await TeamMember.find()
        .sort({ order: 1, createdAt: 1 });

    res.json({
        success: true,
        data: teamMembers
    });
}));

// @route   POST /api/team
// @desc    Add new team member
// @access  Private (Admin)
router.post('/', auth, authorize(['admin']), [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    
    body('role')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Role must be between 2 and 100 characters'),
    
    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),
    
    body('skills')
        .optional()
        .isArray()
        .withMessage('Skills must be an array'),
    
    body('experience.years')
        .optional()
        .isNumeric({ min: 0, max: 50 })
        .withMessage('Experience years must be between 0 and 50'),
    
    body('social.linkedin')
        .optional()
        .isURL()
        .withMessage('LinkedIn URL must be valid'),
    
    body('social.github')
        .optional()
        .isURL()
        .withMessage('GitHub URL must be valid'),
    
    body('social.twitter')
        .optional()
        .isURL()
        .withMessage('Twitter URL must be valid'),
    
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

    const teamMember = new TeamMember(req.body);
    await teamMember.save();

    logger.userAction(req.user.userId, 'added_team_member', { 
        teamMemberId: teamMember._id, 
        name: teamMember.name 
    });

    res.status(201).json({
        success: true,
        message: 'Team member added successfully',
        data: teamMember
    });
}));

// @route   PUT /api/team/:id
// @desc    Update team member
// @access  Private (Admin)
router.put('/:id', auth, authorize(['admin']), [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    
    body('role')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Role must be between 2 and 100 characters'),
    
    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),
    
    body('skills')
        .optional()
        .isArray()
        .withMessage('Skills must be an array'),
    
    body('experience.years')
        .optional()
        .isNumeric({ min: 0, max: 50 })
        .withMessage('Experience years must be between 0 and 50'),
    
    body('social.linkedin')
        .optional()
        .isURL()
        .withMessage('LinkedIn URL must be valid'),
    
    body('social.github')
        .optional()
        .isURL()
        .withMessage('GitHub URL must be valid'),
    
    body('social.twitter')
        .optional()
        .isURL()
        .withMessage('Twitter URL must be valid'),
    
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

    const teamMember = await TeamMember.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!teamMember) {
        return res.status(404).json({
            success: false,
            message: 'Team member not found'
        });
    }

    logger.userAction(req.user.userId, 'updated_team_member', { 
        teamMemberId: teamMember._id, 
        name: teamMember.name 
    });

    res.json({
        success: true,
        message: 'Team member updated successfully',
        data: teamMember
    });
}));

// @route   DELETE /api/team/:id
// @desc    Delete team member
// @access  Private (Admin only)
router.delete('/:id', auth, authorize(['admin']), catchAsync(async (req, res) => {
    const teamMember = await TeamMember.findByIdAndDelete(req.params.id);

    if (!teamMember) {
        return res.status(404).json({
            success: false,
            message: 'Team member not found'
        });
    }

    logger.userAction(req.user.userId, 'deleted_team_member', { 
        teamMemberId: teamMember._id, 
        name: teamMember.name 
    });

    res.json({
        success: true,
        message: 'Team member deleted successfully'
    });
}));

// @route   PUT /api/team/:id/toggle
// @desc    Toggle team member active status
// @access  Private (Admin)
router.put('/:id/toggle', auth, authorize(['admin']), catchAsync(async (req, res) => {
    const teamMember = await TeamMember.findById(req.params.id);

    if (!teamMember) {
        return res.status(404).json({
            success: false,
            message: 'Team member not found'
        });
    }

    teamMember.isActive = !teamMember.isActive;
    await teamMember.save();

    logger.userAction(req.user.userId, 'toggled_team_member_status', { 
        teamMemberId: teamMember._id, 
        name: teamMember.name,
        newStatus: teamMember.isActive 
    });

    res.json({
        success: true,
        message: `Team member ${teamMember.isActive ? 'activated' : 'deactivated'} successfully`,
        data: teamMember
    });
}));

// @route   PUT /api/team/reorder
// @desc    Reorder team members
// @access  Private (Admin)
router.put('/reorder', auth, authorize(['admin']), [
    body('teamMembers')
        .isArray({ min: 1 })
        .withMessage('Team members array is required'),
    
    body('teamMembers.*.id')
        .isMongoId()
        .withMessage('Invalid team member ID'),
    
    body('teamMembers.*.order')
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

    const { teamMembers } = req.body;

    // Update each team member's order
    const updatePromises = teamMembers.map(({ id, order }) =>
        TeamMember.findByIdAndUpdate(id, { order }, { new: true })
    );

    await Promise.all(updatePromises);

    logger.userAction(req.user.userId, 'reordered_team_members', { 
        memberCount: teamMembers.length 
    });

    res.json({
        success: true,
        message: 'Team members reordered successfully'
    });
}));

// @route   GET /api/team/stats/overview
// @desc    Get team statistics
// @access  Private (Admin/Manager)
router.get('/stats/overview', auth, authorize(['admin', 'manager']), catchAsync(async (req, res) => {
    const totalMembers = await TeamMember.countDocuments();
    const activeMembers = await TeamMember.countDocuments({ isActive: true });
    const inactiveMembers = await TeamMember.countDocuments({ isActive: false });

    // Get role distribution
    const roleStats = await TeamMember.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);

    // Get experience distribution
    const experienceStats = await TeamMember.aggregate([
        { $match: { isActive: true, 'experience.years': { $exists: true } } },
        {
            $bucket: {
                groupBy: '$experience.years',
                boundaries: [0, 2, 5, 10, 20, 50],
                default: 'Unknown',
                output: {
                    count: { $sum: 1 }
                }
            }
        }
    ]);

    // Get skills distribution (top 10)
    const skillsStats = await TeamMember.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$skills' },
        {
            $group: {
                _id: '$skills',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    res.json({
        success: true,
        data: {
            totalMembers,
            activeMembers,
            inactiveMembers,
            roleStats,
            experienceStats,
            skillsStats
        }
    });
}));

module.exports = router;