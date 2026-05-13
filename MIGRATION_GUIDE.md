# AgriLink Phase 1 & 2 Migration Guide

## Phase 1: Security Hardening ✅
- JWT token-based authentication
- Input validation and sanitization
- Password hashing with werkzeug
- CORS restricted to allowed origins
- API endpoints secured with token verification

## Phase 2: Database Migration ✅
- **SQLite → PostgreSQL**: From local file database to production-grade RDBMS
- **Automatic schema creation**: All tables and indexes created on startup
- **Concurrent access**: PostgreSQL handles multiple users reliably

---

## Step-by-Step Setup Guide

### Prerequisites
- Python 3.8+
- Node.js 14+
- PostgreSQL 12+ installed and running
- Git

### Step 1: Backend Setup

#### 1.1 Install PostgreSQL and Create Database

**Windows (using pgAdmin or command line):**
```sql
-- Create database
CREATE DATABASE agrilink_db;

-- Create user with password
CREATE USER agrilink_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
ALTER ROLE agrilink_user SET client_encoding TO 'utf8';
ALTER ROLE agrilink_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE agrilink_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE agrilink_db TO agrilink_user;
```

**macOS/Linux:**
```bash
# Install PostgreSQL (macOS)
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Or manually
postgres -D /usr/local/var/postgres

# Access PostgreSQL CLI
psql postgres

# Run the SQL commands above
```

#### 1.2 Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**requirements.txt includes:**
- flask==2.3.3 - Web framework
- flask-cors==4.0.0 - CORS handling
- psycopg2-binary==2.9.7 - PostgreSQL adapter
- PyJWT==2.8.1 - JWT token generation
- validators==0.22.0 - Input validation
- python-dotenv==1.0.0 - Environment variables

#### 1.3 Configure Environment Variables

```bash
# Copy example to .env
cp .env.example .env

# Edit .env with your values
```

**.env file:**
```
FLASK_ENV=development
DEBUG=True
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agrilink_db
DB_USER=agrilink_user
DB_PASSWORD=your_secure_password_here
JWT_SECRET_KEY=generate_a_strong_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

**⚠️ Generate a Strong JWT Secret Key:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
# Output: a1b2c3d4e5f6... (copy this)
```

#### 1.4 Run Backend

```bash
python main.py
```

**Expected output:**
```
╔════════════════════════════════════════════════════════════════╗
║           🌾 AgriLink Backend - Production Ready               ║
║          Phase 1: Security Hardening ✅                        ║
║          Phase 2: PostgreSQL Database ✅                       ║
╚════════════════════════════════════════════════════════════════╝

📋 Running in DEVELOPMENT mode on port 5000
🔒 CORS allowed origins: ['http://localhost:3000']
✅ PostgreSQL database initialized successfully
```

### Step 2: Frontend Setup

#### 2.1 Install Node Dependencies

```bash
cd frontend
npm install
```

#### 2.2 Configure Environment Variables (Optional)

Create `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:5000
```

#### 2.3 Run Frontend

```bash
npm start
```

**Expected output:**
```
Compiled successfully!

You can now view agrilink-frontend in the browser.

Local:            http://localhost:3000
```

---

## Data Migration from SQLite (if upgrading)

If you have existing SQLite data, follow these steps:

### Step 1: Backup Your SQLite Database
```bash
cp agrilink.db agrilink_backup.db
```

### Step 2: Export SQLite Data
```bash
# Connect to SQLite
sqlite3 agrilink.db

# Export tables as SQL
.schema users
.schema products
.schema vehicles

# Export data as CSV
.mode csv
.output users.csv
SELECT * FROM users;
.quit
```

### Step 3: Import into PostgreSQL

```bash
# Connect to PostgreSQL and create CSV import script
psql -U agrilink_user -d agrilink_db

-- Create temporary staging table
CREATE TABLE users_staging (
    name TEXT,
    email TEXT,
    phone TEXT,
    password_hash TEXT,
    profile_pic TEXT,
    role TEXT
);

-- Import from CSV
\COPY users_staging FROM '/path/to/users.csv' WITH (FORMAT csv);

-- Insert into production table
INSERT INTO users (name, email, phone, password_hash, profile_pic, role)
SELECT name, email, phone, password_hash, COALESCE(profile_pic, NULL), COALESCE(role, 'user')
FROM users_staging;

-- Drop staging table
DROP TABLE users_staging;
```

