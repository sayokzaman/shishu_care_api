var { z } = require('zod')

exports.createSessionSchema = z.object({
    childId:         z.coerce.number().int().positive().optional(),
    startedAt:       z.coerce.date(),
    durationMinutes: z.coerce.number().int().positive().optional(),
    type:            z.enum(['tummy_time', 'play', 'bath', 'outdoor', 'reading', 'massage', 'music', 'other']),
    notes:           z.string().max(1000).optional(),
})
