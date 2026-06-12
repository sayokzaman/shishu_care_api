# NutriMind config — adapted for Shishu Care (Bangladesh child & maternal health)
# Original: zakaria-narjis/nutrimind | License: MIT
# Adaptations: mother (breastfeeding/pregnancy) + child (6m-5yr) calorie targets

# ---------------------------------------------------------------------------
# Activity multipliers (Mifflin-St Jeor)
# ---------------------------------------------------------------------------
ACTIVITY_MULTIPLIERS = {
    "Little/no exercise": 1.2,
    "Light exercise": 1.375,
    "Moderate exercise (3-5 days/wk)": 1.55,
    "Very active (6-7 days/wk)": 1.725,
    "Extra active (very active & physical job)": 1.9,
}

# ---------------------------------------------------------------------------
# Weight management plans (for mothers only — not applied to children)
# ---------------------------------------------------------------------------
WEIGHT_LOSS_PLANS = {
    "Maintain weight":     {"factor": 1.0, "weekly_loss": "0 kg/week"},
    "Mild weight loss":    {"factor": 0.9, "weekly_loss": "0.25 kg/week"},
    "Weight loss":         {"factor": 0.8, "weekly_loss": "0.5 kg/week"},
    "Extreme weight loss": {"factor": 0.6, "weekly_loss": "1 kg/week"},
}

# ---------------------------------------------------------------------------
# Calorie bonuses for mothers (WHO/UNICEF recommendations)
# ---------------------------------------------------------------------------
# Breastfeeding: +500 kcal/day above TDEE (first 6 months)
# Pregnancy trimester bonuses above pre-pregnancy TDEE:
#   T1: +0 kcal, T2: +340 kcal, T3: +452 kcal
BREASTFEEDING_CALORIE_BONUS = 500
PREGNANCY_CALORIE_BONUS = {
    1: 0,
    2: 340,
    3: 452,
}

# ---------------------------------------------------------------------------
# Child daily calorie targets (WHO complementary feeding guidelines)
# Age in months → target kcal/day from complementary food
# (excludes breastmilk calories which cannot be precisely measured)
# ---------------------------------------------------------------------------
CHILD_CALORIE_TARGETS = {
    # (min_age_months, max_age_months): daily_kcal
    (6, 8):   200,   # WHO: 6-8 months
    (9, 11):  300,   # WHO: 9-11 months
    (12, 23): 550,   # WHO: 12-23 months
    (24, 35): 1000,  # Approx 2-3 years
    (36, 47): 1200,  # Approx 3-4 years
    (48, 60): 1400,  # Approx 4-5 years
}

def get_child_calorie_target(age_months: int) -> int:
    """Return WHO-aligned daily calorie target for child by age in months."""
    for (lo, hi), kcal in CHILD_CALORIE_TARGETS.items():
        if lo <= age_months <= hi:
            return kcal
    if age_months < 6:
        raise ValueError("Child under 6 months should be exclusively breastfed — no complementary food.")
    return 1400  # default for 5yr+

# ---------------------------------------------------------------------------
# Meal calorie distribution
# ---------------------------------------------------------------------------
MEALS_CALORIES_PERC = {
    3: {"breakfast": 0.35, "lunch": 0.40, "dinner": 0.25},
    4: {"breakfast": 0.30, "morning snack": 0.05, "lunch": 0.40, "dinner": 0.25},
    5: {
        "breakfast": 0.30,
        "morning snack": 0.05,
        "lunch": 0.40,
        "afternoon snack": 0.05,
        "dinner": 0.20,
    },
}

# ---------------------------------------------------------------------------
# Per-meal nutrition target ranges
# ---------------------------------------------------------------------------
NUTRITION_RANGES = {
    "breakfast": {
        "fat": (10, 30), "sat_fat": (0, 4), "cholesterol": (0, 30),
        "sodium": (0, 400), "carbs": (40, 75), "fiber": (4, 10),
        "sugar": (0, 10), "protein": (30, 100),
    },
    "lunch": {
        "fat": (20, 40), "sat_fat": (0, 4), "cholesterol": (0, 30),
        "sodium": (0, 400), "carbs": (40, 75), "fiber": (4, 20),
        "sugar": (0, 10), "protein": (50, 175),
    },
    "dinner": {
        "fat": (20, 40), "sat_fat": (0, 4), "cholesterol": (0, 30),
        "sodium": (0, 400), "carbs": (40, 75), "fiber": (4, 20),
        "sugar": (0, 10), "protein": (50, 175),
    },
    "snack": {
        "fat": (5, 15), "sat_fat": (0, 3), "cholesterol": (0, 20),
        "sodium": (0, 200), "carbs": (20, 40), "fiber": (2, 8),
        "sugar": (0, 8), "protein": (10, 40),
    },
}

NUTRITION_COLUMNS = [
    "Calories", "FatContent", "SaturatedFatContent", "CholesterolContent",
    "SodiumContent", "CarbohydrateContent", "FiberContent", "SugarContent",
    "ProteinContent",
]

DEFAULT_N_NEIGHBORS = 5

# ---------------------------------------------------------------------------
# Bangladesh-preferred ingredients filter keywords
# Used to bias recommendations toward locally available foods
# ---------------------------------------------------------------------------
BD_PREFERRED_INGREDIENTS = [
    "rice", "lentil", "dal", "fish", "egg", "chicken", "potato",
    "spinach", "banana", "milk", "yogurt", "carrot", "pumpkin",
]
