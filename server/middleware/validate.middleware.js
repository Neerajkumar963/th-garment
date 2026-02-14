const { errorResponse } = require('../utils/errorResponse');

// Regex Patterns
const REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_IN: /^[6-9]\d{9}$/, // Indian Mobile (10 digits starting 6-9)
    GST: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    DATE_YMD: /^\d{4}-\d{2}-\d{2}$/
};

// Validators
const validateEmail = (email) => REGEX.EMAIL.test(email);
const validatePhone = (phone) => REGEX.PHONE_IN.test(phone);
const validateGST = (gst) => REGEX.GST.test(gst);
const validateDate = (date) => REGEX.DATE_YMD.test(date) && !isNaN(Date.parse(date));

const validateNumber = (value, min = 0, max = Infinity) => {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
};

// Middleware Generator
const requireFields = (fields) => {
    return (req, res, next) => {
        const missing = [];
        fields.forEach(field => {
            if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
                missing.push(field);
            }
        });

        if (missing.length > 0) {
            return errorResponse(res, 'VALIDATION_ERROR', `Missing required fields: ${missing.join(', ')}`, missing.join(', '));
        }
        next();
    };
};

module.exports = {
    validateEmail,
    validatePhone,
    validateGST,
    validateDate,
    validateNumber,
    requireFields,
    // Exports helper for custom validation inside controllers if needed
    REGEX 
};
