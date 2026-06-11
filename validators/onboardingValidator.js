var { z } = require('zod')

// Shared: a single health condition from a chip or free-text input
var conditionItem = z.object({
    name: z.string().min(1, 'Condition name is required'),
    description: z.string().optional()
})

// Screen: Onboarding - Prenatal
// Fields: EDD, Pregnancy Duration slider, Mother's Weight,
//         Mother's Health Conditions (chips), Baby Nickname, Gender
exports.prenatalSchema = z.object({
    expectedDeliveryDate: z.coerce.date({ required_error: 'Expected delivery date is required' }),
    // Slider shows current pregnancy stage in weeks (1–45)
    pregnancyDuration: z.coerce.number().int().min(1).max(45).optional(),
    weight: z.coerce.number().positive('Weight must be a positive number').optional(),
    // Mother's health conditions → stored in parent_health_conditions table
    healthConditions: z.array(conditionItem).optional(),
    babyNickname: z.string().min(1, 'Baby nickname is required'),
    gender: z.enum(['male', 'female', 'unknown'])
})

// Screen: Onboarding - Postnatal
// Fields: Child Name, DOB, Sex, Current Weight, Current Height, Birth Weight,
//         Known Conditions (chips), Guardian Name, District, Upazila
exports.postnatalSchema = z.object({
    fullNameBn: z.string().min(1, "Child's name is required"),
    fullNameEn: z.string().optional(),
    dateOfBirth: z.coerce.date({ required_error: 'Date of birth is required' })
        .refine(d => d <= new Date(), { message: 'Date of birth cannot be in the future' }),
    gender: z.enum(['male', 'female', 'unknown']),
    currentWeightKg: z.coerce.number().positive().max(30, 'Weight must be ≤ 30 kg'),
    currentHeightCm: z.coerce.number().positive().max(200, 'Height must be ≤ 200 cm'),
    // Birth weight stored as a day-0 growth measurement (height not collected in onboarding UI)
    birthWeightKg: z.coerce.number().positive().max(10, 'Birth weight must be ≤ 10 kg').optional(),
    // Child's known conditions → each becomes an IllnessRecord
    knownConditions: z.array(conditionItem).optional(),
    // Guardian name → optionally updates users.full_name_bn
    guardianName: z.string().optional(),
    // Child location — falls back to parent's location if omitted
    districtId: z.coerce.number().int().positive().optional(),
    upazillaId: z.coerce.number().int().positive().optional()
})
