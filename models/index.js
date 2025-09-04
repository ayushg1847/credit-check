const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Moved import to the top
const jwt = require('jsonwebtoken'); // Moved import to the top

// User Schema
const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    },
    firstName: String,
    lastName: String,
    phone: String,
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.getSignedJwtToken = function() {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Customer Profile Schema
const CustomerProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    dateOfBirth: Date,
    address: String,
    employmentStatus: String,
    annualIncome: Number,
    employerName: String,
    workExperience: Number,
    creditScore: {
        type: Number,
        default: 0
    },
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'unknown'],
        default: 'unknown'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Document Schema
const DocumentSchema = new mongoose.Schema({
    fileName: String,
    filePath: String,
    isVerified: {
        type: Boolean,
        default: false
    },
    verifiedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    verifiedAt: Date,
    uploadDate: {
        type: Date,
        default: Date.now
    }
});

// Credit Application Schema
const CreditApplicationSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    applicationData: Object,
    calculatedScore: Number,
    riskAssessment: {
        type: String,
        enum: ['low', 'medium', 'high', 'unknown'],
        default: 'unknown'
    },
    recommendations: Object,
    status: {
        type: String,
        enum: ['pending', 'completed', 'rejected', 'in-review'],
        default: 'pending'
    },
    reviewedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    adminComments: String,
    documents: [DocumentSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', UserSchema);
const CustomerProfile = mongoose.model('CustomerProfile', CustomerProfileSchema);
const CreditApplication = mongoose.model('CreditApplication', CreditApplicationSchema);

module.exports = { User, CustomerProfile, CreditApplication };
