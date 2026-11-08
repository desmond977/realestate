import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { ArrowRight, Check, LockKeyhole as FaLock, Mail as FaEnvelope } from 'lucide-react';
import { ClientBrandLogo } from '../../components/client/ClientBrandLogo';
import { useClientBranding } from '../../hooks/useClientBranding';
import './ClientLoginPage.css';

const ClientLoginPage = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useClient();
  const branding = useClientBranding();
  const navigate = useNavigate();
  const supportEmail = branding.company_email;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(credentials);
    
    if (result.success) {
      navigate('/client/dashboard');
    } else {
      setError(result.message || 'Login failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="client-login-page">
      <main className="login-main">
        <div className="login-container">
          <div className="login-header">
            <ClientBrandLogo className="brand" imageClassName="client-login-logo" fallbackClassName="client-login-logo-fallback" />
            <span className="login-eyebrow">CLIENT PORTAL</span>
            <h2>Welcome back</h2>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="client-email">
                <FaEnvelope /> Email Address
              </label>
              <input
                id="client-email"
                type="email"
                name="email"
                autoComplete="username"
                value={credentials.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="client-password">
                <FaLock /> Password
              </label>
              <input
                id="client-password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={credentials.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              <span>{loading ? 'Signing in...' : 'Sign in to your account'}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/client/register" className="register-link">
                Register here
              </Link>
            </p>
            {supportEmail && (
              <p className="support-text">
                Need help? Contact <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
              </p>
            )}
          </div>
        </div>
      </main>

      <aside className="login-side">
        <div className="login-hero-image">
          <img
            src="/property-management-showcase.gif"
            alt="Property manager presenting a modern home"
          />
        </div>
        <div className="side-content">
          <span className="hero-kicker">YOUR PROPERTY, IN GOOD HANDS</span>
          <h2>A clearer view of your property journey.</h2>
          <p>Everything you need to stay on top of your property.</p>
          <ul className="features-list">
            <li><Check size={16} /> View your properties and allocation</li>
            <li><Check size={16} /> Track payments and download receipts</li>
            <li><Check size={16} /> Keep important documents close</li>
          </ul>
        </div>
        <span className="hero-decoration hero-decoration-one" />
        <span className="hero-decoration hero-decoration-two" />
      </aside>
    </div>
  );
};

export default ClientLoginPage;
