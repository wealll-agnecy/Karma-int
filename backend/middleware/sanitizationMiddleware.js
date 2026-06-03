const { clean } = require('xss-clean/lib/xss');
const mongoSanitize = require('express-mongo-sanitize');
const qs = require('qs');

/**
 * Express 5 strictly enforces req.query as a getter.
 * To safely sanitize the query without crashing, we inject our sanitization 
 * directly into the application's query parser.
 */
const queryParserSanitizer = (str) => {
    // 1. Parse using standard qs
    let parsed = qs.parse(str);
    
    if (parsed && typeof parsed === 'object') {
        // 2. Sanitize XSS
        parsed = clean(parsed);
        // 3. Sanitize NoSQL injection
        parsed = mongoSanitize.sanitize(parsed, { replaceWith: '_' });
    }
    
    return parsed;
};

/**
 * Standard middleware for body and params
 */
const bodyAndParamSanitizer = (req, res, next) => {
    if (req.body) {
        req.body = clean(req.body);
        req.body = mongoSanitize.sanitize(req.body, { replaceWith: '_' });
    }

    if (req.params) {
        req.params = clean(req.params);
        req.params = mongoSanitize.sanitize(req.params, { replaceWith: '_' });
    }

    next();
};

module.exports = {
    queryParserSanitizer,
    bodyAndParamSanitizer
};
