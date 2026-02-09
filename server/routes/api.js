const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

// --- PROJECTS ---

// @route   GET /api/projects
// @desc    Get all projects for user (owned + member)
// @access  Private
router.get('/projects', auth, async (req, res) => {
    try {
        const projects = await Project.find({
            $or: [{ owner: req.user.id }, { members: req.user.id }]
        }).populate('owner', 'username').populate('members', 'username');
        res.json(projects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/projects
// @desc    Create a project
// @access  Private
router.post('/projects', auth, async (req, res) => {
    const { title, description } = req.body;
    console.log('Creating project:', req.body); // DEBUG

    // Validation
    if (!title) return res.status(400).json({ msg: 'Title is required' });

    try {
        const newProject = new Project({
            title,
            description,
            owner: req.user.id,
            members: [req.user.id] // Owner is also a member
        });
        const project = await newProject.save();
        console.log('Project created:', project); // DEBUG
        res.json(project);
    } catch (err) {
        console.error('Error creating project:', err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// @route   POST /api/projects/:id/members
// @desc    Add member to project (by email)
// @access  Private
router.post('/projects/:id/members', auth, async (req, res) => {
    const { email } = req.body;
    console.log('Adding member:', email, 'to project:', req.params.id); // DEBUG
    if (!email) return res.status(400).json({ msg: 'Email is required' });

    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ msg: 'Project not found' });

        // Check ownership
        if (project.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        const userToAdd = await User.findOne({ email });
        if (!userToAdd) return res.status(404).json({ msg: 'User not found: ' + email });

        if (project.members.includes(userToAdd.id)) {
            return res.status(400).json({ msg: 'User already in project' });
        }

        project.members.push(userToAdd.id);
        await project.save();

        // Return full member info
        const updatedProject = await Project.findById(req.params.id)
            .populate('owner', 'username')
            .populate('members', 'username');

        res.json(updatedProject);
    } catch (err) {
        console.error('Error adding member:', err.message);
        res.status(500).send('Server Error');
    }
});


// --- TASKS ---

// @route   GET /api/projects/:projectId/tasks
// @desc    Get tasks for a project
// @access  Private
router.get('/projects/:projectId/tasks', auth, async (req, res) => {
    try {
        const tasks = await Task.find({ project: req.params.projectId })
            .populate('assignedTo', 'username')
            .populate('comments.user', 'username');
        res.json(tasks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/projects/:projectId/tasks
// @desc    Create a task
// @access  Private
router.post('/projects/:projectId/tasks', auth, async (req, res) => {
    const { title, description, assignedTo, status } = req.body;

    if (!title) return res.status(400).json({ msg: 'Title is required' });

    try {
        const newTask = new Task({
            title,
            description,
            project: req.params.projectId,
            status: status || 'To Do',
            assignedTo: assignedTo || null
        });
        const task = await newTask.save();

        if (req.io) {
            req.io.to(req.params.projectId).emit('task_update', { type: 'CREATE', task });
        }

        res.json(task);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/tasks/:id
// @desc    Update task (status, assign, etc)
// @access  Private
router.put('/tasks/:id', auth, async (req, res) => {
    const { title, description, status, assignedTo } = req.body;

    const taskFields = {};
    if (title) taskFields.title = title;
    if (description) taskFields.description = description;
    if (status) taskFields.status = status;
    // Allow unassigning
    if (assignedTo !== undefined) taskFields.assignedTo = assignedTo || null;

    try {
        let task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ msg: 'Task not found' });

        task = await Task.findByIdAndUpdate(req.params.id, { $set: taskFields }, { new: true })
            .populate('assignedTo', 'username')
            .populate('comments.user', 'username');

        if (req.io) {
            req.io.to(task.project.toString()).emit('task_update', { type: 'UPDATE', task });
        }

        res.json(task);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/tasks/:id/comments
// @desc    Add comment
// @access  Private
router.post('/tasks/:id/comments', auth, async (req, res) => {
    // Validation
    if (!req.body.text) return res.status(400).json({ msg: 'Comment text is required' });

    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ msg: 'Task not found' });

        const newComment = {
            text: req.body.text,
            user: req.user.id
        };

        task.comments.unshift(newComment);
        await task.save();

        // Re-fetch to populate user
        const updatedTask = await Task.findById(req.params.id)
            .populate('assignedTo', 'username')
            .populate('comments.user', 'username');

        if (req.io) {
            req.io.to(task.project.toString()).emit('task_update', { type: 'COMMENT', task: updatedTask });
        }

        res.json(updatedTask.comments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project and its tasks
// @access  Private
router.delete('/projects/:id', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ msg: 'Project not found' });

        // Check ownership
        if (project.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Delete all tasks associated with project
        await Task.deleteMany({ project: req.params.id });

        // Delete project
        await Project.findByIdAndDelete(req.params.id); // atomic

        res.json({ msg: 'Project removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private
router.delete('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ msg: 'Task not found' });

        // Verify user is member of project (or owner of project, or assigned, or creator?)
        // Simplest: Check if user is member of the project this task belongs to.
        const project = await Project.findById(task.project);

        const isMember = project.members.some(memberId => memberId.toString() === req.user.id);
        const isOwner = project.owner.toString() === req.user.id;

        if (!isMember && !isOwner) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await Task.findByIdAndDelete(req.params.id);

        if (req.io) {
            req.io.to(task.project.toString()).emit('task_update', { type: 'DELETE', taskId: req.params.id, task: task });
        }

        res.json({ msg: 'Task removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
