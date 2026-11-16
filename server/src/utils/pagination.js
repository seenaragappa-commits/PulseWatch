const { AppError } = require('./errors');
function pagination(query) { const page = Number(query.page || 1), limit = Number(query.limit || 20); if (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1 || limit > 100) throw new AppError(400, 'page must be >= 1 and limit must be 1–100'); return { page, limit, offset: (page - 1) * limit }; }
function pageResult(rows, total, p) { return { data: rows, pagination: { page: p.page, limit: p.limit, total, pages: Math.ceil(total / p.limit) } }; }
module.exports = { pagination, pageResult };
