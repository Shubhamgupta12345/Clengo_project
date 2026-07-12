# Clengo — Laundry Service App

> **Freshness delivered at doorstep.**
> A full-stack laundry booking platform for Delhi NCR — Wash, Iron & Dry Clean at your doorstep.

![Tech](https://img.shields.io/badge/stack-React%2019%20%2B%20FastAPI%20%2B%20MongoDB-D4A017)
![Auth](https://img.shields.io/badge/auth-Google%20Sign--In-black)
![License](https://img.shields.io/badge/license-Proprietary-lightgrey)

---

## Features

### Customer
- Serviceability check by pincode before booking
- 4-step order flow: Pincode → Items → Pickup → Confirm
- 16-item catalog (Shirt, Saree, Bedsheet, Suit, etc.) with per-service pricing (wash / iron / dry-clean)
- Unique human-readable Order ID: `CLG-YYMMDD-XXXXXX`
- COD only (no online payment in Phase 1)
- My Orders with timeline stepper + copy-to-clipboard order ID
- Complaint system tied to Order ID
- Profile page (phone, address, default pincode)
- WhatsApp integration — one-tap "Confirm on WhatsApp" & floating support FAB

### Admin (`admin@clengo.in`, `shubham2710gupta@gmail.com`)
- 7-metric KPI dashboard (total orders, pending, in-process, completed, revenue, users, open complaints)
- Orders table with filters — search / status / service / pincode / date range
- **Excel export** with applied filters
- **One-click "Mark Complete"** + full status modal
- WhatsApp customer directly from the row
- Complaints management (respond + resolve)
- Serviceable pincodes CRUD

---

## Tech Stack

| Layer      | Technology                                         |
| ---------- | -------------------------------------------------- |
| Frontend   | React 19, React Router 7, Tailwind CSS, shadcn/ui  |
| Backend    | FastAPI (Python 3.11), Motor (async MongoDB)       |
| Database   | MongoDB 6+                                         |
| Auth       | Emergent-managed Google OAuth (session cookies)    |
| Excel      | pandas + openpyxl                                  |
| Icons      | lucide-react                                       |
| Toast      | sonner                                             |

---

## Project Structure

```
clengo/
├── backend/
│   ├── server.py           # All FastAPI routes + models + seed
│   ├── requirements.txt    # Python deps
│   ├── .env                # Backend env (see .env.example)
│   └── tests/              # pytest suite (43 tests, all pass)
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/          # Landing, Order, MyOrders, Complaint, Profile, Admin, AuthCallback
│   │   ├── components/     # Navbar, Footer, Logo, PincodeChecker, WhatsAppFab
│   │   ├── context/        # AuthContext.jsx
│   │   ├── lib/            # api.js, whatsapp.js
│   │   └── constants/testIds/
│   ├── package.json
│   └── .env                # Frontend env (see .env.example)
├── design_guidelines.json  # UI design tokens
├── auth_testing.md         # QA guide for seeded sessions
└── README.md               # (this file)
```

---

## Local Development Setup

### Prerequisites

| Tool                  | Version | Install                                                                                     |
| --------------------- | ------- | ------------------------------------------------------------------------------------------- |
| **Node.js**           | ≥ 18    | https://nodejs.org (or `nvm install 20`)                                                    |
| **Yarn**              | ≥ 1.22  | `npm install -g yarn`                                                                       |
| **Python**            | ≥ 3.11  | https://python.org (or `pyenv install 3.11`)                                                |
| **MongoDB Community** | ≥ 6.0   | https://www.mongodb.com/try/download/community — or use MongoDB Atlas free tier             |
| **Git**               | any     | https://git-scm.com                                                                         |

> **Windows users**: use PowerShell or WSL2. Commands with `sudo` don't apply; MongoDB installs as a Windows Service automatically.

---

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/clengo.git
cd clengo
```

### 2. Start MongoDB

**Mac (Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo systemctl start mongod
```

**Windows:** MongoDB runs as a service automatically after install. Confirm via Services.msc or `net start MongoDB`.

**Alternative — Atlas (cloud):** create a free cluster at https://cloud.mongodb.com and use its connection string in `backend/.env`.

---

### 3. Backend setup (`http://localhost:8001`)

```bash
cd backend

# Create virtual env
python3 -m venv venv
source venv/bin/activate            # Mac/Linux
# venv\Scripts\activate              # Windows PowerShell

# Install dependencies
pip install -r requirements.txt

# Copy env template
cp .env.example .env                 # Mac/Linux
# copy .env.example .env             # Windows

# Start FastAPI (with hot reload)
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Backend now serves at http://localhost:8001. Try it:
```bash
curl http://localhost:8001/api/          # → {"message":"Clengo API","version":"1.0"}
curl http://localhost:8001/api/pincodes  # → 12 seeded serviceable areas
curl http://localhost:8001/api/catalog   # → 16 catalog items
```

On first startup, the backend automatically **seeds**:
- 12 serviceable pincodes (Delhi, Noida, Gurgaon)
- 16 catalog items across daily / ethnic / household / premium categories
- Admin user for `admin@clengo.in`

---

### 4. Frontend setup (`http://localhost:3000`)

Open a **second terminal**:

```bash
cd frontend

# Install dependencies (use yarn, not npm — as configured in package.json)
yarn install

# Copy env template
cp .env.example .env                 # Mac/Linux
# copy .env.example .env             # Windows

# Start CRA dev server
yarn start
```

The app opens at http://localhost:3000 with hot reload.

---

### 5. Bootstrap an admin user (for local testing without Google OAuth)

Since Google Sign-In requires a public HTTPS URL to work, for local testing you can seed a session directly in MongoDB:

```bash
mongosh --eval "
use('clengo_local');
var uid = 'user_local_admin';
var token = 'local_admin_token';
db.users.updateOne(
  { user_id: uid },
  { \$set: {
    user_id: uid,
    email: 'admin@clengo.in',
    name: 'Local Admin',
    role: 'admin',
    phone: '9999999999',
    address: 'Localhost',
    pincode: '110001',
    created_at: new Date().toISOString()
  }},
  { upsert: true }
);
db.user_sessions.updateOne(
  { session_token: token },
  { \$set: {
    user_id: uid,
    session_token: token,
    expires_at: new Date(Date.now() + 7*24*60*60*1000),
    created_at: new Date()
  }},
  { upsert: true }
);
print('Local admin session: ' + token);
"
```

Then, in the browser DevTools console at `http://localhost:3000`, run:
```js
document.cookie = "session_token=local_admin_token; path=/; SameSite=Lax";
location.reload();
```

You're now logged in as admin locally. Visit http://localhost:3000/admin.

---

## Environment Files

### `backend/.env.example`
```
MONGO_URL=mongodb+srv://shubham2710gupta_db_user:Clengo@123@cluster0.34pn5ke.mongodb.net/?appName=Cluster0 
DB_NAME=clengo_local
CORS_ORIGINS=http://localhost:3000
```yarn start

### `frontend/.env.example`
```
REACT_APP_BACKEND_URL=http://localhost:8000
WDS_SOCKET_PORT=0
```

Copy both to `.env` (same folder) — the app reads only `.env`, never `.env.example`.

---

## Running Tests

Backend pytest suite (43 tests, all pass):
```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

---

## Deployment Notes

- **Preview / staging** is managed by Emergent (the `.emergentagent.com` URL).
- **Production**: point your custom domain (`www.clengo.in`) via CNAME once you deploy from the Emergent chat UI.
- **Admin emails**: edit `ADMIN_EMAILS` set at the top of `backend/server.py` to add more team members.
- **WhatsApp**: business number is defined as `CLENGO_WHATSAPP` in `backend/server.py`. Update the digits if the number changes.

---

## Roadmap

- [ ] Delivery partner app (accept/reject orders) — Phase 2
- [ ] Razorpay / UPI alongside COD
- [ ] WhatsApp Business Cloud API for auto-send order status updates
- [ ] SMS OTP fallback (Twilio / MSG91)
- [ ] Ratings & reviews for laundry partners
- [ ] Recurring / subscription pickups
- [ ] Multi-address book per user

---

## License
Proprietary — © Clengo Laundry Pvt. Ltd.
