# AgriLink - AI Agent Instructions

AgriLink is a production-ready agricultural marketplace platform connecting farmers, buyers, and logistics providers.

**Current Status:**
- ✅ Phase 1: Security Hardening (JWT authentication, input validation, secure endpoints)
- ✅ Phase 2: PostgreSQL Database (production-grade concurrent access)
- 🔄 Phase 3+: Payment, notifications, advanced features (coming soon)

---

## Quick Start Commands

### Backend (Python/Flask + PostgreSQL)
```bash
# Navigate to backend
cd backend

# 1. Install dependencies
pip install -r requirements.txt

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials and JWT secret

# 3. Ensure PostgreSQL is running
# PostgreSQL must be listening on DB_HOST:DB_PORT

# 4. Run the server (port 5000)
python main.py
```

### Frontend (React)
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server (port 3000)
npm start
```

---

## Architecture Overview

### Backend Structure (`backend/`)
- **main.py** (NEW - Phase 1 & 2):
  - PostgreSQL database for production scalability
  - JWT token-based authentication (Bearer tokens)
  - Input validation and sanitization
  - CORS restricted to allowed origins
  - Automatic schema creation on startup
  - All endpoints secured with `@token_required` decorator
  - Password hashing with werkzeug
  
- **.env.example**:
  - Copy to `.env` and configure
  - PostgreSQL connection: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  - JWT config: `JWT_SECRET_KEY`, `JWT_EXPIRATION_HOURS`
  - CORS: `ALLOWED_ORIGINS`

- **requirements.txt** (UPDATED):
  - `psycopg2-binary` - PostgreSQL adapter
  - `PyJWT` - JWT token handling
  - `validators` - Input validation
  - `python-dotenv` - Environment configuration

### Frontend Structure (`frontend/src/`)
- **App.js** (UPDATED - Phase 1):
  - JWT token storage in localStorage (`agri_auth` key)
  - Bearer token in Authorization header for all authenticated requests
  - Automatic logout on 401 (expired token)
  - Updated endpoints use `/api/` prefix
  - Changed filtering from `seller_phone` to `seller_id`

- **LoginRegister.js** (UPDATED - Phase 1):
  - JWT token returned on login
  - Updated endpoints: `/api/auth/register`, `/api/auth/login`
  - New field: `email_or_phone` for login flexibility

---

## API Changes (Phase 1 & 2)
  - Tab navigation: Home, Products, Transport, Profile
  - Product and vehicle management forms
  - Search functionality
  
- **LoginRegister.js** (UPDATED - Phase 1):
  - JWT token returned on successful login/registration
  - Stores token in localStorage
  
- **index.js**: React DOM entry point

---

## Key API Endpoints

### All Endpoints
- Base URL: `http://localhost:5000/api/`
- **Authentication**: Pass JWT token in `Authorization: Bearer <token>` header
- **Public endpoints**: `/api/products` (GET), `/api/vehicles` (GET), `/api/health`
- **Protected endpoints**: Require valid JWT token (all POST/PATCH/DELETE)

### Authentication Endpoints
```
POST /api/auth/register
Body: { name, email, phone, password }
Response: { message, status: 201 }

POST /api/auth/login
Body: { email_or_phone, password }
Response: { token: "jwt_token_here", user: {...} }

GET /api/auth/verify-token
Headers: { Authorization: "Bearer <token>" }
Response: { user: {...} }
```

### Products Endpoints
```
GET /api/products?search=term&limit=50&offset=0
Response: [ { id, seller_id, item, price, location, stock, image, seller_name, ... }, ... ]

POST /api/products (REQUIRES TOKEN)
Headers: { Authorization: "Bearer <token>" }
Body: { item, price, location, stock, image }
Response: { message, product_id }

DELETE /api/products/<product_id> (REQUIRES TOKEN)
Headers: { Authorization: "Bearer <token>" }
Response: { message }
```

### Vehicles Endpoints
```
GET /api/vehicles?location=term&limit=50&offset=0
Response: [ { id, owner_id, owner_name, owner_phone, vehicle_type, ... }, ... ]

POST /api/vehicles (REQUIRES TOKEN)
Headers: { Authorization: "Bearer <token>" }
Body: { vehicle_type, location, capacity }
Response: { message, vehicle_id }

DELETE /api/vehicles/<vehicle_id> (REQUIRES TOKEN)
Headers: { Authorization: "Bearer <token>" }
Response: { message }
```

