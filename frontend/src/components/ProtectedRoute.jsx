import { Navigate } from 'react-router-dom';

// Check if user is authenticated
export default function ProtectedRoute({ children }) {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
