const { User, CustomerProfile, CreditApplication } = require('../models');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: `No user with id of ${req.params.id}` });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a new user (customer or admin)
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, role } = req.body;

        const user = await User.create({
            firstName,
            lastName,
            email,
            password,
            role: role || 'customer' // Default to customer if not specified
        });

        // Create an empty customer profile for new customers
        if (user.role === 'customer') {
            await CustomerProfile.create({ userId: user._id });
        }

        // Return the user without the password
        const newUser = user.toObject();
        delete newUser.password;

        res.status(201).json({ success: true, data: newUser });
    } catch (error) {
        // Handle specific errors like duplicate email
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
    try {
        const { password, ...updateData } = req.body; // Prevent direct password updates

        const user = await User.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        }).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: `No user with id of ${req.params.id}` });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: `No user with id of ${req.params.id}` });
        }

        await user.deleteOne();
        await CustomerProfile.deleteOne({ userId: req.params.id });
        await CreditApplication.deleteMany({ customerId: req.params.id });

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all pending applications
// @route   GET /api/admin/applications
// @access  Private/Admin
exports.getPendingApplications = async (req, res, next) => {
    try {
        const applications = await CreditApplication.find({ status: 'pending' }).populate('customerId', 'firstName lastName email');
        res.status(200).json({ success: true, count: applications.length, data: applications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get a single application
// @route   GET /api/admin/applications/:id
// @access  Private/Admin
exports.getSingleApplication = async (req, res, next) => {
    try {
        const application = await CreditApplication.findById(req.params.id).populate('customerId', 'firstName lastName email');
        if (!application) {
            return res.status(404).json({ success: false, message: `No application with id of ${req.params.id}` });
        }
        res.status(200).json({ success: true, data: application });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Review a loan application
// @route   PUT /api/admin/applications/:id/review
// @access  Private/Admin
exports.reviewApplication = async (req, res, next) => {
    try {
        const { status, adminComments } = req.body;
        const application = await CreditApplication.findByIdAndUpdate(
            req.params.id,
            { status, adminComments, reviewedBy: req.user.id, updatedAt: Date.now() },
            { new: true, runValidators: true }
        ).populate('reviewedBy', 'firstName lastName');

        if (!application) {
            return res.status(404).json({ success: false, message: `No application with id of ${req.params.id}` });
        }

        res.status(200).json({ success: true, data: application });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a document's verification status
// @route   PUT /api/admin/documents/:appId/verify
// @access  Private/Admin
exports.updateDocumentStatus = async (req, res, next) => {
    try {
        const { documentId, isVerified } = req.body;
        const application = await CreditApplication.findById(req.params.appId);

        if (!application) {
            return res.status(404).json({ success: false, message: `No application with id of ${req.params.appId}` });
        }

        const document = application.documents.id(documentId);
        if (!document) {
            return res.status(404).json({ success: false, message: `No document with id of ${documentId}` });
        }

        document.isVerified = isVerified;
        document.verifiedBy = req.user.id;
        document.verifiedAt = Date.now();

        await application.save();

        res.status(200).json({ success: true, data: document });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
