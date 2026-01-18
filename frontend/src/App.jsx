import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClothCutting from './pages/ClothCutting';
import Processing from './pages/Processing';
import Stock from './pages/Stock';
import Orders from './pages/Orders';
import Fabricators from './pages/Fabricators';
import JobWorks from './pages/JobWorks';
import JobWorkIssue from './pages/JobWorkIssue';
import JobWorkReceive from './pages/JobWorkReceive';
import ReadyItems from './pages/ReadyItems';
import DirectSales from './pages/DirectSales.jsx';
import DeadStock from './pages/DeadStock';
import ClothProcessing from './pages/ClothProcessing';

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
                                        <NavLink to="/cloth-processing" className="nav-link">
                                            Cloth Processing
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
                                    <li className="nav-item">
                                        <NavLink to="/fabricators" className="nav-link">
                                            Fabricators
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink to="/job-works" className="nav-link">
                                            Job Works
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink to="/ready-items" className="nav-link">
                                            Ready Items
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink to="/direct-sales" className="nav-link">
                                            Direct Sales
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink to="/dead-stock" className="nav-link">
                                            Dead Stock
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

                                <div className="flex items-center">
                                    <ThemeToggle />

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
                                </div>
                            </header>

                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/cloth-processing" element={<ClothProcessing />} />
                                <Route path="/cutting" element={<ClothCutting />} />
                                <Route path="/processing" element={<Processing />} />
                                <Route path="/stock" element={<Stock />} />
                                <Route path="/orders" element={<Orders />} />
                                <Route path="/fabricators" element={<Fabricators />} />
                                <Route path="/job-works" element={<JobWorks />} />
                                <Route path="/job-works/issue" element={<JobWorkIssue />} />
                                <Route path="/job-works/receive" element={<JobWorkReceive />} />
                                <Route path="/ready-items" element={<ReadyItems />} />
                                <Route path="/direct-sales" element={<DirectSales />} />
                                <Route path="/dead-stock" element={<DeadStock />} />
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
import { ThemeProvider } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

function App() {
    return (
        <ToastProvider>
            <ModalProvider>
                <ThemeProvider>
                    <Router>
                        <AppContent />
                    </Router>
                </ThemeProvider>
            </ModalProvider>
        </ToastProvider>
    );
}

export default App;
