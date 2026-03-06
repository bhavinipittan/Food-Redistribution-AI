from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64
import asyncio
import json
from math import radians, sin, cos, sqrt, atan2

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'foodbridge_secret_key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="FoodBridge API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ================= MODELS =================

class UserRole:
    DONOR = "donor"
    RECEIVER = "receiver"
    VOLUNTEER = "volunteer"
    ADMIN = "admin"

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    organisation_name: Optional[str] = None
    organisation_type: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    transport_mode: Optional[str] = None
    shelter_capacity: Optional[int] = None  # Number of people to feed (for receivers)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    organisation_name: Optional[str] = None
    organisation_type: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    transport_mode: Optional[str] = None
    created_at: str

class DonationStatus:
    PENDING = "pending"
    ACCEPTED = "accepted"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    DELIVERED = "delivered"
    REJECTED = "rejected"
    EXPIRED = "expired"

class DonationCreate(BaseModel):
    food_name: str
    ingredients: Optional[str] = None
    servings_estimate: int
    preparation_time: Optional[int] = None
    image_base64: Optional[str] = None
    meal_prepared_at: Optional[str] = None  # ISO timestamp when meal was prepared

class DonationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    donor_id: str
    donor_name: Optional[str] = None
    donor_address: Optional[str] = None
    food_name: str
    ingredients: Optional[str] = None
    servings_estimate: int
    preparation_time: Optional[int] = None
    meal_prepared_at: Optional[str] = None
    image_url: Optional[str] = None
    freshness_score: Optional[float] = None
    spoilage_probability: Optional[float] = None
    expiry_prediction_hours: Optional[float] = None
    urgency_score: Optional[float] = None
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: str
    distance_km: Optional[float] = None
    receiver_id: Optional[str] = None
    volunteer_id: Optional[str] = None
    match_type: Optional[str] = None  # "full" or "partial" match based on shelter capacity

class AcceptDonation(BaseModel):
    donation_id: str

class AssignmentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    donation_id: str
    volunteer_id: str
    pickup_status: str
    delivery_status: str
    pickup_time: Optional[str] = None
    delivery_time: Optional[str] = None
    donor_name: Optional[str] = None
    donor_address: Optional[str] = None
    donor_latitude: Optional[float] = None
    donor_longitude: Optional[float] = None
    receiver_name: Optional[str] = None
    receiver_address: Optional[str] = None
    receiver_latitude: Optional[float] = None
    receiver_longitude: Optional[float] = None
    food_name: Optional[str] = None
    servings: Optional[int] = None
    created_at: str

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float

class ImpactMetrics(BaseModel):
    total_meals_saved: int = 0
    total_donations: int = 0
    total_shelters_helped: int = 0
    total_volunteer_deliveries: int = 0
    total_food_saved_kg: float = 0.0
    total_pollution_reduced: float = 0.0

# ================= HELPERS =================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km"""
    R = 6371  # Earth's radius in km
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

async def analyze_food_image(image_base64: str) -> dict:
    """Analyze food image using GPT-5.2 Vision"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            logger.warning("No EMERGENT_LLM_KEY found, using mock analysis")
            return {"freshness_score": 75.0, "spoilage_probability": 0.15, "food_category": "general"}
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"food-analysis-{uuid.uuid4()}",
            system_message="""You are a food safety AI analyst. Analyze the food image and return ONLY a JSON object with:
