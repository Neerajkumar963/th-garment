import { useState } from 'react';
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
    const [showDropdown, setShowDropdown] = useState(false);

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
                        </aside>

                        <main className="main-content">
                            <header className="top-header">
                                <div className="page-header-title">
                                    {/* Placeholder if we want breadcrumbs or title here later */}
                                </div>

                                {user && (
                                    <div className="user-profile-container" onClick={() => setShowDropdown(!showDropdown)}>

                                        <div className="user-avatar">
                                            {user.email?.charAt(0).toUpperCase() || 'A'}
                                        </div>

                                        {showDropdown && (
                                            <div className="dropdown-menu">
                                                <div className="dropdown-header">
                                                    <div className="dropdown-user-name">{user.email?.split('@')[0] || 'Admin'}</div>
                                                    <div className="dropdown-user-email">{user.email}</div>
                                                </div>
                                                <button onClick={handleLogout} className="dropdown-item text-danger">
                                                    Logout
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </header>

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
