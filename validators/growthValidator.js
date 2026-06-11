var { z } = require('zod')

exports.createMeasurementSchema = z.object({
    childId:             z.coerce.number().int().positive().optional(),
    measuredAt:          z.coerce.date(),
    weightKg:            z.coerce.number().positive().optional(),
    heightCm:            z.coerce.number().positive().optional(),
    headCircumferenceCm: z.coerce.number().positive().optional(),
    notes:               z.string().max(1000).optional(),
})