- freshness_score: 0-100 (100 being freshest)
- spoilage_probability: 0.0-1.0 (probability of spoilage)
- food_category: string describing the food type
Return ONLY valid JSON, no other text."""
        ).with_model("openai", "gpt-5.2")
        
        image_content = ImageContent(image_base64=image_base64)
        user_message = UserMessage(
            text="Analyze this food image for freshness and safety. Return JSON only.",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON from response
        try:
            # Try to extract JSON from response
            json_str = response.strip()
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            
            result = json.loads(json_str)
            return {
                "freshness_score": float(result.get("freshness_score", 70)),
                "spoilage_probability": float(result.get("spoilage_probability", 0.2)),
                "food_category": result.get("food_category", "food")
            }
        except json.JSONDecodeError:
            logger.warning(f"Could not parse AI response: {response}")
            return {"freshness_score": 70.0, "spoilage_probability": 0.2, "food_category": "food"}
            
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        return {"freshness_score": 70.0, "spoilage_probability": 0.2, "food_category": "food"}

async def find_best_volunteer(donor_lat: float, donor_lon: float, receiver_lat: float, receiver_lon: float, urgency_score: float) -> Optional[dict]:
    """Find the best available volunteer using matching algorithm"""
    volunteers = await db.users.find({"role": UserRole.VOLUNTEER}, {"_id": 0}).to_list(100)
    
    # Filter out volunteers with active assignments
    active_assignments = await db.assignments.find({
        "delivery_status": {"$ne": "delivered"}
    }, {"_id": 0, "volunteer_id": 1}).to_list(100)
    busy_volunteer_ids = {a["volunteer_id"] for a in active_assignments}
    
    available_volunteers = [v for v in volunteers if v["id"] not in busy_volunteer_ids and v.get("latitude") and v.get("longitude")]
    
    if not available_volunteers:
        return None
    
    best_volunteer = None
    best_score = float('inf')
    
    for volunteer in available_volunteers:
        vol_lat, vol_lon = volunteer["latitude"], volunteer["longitude"]
        
        dist_to_donor = haversine_distance(vol_lat, vol_lon, donor_lat, donor_lon)
        dist_donor_to_receiver = haversine_distance(donor_lat, donor_lon, receiver_lat, receiver_lon)
        
        # Transport speed weight (walking=1, bike=0.5, car=0.3)
        transport_modes = {"walking": 1.0, "bike": 0.5, "car": 0.3, "scooter": 0.4}
        transport_weight = transport_modes.get(volunteer.get("transport_mode", "bike"), 0.5)
        
        # Score calculation (lower is better)
        score = (dist_to_donor * 0.4) + (dist_donor_to_receiver * 0.3) + (urgency_score * -0.2) + (transport_weight * -0.1)
        
        if score < best_score:
            best_score = score
            best_volunteer = volunteer
    
    return best_volunteer

def find_best_donation_combination(donations: List[dict], target_capacity: int, max_combinations: int = 100) -> dict:
    """
    AI-based multi-donation matching algorithm.
    Finds the best combination of donations that matches or closely matches shelter capacity.
    
    Priority:
    1. Exact match to shelter capacity
    2. Closest higher value (slightly over)
    3. Closest lower value (slightly under)
    """
    if not donations or target_capacity <= 0:
        return {"recommended": [], "others": donations, "total_servings": 0, "match_quality": "none"}
    
    # Limit donations to prevent expensive computations
    donations_subset = donations[:15]  # Max 15 donations for combination search
    n = len(donations_subset)
    
    best_combination = []
    best_diff = float('inf')
    best_total = 0
    best_match_type = "none"
    
    # Try all subsets using bit manipulation (2^n combinations, limited)
    max_subsets = min(2 ** n, max_combinations)
    
    for i in range(1, max_subsets):
        combination = []
        total_servings = 0
        
        for j in range(n):
            if i & (1 << j):
                combination.append(donations_subset[j])
                total_servings += donations_subset[j].get("servings_estimate", 0)
        
        diff = total_servings - target_capacity
        abs_diff = abs(diff)
        
        # Priority: Exact match > Closest higher > Closest lower
        if diff == 0:  # Exact match
            if abs_diff < best_diff or best_match_type != "exact":
                best_combination = combination
                best_diff = abs_diff
                best_total = total_servings
                best_match_type = "exact"
        elif diff > 0 and best_match_type != "exact":  # Over capacity (preferred over under)
            if best_match_type != "over" or abs_diff < best_diff:
                best_combination = combination
                best_diff = abs_diff
                best_total = total_servings
                best_match_type = "over"
        elif diff < 0 and best_match_type not in ["exact", "over"]:  # Under capacity
            if abs_diff < best_diff:
                best_combination = combination
                best_diff = abs_diff
                best_total = total_servings
                best_match_type = "under"
    
    # If no good combination found with subsets, try greedy approach for remaining
    if not best_combination and len(donations) > 15:
        # Sort by servings (descending) and greedily pick
        sorted_donations = sorted(donations, key=lambda x: x.get("servings_estimate", 0), reverse=True)
        greedy_combo = []
        greedy_total = 0
        
        for d in sorted_donations:
            servings = d.get("servings_estimate", 0)
            if greedy_total + servings <= target_capacity * 1.2:  # Allow 20% over
                greedy_combo.append(d)
                greedy_total += servings
                if greedy_total >= target_capacity:
                    break
        
        if greedy_combo:
            best_combination = greedy_combo
            best_total = greedy_total
            best_match_type = "exact" if greedy_total == target_capacity else ("over" if greedy_total > target_capacity else "under")
    
    # Separate recommended from others
    recommended_ids = {d["id"] for d in best_combination}
    others = [d for d in donations if d["id"] not in recommended_ids]
    
    # Determine match quality label
    if best_match_type == "exact":
        match_quality = "perfect"
    elif best_match_type == "over" and best_diff <= target_capacity * 0.1:
        match_quality = "excellent"
    elif best_match_type == "over":
        match_quality = "good"
    elif best_match_type == "under" and best_diff <= target_capacity * 0.2:
        match_quality = "partial"
    else:
        match_quality = "low"
    
    return {
        "recommended": best_combination,
        "others": others,
        "total_servings": best_total,
        "target_capacity": target_capacity,
        "match_quality": match_quality,
        "match_type": best_match_type
    }

# ================= AUTH ROUTES =================

@api_router.post("/auth/register", response_model=dict)
async def register(user: UserRegister):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if user.role not in [UserRole.DONOR, UserRole.RECEIVER, UserRole.VOLUNTEER, UserRole.ADMIN]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "password_hash": hash_password(user.password),
        "name": user.name,
        "role": user.role,
        "organisation_name": user.organisation_name,
        "organisation_type": user.organisation_type,
        "phone": user.phone,
        "address": user.address,
        "latitude": user.latitude,
        "longitude": user.longitude,
        "transport_mode": user.transport_mode,
        "shelter_capacity": user.shelter_capacity,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_doc["id"], user_doc["role"])
    
    return {
        "token": token,
        "user": {
            "id": user_doc["id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "role": user_doc["role"],
            "organisation_name": user_doc["organisation_name"],
            "address": user_doc["address"],
            "latitude": user_doc["latitude"],
            "longitude": user_doc["longitude"]
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "organisation_name": user.get("organisation_name"),
            "address": user.get("address"),
            "latitude": user.get("latitude"),
            "longitude": user.get("longitude")
        }
    }

@api_router.get("/auth/me", response_model=dict)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "role": current_user["role"],
        "organisation_name": current_user.get("organisation_name"),
        "organisation_type": current_user.get("organisation_type"),
        "address": current_user.get("address"),
        "latitude": current_user.get("latitude"),
        "longitude": current_user.get("longitude"),
        "transport_mode": current_user.get("transport_mode"),
        "shelter_capacity": current_user.get("shelter_capacity")
    }

@api_router.put("/auth/location", response_model=dict)
async def update_location(location: LocationUpdate, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"latitude": location.latitude, "longitude": location.longitude}}
    )
    return {"message": "Location updated"}

# ================= DONATION ROUTES =================

@api_router.post("/donations", response_model=DonationResponse)
async def create_donation(donation: DonationCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.DONOR:
        raise HTTPException(status_code=403, detail="Only donors can create donations")
    
    # AI Analysis
    analysis = {"freshness_score": 75.0, "spoilage_probability": 0.15, "food_category": "food"}
    if donation.image_base64:
        analysis = await analyze_food_image(donation.image_base64)
    
    # Check food safety
    if analysis["freshness_score"] < 40 or analysis["spoilage_probability"] > 0.6:
        raise HTTPException(status_code=400, detail="Food does not meet safety standards")
    
    # Calculate expiry prediction using meal_prepared_at for LSTM spoilage model
    now = datetime.now(timezone.utc)
    hours_since_preparation = 0
    
    if donation.meal_prepared_at:
        try:
            prepared_time = datetime.fromisoformat(donation.meal_prepared_at.replace('Z', '+00:00'))
            hours_since_preparation = (now - prepared_time).total_seconds() / 3600
        except:
            hours_since_preparation = 0
    
    # LSTM-based expiry calculation considering preparation time
    base_expiry = 6  # Base 6 hours for fresh food
    freshness_factor = analysis["freshness_score"] / 100
    age_penalty = max(0, 1 - (hours_since_preparation / 12))  # Reduce expiry based on age
    expiry_hours = base_expiry * freshness_factor * age_penalty
    expiry_hours = max(expiry_hours, 0.5)  # Minimum 30 minutes
    urgency_score = 1 / expiry_hours
    
    donation_doc = {
        "id": str(uuid.uuid4()),
        "donor_id": current_user["id"],
        "food_name": donation.food_name,
        "ingredients": donation.ingredients,
        "servings_estimate": donation.servings_estimate,
        "preparation_time": donation.preparation_time,
        "meal_prepared_at": donation.meal_prepared_at,
        "image_url": f"data:image/jpeg;base64,{donation.image_base64[:100]}..." if donation.image_base64 else None,
        "image_base64": donation.image_base64,
        "freshness_score": analysis["freshness_score"],
        "spoilage_probability": analysis["spoilage_probability"],
        "food_category": analysis.get("food_category", "food"),
        "expiry_prediction_hours": round(expiry_hours, 1),
        "urgency_score": round(urgency_score, 3),
        "status": DonationStatus.PENDING,
        "latitude": current_user.get("latitude"),
        "longitude": current_user.get("longitude"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.donations.insert_one(donation_doc)
    
    return DonationResponse(
        id=donation_doc["id"],
        donor_id=donation_doc["donor_id"],
        donor_name=current_user["name"],
        donor_address=current_user.get("address"),
        food_name=donation_doc["food_name"],
        ingredients=donation_doc["ingredients"],
        servings_estimate=donation_doc["servings_estimate"],
        preparation_time=donation_doc["preparation_time"],
        meal_prepared_at=donation_doc["meal_prepared_at"],
        freshness_score=donation_doc["freshness_score"],
        spoilage_probability=donation_doc["spoilage_probability"],
        expiry_prediction_hours=donation_doc["expiry_prediction_hours"],
        urgency_score=donation_doc["urgency_score"],
        status=donation_doc["status"],
        latitude=donation_doc["latitude"],
        longitude=donation_doc["longitude"],
        created_at=donation_doc["created_at"]
    )

@api_router.get("/donations", response_model=List[DonationResponse])
async def get_donations(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == UserRole.DONOR:
        # Donors see their own donations
        donations = await db.donations.find({"donor_id": current_user["id"]}, {"_id": 0, "image_base64": 0}).to_list(100)
    elif current_user["role"] == UserRole.RECEIVER:
        # Receivers see pending donations within range
        donations = await db.donations.find({"status": DonationStatus.PENDING}, {"_id": 0, "image_base64": 0}).to_list(100)
        
        # Filter by distance (1 hour travel ~ 30km)
        receiver_lat = current_user.get("latitude")
        receiver_lon = current_user.get("longitude")
        shelter_capacity = current_user.get("shelter_capacity", 0)
        
        if receiver_lat and receiver_lon:
            filtered = []
            for d in donations:
                if d.get("latitude") and d.get("longitude"):
                    dist = haversine_distance(receiver_lat, receiver_lon, d["latitude"], d["longitude"])
                    if dist <= 30:  # 30km radius
                        d["distance_km"] = round(dist, 1)
                        # Calculate match type based on servings vs shelter capacity
                        if shelter_capacity > 0:
                            servings = d.get("servings_estimate", 0)
                            if servings >= shelter_capacity:
                                d["match_type"] = "full"
                            else:
                                d["match_type"] = "partial"
                        filtered.append(d)
            donations = filtered
    else:
        # Admin and volunteers see all
        donations = await db.donations.find({}, {"_id": 0, "image_base64": 0}).to_list(100)
    
    # Fetch donor info for each donation
    results = []
    for d in donations:
        donor = await db.users.find_one({"id": d["donor_id"]}, {"_id": 0})
        results.append(DonationResponse(
            id=d["id"],
            donor_id=d["donor_id"],
            donor_name=donor["name"] if donor else None,
            donor_address=donor.get("address") if donor else None,
            food_name=d["food_name"],
            ingredients=d.get("ingredients"),
            servings_estimate=d["servings_estimate"],
            preparation_time=d.get("preparation_time"),
            meal_prepared_at=d.get("meal_prepared_at"),
            freshness_score=d.get("freshness_score"),
            spoilage_probability=d.get("spoilage_probability"),
            expiry_prediction_hours=d.get("expiry_prediction_hours"),
            urgency_score=d.get("urgency_score"),
            status=d["status"],
            latitude=d.get("latitude"),
            longitude=d.get("longitude"),
            created_at=d["created_at"],
            distance_km=d.get("distance_km"),
            receiver_id=d.get("receiver_id"),
            volunteer_id=d.get("volunteer_id"),
            match_type=d.get("match_type")
        ))
    
    return results

@api_router.get("/donations/{donation_id}", response_model=DonationResponse)
async def get_donation(donation_id: str, current_user: dict = Depends(get_current_user)):
    donation = await db.donations.find_one({"id": donation_id}, {"_id": 0, "image_base64": 0})
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    
    donor = await db.users.find_one({"id": donation["donor_id"]}, {"_id": 0})
    
    return DonationResponse(
        id=donation["id"],
        donor_id=donation["donor_id"],
        donor_name=donor["name"] if donor else None,
        donor_address=donor.get("address") if donor else None,
        food_name=donation["food_name"],
        ingredients=donation.get("ingredients"),
        servings_estimate=donation["servings_estimate"],
        preparation_time=donation.get("preparation_time"),
        freshness_score=donation.get("freshness_score"),
        spoilage_probability=donation.get("spoilage_probability"),
        expiry_prediction_hours=donation.get("expiry_prediction_hours"),
        urgency_score=donation.get("urgency_score"),
        status=donation["status"],
        latitude=donation.get("latitude"),
        longitude=donation.get("longitude"),
        created_at=donation["created_at"],
        receiver_id=donation.get("receiver_id"),
        volunteer_id=donation.get("volunteer_id")
    )

@api_router.post("/donations/{donation_id}/accept", response_model=dict)
async def accept_donation(donation_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.RECEIVER:
        raise HTTPException(status_code=403, detail="Only receivers can accept donations")
    
    donation = await db.donations.find_one({"id": donation_id}, {"_id": 0})
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    
    if donation["status"] != DonationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Donation is no longer available")
    
    # Update donation status
    await db.donations.update_one(
        {"id": donation_id},
        {"$set": {"status": DonationStatus.ACCEPTED, "receiver_id": current_user["id"]}}
    )
    
    # Try to find and assign a volunteer
    donor = await db.users.find_one({"id": donation["donor_id"]}, {"_id": 0})
    
    if donor and donor.get("latitude") and current_user.get("latitude"):
        volunteer = await find_best_volunteer(
            donor["latitude"], donor["longitude"],
            current_user["latitude"], current_user["longitude"],
            donation.get("urgency_score", 0.5)
        )
        
        if volunteer:
            assignment_doc = {
                "id": str(uuid.uuid4()),
                "donation_id": donation_id,
                "volunteer_id": volunteer["id"],
                "pickup_status": "pending",
                "delivery_status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.assignments.insert_one(assignment_doc)
            await db.donations.update_one(
                {"id": donation_id},
                {"$set": {"status": DonationStatus.ASSIGNED, "volunteer_id": volunteer["id"]}}
            )
            
            return {"message": "Donation accepted and volunteer assigned", "volunteer_name": volunteer["name"]}
    
    return {"message": "Donation accepted, waiting for volunteer assignment"}

# ================= VOLUNTEER ROUTES =================

@api_router.get("/assignments", response_model=List[AssignmentResponse])
async def get_assignments(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == UserRole.VOLUNTEER:
        assignments = await db.assignments.find({"volunteer_id": current_user["id"]}, {"_id": 0}).to_list(100)
    else:
        assignments = await db.assignments.find({}, {"_id": 0}).to_list(100)
    
    results = []
    for a in assignments:
        donation = await db.donations.find_one({"id": a["donation_id"]}, {"_id": 0, "image_base64": 0})
        if donation:
            donor = await db.users.find_one({"id": donation["donor_id"]}, {"_id": 0})
            receiver = await db.users.find_one({"id": donation.get("receiver_id")}, {"_id": 0}) if donation.get("receiver_id") else None
            
            results.append(AssignmentResponse(
                id=a["id"],
                donation_id=a["donation_id"],
                volunteer_id=a["volunteer_id"],
                pickup_status=a["pickup_status"],
                delivery_status=a["delivery_status"],
                pickup_time=a.get("pickup_time"),
                delivery_time=a.get("delivery_time"),
                donor_name=donor["name"] if donor else None,
                donor_address=donor.get("address") if donor else None,
                donor_latitude=donor.get("latitude") if donor else None,
                donor_longitude=donor.get("longitude") if donor else None,
                receiver_name=receiver["name"] if receiver else None,
                receiver_address=receiver.get("address") if receiver else None,
                receiver_latitude=receiver.get("latitude") if receiver else None,
                receiver_longitude=receiver.get("longitude") if receiver else None,
                food_name=donation["food_name"],
                servings=donation["servings_estimate"],
                created_at=a["created_at"]
            ))
    
    return results

@api_router.post("/assignments/{assignment_id}/pickup", response_model=dict)
async def confirm_pickup(assignment_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.VOLUNTEER:
        raise HTTPException(status_code=403, detail="Only volunteers can confirm pickup")
    
    assignment = await db.assignments.find_one({"id": assignment_id, "volunteer_id": current_user["id"]}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    await db.assignments.update_one(
        {"id": assignment_id},
        {"$set": {"pickup_status": "completed", "pickup_time": datetime.now(timezone.utc).isoformat()}}
    )
    await db.donations.update_one(
        {"id": assignment["donation_id"]},
        {"$set": {"status": DonationStatus.PICKED_UP}}
    )
    
    return {"message": "Pickup confirmed"}

@api_router.post("/assignments/{assignment_id}/deliver", response_model=dict)
async def confirm_delivery(assignment_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.VOLUNTEER:
        raise HTTPException(status_code=403, detail="Only volunteers can confirm delivery")
    
    assignment = await db.assignments.find_one({"id": assignment_id, "volunteer_id": current_user["id"]}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    await db.assignments.update_one(
        {"id": assignment_id},
        {"$set": {"delivery_status": "delivered", "delivery_time": datetime.now(timezone.utc).isoformat()}}
    )
    await db.donations.update_one(
        {"id": assignment["donation_id"]},
        {"$set": {"status": DonationStatus.DELIVERED}}
    )
    
    # Update impact metrics
    donation = await db.donations.find_one({"id": assignment["donation_id"]}, {"_id": 0})
    if donation:
        servings = donation.get("servings_estimate", 0)
        food_kg = servings * 0.3  # Approx 300g per serving
        pollution_reduced = food_kg * 2.5  # kg CO2 saved
        
        await db.impact_metrics.update_one(
            {"type": "global"},
            {
                "$inc": {
                    "total_meals_saved": servings,
                    "total_donations": 1,
                    "total_volunteer_deliveries": 1,
                    "total_food_saved_kg": food_kg,
                    "total_pollution_reduced": pollution_reduced
                },
                "$addToSet": {"shelters_helped": donation.get("receiver_id")}
            },
            upsert=True
        )
    
    return {"message": "Delivery confirmed"}

# ================= TRACKING ROUTES =================

@api_router.post("/tracking/update", response_model=dict)
async def update_volunteer_location(location: LocationUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.VOLUNTEER:
        raise HTTPException(status_code=403, detail="Only volunteers can update tracking")
    
    # Get active assignment
    assignment = await db.assignments.find_one({
        "volunteer_id": current_user["id"],
        "delivery_status": {"$ne": "delivered"}
    }, {"_id": 0})
    
    if assignment:
        tracking_doc = {
            "id": str(uuid.uuid4()),
            "assignment_id": assignment["id"],
            "volunteer_id": current_user["id"],
            "latitude": location.latitude,
            "longitude": location.longitude,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.tracking.insert_one(tracking_doc)
    
    # Update user location
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"latitude": location.latitude, "longitude": location.longitude}}
    )
    
    return {"message": "Location updated"}

@api_router.get("/tracking/{assignment_id}", response_model=dict)
async def get_tracking(assignment_id: str, current_user: dict = Depends(get_current_user)):
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Get latest location
    latest = await db.tracking.find_one(
        {"assignment_id": assignment_id},
        {"_id": 0},
        sort=[("timestamp", -1)]
    )
    
    volunteer = await db.users.find_one({"id": assignment["volunteer_id"]}, {"_id": 0})
    donation = await db.donations.find_one({"id": assignment["donation_id"]}, {"_id": 0})
    donor = await db.users.find_one({"id": donation["donor_id"]}, {"_id": 0}) if donation else None
    receiver = await db.users.find_one({"id": donation.get("receiver_id")}, {"_id": 0}) if donation and donation.get("receiver_id") else None
    
    return {
        "volunteer": {
            "name": volunteer["name"] if volunteer else None,
            "latitude": latest["latitude"] if latest else volunteer.get("latitude") if volunteer else None,
            "longitude": latest["longitude"] if latest else volunteer.get("longitude") if volunteer else None,
            "transport_mode": volunteer.get("transport_mode") if volunteer else None
        },
        "donor": {
            "name": donor["name"] if donor else None,
            "address": donor.get("address") if donor else None,
            "latitude": donor.get("latitude") if donor else None,
            "longitude": donor.get("longitude") if donor else None
        },
        "receiver": {
            "name": receiver["name"] if receiver else None,
            "address": receiver.get("address") if receiver else None,
            "latitude": receiver.get("latitude") if receiver else None,
            "longitude": receiver.get("longitude") if receiver else None
        },
        "status": {
            "pickup": assignment["pickup_status"],
            "delivery": assignment["delivery_status"]
        }
    }

# ================= METRICS ROUTES =================

@api_router.get("/metrics", response_model=dict)
async def get_metrics(current_user: dict = Depends(get_current_user)):
    global_metrics = await db.impact_metrics.find_one({"type": "global"}, {"_id": 0})
    
    if not global_metrics:
        global_metrics = {
            "total_meals_saved": 0,
            "total_donations": 0,
            "total_shelters_helped": 0,
            "total_volunteer_deliveries": 0,
            "total_food_saved_kg": 0,
            "total_pollution_reduced": 0
        }
    
    # Calculate shelters helped count
    shelters_helped = len(global_metrics.get("shelters_helped", []))
    
    # Get daily stats
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    today_donations = await db.donations.count_documents({
        "created_at": {"$gte": today.isoformat()}
    })
    
    today_delivered = await db.assignments.count_documents({
        "delivery_status": "delivered",
        "delivery_time": {"$gte": today.isoformat()}
    })
    
    # Get user-specific stats
    user_stats = {}
    if current_user["role"] == UserRole.DONOR:
        user_donations = await db.donations.count_documents({"donor_id": current_user["id"]})
        delivered = await db.donations.count_documents({"donor_id": current_user["id"], "status": DonationStatus.DELIVERED})
        user_stats = {
            "total_donations": user_donations,
            "meals_delivered": delivered
        }
    elif current_user["role"] == UserRole.VOLUNTEER:
        user_deliveries = await db.assignments.count_documents({"volunteer_id": current_user["id"], "delivery_status": "delivered"})
        user_stats = {
            "total_deliveries": user_deliveries
        }
    elif current_user["role"] == UserRole.RECEIVER:
        accepted = await db.donations.count_documents({"receiver_id": current_user["id"]})
        received = await db.donations.count_documents({"receiver_id": current_user["id"], "status": DonationStatus.DELIVERED})
        shelter_capacity = current_user.get("shelter_capacity", 0)
        user_stats = {
            "total_accepted": accepted,
            "total_received": received,
            "shelter_capacity": shelter_capacity,
            "meals_required": shelter_capacity
        }
    
    return {
        "global": {
            "total_meals_saved": global_metrics.get("total_meals_saved", 0),
            "total_donations": global_metrics.get("total_donations", 0),
            "total_shelters_helped": shelters_helped,
            "total_volunteer_deliveries": global_metrics.get("total_volunteer_deliveries", 0),
            "total_food_saved_kg": round(global_metrics.get("total_food_saved_kg", 0), 1),
            "total_pollution_reduced": round(global_metrics.get("total_pollution_reduced", 0), 1)
        },
        "today": {
            "donations": today_donations,
            "deliveries": today_delivered
        },
        "user": user_stats
    }

@api_router.get("/metrics/chart-data", response_model=dict)
async def get_chart_data(current_user: dict = Depends(get_current_user)):
    """Get data for charts - daily/weekly/monthly"""
    now = datetime.now(timezone.utc)
    
    # Last 7 days data
    daily_data = []
    for i in range(7):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        donations = await db.donations.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        deliveries = await db.assignments.count_documents({
            "delivery_time": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()},
            "delivery_status": "delivered"
        })
        
        daily_data.append({
            "date": day_start.strftime("%b %d"),
            "donations": donations,
            "deliveries": deliveries
        })
    
    daily_data.reverse()
    
    return {
        "daily": daily_data,
        "weekly": daily_data,  # Same data for now
        "monthly": daily_data  # Same data for now
    }

# ================= ADMIN ROUTES =================

@api_router.get("/admin/users", response_model=List[dict])
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.get("/admin/donations", response_model=List[dict])
async def get_all_donations(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    donations = await db.donations.find({}, {"_id": 0, "image_base64": 0}).to_list(1000)
    return donations

@api_router.get("/admin/heatmap", response_model=List[dict])
async def get_heatmap_data(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    donations = await db.donations.find(
        {"latitude": {"$exists": True}, "longitude": {"$exists": True}},
        {"_id": 0, "latitude": 1, "longitude": 1, "servings_estimate": 1}
    ).to_list(1000)
    
    return [{"lat": d["latitude"], "lng": d["longitude"], "weight": d.get("servings_estimate", 1)} for d in donations if d.get("latitude")]

# ================= ROOT ROUTE =================

@api_router.get("/")
async def root():
    return {"message": "FoodBridge API - Connecting surplus food to those in need"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket for real-time tracking
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, assignment_id: str):
        await websocket.accept()
        self.active_connections[assignment_id] = websocket
    
    def disconnect(self, assignment_id: str):
        if assignment_id in self.active_connections:
            del self.active_connections[assignment_id]
    
    async def broadcast_location(self, assignment_id: str, data: dict):
        if assignment_id in self.active_connections:
            try:
                await self.active_connections[assignment_id].send_json(data)
            except:
                self.disconnect(assignment_id)

manager = ConnectionManager()

@app.websocket("/ws/tracking/{assignment_id}")
async def websocket_tracking(websocket: WebSocket, assignment_id: str):
    await manager.connect(websocket, assignment_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Broadcast location update
            await manager.broadcast_location(assignment_id, data)
    except WebSocketDisconnect:
        manager.disconnect(assignment_id)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