---

## API Endpoint Changes

### Before (No JWT)
```javascript
// Login
POST /login
{ email: "user@test.com", password: "pass123" }

// Get products (public)
GET /products
```

### After (Phase 1 & 2 with JWT)
```javascript
// Register
POST /api/auth/register
{ name: "John", email: "john@test.com", phone: "+254712345678", password: "SecurePass123" }

// Login
POST /api/auth/login
{ email_or_phone: "john@test.com", password: "SecurePass123" }

// Response includes JWT token
{ 
  token: "eyJhbGc...",  // <- Store and use this!
  user: { id: 1, name: "John", email: "john@test.com", ... }
}

// Get products (requires token)
GET /api/products
Headers: { Authorization: "Bearer eyJhbGc..." }

// Post product (requires token)
POST /api/products
Headers: { Authorization: "Bearer eyJhbGc...", Content-Type: "application/json" }
Body: { item: "Maize", price: 3000, ... }
```

---

## Database Schema (PostgreSQL)

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_pic TEXT,
    role VARCHAR(50) DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Products Table
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    location VARCHAR(255) NOT NULL,
    stock VARCHAR(100) NOT NULL,
    image TEXT,
    seller_name VARCHAR(255),
    seller_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Vehicles Table
```sql
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_name VARCHAR(255) NOT NULL,
    owner_phone VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    capacity VARCHAR(100) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Testing the Migration

### 1. Test Backend Health
```bash
curl http://localhost:5000/api/health

# Response:
# {"status": "ok", "database": "connected", "timestamp": "2024-05-13T..."}
```

### 2. Test Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"+254712345678","password":"TestPass123"}'
```

### 3. Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email_or_phone":"test@example.com","password":"TestPass123"}'

# Response will include:
# {"token":"eyJhbGc...", "user":{...}}
```

### 4. Test Protected Endpoint
```bash
# Copy token from login response
TOKEN="eyJhbGc..."

curl http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### PostgreSQL Connection Issues
```
Error: could not connect to server: Connection refused
```
**Solution:** Ensure PostgreSQL service is running
```bash
# macOS
brew services restart postgresql@15

# Windows
# Use pgAdmin or Services app to restart PostgreSQL

# Linux
sudo systemctl restart postgresql
```

### JWT Secret Not Set
```
WARNING: JWT_SECRET_KEY is not set
```
**Solution:** Add to `.env` file:
```
JWT_SECRET_KEY=your_generated_key_here
```

### Password Hashing Issues
```
ModuleNotFoundError: No module named 'werkzeug'
```
**Solution:** Reinstall requirements
```bash
pip install -r requirements.txt
```

### CORS Errors
```
Access to XMLHttpRequest has been blocked by CORS policy
```
**Solution:** Update `ALLOWED_ORIGINS` in `.env`:
```
ALLOWED_ORIGINS=http://localhost:3000,http://192.168.1.1:3000
```

---

## Next Steps (Phase 3+)

- **Payment Integration**: Add M-Pesa/Stripe support
- **Notifications**: Email/SMS alerts for new listings
- **Ratings & Reviews**: User feedback system
- **Messaging**: Buyer-seller chat
- **Advanced Search**: Filter by price, category, date
- **Caching**: Redis for performance
- **API Rate Limiting**: Prevent abuse
- **Deployment**: Docker + Kubernetes/Cloud Platform

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Change `DEBUG=False` in `.env`
- [ ] Use strong `JWT_SECRET_KEY`
- [ ] Use strong database password
- [ ] Set `FLASK_ENV=production`
- [ ] Update `ALLOWED_ORIGINS` with actual domain
- [ ] Use HTTPS/SSL certificate
- [ ] Set up database backups
- [ ] Configure logging and monitoring
- [ ] Use environment-specific secrets management (AWS Secrets Manager, etc.)
- [ ] Test all endpoints thoroughly
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure rate limiting
- [ ] Set up CI/CD pipeline
