import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { LockKeyhole as FaLock, Mail as FaEnvelope } from 'lucide-react';
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
      <div className="login-container">
        <div className="login-header">
          <ClientBrandLogo className="brand" />
          <h1>Client Portal</h1>
          <p>Sign in to access your real estate portfolio</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label>
              <FaEnvelope /> Email Address
            </label>
            <input
              type="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <FaLock /> Password
            </label>
            <input
              type="password"
              name="password"
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
            {loading ? 'Signing in...' : 'Sign In'}
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

      <div className="login-side">
        <div className="side-content">
          <h2>Welcome to Your Client Portal</h2>
          <p>Access your property allocations, payment history, receipts, and more - all in one place.</p>
          <ul className="features-list">
            <li>View your allocated properties</li>
            <li>Track payment progress</li>
            <li>Download receipts</li>
            <li>Monitor outstanding balances</li>
            <li>Update your profile</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ClientLoginPage;
