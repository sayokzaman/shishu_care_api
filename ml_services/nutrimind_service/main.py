"""
NutriMind FastAPI Service — Shishu Care Adaptation
====================================================
Adapted from zakaria-narjis/nutrimind (MIT License)
Modifications:
  - Mother meal plan endpoint (breastfeeding / pregnancy calorie bonuses)
  - Child food guide endpoint (WHO complementary feeding calorie targets)
  - CORS open for local Node.js proxy on port 3000/5000
"""
import os
import re
from contextlib import asynccontextmanager
from typing import Annotated, List, Literal, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import (
    DEFAULT_N_NEIGHBORS,
    MEALS_CALORIES_PERC,
    WEIGHT_LOSS_PLANS,
    get_child_calorie_target,
)
from model import output_recommended_recipes, recommend
from nutrition import (
    build_nutrition_vector,
    calculate_bmi,
    calculate_bmr,
    calculate_mother_calories,
    calculate_tdee,
)

# Path to the Food.com dataset (relative to this file)
_DATASET_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'ml models',
    'nutrimind', 'Data', 'dataset.csv'
)

dataset: Optional[pd.DataFrame] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global dataset
    if dataset is None:
        print(f"Loading dataset from: {_DATASET_PATH}")
        dataset = pd.read_csv(_DATASET_PATH, compression='gzip')
        dataset['_ingredients_parsed'] = dataset['RecipeIngredientParts'].apply(
            lambda x: frozenset(s.lower() for s in re.findall(r'"([^"]*)"', x))
        )
        print(f"Dataset loaded: {len(dataset)} recipes")
    yield


app = FastAPI(
    title="NutriMind — Shishu Care",
    description="Nutrition recommendation service for mothers and children (Bangladesh context)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Proxied through Node.js — restrict at proxy layer
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ---------------------------------------------------------------------------
# Shared models
# ---------------------------------------------------------------------------

class Recipe(BaseModel):
    Name: str
    CookTime: str
    PrepTime: str
    TotalTime: str
    RecipeIngredientParts: list[str]
    Calories: float
    FatContent: float
    SaturatedFatContent: float
    CholesterolContent: float
    SodiumContent: float
    CarbohydrateContent: float
    FiberContent: float
    SugarContent: float
    ProteinContent: float
    RecipeInstructions: list[str]


class MealRecommendation(BaseModel):
    meal_name: str
    recipes: List[Recipe]


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "dataset_loaded": dataset is not None,
        "recipes_count": len(dataset) if dataset is not None else 0,
    }


# ---------------------------------------------------------------------------
# /mother-meal-plan — breastfeeding / pregnant mother meal plan
# ---------------------------------------------------------------------------

class MotherData(BaseModel):
    age: int = Field(..., ge=15, le=60, description="Mother's age in years")
    height: float = Field(..., ge=100, le=220, description="Height in cm")
    weight: float = Field(..., ge=30, le=200, description="Weight in kg")
    is_breastfeeding: bool = False
    is_pregnant: bool = False
    trimester: Optional[Literal[1, 2, 3]] = None
    activity: str = "Little/no exercise"
    number_of_meals: Literal[3, 4, 5] = 3
    preferred_ingredients: List[str] = []


class MotherMealPlanOut(BaseModel):
    bmi: float
    daily_calorie_target: int
    calorie_note: str
    meals: List[MealRecommendation]


