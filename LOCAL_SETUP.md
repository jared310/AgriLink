# Local Development Setup - Windows

**Time to complete:** ~15 minutes

---

## Step 1: PostgreSQL Installation (5 minutes)

### Option A: PostgreSQL Installer (Recommended for Windows)
1. Download: https://www.postgresql.org/download/windows/
2. Run installer
3. Set password for `postgres` user (remember this!)
4. Default port: `5432`
5. At end, uncheck "Stack Builder"

### Option B: Quick Check (Already Installed?)
Open PowerShell and run:
```powershell
psql --version
```
If you see a version number, PostgreSQL is already installed.

---

## Step 2: Create Local Database

Open PowerShell and run:

```powershell
# Connect to PostgreSQL
psql -U postgres

# Inside psql prompt (you'll see postgres=#):
CREATE DATABASE agrilink;
CREATE USER agrilink_user WITH PASSWORD 'agrilink_password';
ALTER ROLE agrilink_user SET client_encoding TO 'utf8';
ALTER ROLE agrilink_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE agrilink_user SET default_transaction_deferrable TO on;
ALTER ROLE agrilink_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE agrilink TO agrilink_user;

# Exit (type this):
\q
```

---

## Step 3: Backend Setup (3 minutes)

### 3a. Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3b. Create .env File
Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```

### 3c. Edit .env
Open `backend/.env` and update these values:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agrilink
DB_USER=agrilink_user
DB_PASSWORD=agrilink_password
JWT_SECRET_KEY=your-random-secret-key-here-32-characters-or-more
DEBUG=True
FLASK_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

### 3d. Generate JWT Secret
Open PowerShell and run:
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```
Copy the output and paste into `JWT_SECRET_KEY` in `.env`

---

## Step 4: Frontend Setup (2 minutes)

### 4a. Install Node Packages
```bash
cd frontend
npm install
```

### 4b. Create .env (Optional)
Create `frontend/.env`:
```
REACT_APP_API_BASE_URL=http://localhost:5000
```

---

## Step 5: Run Locally

### Terminal 1: Backend
```bash
cd backend
python main.py
```
You should see:
```
✅ PostgreSQL connection successful
✅ PostgreSQL database initialized successfully
 * Running on http://127.0.0.1:5000
```

### Terminal 2: Frontend
```bash
cd frontend
npm start
```
Browser should open to `http://localhost:3000`

---

## Step 6: Test the Flow

1. **Register**: Click register, fill in form
   - Email: test@example.com
   - Phone: 0712345678
   - Password: TestPassword123

2. **Check Token**: Open browser DevTools (F12)
   - Go to Console → `localStorage.agri_auth`
   - Should show: `{token: "eyJ...", user: {...}}`

3. **Post Product**: Click "Post Product"
   - Fill in item, price, location
   - Should appear in the list
   - Backend stores `seller_id` automatically

4. **Check Database**: 
   Open PowerShell:
   ```powershell
   psql -U agrilink_user -d agrilink
   
   # Inside psql:
   \dt                    # List tables
   SELECT * FROM users;   # See created users
   SELECT * FROM products; # See posted products
   \q                     # Exit
   ```

---

## Troubleshooting

### Port 5000 already in use
```powershell
# Find process using port 5000
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess

# Kill it (replace PID with number from above)
Stop-Process -Id PID -Force
```

### PostgreSQL connection failed
- Check PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Verify database exists: `psql -U postgres -l`

### npm start fails
```bash
# Delete node_modules and reinstall
rm -r node_modules
npm install
npm start
```

### JWT_SECRET_KEY error
- Make sure you've set it in `.env`
- Restart backend after changing `.env`

### CORS error
- Check `ALLOWED_ORIGINS` in `.env`
- For localhost: `http://localhost:3000`
- Don't include trailing slash

---

## Quick Commands Reference

```bash
# Backend
cd backend && python main.py          # Start backend on :5000

# Frontend
cd frontend && npm start              # Start frontend on :3000

# Database
psql -U postgres                      # Connect as admin
psql -U agrilink_user -d agrilink   # Connect as app user

# Check if PostgreSQL is running
pg_isready

# Stop backend
# Press Ctrl+C in terminal

# View logs
# Both Flask and React show logs in terminal
```

---

## Next Steps After Testing

1. ✅ Test locally (you are here)
2. Create GitHub account
3. Create repositories (frontend + backend)
4. Deploy to Vercel (frontend) + Render (backend)
5. Configure production .env

See [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) for production deployment.
