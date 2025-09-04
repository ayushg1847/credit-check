const express = require('express');
const {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    createUser, // <-- Add this import
    getPendingApplications,
    getSingleApplication,
    reviewApplication,
    updateDocumentStatus
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply the middleware to all routes in this router
router.use(protect);
router.use(authorize('admin'));

// User Management APIs
router.post('/users', createUser); // <-- Add this POST route
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Document Verification Panel
router.put('/documents/:appId/verify', updateDocumentStatus);

// Loan Application APIs
router.get('/applications', getPendingApplications);
router.get('/applications/:id', getSingleApplication);
router.put('/applications/:id/review', reviewApplication);

module.exports = router;