### User Endpoints
```
GET /api/users/<user_id> (REQUIRES TOKEN)
Headers: { Authorization: "Bearer <token>" }
Response: { user: { id, email, phone, name, profile_pic, role } }

PATCH /api/users/<user_id>/profile-pic (REQUIRES TOKEN)
Headers: { Authorization: "Bearer <token>" }
Body: { profile_pic: "base64_data_url" }
Response: { user: {...} }
```

### Health Check
```
GET /api/health
Response: { status: "ok", database: "connected", timestamp: "ISO-8601" }
```

---

## Database Schema (PostgreSQL)

### Users Table
```sql
id SERIAL PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
phone VARCHAR(20) UNIQUE NOT NULL
name VARCHAR(255) NOT NULL
password_hash VARCHAR(255) NOT NULL (hashed, never returned)
profile_pic TEXT (optional)
role VARCHAR(50) DEFAULT 'user'
is_verified BOOLEAN DEFAULT FALSE
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Products Table
```sql
id SERIAL PRIMARY KEY
seller_id INTEGER NOT NULL (FOREIGN KEY -> users.id)
item VARCHAR(255) NOT NULL
price DECIMAL(10, 2) NOT NULL
location VARCHAR(255) NOT NULL
stock VARCHAR(100) NOT NULL
image TEXT (optional)
seller_name VARCHAR(255)
seller_phone VARCHAR(20)
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Vehicles Table
```sql
id SERIAL PRIMARY KEY
owner_id INTEGER NOT NULL (FOREIGN KEY -> users.id)
owner_name VARCHAR(255) NOT NULL
owner_phone VARCHAR(20) NOT NULL
vehicle_type VARCHAR(100) NOT NULL
location VARCHAR(255) NOT NULL
capacity VARCHAR(100) NOT NULL
is_available BOOLEAN DEFAULT TRUE
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

---

## Development Conventions

### State Management (Frontend)
- Frontend uses React hooks (useState, useEffect, useCallback, useMemo)
- Session persisted in localStorage under key `agri_auth`
- Stored as: `{ token: "jwt_token", user: { id, name, email, phone, role, profile_pic } }`
- Auto-logout on 401 (expired token)

### JWT Token Flow
1. User logs in → Backend returns `{ token, user }`
2. Frontend stores in `localStorage.agri_auth`
3. Frontend includes `Authorization: Bearer <token>` in all protected requests
4. Backend validates token with `@token_required` decorator
5. If token expired (401), frontend clears storage and logs out

### API Communication
- Base URL: `http://localhost:5000` (via `REACT_APP_API_URL` env var)
- All requests use `fetch()` API
- Responses are JSON
- Error handling: 401 triggers logout, other errors show user message

### Form Handling
- Controlled components with state hooks
- Form state initialized separately (e.g., `initialProductForm`)
- Image uploads: Base64 data URLs (no multipart)

### Input Validation (Backend)
- Email validation: RFC-compliant with `validators` library
- Phone validation: 10+ digits, no spaces
- Password validation: Minimum 8 characters
- All inputs sanitized and length-limited
- SQL injection protected by parameterized queries

### CORS Configuration
- Restricted to `ALLOWED_ORIGINS` in `.env`
- Development: `http://localhost:3000`
- Production: Your actual domain(s)

---

## Security Features (Phase 1)

### ✅ Authentication
- JWT tokens with configurable expiration (default: 24 hours)
- Tokens stored in localStorage (browser)
- Bearer token in Authorization header
- Automatic token verification on protected endpoints

### ✅ Authorization
- `@token_required` decorator validates JWT
- Users can only modify their own data
- Product/vehicle ownership verified before deletion
- 403 Forbidden response for unauthorized access

### ✅ Password Security
- Hashing with werkzeug `generate_password_hash()`
- Bcrypt algorithm (configurable)
- Never store plaintext passwords
- Password field never returned in API responses

### ✅ Input Security
- Email validation (RFC standard)
- Phone number validation
- String length limits (prevents buffer overflow)
- No SQL injection (parameterized queries)

