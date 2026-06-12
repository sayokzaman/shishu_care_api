var { z } = require('zod')

var feedingItemSchema = z.object({
    foodNameBn: z.string().min(1, 'Food name in Bangla is required'),
    foodNameEn: z.string().optional(),
    category: z.enum([
        'breast_milk', 'formula', 'water', 'juice', 'grains_cereals',
        'legumes', 'fish', 'meat_poultry', 'egg', 'vegetables', 'fruits',
        'dairy', 'mixed_meal', 'commercial_baby_food', 'snack', 'other'
    ]),
    consistency: z.enum(['liquid', 'puree', 'mashed', 'minced', 'soft_pieces', 'regular']).optional(),
    amountGrams: z.coerce.number().positive().optional(),
    amountMl: z.coerce.number().positive().optional(),
    amountDescription: z.string().max(100).optional(),
    isNewFood: z.boolean().default(false),
    accepted: z.boolean().optional(),
    reaction: z.string().optional(),
})

exports.createSessionSchema = z.object({
    // childId is optional — controller auto-detects from logged-in parent if omitted
    childId: z.coerce.number().int().positive().optional(),
    fedAt: z.coerce.date(),
    method: z.enum(['breastfed', 'bottle_breast_milk', 'bottle_formula', 'spoon_fed', 'cup_fed', 'self_fed', 'tube_fed', 'mixed']),
    breastSide: z.enum(['left', 'right', 'both']).optional(),
    durationMinutes: z.coerce.number().int().positive().optional(),
    amountMl: z.coerce.number().positive().optional(),
    mood: z.string().max(50).optional(),
    appetite: z.enum(['easy', 'moderate', 'difficult', 'refused']).optional(),
    vomitedAfter: z.boolean().default(false),
    choked: z.boolean().default(false),
    allergicReaction: z.boolean().default(false),
    notes: z.string().optional(),
    items: z.array(feedingItemSchema).default([]),
})
