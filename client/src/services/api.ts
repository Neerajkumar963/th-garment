const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Configure fetch with credentials for JWT cookies
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include', // Important for JWT cookies
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
};

export const api = {
    get: (endpoint: string) => fetchWithAuth(endpoint, { method: 'GET' }),
    post: (endpoint: string, data: any) =>
        fetchWithAuth(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    put: (endpoint: string, data: any) =>
        fetchWithAuth(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (endpoint: string) => fetchWithAuth(endpoint, { method: 'DELETE' }),
};