### ✅ API Security
- CORS restricted to known origins
- Rate limiting ready (can add middleware)
- HTTPS enforced in production (via reverse proxy)
- Error messages don't leak sensitive info

---

## Common Development Tasks

### Adding a New Feature
1. **Backend**: Add route with `@token_required` if needed
2. **Validation**: Add input validation in handler
3. **Database**: Update schema if needed (automatic on init)
4. **Frontend**: Add state and UI component
5. **API Call**: Use `fetchJson()` helper with Authorization header

### Testing an Endpoint
```bash
# Get health status
curl http://localhost:5000/api/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","phone":"+254712345678","password":"Pass123!"}'

# Login (get token)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email_or_phone":"test@test.com","password":"Pass123!"}'

# Use token in authenticated request
TOKEN="eyJ..."
curl -X GET http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN"
```

### Database Issues
- **Connection refused**: PostgreSQL not running
- **permission denied**: Wrong database credentials in `.env`
- **relation does not exist**: Tables not created (check logs on startup)

### Frontend Token Issues
- **Token not sending**: Check `agri_auth` in localStorage
- **401 on requests**: Token expired or invalid
- **CORS errors**: Check `ALLOWED_ORIGINS` in backend `.env`

### Adding Custom Validation
```python
# In main.py, add before route handler
def validate_custom(value):
    if not isinstance(value, str):
        return False
    # Your validation logic
    return True

# Use in endpoint
if not validate_custom(user_input):
    return jsonify({'message': 'Invalid input'}), 400
```

---

## Deployment & Production

### Before Going Live

**Security Checklist:**
- [ ] Change `JWT_SECRET_KEY` to strong random value
- [ ] Set `DEBUG=False` in `.env`
- [ ] Use strong database password
- [ ] Update `ALLOWED_ORIGINS` with your domain
- [ ] Set `FLASK_ENV=production`
- [ ] Configure HTTPS/SSL certificate
- [ ] Set up database backups
- [ ] Enable logging and monitoring

**Performance:**
- [ ] Add database indexes (auto-created for `created_at`, `seller_id`, etc.)
- [ ] Implement pagination (limit 50-100 products per request)
- [ ] Add caching layer (Redis) for product searches
- [ ] Enable gzip compression in reverse proxy

**Recommended Hosting:**
- **Frontend**: Vercel (free tier, auto-deploys from Git)
- **Backend**: Render or Railway (PostgreSQL included)
- **Database**: PostgreSQL managed service (included with Render/Railway)

### Environment Setup

**Development:**
```
FLASK_ENV=development
DEBUG=True
DB_HOST=localhost
JWT_EXPIRATION_HOURS=24
```

**Production:**
```
FLASK_ENV=production
DEBUG=False
DB_HOST=managed-postgres-service
JWT_EXPIRATION_HOURS=24
```

### Database Backups
```bash
# PostgreSQL daily backup script
pg_dump -U agrilink_user -d agrilink_db | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore from backup
gunzip -c backup_20240513.sql.gz | psql -U agrilink_user -d agrilink_db
```

---

## Important Notes for Agents

- **Do NOT store passwords in code** - Always use werkzeug hashing
- **Do NOT commit .env files** - Use `.env.example` as template
- **Do NOT bypass token validation** - Always use `@token_required`
- **Do NOT hardcode secrets** - Load from environment variables
- **Verify ownership** - Check `seller_id == request.user_id` before modifications
- **Sanitize all inputs** - Use `sanitize_input()` function
- **Return helpful error messages** - But don't leak system details

---

## File References

See also:
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Detailed Phase 1 & 2 setup and migration
- `.env.example` - Environment variable template
- `backend/main.py` - Complete implementation
- `frontend/src/App.js` - Frontend with JWT integration
- `requirements.txt` - Python dependencies

---

When working on features:
- [ ] Backend endpoint returns 200/201 status for success
- [ ] Frontend receives and parses JSON correctly
- [ ] User session persists on page refresh (localStorage)
- [ ] Product/vehicle forms clear after successful submission
- [ ] Search filters work on existing product list
- [ ] Profile picture uploads work (check file size < 16MB)
- [ ] Error messages display to user on API failures
