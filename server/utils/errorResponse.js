// Standardized Error Response Helper
exports.errorResponse = (res, code, message, field = null, status = 400) => {
    return res.status(status).json({
        success: false,
        error: {
            code,
            message,
            field
        }
    });
};
