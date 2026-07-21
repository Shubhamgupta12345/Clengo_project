"""
Clengo - Laundry Service Application
Backend: FastAPI + MongoDB with Emergent-managed Google Auth
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
import uuid
import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import httpx
import pandas as pd
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Clengo API")
api_router = APIRouter(prefix="/api")

# ============ Constants ============
ADMIN_EMAILS = {"admin@clengo.in", "shubham2710gupta@gmail.com"}
# EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
# Clengo business WhatsApp number (E.164, digits only, incl. country code)
CLENGO_WHATSAPP = "916307074843"
GOOGLE_CLIENT_ID = os.environ['GOOGLE_CLIENT_ID']

# ============ Email (SMTP) config ============
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", SMTP_USER)
FROM_NAME = os.environ.get("FROM_NAME", "Clengo Laundry")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.clengo.in")
EMAIL_ENABLED = bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)

# ============ Utils ============
def now_utc():
    return datetime.now(timezone.utc)

def gen_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"

def gen_order_id() -> str:
    # Human-friendly unique order ID: CLG-YYMMDD-XXXX
    d = now_utc().strftime("%y%m%d")
    return f"CLG-{d}-{uuid.uuid4().hex[:6].upper()}"

def gen_complaint_id() -> str:
    return f"CMP-{uuid.uuid4().hex[:8].upper()}"

# ============ Email notifications ============
def _send_email_sync(to_email: str, subject: str, html_body: str):
    if not EMAIL_ENABLED:
        logging.info(f"[email disabled - set SMTP_HOST/SMTP_USER/SMTP_PASSWORD] Would send to {to_email}: {subject}")
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, [to_email], msg.as_string())
    except Exception as e:
        logging.error(f"Failed to send email to {to_email} ({subject}): {e}")

async def send_email(to_email: str, subject: str, html_body: str):
    """Fire-and-forget email send; never raises so it can't break the request it's attached to."""
    try:
        await asyncio.to_thread(_send_email_sync, to_email, subject, html_body)
    except Exception as e:
        logging.error(f"send_email failed for {to_email}: {e}")

def _email_shell(preheader: str, body_html: str) -> str:
    """Shared branded wrapper for all outgoing emails."""
    return f"""
    <div style="background:#F4F5F7;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#111;">
      <div style="display:none;max-height:0;overflow:hidden;">{preheader}</div>
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
        <div style="background:#111;padding:20px 28px;">
          <span style="color:#D4A017;font-weight:bold;font-size:20px;letter-spacing:0.04em;">CLENGO</span>
          <span style="color:#fff;font-size:12px;margin-left:8px;">Freshness Delivered at Doorstep</span>
        </div>
        <div style="padding:28px;font-size:14px;line-height:1.6;">
          {body_html}
        </div>
        <div style="padding:16px 28px;background:#F7F6F2;font-size:11px;color:#888;">
          Clengo Laundry Pvt. Ltd. · Need help? Reply to this email or WhatsApp us.
        </div>
      </div>
    </div>
    """

def _order_items_table(items) -> str:
    rows = "".join(
        f"<tr><td style='padding:6px 0;'>{i['item_name']} <span style='color:#D4A017;text-transform:uppercase;font-size:10px;'>{i['service']}</span></td>"
        f"<td style='padding:6px 0;text-align:center;'>x{i['quantity']}</td>"
        f"<td style='padding:6px 0;text-align:right;'>₹{i['subtotal']:.0f}</td></tr>"
        for i in items
    )
    return f"<table style='width:100%;border-collapse:collapse;margin-top:8px;'>{rows}</table>"

async def notify_order_confirmed(order: dict):
    body = f"""
    <p>Hi {order['user_name']},</p>
    <p>Your order has been placed successfully. Here are the details:</p>
    <p style="margin:16px 0;"><b>Order ID:</b> <span style="font-family:monospace;">{order['order_id']}</span></p>
    {_order_items_table(order['items'])}
    <p style="margin-top:12px;">
      Subtotal: ₹{order['subtotal']:.0f}<br/>
      {'Discount: -₹' + format(order['discount'], '.0f') + '<br/>' if order.get('discount') else ''}
      <b>Total (COD): ₹{order['total_amount']:.0f}</b>
    </p>
    <p><b>Pickup:</b> {order['pickup_date']}, {order['pickup_slot']}<br/>
       <b>Address:</b> {order['pickup_address']} ({order['pickup_pincode']})</p>
    <p>We'll notify you as your order moves through pickup, processing and delivery.</p>
    """
    await send_email(order["user_email"], f"Order confirmed – {order['order_id']}", _email_shell("Your Clengo order is confirmed", body))

STATUS_MESSAGES = {
    "picked_up": "Your laundry has been picked up by our partner and is on its way to the facility.",
    "in_process": "Your laundry is now being washed / cleaned by our team.",
    "out_for_delivery": "Your laundry is fresh and out for delivery to your address.",
    "completed": "Your order has been delivered. Thank you for choosing Clengo! We'd love your feedback.",
    "cancelled": "Your order has been cancelled.",
}
STATUS_LABELS_EMAIL = {
    "pending": "Pending", "picked_up": "Picked up", "in_process": "In process",
    "out_for_delivery": "Out for delivery", "completed": "Completed", "cancelled": "Cancelled",
}

async def notify_status_update(order: dict, status: str):
    message = STATUS_MESSAGES.get(status, f"Your order status is now {STATUS_LABELS_EMAIL.get(status, status)}.")
    body = f"""
    <p>Hi {order['user_name']},</p>
    <p>{message}</p>
    <p style="margin:16px 0;"><b>Order ID:</b> <span style="font-family:monospace;">{order['order_id']}</span><br/>
    <b>Status:</b> {STATUS_LABELS_EMAIL.get(status, status)}</p>
    """
    await send_email(order["user_email"], f"Order {STATUS_LABELS_EMAIL.get(status, status)} – {order['order_id']}", _email_shell(message, body))

async def notify_order_cancelled(order: dict, cancelled_by: str, reason: str):
    who = "you" if cancelled_by == "user" else "Clengo support"
    body = f"""
    <p>Hi {order['user_name']},</p>
    <p>Your order <span style="font-family:monospace;">{order['order_id']}</span> has been cancelled by {who}.</p>
    {'<p><b>Reason:</b> ' + reason + '</p>' if reason else ''}
    <p>If this was unexpected or you have questions, just reply to this email or reach us on WhatsApp.</p>
    """
    await send_email(order["user_email"], f"Order cancelled – {order['order_id']}", _email_shell("Your Clengo order was cancelled", body))

async def notify_order_rescheduled(order: dict, pickup_date: str, pickup_slot: str):
    body = f"""
    <p>Hi {order['user_name']},</p>
    <p>Your pickup for order <span style="font-family:monospace;">{order['order_id']}</span> has been rescheduled.</p>
    <p style="margin:16px 0;"><b>New pickup date:</b> {pickup_date}<br/><b>New pickup slot:</b> {pickup_slot}</p>
    <p>Sorry for any inconvenience — we'll be there at the new time.</p>
    """
    await send_email(order["user_email"], f"Pickup rescheduled – {order['order_id']}", _email_shell("Your pickup time has changed", body))

async def notify_admins_new_complaint(complaint: dict):
    body = f"""
    <p>A new complaint has been filed.</p>
    <p><b>Complaint ID:</b> {complaint['complaint_id']}<br/>
    <b>Order ID:</b> {complaint['order_id']}<br/>
    <b>From:</b> {complaint['user_email']}<br/>
    <b>Subject:</b> {complaint['subject']}</p>
    <p style="background:#F7F6F2;padding:12px;border-radius:8px;">{complaint['message']}</p>
    <p>Please review and respond from the admin dashboard.</p>
    """
    for admin_email in ADMIN_EMAILS:
        await send_email(admin_email, f"New complaint – {complaint['complaint_id']}", _email_shell("A customer needs support", body))

async def notify_complaint_resolved(complaint: dict):
    body = f"""
    <p>Hi,</p>
    <p>We've responded to your complaint regarding order <span style="font-family:monospace;">{complaint['order_id']}</span>.</p>
    <p><b>Your message:</b> {complaint['message']}</p>
    <p style="background:#F7F6F2;padding:12px;border-radius:8px;"><b>Our response:</b> {complaint.get('admin_response') or ''}</p>
    <p>Thanks for your patience — reach out again if anything's still unresolved.</p>
    """
    await send_email(complaint["user_email"], f"We've responded to your complaint – {complaint['complaint_id']}", _email_shell("Update on your complaint", body))

async def notify_admins_low_feedback(order: dict, rating: int, comment: str):
    body = f"""
    <p>A customer left a low rating and may need follow-up.</p>
    <p><b>Order ID:</b> {order['order_id']}<br/>
    <b>Customer:</b> {order['user_name']} ({order['user_email']})<br/>
    <b>Rating:</b> {rating} / 5</p>
    {'<p style="background:#F7F6F2;padding:12px;border-radius:8px;">' + comment + '</p>' if comment else ''}
    """
    for admin_email in ADMIN_EMAILS:
        await send_email(admin_email, f"Low rating ({rating}★) on order {order['order_id']}", _email_shell("Customer feedback needs attention", body))

# ============ Models ============
class GoogleAuthInput(BaseModel):
    credential: str  # the ID token JWT from GoogleLogin
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    role: str = "user"  # "user" or "admin"
    created_at: datetime = Field(default_factory=now_utc)

class ProfileUpdate(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    name: Optional[str] = None

class PincodeArea(BaseModel):
    pincode: str
    city: str
    area: str
    active: bool = True

class CatalogItem(BaseModel):
    item_id: str
    name: str
    category: str  # 'daily', 'ethnic', 'household', 'premium'
    prices: Dict[str, float]  # {'wash': 20, 'iron': 10, 'dryclean': 100}
    icon: str = "shirt"

class OrderLine(BaseModel):
    item_id: str
    item_name: str
    service: str  # 'wash' | 'iron' | 'dryclean'
    quantity: int
    unit_price: float
    subtotal: float

class OrderCreate(BaseModel):
    items: List[OrderLine]
    pickup_address: str
    pickup_pincode: str
    pickup_date: str  # ISO date string
    pickup_slot: str  # e.g. "10:00 AM - 12:00 PM"
    contact_phone: str
    notes: Optional[str] = None

class Order(BaseModel):
    order_id: str
    user_id: str
    user_email: str
    user_name: str
    contact_phone: str
    items: List[OrderLine]
    total_items: int
    subtotal: float = 0
    discount: float = 0
    offer_applied: Optional[str] = None
    total_amount: float
    pickup_address: str
    pickup_pincode: str
    pickup_date: str
    pickup_slot: str
    notes: Optional[str] = None
    status: str = "pending"  # pending | picked_up | in_process | out_for_delivery | completed | cancelled
    cancel_reason: Optional[str] = None
    cancelled_by: Optional[str] = None  # 'user' | 'admin'
    payment_method: str = "COD"
    payment_status: str = "pending"
    feedback_rating: Optional[int] = None
    feedback_comment: Optional[str] = None
    feedback_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)

class OrderStatusUpdate(BaseModel):
    status: str

class ComplaintCreate(BaseModel):
    order_id: str
    subject: str
    message: str

class Complaint(BaseModel):
    complaint_id: str
    order_id: str
    user_id: str
    user_email: str
    subject: str
    message: str
    status: str = "open"  # open | resolved
    admin_response: Optional[str] = None
    created_at: datetime = Field(default_factory=now_utc)

class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    admin_response: Optional[str] = None

class OfferModel(BaseModel):
    offer_id: Optional[str] = None
    threshold: float
    discount: float
    label: Optional[str] = None
    active: bool = True

class SettingsUpdate(BaseModel):
    min_order_value: Optional[float] = None
    company_name: Optional[str] = None
    company_about: Optional[str] = None
    contact_email: Optional[str] = None

class CatalogItemInput(BaseModel):
    item_id: Optional[str] = None
    name: str
    category: str
    prices: Dict[str, float]
    icon: str = "shirt"

class BlocklistInput(BaseModel):
    email: str
    reason: Optional[str] = None

class OrderCancelInput(BaseModel):
    reason: Optional[str] = None

class OrderRescheduleInput(BaseModel):
    pickup_date: str
    pickup_slot: str

class FeedbackInput(BaseModel):
    rating: int  # 1-5
    comment: Optional[str] = None

# ============ Auth Helpers ============
async def get_session_token(request: Request) -> Optional[str]:
    token = request.cookies.get("session_token")
    if token:
        return token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None

async def get_current_user(request: Request) -> User:
    token = await get_session_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    # coerce datetime
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    return User(**user_doc)

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============ Auth Endpoints ============
@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Verify a Google access_token and create our own session."""
    body = await request.json()
    access_token = body.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="access_token required")

    async with httpx.AsyncClient(timeout=15) as hc:
        # Confirm the token was issued for OUR client (security check)
        tokeninfo = await hc.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"access_token": access_token},
        )
        if tokeninfo.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid access_token")
        if tokeninfo.json().get("aud") != GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=401, detail="Token was not issued for this app")

        # Fetch the actual profile info
        userinfo = await hc.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if userinfo.status_code != 200:
        raise HTTPException(status_code=401, detail="Could not fetch user info")

    data = userinfo.json()
    email = data["email"]
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture")

    # Block check
    if email not in ADMIN_EMAILS:
        blocked = await db.blocklist.find_one({"email": email})
        if blocked:
            raise HTTPException(status_code=403, detail="This account has been blocked. Contact support.")

    # Find or create user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        role = "admin" if email in ADMIN_EMAILS else existing.get("role", "user")
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "role": role}}
        )
    else:
        user_id = gen_id("user_")
        role = "admin" if email in ADMIN_EMAILS else "user"
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "created_at": now_utc().isoformat(),
        }
        await db.users.insert_one(new_user)

    # Create our own session token (was previously issued by Emergent)
    session_token = gen_id("sess_")
    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": now_utc(),
        }},
        upsert=True,
    )

    # response.set_cookie(
    #     key="session_token",
    #     value=session_token,
    #     max_age=7 * 24 * 60 * 60,
    #     httponly=True,
    #     secure=False,      # True in production over HTTPS
    #     samesite="lax",    # "none" requires secure=True
    #     path="/",
    # )
    
