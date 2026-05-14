import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LoginRegister from './LoginRegister';

const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');
const initialProductForm = { item: '', price: '', stock: '', location: '', image: '' };
const initialVehicleForm = { vehicle_type: 'Pickup', location: '', capacity: '', driver_name: '', driver_phone: '', transport_cost: '', driver_pic: '', vehicle_pic: '' };

const cleanUserForStorage = (user) => {
  if (!user) return null;
  const { profile_pic, ...rest } = user;
  return rest;
};

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
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('agri_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.name) {
          setUser(parsedUser);
          setIsLoggedIn(true);
        }
      } catch {
        localStorage.removeItem('agri_user');
      }
    }
  }, []);

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

  useEffect(() => {
    if (isLoggedIn) {
      loadProducts();
      loadVehicles();
    }
  }, [isLoggedIn, loadProducts, loadVehicles]);

  const handleAuthSuccess = (userData) => {
    const authUser = userData?.user || userData;
    setUser(authUser);
    try {
      localStorage.setItem('agri_user', JSON.stringify(cleanUserForStorage(authUser)));
    } catch (error) {
      console.warn('Could not save user data to localStorage:', error);
      localStorage.removeItem('agri_user');
    }
    setIsLoggedIn(true);
    setActiveTab('Home');
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
          try {
            localStorage.setItem('agri_user', JSON.stringify(cleanUserForStorage(updatedUser)));
          } catch (error) {
            console.warn('Could not save updated user to localStorage:', error);
          }
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

  const handleUploadVehicleImage = (event, field) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setVehicleForm(c => ({ ...c, [field]: reader.result }));
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

  const handleAiChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);
    try {
      const response = await fetchJson('/ai_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg }),
      });
      setChatMessages(prev => [...prev, { role: 'ai', text: response.answer || 'Unable to process your question.' }]);
    } catch (e) {
      console.error('AI chat error', e);
      const q = (userMsg || '').toLowerCase();
      const localKb = {
        'maize': 'Maize needs well-drained soil, 75-100mm rainfall, and grows best at 21-27°C. Apply NPK fertilizer at 150kg/hectare.',
        'disease': 'Common crop diseases: Maize Leaf Blight (use Mancozeb), Fall Armyworm (use Chlorpyrifos). Early detection is key!',
        'chemical': 'Always follow label instructions. Use Roundup for weeds, Mancozeb for fungal diseases, and Neem oil for insects.',
        'rain': 'Best planting time is during rainy season. Monitor weather forecasts and plant 2-3 weeks before heavy rains.',
        'soil': 'Test soil before planting. Add manure 2-3 weeks before planting for better fertility and water retention.',
        'bean': 'Beans need 400-600mm rainfall, 18-25°C temperature. Plant 45cm apart, harvest after 80-90 days.',
        'tomato': 'Tomatoes need 6-8 hours sunlight daily. Water consistently and prune for better yields. Use trellis support.',
      };
      let fallback = '🌾 Farming Assistant: Sorry, I could not reach the assistant. Try again later.';
      for (const k of Object.keys(localKb)) {
        if (q.includes(k)) { fallback = localKb[k]; break; }
      }
      setChatMessages(prev => [...prev, { role: 'ai', text: fallback }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.item?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const navItems = [
    { key: 'Home', icon: '🏠' },
    { key: 'Soko', icon: '🛒' },
    { key: 'Usafiri', icon: '🚚' },
    { key: 'AiChat', icon: '🤖' },
    { key: 'Profile', icon: '👤' },
  ];

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

            <div style={s.poweredBy}>
              <span>🌾 Powered by AgriLink 🌾</span>
            </div>
          </div>
        )}

        {activeTab === 'Soko' && (
          <div>
            <div style={s.searchContainer}>
              <input 
                style={{ ...s.input, marginBottom: '15px' }} 
                placeholder="🔍 Search produce..." 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
            {filteredProducts.map(p => (
              <div key={p.id} style={s.sokoCard}>
                <img src={p.image || 'https://via.placeholder.com/80'} style={s.sokoImg} alt="produce" />
                <div style={{ flex: 1, paddingLeft: '15px' }}>
                  <h4 style={{ margin: 0 }}>{p.item}</h4>
                  <p style={{ fontSize: '13px', margin: '5px 0' }}>
                    <strong>{p.price} KES</strong> | 📍 {p.location}
                  </p>
                  <button style={s.callBtn} onClick={() => window.open(`tel:${p.seller_phone}`)}>
                    Call Seller
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Usafiri' && (
          <div>
            <div style={s.contentBox}>
              <h4 style={{ color: '#4caf50', margin: '0 0 15px 0' }}>📋 Register Transport Service</h4>
              <input style={s.input} placeholder="Your Full Name" onChange={e => setVehicleForm({ ...vehicleForm, driver_name: e.target.value })} />
              <input style={s.input} placeholder="Your Phone Number" onChange={e => setVehicleForm({ ...vehicleForm, driver_phone: e.target.value })} />
              <input style={s.input} placeholder="Vehicle Type" onChange={e => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })} />
              <input style={s.input} placeholder="Capacity" onChange={e => setVehicleForm({ ...vehicleForm, capacity: e.target.value })} />
              <input style={s.input} placeholder="Area" onChange={e => setVehicleForm({ ...vehicleForm, location: e.target.value })} />
              <input style={s.input} type="number" placeholder="Transport Cost (KES)" onChange={e => setVehicleForm({ ...vehicleForm, transport_cost: e.target.value })} />
              <div style={{ margin: '10px 0', fontSize: '12px' }}>
                <label>📸 Driver Picture:</label><br/>
                <input type="file" onChange={(e) => handleUploadVehicleImage(e, 'driver_pic')} />
              </div>
              <div style={{ margin: '10px 0', fontSize: '12px' }}>
                <label>🚗 Vehicle Photo:</label><br/>
                <input type="file" onChange={(e) => handleUploadVehicleImage(e, 'vehicle_pic')} />
              </div>
              <button style={s.btn} onClick={async () => {
                if (!vehicleForm.driver_name || !vehicleForm.driver_phone) {
                  setErrorMessage('Driver name and phone are required.');
                  return;
                }
                await fetchJson('/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vehicleForm) });
                setVehicleForm(initialVehicleForm);
                loadVehicles();
                setErrorMessage('');
              }}>Register Vehicle</button>
            </div>
            <h4 style={{ margin: '20px 0 10px 0' }}>Available Transport Services</h4>
            {vehicles.map(v => (
              <div key={v.id} style={s.vehicleDetailCard}>
                <div style={{ display: 'flex', gap: '12px', marginRight: '15px' }}>
                  {v.driver_pic && <img src={v.driver_pic} style={s.driverPic} alt="driver" />}
                  {v.vehicle_pic && <img src={v.vehicle_pic} style={s.vehiclePic} alt="vehicle" />}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>👤 {v.driver_name}</h4>
                  <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>🚗 Vehicle:</strong> {v.vehicle_type}</p>
                  <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>📦 Capacity:</strong> {v.capacity}</p>
                  <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>📍 Area:</strong> {v.location}</p>
                  <p style={{ fontSize: '12px', margin: '4px 0', color: '#4caf50', fontWeight: 'bold' }}><strong>💰 Cost:</strong> {v.transport_cost} KES</p>
                  <button style={s.callBtn} onClick={() => window.open(`tel:${v.driver_phone}`)}>📞 Call {v.driver_phone}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'AiChat' && (
          <div style={s.chatContainer}>
            <h3 style={{ color: '#4caf50', textAlign: 'center' }}>🤖 Farming AI Assistant</h3>
            <p style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>Ask about crop diseases, chemicals, weather, and farming advice</p>
            <div style={s.chatBox}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                  <p>💬 Start chatting with your farming assistant!</p>
                  <p style={{ fontSize: '12px' }}>Examples: "What chemicals treat maize leaf blight?", "Best time to plant beans?"</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={msg.role === 'user' ? s.userMsg : s.aiMsg}>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                </div>
              ))}
            </div>
            <div style={s.chatInput}>
              <input 
                style={s.chatInputField}
                placeholder="Ask me about farming..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAiChat()}
              />
              <button style={s.chatSendBtn} onClick={handleAiChat} disabled={isChatLoading}>
                {isChatLoading ? '⏳' : '➤'}
              </button>
            </div>
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
                    <span role="img" aria-label="upload">📷</span>
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
        {navItems.map(item => (
          <div key={item.key} onClick={() => setActiveTab(item.key)} style={{ ...s.navItem, color: activeTab === item.key ? '#4caf50' : '#888' }}>
            <div style={{ fontSize: '18px' }}>{item.icon}</div>
            <div style={{ fontSize: '10px' }}>{item.key}</div>
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
  vehicleDetailCard: { background: '#1e1e1e', padding: '15px', borderRadius: '18px', marginBottom: '12px', border: '1px solid #2a2a2a', display: 'flex', gap: '15px', alignItems: 'flex-start' },
  driverPic: { width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover' },
  vehiclePic: { width: '90px', height: '70px', borderRadius: '12px', objectFit: 'cover' },
  callBtn: { padding: '10px 18px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' },
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
  alert: { background: '#d32f2f', padding: '12px', borderRadius: '10px', marginBottom: '15px', textAlign: 'center' },
  poweredBy: { marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #333', color: '#888', fontSize: '12px', textAlign: 'center' },
  chatContainer: { padding: '10px 0' },
  chatBox: { background: '#181818', border: '1px solid #333', borderRadius: '12px', height: '400px', overflowY: 'auto', padding: '15px', marginBottom: '10px' },
  userMsg: { background: '#2e7d32', padding: '10px 12px', borderRadius: '12px', marginBottom: '8px', textAlign: 'right', color: '#fff' },
  aiMsg: { background: '#333', padding: '10px 12px', borderRadius: '12px', marginBottom: '8px', color: '#ccc' },
  chatInput: { display: 'flex', gap: '8px' },
  chatInputField: { flex: 1, padding: '12px', background: '#252525', border: '1px solid #333', borderRadius: '12px', color: '#fff' },
  chatSendBtn: { padding: '12px 18px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  searchContainer: { marginBottom: '15px' },
};
