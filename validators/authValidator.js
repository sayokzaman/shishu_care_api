var { z } = require('zod')

// BD phone: 01X-XXXXXXXX, normalised to bare 11-digit form (strips +880/880 prefix)
var bdPhone = z
    .string()
    .regex(/^(\+?880)?01[3-9]\d{8}$/, 'Must be a valid Bangladesh phone number (e.g. 01712345678)')
    .transform((val) => val.replace(/^\+?880/, ''))

var locationFields = {
    upazillaId: z.coerce.number({ invalid_type_error: 'upazillaId must be a number' }).int().positive(),
    districtId: z.coerce.number({ invalid_type_error: 'districtId must be a number' }).int().positive(),
    divisionId: z.coerce.number({ invalid_type_error: 'divisionId must be a number' }).int().positive()
}

exports.registerSchema = z.object({
    phone: bdPhone,
    fullNameBn: z.string().min(1, 'Name in Bengali is required'),
    fullNameEn: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['parent', 'health_worker'], { error: 'role must be one of: parent, health_worker' }),
    ...locationFields,
    dateOfBirth: z.coerce.date().optional()
})

exports.loginSchema = z.object({
    phone: bdPhone,
    password: z.string().min(1, 'password is required')
})
