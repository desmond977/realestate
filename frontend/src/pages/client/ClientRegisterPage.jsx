import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { Briefcase, LockKeyhole as FaLock, Mail as FaEnvelope, MapPin, Phone as FaPhone, User as FaUser } from 'lucide-react';
import { ClientBrandLogo } from '../../components/client/ClientBrandLogo';
import './ClientRegisterPage.css';

const ClientRegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    occupation: '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useClient();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password_confirmation) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    const result = await register({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      occupation: formData.occupation,
      password: formData.password,
      password_confirmation: formData.password_confirmation,
    });

    if (result.success) {
      navigate('/client/dashboard');
    } else {
      setError(result.message || 'Registration failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="client-register-page">
      <div className="register-container">
        <div className="register-header">
          <ClientBrandLogo className="brand" />
          <h1>Create Account</h1>
          <p>Register to access your client portal</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label>
              <FaUser /> Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <FaEnvelope /> Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <FaPhone /> Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
            />
          </div>

          <div className="form-group">
            <label>
              <MapPin /> Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter your address"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>
              <Briefcase /> Occupation
            </label>
            <input
              type="text"
              name="occupation"
              value={formData.occupation}
              onChange={handleChange}
              placeholder="Enter your occupation"
            />
          </div>

          <div className="form-group">
            <label>
              <FaLock /> Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password (min 8 characters)"
              required
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label>
              <FaLock /> Confirm Password
            </label>
            <input
              type="password"
              name="password_confirmation"
              value={formData.password_confirmation}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
              minLength={8}
            />
          </div>

          <button 
            type="submit" 
            className="register-btn"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="register-footer">
          <p>
            Already have an account?{' '}
            <Link to="/client/login" className="login-link">
              Sign in here
            </Link>
          </p>
          <p className="terms-text">
            By registering, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      <div className="register-side">
        <div className="side-content">
          <h2>Join Our Client Portal</h2>
          <p>Create an account to get started with managing your real estate investments.</p>
          <ul className="features-list">
            <li>View your property allocations</li>
            <li>Track payment history</li>
            <li>Download official receipts</li>
            <li>Monitor outstanding balances</li>
            <li>Update your profile information</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ClientRegisterPage;
