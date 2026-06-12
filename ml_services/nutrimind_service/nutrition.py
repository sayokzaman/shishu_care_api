from random import randint as rnd
from config import ACTIVITY_MULTIPLIERS, NUTRITION_RANGES, BREASTFEEDING_CALORIE_BONUS, PREGNANCY_CALORIE_BONUS


def calculate_bmi(weight: float, height: float) -> float:
    """Body Mass Index: weight(kg) / height(m)²."""
    return round(weight / ((height / 100) ** 2), 2)


def calculate_bmr(weight: float, height: float, age: int, gender: str) -> float:
    """Basal Metabolic Rate using the Mifflin-St Jeor equation."""
    base = 10 * weight + 6.25 * height - 5 * age
    return base + 5 if gender == "Male" else base - 161


def calculate_tdee(bmr: float, activity: str) -> float:
    """Total Daily Energy Expenditure: BMR × activity multiplier."""
    return bmr * ACTIVITY_MULTIPLIERS[activity]


def calculate_mother_calories(
    weight: float,
    height: float,
    age: int,
    activity: str,
    is_breastfeeding: bool = False,
    is_pregnant: bool = False,
    trimester: int = None,
) -> float:
    """
    Calculate daily calorie target for a mother.
    Adds WHO-recommended bonuses for breastfeeding (+500 kcal) or
    pregnancy by trimester (+0/+340/+452 kcal).
    """
    bmr = calculate_bmr(weight, height, age, "Female")
    tdee = calculate_tdee(bmr, activity)
    if is_breastfeeding:
        tdee += BREASTFEEDING_CALORIE_BONUS
    elif is_pregnant and trimester in PREGNANCY_CALORIE_BONUS:
        tdee += PREGNANCY_CALORIE_BONUS[trimester]
    return round(tdee)


def build_nutrition_vector(meal_calories: float, meal_type: str) -> list:
    """Build a 9-element nutrition input vector for the recommendation model."""
    key = meal_type if meal_type in NUTRITION_RANGES else "snack"
    r = NUTRITION_RANGES[key]
    return [
        meal_calories,
        rnd(*r["fat"]),
        rnd(*r["sat_fat"]),
        rnd(*r["cholesterol"]),
        rnd(*r["sodium"]),
        rnd(*r["carbs"]),
        rnd(*r["fiber"]),
        rnd(*r["sugar"]),
        rnd(*r["protein"]),
    ]