#     response.set_cookie(
#     key="session_token",
#     value=session_token,
#     max_age=7 * 24 * 60 * 60,
#     httponly=True,
#     secure=True,      # change from False
#     samesite="none",  # change from "lax"
#     path="/",
# )

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,        # required — mobile browsers reject SameSite=None without this
        samesite="none",    # required for cross-site (different domain) cookies
        path="/",
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = await get_session_token(request)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"success": True}

# ============ Profile ============
@api_router.patch("/users/me")
async def update_profile(update: ProfileUpdate, user: User = Depends(get_current_user)):
    updates = {k: v for k, v in update.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"user_id": user.user_id}, {"$set": updates})
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return doc

# ============ Pincodes ============
@api_router.get("/pincodes")
async def list_pincodes():
    docs = await db.pincodes.find({"active": True}, {"_id": 0}).to_list(1000)
    return docs

@api_router.get("/pincodes/check/{pincode}")
async def check_pincode(pincode: str):
    doc = await db.pincodes.find_one({"pincode": pincode, "active": True}, {"_id": 0})
    return {"serviceable": bool(doc), "area": doc}

# ============ Catalog ============
@api_router.get("/catalog")
async def get_catalog():
    docs = await db.catalog.find({}, {"_id": 0}).to_list(1000)
    return docs

