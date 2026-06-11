var { z } = require('zod')

exports.createSessionSchema = z.object({
    childId:    z.coerce.number().int().positive().optional(),
    startedAt:  z.coerce.date(),
    endedAt:    z.coerce.date().optional(),
    type:       z.enum(['nap', 'night', 'rest']),
    quality:    z.enum(['good', 'fair', 'poor']).optional(),
    location:   z.string().max(100).optional(),
    notes:      z.string().max(1000).optional(),
})
