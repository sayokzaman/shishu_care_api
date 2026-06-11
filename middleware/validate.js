function validate(schema) {
    return function (req, res, next) {
        var result = schema.safeParse(req.body)
        if (!result.success) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: result.error.issues.map(function (e) {
                    return { field: e.path.join('.'), message: e.message }
                })
            })
        }
        req.body = result.data
        next()
    }
}

module.exports = validate