@app.post("/mother-meal-plan", response_model=MotherMealPlanOut)
def mother_meal_plan(data: MotherData):
    if dataset is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded yet. Please retry in a moment.")

    daily_calories = calculate_mother_calories(
        weight=data.weight,
        height=data.height,
        age=data.age,
        activity=data.activity,
        is_breastfeeding=data.is_breastfeeding,
        is_pregnant=data.is_pregnant,
        trimester=data.trimester,
    )

    # Calorie note for UI display
    if data.is_breastfeeding:
        note = "Includes +500 kcal for breastfeeding (WHO recommendation)"
    elif data.is_pregnant and data.trimester:
        from config import PREGNANCY_CALORIE_BONUS
        bonus = PREGNANCY_CALORIE_BONUS.get(data.trimester, 0)
        note = f"Includes +{bonus} kcal for pregnancy trimester {data.trimester} (WHO recommendation)"
    else:
        note = "Standard daily calorie target based on your activity level"

    meals = []
    for meal_name, perc in MEALS_CALORIES_PERC[data.number_of_meals].items():
        vector = build_nutrition_vector(daily_calories * perc, meal_name)
        recs = recommend(
            dataset, vector, data.preferred_ingredients,
            {"n_neighbors": DEFAULT_N_NEIGHBORS, "return_distance": False},
        )
        recipes = output_recommended_recipes(recs) if recs is not None else []
        meals.append(MealRecommendation(meal_name=meal_name, recipes=recipes))

    return MotherMealPlanOut(
        bmi=calculate_bmi(data.weight, data.height),
        daily_calorie_target=daily_calories,
        calorie_note=note,
        meals=meals,
    )


# ---------------------------------------------------------------------------
# /child-food-guide — age-appropriate food for children 6m-5yr
# ---------------------------------------------------------------------------

class ChildData(BaseModel):
    child_age_months: int = Field(..., ge=6, le=60, description="Child's age in months (6-60)")
    child_weight_kg: Optional[float] = None
    number_of_meals: Literal[3, 4, 5] = 3
    preferred_ingredients: List[str] = []


class ChildFoodGuideOut(BaseModel):
    child_age_months: int
    daily_calorie_target: int
    age_feeding_note: str
    meals: List[MealRecommendation]


@app.post("/child-food-guide", response_model=ChildFoodGuideOut)
def child_food_guide(data: ChildData):
    if dataset is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded yet. Please retry in a moment.")

    try:
        daily_calories = get_child_calorie_target(data.child_age_months)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Age-appropriate feeding notes (for UI display)
    age = data.child_age_months
    if age < 9:
        note = "6-8 months: Start with soft, mashed single-ingredient foods. Continue breastfeeding."
    elif age < 12:
        note = "9-11 months: Introduce more variety. Mashed family foods. 3-4 meals/day."
    elif age < 24:
        note = "12-23 months: Family foods, finely chopped. Milk still important."
    elif age < 36:
        note = "2-3 years: Balanced meals from all food groups. 3 meals + 2 snacks."
    else:
        note = "3-5 years: Regular family meals. Encourage variety and self-feeding."

    meals = []
    for meal_name, perc in MEALS_CALORIES_PERC[data.number_of_meals].items():
        vector = build_nutrition_vector(daily_calories * perc, meal_name)
        recs = recommend(
            dataset, vector, data.preferred_ingredients,
            {"n_neighbors": DEFAULT_N_NEIGHBORS, "return_distance": False},
        )
        recipes = output_recommended_recipes(recs) if recs is not None else []
        meals.append(MealRecommendation(meal_name=meal_name, recipes=recipes))

    return ChildFoodGuideOut(
        child_age_months=data.child_age_months,
        daily_calorie_target=daily_calories,
        age_feeding_note=note,
        meals=meals,
    )


# ---------------------------------------------------------------------------
# /predict — raw nutrition vector → recipes (original endpoint, kept for devs)
# ---------------------------------------------------------------------------

class Params(BaseModel):
    n_neighbors: int = DEFAULT_N_NEIGHBORS
    return_distance: bool = False


class PredictionIn(BaseModel):
    nutrition_input: Annotated[list[float], Field(min_length=9, max_length=9)]
    ingredients: list[str] = []
    params: Optional[Params] = None


class PredictionOut(BaseModel):
    output: Optional[List[Recipe]] = None


@app.post("/predict", response_model=PredictionOut)
def predict(prediction_input: PredictionIn):
    if dataset is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded yet.")
    params = (
        prediction_input.params.model_dump()
        if prediction_input.params
        else {"n_neighbors": DEFAULT_N_NEIGHBORS, "return_distance": False}
    )
    recommendation_dataframe = recommend(
        dataset,
        prediction_input.nutrition_input,
        prediction_input.ingredients,
        params,
    )
    output = output_recommended_recipes(recommendation_dataframe)
    return {"output": output}