# ============ Orders ============
async def _get_settings():
    doc = await db.settings.find_one({"key": "global"}, {"_id": 0}) or {}
    return {
        "min_order_value": doc.get("min_order_value", 199),
        "company_name": doc.get("company_name", "Clengo Laundry Pvt. Ltd."),
        "company_about": doc.get("company_about", "Clengo is your neighbourhood laundry partner — premium wash, iron and dry-cleaning at your doorstep across Delhi NCR. We connect households with vetted, trained laundry houses in your area for reliable, damage-free, timely service."),
        "contact_email": doc.get("contact_email", "clengo.in@gmail.com"),
    }

def _best_offer(subtotal: float, offers: list):
    """Return the best applicable offer (highest discount) for a given subtotal."""
    applicable = [o for o in offers if o.get("active") and subtotal >= o.get("threshold", 0)]
    if not applicable:
        return None
    return max(applicable, key=lambda o: o.get("discount", 0))

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, background_tasks: BackgroundTasks, user: User = Depends(get_current_user)):
    # Validate pincode
    pin_doc = await db.pincodes.find_one({"pincode": order_data.pickup_pincode, "active": True})
    if not pin_doc:
        raise HTTPException(status_code=400, detail="Pincode not serviceable")
    if not order_data.items:
        raise HTTPException(status_code=400, detail="No items in order")

    total_items = sum(i.quantity for i in order_data.items)
    subtotal = sum(i.subtotal for i in order_data.items)

    # Min order value check
    settings = await _get_settings()
    if subtotal < settings["min_order_value"]:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order value is ₹{int(settings['min_order_value'])}. Add ₹{int(settings['min_order_value'] - subtotal)} more to place order."
        )

    # Compute discount from best applicable offer
    offers = await db.offers.find({"active": True}, {"_id": 0}).to_list(100)
    best = _best_offer(subtotal, offers)
    discount = float(best["discount"]) if best else 0
    offer_applied = best.get("offer_id") if best else None
    total_amount = max(0, subtotal - discount)

    order = Order(
        order_id=gen_order_id(),
        user_id=user.user_id,
        user_email=user.email,
        user_name=user.name,
        contact_phone=order_data.contact_phone,
        items=order_data.items,
        total_items=total_items,
        subtotal=subtotal,
        discount=discount,
        offer_applied=offer_applied,
        total_amount=total_amount,
        pickup_address=order_data.pickup_address,
        pickup_pincode=order_data.pickup_pincode,
        pickup_date=order_data.pickup_date,
        pickup_slot=order_data.pickup_slot,
        notes=order_data.notes,
    )
    doc = order.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.orders.insert_one(doc)
    background_tasks.add_task(notify_order_confirmed, doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/orders/me")
async def my_orders(user: User = Depends(get_current_user)):
    docs = await db.orders.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: User = Depends(get_current_user)):
    doc = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["user_id"] != user.user_id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return doc

