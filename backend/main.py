from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import os

# Serve frontend build folder (placed inside backend/frontend/build during deploy)
FRONTEND_BUILD_PATH = os.path.join(os.path.dirname(__file__), 'frontend', 'build')

app = Flask(__name__, static_folder=FRONTEND_BUILD_PATH, static_url_path='')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 
CORS(app)

DB_FILE = os.path.join(os.path.dirname(__file__), 'agrilink.db')

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import os
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Serve frontend build folder (placed inside backend/frontend/build during deploy)
FRONTEND_BUILD_PATH = os.path.join(os.path.dirname(__file__), 'frontend', 'build')

app = Flask(__name__, static_folder=FRONTEND_BUILD_PATH, static_url_path='')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
CORS(app)

# Database configuration (use DATABASE_URL for production, fallback to local SQLite)
DB_FILE = os.path.join(os.path.dirname(__file__), 'agrilink.db')
DATABASE_URL = os.environ.get('DATABASE_URL') or f'sqlite:///{DB_FILE}'

engine_kwargs = {}
if DATABASE_URL.startswith('sqlite'):
    # SQLite needs check_same_thread disabled for SQLAlchemy with threaded servers
    engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False}, echo=False)
else:
    engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=True)
    phone = Column(String(50), unique=True, nullable=False)
    password = Column(Text, nullable=False)
    profile_pic = Column(Text, nullable=True)
    role = Column(String(50), default='user', nullable=False)


class Product(Base):
    __tablename__ = 'products'
    id = Column(Integer, primary_key=True, index=True)
    item = Column(String(255))
    price = Column(Integer)
    location = Column(String(255))
    stock = Column(String(255))
    image = Column(Text)
    seller_name = Column(String(255))
    seller_phone = Column(String(50))


class Vehicle(Base):
    __tablename__ = 'vehicles'
    id = Column(Integer, primary_key=True, index=True)
    owner_name = Column(String(255))
    owner_phone = Column(String(50))
    vehicle_type = Column(String(255))
    location = Column(String(255))
    capacity = Column(String(255))
    driver_name = Column(String(255))
    driver_phone = Column(String(50))
    transport_cost = Column(String(50))
    driver_pic = Column(Text)
    vehicle_pic = Column(Text)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
    from sqlalchemy.exc import IntegrityError
    db = SessionLocal()
    try:
        user = User(name=name, email=email, phone=phone, password=hashed, role='user')
        db.add(user)
        db.commit()
        db.refresh(user)
        return jsonify({'message': 'User registered successfully.'}), 201
    except IntegrityError as e:
        db.rollback()
        return jsonify({'message': 'User exists or invalid data.', 'error': str(e)}), 400
    except Exception as e:
        db.rollback()
        return jsonify({'message': 'Error', 'error': str(e)}), 500
    finally:
        db.close()


@app.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email', '').strip().lower() or None
    phone = data.get('phone', '').strip()
    password = data.get('password', '')
    db = SessionLocal()
    try:
        user = db.query(User).filter((User.email == email) | (User.phone == phone)).first()
        if not user or not check_password_hash(user.password, password):
            return jsonify({'message': 'Invalid credentials.'}), 401
        return jsonify({'user': {'id': user.id, 'name': user.name, 'email': user.email, 'phone': user.phone, 'profile_pic': user.profile_pic, 'role': user.role}}), 200
    finally:
        db.close()


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': 'AgriLink Backend'}), 200


@app.route('/update_profile', methods=['POST'])
def update_profile():
    data = request.json
    phone = data.get('phone')
    image = data.get('image')
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        user.profile_pic = image
        db.add(user)
        db.commit()
        return jsonify({"message": "Profile updated"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@app.route('/products', methods=['GET', 'POST'])
def handle_products():
    db = SessionLocal()
    try:
        if request.method == 'POST':
            d = request.json
            p = Product(item=d.get('item'), price=d.get('price'), location=d.get('location'), stock=d.get('stock'), image=d.get('image'), seller_name=d.get('seller_name'), seller_phone=d.get('seller_phone'))
            db.add(p)
            db.commit()
            return jsonify({"message": "Success"}), 201
        prods = db.query(Product).order_by(Product.id.desc()).all()
        return jsonify([{"id": prod.id, "item": prod.item, "price": prod.price, "location": prod.location, "stock": prod.stock, "image": prod.image, "seller_name": prod.seller_name, "seller_phone": prod.seller_phone} for prod in prods])
    finally:
        db.close()


@app.route('/products/<int:pid>', methods=['DELETE'])
def delete_product(pid):
    db = SessionLocal()
    try:
        prod = db.query(Product).filter(Product.id == pid).first()
        if prod:
            db.delete(prod)
            db.commit()
        return jsonify({"message": "Deleted"}), 200
    finally:
        db.close()


@app.route('/vehicles', methods=['GET', 'POST'])
def handle_vehicles():
    db = SessionLocal()
    try:
        if request.method == 'POST':
            d = request.json
            v = Vehicle(owner_name=d.get('owner_name', d.get('driver_name')), owner_phone=d.get('owner_phone', d.get('driver_phone')), vehicle_type=d.get('vehicle_type'), location=d.get('location'), capacity=d.get('capacity'), driver_name=d.get('driver_name'), driver_phone=d.get('driver_phone'), transport_cost=d.get('transport_cost'), driver_pic=d.get('driver_pic'), vehicle_pic=d.get('vehicle_pic'))
            db.add(v)
            db.commit()
            return jsonify({"message": "Success"}), 201
        vehs = db.query(Vehicle).order_by(Vehicle.id.desc()).all()
        return jsonify([{"id": v.id, "owner_name": v.owner_name, "owner_phone": v.owner_phone, "vehicle_type": v.vehicle_type, "location": v.location, "capacity": v.capacity, "driver_name": v.driver_name, "driver_phone": v.driver_phone, "transport_cost": v.transport_cost, "driver_pic": v.driver_pic, "vehicle_pic": v.vehicle_pic} for v in vehs])
    finally:
        db.close()


@app.route('/ai_chat', methods=['POST'])
def ai_chat():
    data = request.json or {}
    question = data.get('question', '').lower()
    responses = {
        'maize': 'Maize needs well-drained soil, 75-100mm rainfall, and grows best at 21-27°C. Apply NPK fertilizer at 150kg/hectare.',
        'disease': 'Common crop diseases: Maize Leaf Blight (use Mancozeb), Fall Armyworm (use Chlorpyrifos). Early detection is key!',
        'chemical': 'Always follow label instructions. Use Roundup for weeds, Mancozeb for fungal diseases, and Neem oil for insects.',
        'rain': 'Best planting time is during rainy season. Monitor weather forecasts and plant 2-3 weeks before heavy rains.',
        'soil': 'Test soil before planting. Add manure 2-3 weeks before planting for better fertility and water retention.',
        'bean': 'Beans need 400-600mm rainfall, 18-25°C temperature. Plant 45cm apart, harvest after 80-90 days.',
        'tomato': 'Tomatoes need 6-8 hours sunlight daily. Water consistently and prune for better yields. Use trellis support.',
    }
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
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)


# Debug endpoint (temporary) — shows whether frontend build folder exists on the server
