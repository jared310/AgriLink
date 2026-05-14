from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import os

# Serve frontend build folder
FRONTEND_BUILD_PATH = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'build')

app = Flask(__name__, static_folder=FRONTEND_BUILD_PATH, static_url_path='')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 
CORS(app)

DB_FILE = os.path.join(os.path.dirname(__file__), 'agrilink.db')

def get_db_connection():
    conn = sqlite3.connect(DB_FILE, timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    conn.execute('PRAGMA journal_mode = WAL')
    conn.execute('PRAGMA busy_timeout = 5000')
    return conn

def init_db():
    with get_db_connection() as conn:
        conn.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, phone TEXT UNIQUE, password TEXT, profile_pic TEXT, role TEXT DEFAULT "user" NOT NULL)')
        conn.execute('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, item TEXT, price INTEGER, location TEXT, stock TEXT, image TEXT, seller_name TEXT, seller_phone TEXT)')
        conn.execute('CREATE TABLE IF NOT EXISTS vehicles (id INTEGER PRIMARY KEY AUTOINCREMENT, owner_name TEXT, owner_phone TEXT, vehicle_type TEXT, location TEXT, capacity TEXT, driver_name TEXT, driver_phone TEXT, transport_cost TEXT, driver_pic TEXT, vehicle_pic TEXT)')
        
        cursor = conn.execute('PRAGMA table_info(users)')
        cols = [c[1] for c in cursor.fetchall()]
        if 'email' not in cols: conn.execute('ALTER TABLE users ADD COLUMN email TEXT')
        if 'role' not in cols: conn.execute('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user" NOT NULL')
        if 'profile_pic' not in cols: conn.execute('ALTER TABLE users ADD COLUMN profile_pic TEXT')
        
        cursor = conn.execute('PRAGMA table_info(vehicles)')
        vcols = [c[1] for c in cursor.fetchall()]
        if 'driver_name' not in vcols: conn.execute('ALTER TABLE vehicles ADD COLUMN driver_name TEXT')
        if 'driver_phone' not in vcols: conn.execute('ALTER TABLE vehicles ADD COLUMN driver_phone TEXT')
        if 'transport_cost' not in vcols: conn.execute('ALTER TABLE vehicles ADD COLUMN transport_cost TEXT')
        if 'driver_pic' not in vcols: conn.execute('ALTER TABLE vehicles ADD COLUMN driver_pic TEXT')
        if 'vehicle_pic' not in vcols: conn.execute('ALTER TABLE vehicles ADD COLUMN vehicle_pic TEXT')
        conn.commit()

init_db()

@app.route('/register', methods=['POST'])
def register():
    data = request.json or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower() or None
    phone = data.get('phone', '').strip()
    password = data.get('password', '')
    if not name or not phone or not password:
        return jsonify({'message': 'Required fields missing.'}), 400
    hashed = generate_password_hash(password)
    try:
        with get_db_connection() as conn:
            conn.execute('INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)', (name, email, phone, hashed, 'user'))
            conn.commit()
        return jsonify({'message': 'User registered successfully.'}), 201
    except Exception as e:
        return jsonify({'message': 'Error', 'error': str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email', '').strip().lower() or None
    phone = data.get('phone', '').strip()
    password = data.get('password', '')
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ? OR phone = ?', (email, phone)).fetchone()
    conn.close()
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'message': 'Invalid credentials.'}), 401
    return jsonify({'user': {'id': user['id'], 'name': user['name'], 'email': user['email'], 'phone': user['phone'], 'profile_pic': user['profile_pic'], 'role': user['role']}}), 200

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': 'AgriLink Backend'}), 200


@app.route('/update_profile', methods=['POST'])
def update_profile():
    data = request.json
    try:
        with get_db_connection() as conn:
            conn.execute('UPDATE users SET profile_pic = ? WHERE phone = ?', (data.get('image'), data.get('phone')))
            conn.commit()
        return jsonify({"message": "Profile updated"}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/products', methods=['GET', 'POST'])
def handle_products():
    if request.method == 'POST':
        d = request.json
        with get_db_connection() as conn:
            conn.execute('INSERT INTO products (item, price, location, stock, image, seller_name, seller_phone) VALUES (?, ?, ?, ?, ?, ?, ?)', (d.get('item'), d.get('price'), d.get('location'), d.get('stock'), d.get('image'), d.get('seller_name'), d.get('seller_phone')))
            conn.commit()
        return jsonify({"message": "Success"}), 201
    with get_db_connection() as conn:
        prods = conn.execute('SELECT * FROM products ORDER BY id DESC').fetchall()
    return jsonify([dict(p) for p in prods])

@app.route('/products/<int:pid>', methods=['DELETE'])
def delete_product(pid):
    with get_db_connection() as conn:
        conn.execute('DELETE FROM products WHERE id = ?', (pid,))
        conn.commit()
    return jsonify({"message": "Deleted"}), 200

@app.route('/vehicles', methods=['GET', 'POST'])
def handle_vehicles():
    if request.method == 'POST':
        d = request.json
        with get_db_connection() as conn:
            conn.execute('INSERT INTO vehicles (owner_name, owner_phone, vehicle_type, location, capacity, driver_name, driver_phone, transport_cost, driver_pic, vehicle_pic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            (d.get('owner_name', d.get('driver_name')), d.get('owner_phone', d.get('driver_phone')), d.get('vehicle_type'), d.get('location'), d.get('capacity'), d.get('driver_name'), d.get('driver_phone'), d.get('transport_cost'), d.get('driver_pic'), d.get('vehicle_pic')))
            conn.commit()
        return jsonify({"message": "Success"}), 201
    with get_db_connection() as conn:
        vehs = conn.execute('SELECT * FROM vehicles ORDER BY id DESC').fetchall()
    return jsonify([dict(v) for v in vehs])

@app.route('/ai_chat', methods=['POST'])
def ai_chat():
    data = request.json or {}
    question = data.get('question', '').lower()
    
    # Simple knowledge base for farming questions
    responses = {
        'maize': 'Maize needs well-drained soil, 75-100mm rainfall, and grows best at 21-27°C. Apply NPK fertilizer at 150kg/hectare.',
        'disease': 'Common crop diseases: Maize Leaf Blight (use Mancozeb), Fall Armyworm (use Chlorpyrifos). Early detection is key!',
        'chemical': 'Always follow label instructions. Use Roundup for weeds, Mancozeb for fungal diseases, and Neem oil for insects.',
        'rain': 'Best planting time is during rainy season. Monitor weather forecasts and plant 2-3 weeks before heavy rains.',
        'soil': 'Test soil before planting. Add manure 2-3 weeks before planting for better fertility and water retention.',
        'bean': 'Beans need 400-600mm rainfall, 18-25°C temperature. Plant 45cm apart, harvest after 80-90 days.',
        'tomato': 'Tomatoes need 6-8 hours sunlight daily. Water consistently and prune for better yields. Use trellis support.',
    }
    
    # Find matching keywords in question
    answer = 'I can help with questions about crop diseases, chemicals, weather, and farming. Ask me about specific crops!'
    for keyword, response in responses.items():
        if keyword in question:
            answer = response
            break
    
    return jsonify({'answer': answer}), 200

# Serve React frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path and os.path.exists(os.path.join(FRONTEND_BUILD_PATH, path)):
        return send_from_directory(FRONTEND_BUILD_PATH, path)
    return send_from_directory(FRONTEND_BUILD_PATH, 'index.html')

if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