# ============ User Order Actions ============
@api_router.post("/orders/{order_id}/cancel")
async def user_cancel_order(order_id: str, payload: OrderCancelInput, background_tasks: BackgroundTasks, user: User = Depends(get_current_user)):
    doc = await db.orders.find_one({"order_id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["user_id"] != user.user_id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    if doc.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Order is already cancelled")
    if doc.get("status") not in ("pending", "picked_up") and user.role != "admin":
        raise HTTPException(status_code=400, detail="Order can no longer be cancelled by user")

    # Enforce 3-hour cancellation window for users (admins can cancel anytime)
    if user.role != "admin":
        try:
            created = datetime.fromisoformat(doc["created_at"]) if isinstance(doc["created_at"], str) else doc["created_at"]
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
        except Exception:
            created = now_utc()
        if (now_utc() - created) > timedelta(hours=3):
            raise HTTPException(status_code=400, detail="Cancellation window has passed. Orders can only be cancelled within 3 hours of placement.")

    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "status": "cancelled",
            "cancel_reason": payload.reason or "Cancelled by " + user.role,
            "cancelled_by": user.role,
            "updated_at": now_utc().isoformat(),
        }},
    )
    updated = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    background_tasks.add_task(notify_order_cancelled, updated, user.role, payload.reason or "")
    return updated

