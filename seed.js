const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const { User, CustomerProfile, CreditApplication } = require('./models');

// Load environment variables from .env file
require('dotenv').config();

const seedDatabase = async () => {
    try {
        // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected successfully for seeding.');

        const usersToSeed = {};
        const applicationsToSeed = [];

        // Read the CSV file and parse data
        fs.createReadStream(path.join(__dirname, 'bank_admin_report_50.csv'))
            .pipe(csv({ headers: true }))
            .on('data', (row) => {
                const { Customer_ID, Applicant_Name, Credit_Score, Loan_Type } = row;

                // Only process rows with a valid Customer_ID
                if (Customer_ID) {
                    // Create or update the user object
                    if (!usersToSeed[Customer_ID]) {
                        usersToSeed[Customer_ID] = {
                            firstName: Applicant_Name ? Applicant_Name.split(' ')[0] : 'Unknown',
                            lastName: Applicant_Name ? Applicant_Name.split(' ')[1] : 'User',
                            email: `${Customer_ID}@example.com`,
                            password: 'password123', // Will be hashed by the UserSchema pre-save hook
                            role: 'customer'
                        };
                    }

                    // Create an application object
                    applicationsToSeed.push({
                        customerId: Customer_ID,
                        calculatedScore: parseInt(Credit_Score, 10),
                        riskAssessment: 'unknown',
                        loanType: Loan_Type,
                        status: 'completed',
                        applicationData: {
                            loanType: Loan_Type
                        }
                    });
                }
            })
            .on('end', async () => {
                console.log('CSV file successfully processed. Starting database insertion...');
                
                // Drop existing collections to ensure a clean state
                await User.deleteMany({});
                await CustomerProfile.deleteMany({});
                await CreditApplication.deleteMany({});
                console.log('Existing collections cleared.');

                const createdUsers = {};
                
                // Insert users and create corresponding profiles
                for (const customerId in usersToSeed) {
                    const userData = usersToSeed[customerId];
                    try {
                        const user = new User({
                            email: userData.email,
                            password: userData.password,
                            firstName: userData.firstName,
                            lastName: userData.lastName,
                            role: userData.role,
                            isEmailVerified: true
                        });
                        await user.save();
                        await CustomerProfile.create({ userId: user._id, creditScore: userData.creditScore });
                        createdUsers[customerId] = user;
                        console.log(`User created: ${user.email}`);

                    } catch (error) {
                        console.error(`Error creating user ${userData.email}:`, error.message);
                    }
                }
                
                // Insert applications, linking them to the correct user
                for (const appData of applicationsToSeed) {
                    const user = createdUsers[appData.customerId];
                    if (user) {
                        const newApp = await CreditApplication.create({
                            customerId: user._id,
                            applicationData: appData.applicationData,
                            calculatedScore: appData.calculatedScore,
                            status: appData.status
                        });
                        // Update the risk assessment based on the score
                        const risk = newApp.calculatedScore > 720 ? 'low' : newApp.calculatedScore > 650 ? 'medium' : 'high';
                        await CreditApplication.findByIdAndUpdate(newApp._id, { riskAssessment: risk });
                    }
                }

                console.log('Database seeding complete!');
                mongoose.disconnect();

            });

    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

seedDatabase();
