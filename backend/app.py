from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
# Allows the React frontend to talk to this Python backend
CORS(app, resources={r"/api/*": {"origins": "*"}})

# --- DATABASE SETUP ---
try:
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=2000)
    db = client['agrilink_db']
    # Tables/Collections
    listings_col = db['listings']
    users_col = db['users']
    logistics_col = db['logistics']
    client.server_info()
    USE_DB = True
    print("✅ MongoDB Connected")
except:
    USE_DB = False
    print("⚠️ Running in Mock Mode (No MongoDB)")

# --- 1. MARKET & LISTINGS ---
@app.route('/api/listings', methods=['GET', 'POST'])
def handle_listings():
    if request.method == 'POST':
        new_listing = request.json
        if USE_DB: listings_col.insert_one(new_listing.copy())
        return jsonify({"message": "Produce posted successfully!"}), 201
    
    # GET Listings
    if USE_DB:
        return jsonify(list(listings_col.find({}, {'_id': 0})))
    return jsonify([
        {"farmer": "John ", "crop": "Maize", "quantity": "50 Bags", "price": "3100", "location": "Nakuru"},
        {"farmer": "Rutto", "crop": "Maize", "quantity": "100 Bags", "price": "3000", "location": "Eldoret"}
    ])
@app.route('/api/listings', methods=['GET', 'POST'])
def handle_listings():
    if request.method == 'POST':
        # ... posting logic ...
        return jsonify({"message": "Success"}), 201
    
    # Expanded Kenyan Products for testing
    mock_data = [
        {"farmer": "Korir", "crop": "Maize", "quantity": "20 Bags", "price": "3100", "location": "Kericho"},
        {"farmer": "John", "crop": "Beans (Rosecoco)", "quantity": "10 Bags", "price": "750", "location": "Nakuru"},
        {"farmer": "Alice", "crop": "Cabbages", "quantity": "500 Heads", "price": "15", "location": "Eldoret"},
        {"farmer": "Omondi", "crop": "Tomatoes", "quantity": "12 Crates", "price": "1800", "location": "Kisumu"},
        {"farmer": "Mwangi", "crop": "Onions (Red Creole)", "quantity": "100kg", "price": "80", "location": "Nyeri"},
        {"farmer": "Sarah", "crop": "Avocados", "quantity": "200 Pieces", "price": "20", "location": "Murang'a"}
    ]
    
    if USE_DB:
        db_data = list(listings_col.find({}, {'_id': 0}))
        return jsonify(db_data if db_data else mock_data)
    return jsonify(mock_data)
# --- 2. COMMODITY PRICES ---
@app.route('/api/prices', methods=['GET'])
def get_prices():
    # Real-time-style market data for Kenya
    prices = [
        {"crop": "Maize", "price": 3100, "unit": "90kg Bag", "trend": "up"},
        {"crop": "Tomatoes", "price": 1800, "unit": "Crate", "trend": "down"},
        {"crop": "Avocado", "price": 50, "unit": "Piece", "trend": "stable"},
        {"crop": "Onions", "price": 120, "unit": "Net", "trend": "up"}
    ]
    return jsonify(prices)

# --- 3. LOGISTICS (Transport) ---
@app.route('/api/logistics', methods=['GET'])
def get_logistics():
    # Available trucks for hiring
    trucks = [
        {"driver": "Kipchirchir", "type": "7-Ton Lorry", "route": "Kericho - Nairobi", "status": "Available"},
        {"driver": "Omondi", "type": "Pickup", "route": "Nakuru - Local", "status": "Busy"}
    ]
    return jsonify(trucks)

# --- 4. ACCOUNT / AUTH ---
@app.route('/api/account/login', methods=['POST'])
def login():
    data = request.json
    # Simple logic for project demonstration
    return jsonify({"status": "success", "user": data.get('username'), "role": "Farmer"})

@app.route('/')
def health_check():
    return "AgriLink System: Market, Prices, Logistics, and Accounts are Online."

if __name__ == '__main__':
    app.run(debug=True, port=5000)