@api_router.post("/orders/{order_id}/feedback")
async def submit_feedback(order_id: str, payload: FeedbackInput, background_tasks: BackgroundTasks, user: User = Depends(get_current_user)):
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    doc = await db.orders.find_one({"order_id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not your order")
    if doc.get("status") != "completed":
        raise HTTPException(status_code=400, detail="You can only rate completed orders")
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "feedback_rating": payload.rating,
            "feedback_comment": payload.comment or "",
            "feedback_at": now_utc().isoformat(),
        }},
    )
    updated = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if payload.rating <= 2:
        background_tasks.add_task(notify_admins_low_feedback, updated, payload.rating, payload.comment or "")
    return updated

# ============ Public offers & settings ============
@api_router.get("/offers")
async def public_offers():
    docs = await db.offers.find({"active": True}, {"_id": 0}).sort("threshold", 1).to_list(50)
    return docs

@api_router.get("/settings")
async def public_settings():
    return await _get_settings()

# ============ Complaints ============
@api_router.post("/complaints")
async def create_complaint(payload: ComplaintCreate, background_tasks: BackgroundTasks, user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"order_id": payload.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found for the given Order ID")
    if order["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="This order does not belong to you")

    complaint = Complaint(
        complaint_id=gen_complaint_id(),
        order_id=payload.order_id,
        user_id=user.user_id,
        user_email=user.email,
        subject=payload.subject,
        message=payload.message,
    )
    doc = complaint.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.complaints.insert_one(doc)
    background_tasks.add_task(notify_admins_new_complaint, doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/complaints/me")
async def my_complaints(user: User = Depends(get_current_user)):
    docs = await db.complaints.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

# ============ Admin ============
@api_router.get("/admin/stats")
async def admin_stats(user: User = Depends(require_admin)):
    total_orders = await db.orders.count_documents({})
    pending = await db.orders.count_documents({"status": "pending"})
    in_process = await db.orders.count_documents({"status": {"$in": ["picked_up", "in_process", "out_for_delivery"]}})
    completed = await db.orders.count_documents({"status": "completed"})
    open_complaints = await db.complaints.count_documents({"status": "open"})
    total_users = await db.users.count_documents({"role": "user"})
    # Revenue sum
    pipeline = [{"$group": {"_id": None, "sum": {"$sum": "$total_amount"}}}]
    agg = await db.orders.aggregate(pipeline).to_list(1)
    revenue = agg[0]["sum"] if agg else 0
    # Feedback / ratings summary
    feedback_count = await db.orders.count_documents({"feedback_rating": {"$ne": None}})
    rating_pipeline = [
        {"$match": {"feedback_rating": {"$ne": None}}},
        {"$group": {"_id": None, "avg": {"$avg": "$feedback_rating"}}},
    ]
    rating_agg = await db.orders.aggregate(rating_pipeline).to_list(1)
    avg_rating = round(rating_agg[0]["avg"], 2) if rating_agg else None
    return {
        "total_orders": total_orders,
        "pending": pending,
        "in_process": in_process,
        "completed": completed,
        "open_complaints": open_complaints,
        "total_users": total_users,
        "revenue": revenue,
        "feedback_count": feedback_count,
        "avg_rating": avg_rating,
    }

@api_router.get("/admin/orders")
async def admin_list_orders(
    user: User = Depends(require_admin),
    status: Optional[str] = None,
    pincode: Optional[str] = None,
    service: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
):
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    if pincode:
        query["pickup_pincode"] = pincode
    if service:
        query["items.service"] = service
    if date_from or date_to:
        rng: Dict[str, Any] = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            rng["$lte"] = date_to + "T23:59:59"
        query["created_at"] = rng
    if search:
        query["$or"] = [
            {"order_id": {"$regex": search, "$options": "i"}},
            {"user_email": {"$regex": search, "$options": "i"}},
            {"user_name": {"$regex": search, "$options": "i"}},
            {"contact_phone": {"$regex": search, "$options": "i"}},
        ]
    docs = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs

@api_router.patch("/admin/orders/{order_id}/status")
async def admin_update_status(order_id: str, payload: OrderStatusUpdate, background_tasks: BackgroundTasks, user: User = Depends(require_admin)):
    valid = {"pending", "picked_up", "in_process", "out_for_delivery", "completed", "cancelled"}
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid}")
    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": payload.status, "updated_at": now_utc().isoformat(),
                  "payment_status": "paid" if payload.status == "completed" else "pending"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    doc = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    background_tasks.add_task(notify_status_update, doc, payload.status)
    return doc

@api_router.get("/admin/orders/export")
async def admin_export_orders(
    user: User = Depends(require_admin),
    status: Optional[str] = None,
    pincode: Optional[str] = None,
    service: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    if pincode:
        query["pickup_pincode"] = pincode
    if service:
        query["items.service"] = service
    if date_from or date_to:
        rng: Dict[str, Any] = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            rng["$lte"] = date_to + "T23:59:59"
        query["created_at"] = rng

    docs = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)

    rows = []
    for o in docs:
        item_lines = "; ".join([f"{i['item_name']} x{i['quantity']} ({i['service']}) ₹{i['subtotal']:.0f}" for i in o.get("items", [])])
        service_summary = ", ".join(sorted({i['service'] for i in o.get("items", [])}))
        rows.append({
            "Order ID": o.get("order_id"),
            "Created At": o.get("created_at"),
            "Customer Name": o.get("user_name"),
            "Customer Email": o.get("user_email"),
            "Contact Phone": o.get("contact_phone"),
            "Pickup Address": o.get("pickup_address"),
            "Pincode": o.get("pickup_pincode"),
            "Pickup Date": o.get("pickup_date"),
            "Pickup Slot": o.get("pickup_slot"),
            "Services": service_summary,
            "Items Detail": item_lines,
            "Total Items": o.get("total_items"),
            "Total Amount (₹)": o.get("total_amount"),
            "Status": o.get("status"),
            "Payment": o.get("payment_method"),
            "Payment Status": o.get("payment_status"),
            "Notes": o.get("notes") or "",
        })

    df = pd.DataFrame(rows) if rows else pd.DataFrame(columns=[
        "Order ID", "Created At", "Customer Name", "Customer Email", "Contact Phone",
        "Pickup Address", "Pincode", "Pickup Date", "Pickup Slot", "Services",
        "Items Detail", "Total Items", "Total Amount (₹)", "Status", "Payment", "Payment Status", "Notes",
    ])
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Orders")
    buf.seek(0)
    filename = f"clengo_orders_{now_utc().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@api_router.get("/admin/complaints")
async def admin_list_complaints(user: User = Depends(require_admin), status: Optional[str] = None):
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    docs = await db.complaints.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs

@api_router.patch("/admin/complaints/{complaint_id}")
async def admin_update_complaint(complaint_id: str, payload: ComplaintUpdate, background_tasks: BackgroundTasks, user: User = Depends(require_admin)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.complaints.update_one({"complaint_id": complaint_id}, {"$set": updates})
    doc = await db.complaints.find_one({"complaint_id": complaint_id}, {"_id": 0})
    if updates.get("status") == "resolved" and updates.get("admin_response"):
        background_tasks.add_task(notify_complaint_resolved, doc)
    return doc

# ---- Feedback ----
@api_router.get("/admin/feedback")
async def admin_list_feedback(
    user: User = Depends(require_admin),
    min_rating: Optional[int] = None,
    max_rating: Optional[int] = None,
):
    rating_q: Dict[str, Any] = {"$ne": None}
    if min_rating is not None or max_rating is not None:
        rating_q = {"$ne": None}
        if min_rating is not None:
            rating_q["$gte"] = min_rating
        if max_rating is not None:
            rating_q["$lte"] = max_rating
    docs = await db.orders.find(
        {"feedback_rating": rating_q},
        {"_id": 0, "order_id": 1, "user_name": 1, "user_email": 1, "feedback_rating": 1,
         "feedback_comment": 1, "feedback_at": 1, "total_amount": 1, "created_at": 1},
    ).sort("feedback_at", -1).to_list(2000)
    return docs

@api_router.get("/admin/pincodes")
async def admin_list_pincodes(user: User = Depends(require_admin)):
    return await db.pincodes.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/admin/pincodes")
async def admin_add_pincode(area: PincodeArea, user: User = Depends(require_admin)):
    existing = await db.pincodes.find_one({"pincode": area.pincode})
    if existing:
        await db.pincodes.update_one({"pincode": area.pincode}, {"$set": area.model_dump()})
    else:
        await db.pincodes.insert_one(area.model_dump())
    return area.model_dump()

@api_router.delete("/admin/pincodes/{pincode}")
async def admin_delete_pincode(pincode: str, user: User = Depends(require_admin)):
    await db.pincodes.delete_one({"pincode": pincode})
    return {"success": True}

# ---- Catalog CRUD ----
@api_router.post("/admin/catalog")
async def admin_upsert_catalog(item: CatalogItemInput, user: User = Depends(require_admin)):
    item_id = item.item_id or ("itm_" + uuid.uuid4().hex[:8])
    doc = item.model_dump()
    doc["item_id"] = item_id
    existing = await db.catalog.find_one({"item_id": item_id})
    if existing:
        await db.catalog.update_one({"item_id": item_id}, {"$set": doc})
    else:
        await db.catalog.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.delete("/admin/catalog/{item_id}")
async def admin_delete_catalog(item_id: str, user: User = Depends(require_admin)):
    r = await db.catalog.delete_one({"item_id": item_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"success": True}

# ---- Offers CRUD ----
@api_router.get("/admin/offers")
async def admin_list_offers(user: User = Depends(require_admin)):
    return await db.offers.find({}, {"_id": 0}).sort("threshold", 1).to_list(100)

@api_router.post("/admin/offers")
async def admin_upsert_offer(offer: OfferModel, user: User = Depends(require_admin)):
    offer_id = offer.offer_id or ("off_" + uuid.uuid4().hex[:8])
    doc = offer.model_dump()
    doc["offer_id"] = offer_id
    existing = await db.offers.find_one({"offer_id": offer_id})
    if existing:
        await db.offers.update_one({"offer_id": offer_id}, {"$set": doc})
    else:
        await db.offers.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.delete("/admin/offers/{offer_id}")
async def admin_delete_offer(offer_id: str, user: User = Depends(require_admin)):
    r = await db.offers.delete_one({"offer_id": offer_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"success": True}

# ---- Settings ----
@api_router.get("/admin/settings")
async def admin_get_settings(user: User = Depends(require_admin)):
    return await _get_settings()

@api_router.patch("/admin/settings")
async def admin_update_settings(payload: SettingsUpdate, user: User = Depends(require_admin)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.settings.update_one(
            {"key": "global"},
            {"$set": {**updates, "key": "global"}},
            upsert=True,
        )
    return await _get_settings()

# ---- Blocklist ----
@api_router.get("/admin/blocklist")
async def admin_list_blocklist(user: User = Depends(require_admin)):
    return await db.blocklist.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.post("/admin/blocklist")
async def admin_add_blocklist(payload: BlocklistInput, user: User = Depends(require_admin)):
    email = payload.email.strip().lower()
    if email in ADMIN_EMAILS:
        raise HTTPException(status_code=400, detail="Cannot block an admin email")
    entry = {"email": email, "reason": payload.reason or "", "created_at": now_utc().isoformat(), "blocked_by": user.email}
    await db.blocklist.update_one({"email": email}, {"$set": entry}, upsert=True)
    # Also invalidate any active sessions for this email
    u = await db.users.find_one({"email": email})
    if u:
        await db.user_sessions.delete_many({"user_id": u["user_id"]})
    return entry

@api_router.delete("/admin/blocklist/{email}")
async def admin_remove_blocklist(email: str, user: User = Depends(require_admin)):
    await db.blocklist.delete_one({"email": email.lower()})
    return {"success": True}

# ---- Order cancel & reschedule (admin) ----
@api_router.post("/admin/orders/{order_id}/cancel")
async def admin_cancel_order(order_id: str, payload: OrderCancelInput, background_tasks: BackgroundTasks, user: User = Depends(require_admin)):
    doc = await db.orders.find_one({"order_id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "status": "cancelled",
            "cancel_reason": payload.reason or "Cancelled by admin",
            "cancelled_by": "admin",
            "updated_at": now_utc().isoformat(),
        }},
    )
    updated = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    background_tasks.add_task(notify_order_cancelled, updated, "admin", payload.reason or "")
    return updated

@api_router.post("/admin/orders/{order_id}/reschedule")
async def admin_reschedule_order(order_id: str, payload: OrderRescheduleInput, background_tasks: BackgroundTasks, user: User = Depends(require_admin)):
    doc = await db.orders.find_one({"order_id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "pickup_date": payload.pickup_date,
            "pickup_slot": payload.pickup_slot,
            "updated_at": now_utc().isoformat(),
        }},
    )
    updated = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    background_tasks.add_task(notify_order_rescheduled, updated, payload.pickup_date, payload.pickup_slot)
    return updated

# ============ Seed Data ============
@app.on_event("startup")
async def seed_startup():
    # Seed pincodes
    if await db.pincodes.count_documents({}) == 0:
        pincodes = [
            {"pincode": "110001", "city": "New Delhi", "area": "Connaught Place", "active": True},
            {"pincode": "110017", "city": "New Delhi", "area": "Saket", "active": True},
            {"pincode": "110019", "city": "New Delhi", "area": "Kalkaji", "active": True},
            {"pincode": "110024", "city": "New Delhi", "area": "Lajpat Nagar", "active": True},
            {"pincode": "110048", "city": "New Delhi", "area": "Greater Kailash", "active": True},
            {"pincode": "110070", "city": "New Delhi", "area": "Vasant Kunj", "active": True},
            {"pincode": "201301", "city": "Noida", "area": "Sector 1-15", "active": True},
            {"pincode": "201303", "city": "Noida", "area": "Sector 62-63", "active": True},
            {"pincode": "201309", "city": "Noida", "area": "Sector 137", "active": True},
            {"pincode": "122001", "city": "Gurgaon", "area": "Old Gurgaon", "active": True},
            {"pincode": "122002", "city": "Gurgaon", "area": "DLF Phase 1-2", "active": True},
            {"pincode": "122009", "city": "Gurgaon", "area": "Sector 49-57", "active": True},
        ]
        await db.pincodes.insert_many(pincodes)
        logging.info(f"Seeded {len(pincodes)} pincodes")

    # Seed catalog
    if await db.catalog.count_documents({}) == 0:
        catalog = [
            # Daily wear
            {"item_id": "itm_shirt", "name": "Shirt", "category": "daily", "icon": "shirt", "prices": {"wash": 25, "iron": 12, "dryclean": 90}},
            {"item_id": "itm_tshirt", "name": "T-Shirt", "category": "daily", "icon": "shirt", "prices": {"wash": 20, "iron": 10, "dryclean": 80}},
            {"item_id": "itm_trouser", "name": "Trouser / Pant", "category": "daily", "icon": "footprints", "prices": {"wash": 30, "iron": 15, "dryclean": 120}},
            {"item_id": "itm_jeans", "name": "Jeans", "category": "daily", "icon": "footprints", "prices": {"wash": 35, "iron": 18, "dryclean": 140}},
            {"item_id": "itm_kurta", "name": "Kurta", "category": "ethnic", "icon": "shirt", "prices": {"wash": 30, "iron": 15, "dryclean": 130}},
            {"item_id": "itm_pyjama", "name": "Pyjama", "category": "ethnic", "icon": "footprints", "prices": {"wash": 25, "iron": 12, "dryclean": 100}},
            # Ethnic / Premium
            {"item_id": "itm_saree", "name": "Saree", "category": "ethnic", "icon": "sparkles", "prices": {"wash": 90, "iron": 40, "dryclean": 220}},
            {"item_id": "itm_lehenga", "name": "Lehenga", "category": "premium", "icon": "sparkles", "prices": {"wash": 250, "iron": 90, "dryclean": 600}},
            {"item_id": "itm_suit", "name": "Suit (2 pcs)", "category": "premium", "icon": "briefcase", "prices": {"wash": 200, "iron": 80, "dryclean": 450}},
            {"item_id": "itm_blazer", "name": "Blazer / Coat", "category": "premium", "icon": "briefcase", "prices": {"wash": 150, "iron": 60, "dryclean": 300}},
            {"item_id": "itm_sherwani", "name": "Sherwani", "category": "premium", "icon": "sparkles", "prices": {"wash": 250, "iron": 90, "dryclean": 550}},
            # Household
            {"item_id": "itm_bedsheet_s", "name": "Bedsheet (Single)", "category": "household", "icon": "bed", "prices": {"wash": 40, "iron": 25, "dryclean": 150}},
            {"item_id": "itm_bedsheet_d", "name": "Bedsheet (Double)", "category": "household", "icon": "bed", "prices": {"wash": 70, "iron": 40, "dryclean": 220}},
            {"item_id": "itm_curtain", "name": "Curtain (per piece)", "category": "household", "icon": "bed", "prices": {"wash": 60, "iron": 30, "dryclean": 180}},
            {"item_id": "itm_towel", "name": "Towel", "category": "household", "icon": "bed", "prices": {"wash": 20, "iron": 10, "dryclean": 70}},
            {"item_id": "itm_blanket", "name": "Blanket", "category": "household", "icon": "bed", "prices": {"wash": 120, "iron": 0, "dryclean": 250}},
        ]
        await db.catalog.insert_many(catalog)
        logging.info(f"Seeded {len(catalog)} catalog items")

    # Seed admin user (idempotent)
    for admin_email in ADMIN_EMAILS:
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            await db.users.insert_one({
                "user_id": gen_id("user_"),
                "email": admin_email,
                "name": "Clengo Admin",
                "role": "admin",
                "picture": None,
                "created_at": now_utc().isoformat(),
            })
        else:
            await db.users.update_one({"email": admin_email}, {"$set": {"role": "admin"}})

    # Seed offers
    if await db.offers.count_documents({}) == 0:
        default_offers = [
            {"offer_id": "off_349", "threshold": 349, "discount": 100, "label": "Save ₹100 on orders above ₹349", "active": True},
            {"offer_id": "off_499", "threshold": 499, "discount": 149, "label": "Save ₹149 on orders above ₹499", "active": True},
            {"offer_id": "off_599", "threshold": 599, "discount": 200, "label": "Save ₹200 on orders above ₹599", "active": True},
            {"offer_id": "off_799", "threshold": 799, "discount": 300, "label": "Save ₹300 on orders above ₹799", "active": True},
        ]
        await db.offers.insert_many(default_offers)
        logging.info(f"Seeded {len(default_offers)} offers")

    # Seed global settings
    existing_settings = await db.settings.find_one({"key": "global"})
    if not existing_settings:
        await db.settings.insert_one({
            "key": "global",
            "min_order_value": 199,
            "company_name": "Clengo Laundry Pvt. Ltd.",
            "company_about": (
                "Clengo (Clengo Laundry Pvt. Ltd.) is a Delhi NCR based on-demand laundry service that connects "
                "urban households with vetted neighbourhood laundry houses. Founded in 2026, our mission is simple: "
                "give every family back the time they'd otherwise spend on laundry. We handle everything — pickup, "
                "washing, ironing, dry-cleaning, folding and doorstep delivery — through a network of trained "
                "local partners who care about your clothes the way you do. Every order is tracked with a unique "
                "Order ID, protected against damage, and delivered in 48 hours. Cash on Delivery. No hidden charges. "
                "Just freshness, delivered."
            ),
            "contact_email": "clengo.in@gmail.com",
        })
        logging.info("Seeded default settings")

@api_router.get("/")
async def root():
    return {"message": "Clengo API", "version": "1.0"}

@api_router.get("/config")
async def get_config():
    """Public config: brand number, etc."""
    return {"whatsapp_number": CLENGO_WHATSAPP}

# Include the router in the main app
app.include_router(api_router)

# app.add_middleware(
#     CORSMiddleware,
#     allow_credentials=True,
#     allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://clengo-project-frontend.vercel.app"],  # exact origin, not "*"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()