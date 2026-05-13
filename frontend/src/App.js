import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LoginRegister from './LoginRegister';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const initialProductForm = { item: '', price: '', stock: '', location: '', image: '' };
const initialVehicleForm = { vehicle_type: 'Pickup', location: '', capacity: '' };

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [productForm, setProductForm] = useState(initialProductForm);
  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('agri_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadProducts();
      loadVehicles();
    }
  }, [isLoggedIn]);

  const fetchJson = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    const responseData = await response.json().catch(() => null);
    if (!response.ok) throw new Error(responseData?.message || 'Network error');
    return responseData;
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchJson('/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) { setErrorMessage('Unable to load products.'); }
    finally { setIsLoading(false); }
  }, [fetchJson]);

  const loadVehicles = useCallback(async () => {
    try {
      const data = await fetchJson('/vehicles');
      setVehicles(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  }, [fetchJson]);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('agri_user', JSON.stringify(userData));
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('agri_user');
    setIsLoggedIn(false);
    setUser(null);
    setActiveTab('Home');
  };

  const handleProfilePicUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result;
      try {
        const res = await fetch(`${API_BASE_URL}/update_profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: user.phone, image: base64Image }),
        });
        if (res.ok) {
          const updatedUser = { ...user, profile_pic: base64Image };
          setUser(updatedUser);
          localStorage.setItem('agri_user', JSON.stringify(updatedUser));
        }
      } catch (e) { setErrorMessage("Upload failed."); }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadProductImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProductForm(c => ({ ...c, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const handlePostProduct = async (e) => {
    e.preventDefault();
    if (!productForm.item || !productForm.price) return setErrorMessage("Item and Price required");
    setIsLoading(true);
    try {
      await fetchJson('/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...productForm, seller_name: user.name, seller_phone: user.phone }),
      });
      setProductForm(initialProductForm);
      loadProducts();
    } catch (e) { setErrorMessage("Post failed."); }
    finally { setIsLoading(false); }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await fetchJson(`/products/${id}`, { method: 'DELETE' });
      loadProducts();
    } catch (e) { setErrorMessage("Delete failed."); }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.item?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  if (!isLoggedIn) return <LoginRegister onAuthSuccess={handleAuthSuccess} apiBaseUrl={API_BASE_URL} />;

  return (
    <div style={s.dash}>
      <header style={s.header}>
        <h3 style={{ margin: 0 }}>AgriLink</h3>
        <span style={{ fontSize: '12px', opacity: 0.8 }}>{user?.name?.toUpperCase()}</span>
      </header>

      <main style={s.main}>
        {errorMessage && <div style={s.alert} onClick={() => setErrorMessage('')}>{errorMessage}</div>}

        {activeTab === 'Home' && (
          <div>
            <div style={s.contentBox}>
              <h4 style={{ color: '#4caf50', margin: '0 0 15px 0' }}>Sell Produce</h4>
              <input style={s.input} placeholder="Item Name" value={productForm.item} onChange={e => setProductForm({ ...productForm, item: e.target.value })} />
              <input style={s.input} type="number" placeholder="Price (KES)" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
              <input style={s.input} placeholder="Location" value={productForm.location} onChange={e => setProductForm({ ...productForm, location: e.target.value })} />
              <div style={{ margin: '10px 0', fontSize: '12px' }}>
                <label>Product Image:</label><br/>
                <input type="file" onChange={handleUploadProductImage} />
              </div>
              <button style={s.btn} onClick={handlePostProduct} disabled={isLoading}>{isLoading ? 'Posting...' : 'Post Now'}</button>
            </div>

            <h4 style={{ margin: '20px 0 10px 0' }}>Your Active Posts</h4>
            <div style={s.grid}>
              {products.filter(p => p.seller_phone === user.phone).map(p => (
                <div key={p.id} style={s.itemCard}>
                  {p.image && <img src={p.image} style={s.prodImg} alt="p" />}
                  <div style={{ padding: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{p.item}</div>
                    <button style={{ ...s.btn, background: '#d32f2f', fontSize: '10px', height: 'auto', padding: '5px', marginTop: '5px' }} onClick={() => handleDeleteProduct(p.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Soko' && (
          <div>
            <input style={{ ...s.input, marginBottom: '15px' }} placeholder="🔍 Search produce..." onChange={e => setSearchTerm(e.target.value)} />
            {filteredProducts.map(p => (
              <div key={p.id} style={s.sokoCard}>
                <img src={p.image || 'https://via.placeholder.com/80'} style={s.sokoImg} alt="p" />
                <div style={{ flex: 1, paddingLeft: '15px' }}>
                  <h4 style={{ margin: 0 }}>{p.item}</h4>
                  <p style={{ fontSize: '13px', margin: '5px 0' }}><strong>{p.price} KES</strong> | 📍 {p.location}</p>
                  <button style={s.callBtn} onClick={() => window.open(`tel:${p.seller_phone}`)}>Call Seller</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Usafiri' && (
          <div>
            <div style={s.contentBox}>
              <h4 style={{ color: '#4caf50', margin: '0 0 15px 0' }}>Register Transport</h4>
              <input style={s.input} placeholder="Vehicle Type" onChange={e => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })} />
              <input style={s.input} placeholder="Capacity" onChange={e => setVehicleForm({ ...vehicleForm, capacity: e.target.value })} />
              <input style={s.input} placeholder="Area" onChange={e => setVehicleForm({ ...vehicleForm, location: e.target.value })} />
              <button style={s.btn} onClick={async () => {
                await fetchJson('/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...vehicleForm, owner_name: user.name, owner_phone: user.phone }) });
                loadVehicles();
              }}>Register Vehicle</button>
            </div>
            {vehicles.map(v => (
              <div key={v.id} style={s.sokoCard}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0 }}>{v.vehicle_type}</h4>
                  <span style={{ fontSize: '13px' }}>{v.capacity} | 📍 {v.location}</span>
                </div>
                <button style={s.callBtn} onClick={() => window.open(`tel:${v.owner_phone}`)}>Contact</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Profile' && (
          <div style={{ padding: '10px', maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ ...s.contentBox, padding: '30px 20px', borderRadius: '25px' }}>
              <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div style={s.avatarWrapper}>
                    <img 
                      src={user.profile_pic || 'https://via.placeholder.com/130?text=👤'} 
                      style={s.avatarImg}
                      alt="Avatar"
                    />
                  </div>
                  <label style={s.camIcon}>
                    <span>📷</span>
                    <input type="file" hidden onChange={handleProfilePicUpload} accept="image/*" />
                  </label>
                </div>
                <h3 style={{ marginTop: '15px', color: '#fff' }}>{user.name}</h3>
                <span style={{ fontSize: '11px', color: '#4caf50', fontWeight: 'bold' }}>VERIFIED FARMER</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={s.infoRow}><span style={s.label}>Full Name</span><span style={s.val}>{user.name}</span></div>
                <div style={s.infoRow}><span style={s.label}>Phone</span><span style={s.val}>{user.phone}</span></div>
                {user.email && <div style={s.infoRow}><span style={s.label}>Email</span><span style={s.val}>{user.email}</span></div>}
              </div>

              <button style={{ ...s.btn, background: 'linear-gradient(to right, #d32f2f, #b71c1c)', marginTop: '30px' }} onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </main>

      <nav style={s.nav}>
        {['Home', 'Soko', 'Usafiri', 'Profile'].map(t => (
          <div key={t} onClick={() => setActiveTab(t)} style={{ ...s.navItem, color: activeTab === t ? '#4caf50' : '#888' }}>
            <div style={{ fontSize: '18px' }}>{t === 'Home' ? '🏠' : t === 'Soko' ? '🛒' : t === 'Usafiri' ? '🚚' : '👤'}</div>
            <div style={{ fontSize: '10px' }}>{t}</div>
          </div>
        ))}
      </nav>
    </div>
  );
}

const s = {
  dash: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  header: { padding: '15px 20px', background: '#1b5e20', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  main: { flex: 1, padding: '20px', overflowY: 'auto', paddingBottom: '100px' },
  contentBox: { background: '#181818', padding: '20px', borderRadius: '15px', border: '1px solid #2a2a2a', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  itemCard: { background: '#1e1e1e', borderRadius: '12px', overflow: 'hidden', border: '1px solid #333' },
  prodImg: { width: '100%', height: '100px', objectFit: 'cover' },
  sokoCard: { background: '#1e1e1e', display: 'flex', padding: '15px', borderRadius: '18px', marginBottom: '12px', alignItems: 'center', border: '1px solid #2a2a2a' },
  sokoImg: { width: '75px', height: '75px', borderRadius: '12px', objectFit: 'cover' },
  callBtn: { padding: '10px 18px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  nav: { display: 'flex', justifyContent: 'space-around', padding: '10px', background: 'rgba(24, 24, 24, 0.95)', position: 'fixed', bottom: 0, width: '100%', borderTop: '1px solid #2a2a2a', backdropFilter: 'blur(10px)' },
  navItem: { cursor: 'pointer', textAlign: 'center' },
  input: { width: '100%', padding: '14px', margin: '8px 0', borderRadius: '12px', border: '1px solid #333', background: '#252525', color: '#fff', boxSizing: 'border-box' },
  btn: { width: '100%', height: '50px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  avatarWrapper: { width: '130px', height: '130px', borderRadius: '50%', background: 'linear-gradient(145deg, #1b5e20, #2e7d32)', padding: '4px' },
  avatarImg: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#121212' },
  camIcon: { position: 'absolute', bottom: '5px', right: '5px', background: '#4caf50', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '3px solid #181818' },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#222', borderRadius: '12px', border: '1px solid #333' },
  label: { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' },
  val: { fontSize: '15px', color: '#fff', fontWeight: '500' },
  alert: { background: '#d32f2f', padding: '12px', borderRadius: '10px', marginBottom: '15px', textAlign: 'center' }
};