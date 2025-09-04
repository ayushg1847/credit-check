const { User, CreditApplication, CustomerProfile } = require('../models');

// This service contains the core credit scoring and risk assessment logic.
// It is called by the API controllers to process application data.

// @desc    Calculates a credit score based on weighted factors and assesses risk.
// @access  Internal
exports.calculateCreditScore = async (applicationData, customerId) => {
    let score = 0;
    const recommendations = [];

    // Retrieve customer profile for existing data (e.g., historical behavior)
    const customerProfile = await CustomerProfile.findOne({ userId: customerId });

    // Define weighting for each factor as per the development plan
    const weights = {
        income: 0.25,
        debtToIncome: 0.20,
        paymentHistory: 0.20,
        creditUtilization: 0.15,
        creditHistoryLength: 0.10,
        creditTypes: 0.05,
        newInquiries: 0.05
    };

    // --- 1. Income (25%) ---
    const annualIncome = applicationData.financials?.annualIncome || 0;
    const incomeScore = annualIncome > 80000 ? 100 : Math.min(100, (annualIncome / 80000) * 100);
    score += incomeScore * weights.income;
    if (annualIncome < 50000) {
        recommendations.push('Consider ways to increase your verifiable annual income.');
    }

    // --- 2. Debt-to-Income Ratio (20%) ---
    const totalMonthlyDebt = applicationData.financials?.totalMonthlyDebt || 0;
    const monthlyIncome = annualIncome / 12;
    const dtiRatio = monthlyIncome > 0 ? (totalMonthlyDebt / monthlyIncome) : 1;
    const dtiScore = dtiRatio < 0.36 ? 100 : (1 - dtiRatio) * 100;
    score += Math.max(0, dtiScore * weights.debtToIncome);
    if (dtiRatio > 0.4) {
        recommendations.push('Reduce existing debt to improve your Debt-to-Income ratio.');
    }

    // --- 3. Payment History (20%) - Placeholder/Simulation ---
    // In a real-world scenario, this would be retrieved from a credit bureau API.
    const latePayments = applicationData.creditHistory?.latePayments || 0;
    const paymentHistoryScore = latePayments === 0 ? 100 : Math.max(0, 100 - (latePayments * 20));
    score += paymentHistoryScore * weights.paymentHistory;
    if (latePayments > 0) {
        recommendations.push('Make all future payments on time to improve your credit history.');
    }

    // --- 4. Credit Utilization (15%) - Placeholder/Simulation ---
    const totalCreditLimit = applicationData.creditHistory?.totalCreditLimit || 1;
    const utilizedCredit = applicationData.creditHistory?.utilizedCredit || 0;
    const utilizationRate = utilizedCredit / totalCreditLimit;
    const utilizationScore = utilizationRate < 0.3 ? 100 : Math.max(0, 100 - (utilizationRate * 100));
    score += utilizationScore * weights.creditUtilization;
    if (utilizationRate > 0.3) {
        recommendations.push('Pay down existing credit card balances to lower your utilization rate.');
    }

    // --- 5. Length of Credit History (10%) - Placeholder/Simulation ---
    const creditHistoryYears = applicationData.creditHistory?.years || 1;
    const historyScore = Math.min(100, (creditHistoryYears / 10) * 100);
    score += historyScore * weights.creditHistoryLength;
    if (creditHistoryYears < 5) {
        recommendations.push('Building a longer credit history over time will improve your score.');
    }

    // --- 6. Types of Credit (5%) - Placeholder/Simulation ---
    const creditTypesScore = applicationData.creditHistory?.hasDiverseCredit ? 100 : 50;
    score += creditTypesScore * weights.creditTypes;
    if (!applicationData.creditHistory?.hasDiverseCredit) {
        recommendations.push('Consider diversifying your credit accounts, such as a mix of installment and revolving credit.');
    }

    // --- 7. New Credit Inquiries (5%) - Placeholder/Simulation ---
    const newInquiries = applicationData.creditHistory?.inquiriesLast6Months || 0;
    const inquiriesScore = newInquiries < 2 ? 100 : Math.max(0, 100 - (newInquiries * 10));
    score += inquiriesScore * weights.newInquiries;
    if (newInquiries > 2) {
        recommendations.push('Limit new credit applications to avoid a negative impact from hard inquiries.');
    }

    // Final calculated score (rounded and capped)
    const calculatedScore = Math.round(Math.min(100, score));

    // Determine risk level based on score
    let riskAssessment = 'high';
    if (calculatedScore >= 70) {
        riskAssessment = 'low';
    } else if (calculatedScore >= 50) {
        riskAssessment = 'medium';
    }

    // Placeholder for loan recommendations based on risk
    const loanSuggestions = [];
    if (riskAssessment === 'low') {
        loanSuggestions.push({ type: 'Personal Loan', rate: '5-7%', amount: '$10,000-$50,000' });
        loanSuggestions.push({ type: 'Mortgage Loan', rate: '3-4%', amount: '$200,000-$1,000,000' });
    } else if (riskAssessment === 'medium') {
        loanSuggestions.push({ type: 'Personal Loan', rate: '8-12%', amount: '$5,000-$20,000' });
    } else {
        loanSuggestions.push({ type: 'Secured Loan', rate: '15-20%', amount: '$1,000-$5,000' });
    }

    return {
        calculatedScore,
        riskAssessment,
        recommendations: {
            improvementTips: recommendations,
            loanSuggestions
        }
    };
};
