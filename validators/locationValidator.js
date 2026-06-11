var { z } = require('zod')

var divisionBody = z.object({
    nameEn: z.string().min(1, 'nameEn is required'),
    nameBn: z.string().min(1, 'nameBn is required')
})

var districtBody = z.object({
    nameEn: z.string().min(1, 'nameEn is required'),
    nameBn: z.string().min(1, 'nameBn is required'),
    divisionId: z.coerce.number({ invalid_type_error: 'divisionId must be a number' }).int().positive()
})

var upazillaBody = z.object({
    nameEn: z.string().min(1, 'nameEn is required'),
    nameBn: z.string().min(1, 'nameBn is required'),
    districtId: z.coerce.number({ invalid_type_error: 'districtId must be a number' }).int().positive(),
    isUrban: z.boolean().optional().default(false)
})

exports.createDivisionSchema = divisionBody
exports.updateDivisionSchema = divisionBody.partial()

exports.createDistrictSchema = districtBody
exports.updateDistrictSchema = districtBody.partial()

exports.createUpazillaSchema = upazillaBody
exports.updateUpazillaSchema = upazillaBody.partial()
