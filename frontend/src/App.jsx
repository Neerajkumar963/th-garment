import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClothCutting from './pages/ClothCutting';
import Processing from './pages/Processing';
import Stock from './pages/Stock';
import Orders from './pages/Orders';

function AppContent() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/*" element={
                <ProtectedRoute>
                    <div className="app-container">
                        <aside className="sidebar">
                            <div className="sidebar-header">
                                <h1 className="sidebar-title">TH GARMENT</h1>
                                {user && (
                                    <div style={{
                                        marginTop: 'var(--spacing-md)',
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)'
                                    }}>
                                        {user.email}
                                    </div>
                                )}
                            </div>

                            <nav>
                                <ul className="nav-menu">
                                    <li className="nav-item">
                                        <NavLink to="/" className="nav-link" end>
                                            Dashboard
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink to="/cutting" className="nav-link">
                                            Cloth Cutting
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink to="/processing" className="nav-link">
                                            Processing
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink to="/stock" className="nav-link">
                                            Stock
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink to="/orders" className="nav-link">
                                            Orders
                                        </NavLink>
                                    </li>
                                </ul>
                            </nav>

                            <div style={{
                                marginTop: 'auto',
                                paddingTop: 'var(--spacing-xl)',
                                borderTop: '1px solid var(--border-color)'
                            }}>
                                <button
                                    onClick={handleLogout}
                                    className="btn btn-secondary"
                                    style={{ width: '100%' }}
                                >
                                    Logout
                                </button>
                            </div>
                        </aside>

                        <main className="main-content">
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/cutting" element={<ClothCutting />} />
                                <Route path="/processing" element={<Processing />} />
                                <Route path="/stock" element={<Stock />} />
                                <Route path="/orders" element={<Orders />} />
                            </Routes>
                        </main>
                    </div>
                </ProtectedRoute>
            } />
        </Routes>
    );
}

import { ToastProvider } from './context/ToastContext';
import { ModalProvider } from './context/ModalContext';

function App() {
    return (
        <ToastProvider>
            <ModalProvider>
                <Router>
                    <AppContent />
                </Router>
            </ModalProvider>
        </ToastProvider>
    );
}

export default App;
