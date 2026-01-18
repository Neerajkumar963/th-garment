import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="theme-toggle-container" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}>
            <div className={`theme-toggle ${theme}`}>
                <div className="toggle-track">
                    <span className="star star-1">★</span>
                    <span className="star star-2">★</span>
                    <span className="star star-3">★</span>
                    <span className="cloud cloud-1">☁</span>
                    <span className="cloud cloud-2">☁</span>
                </div>
                <div className="toggle-thumb">
                    {theme === 'dark' ? (
                        <div className="moon-crater"></div>
                    ) : (
                        <div className="sun-rays"></div>
                    )}
                </div>
            </div>
        </div>
    );
}
