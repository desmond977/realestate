import { useState, useEffect } from 'react';
import { Camera as FaCamera, LockKeyhole as FaLock, Mail as FaEnvelope, Moon, Phone as FaPhone, Save as FaSave, Sun, User as FaUser } from 'lucide-react';
import { assetUrl } from '../../api/client';
import { profileApi } from '../../services/clientApi';
import { useClient } from '../../context/ClientContext';
import { applyBranding } from '../../utils/theme';
import './ClientProfilePage.css';

const PROFILE_IMAGE_PLACEHOLDER = '/favicon.svg';

const ClientProfilePage = () => {
  const { user, updateUser } = useClient();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [themeMode, setThemeMode] = useState(user?.theme_mode ?? 'system');
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState('');

  useEffect(() => {
    let active = true;

    async function fetchProfile() {
      try {
        const response = await profileApi.getProfile();
        if (active) {
          setProfile(response.data);
          if (response.data.profile_image_url) {
            setPreviewImage(assetUrl(response.data.profile_image_url));
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        if (active) {
          setMessage({ type: 'error', text: 'Failed to load profile.' });
        }
      }
    }

    fetchProfile();

    return () => {
      active = false;
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size must be less than 2MB.' });
        return;
      }
      setProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await profileApi.updateProfile(profile);
      updateUser(response.data.user);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to update profile.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordData.password !== passwordData.password_confirmation) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      setLoading(false);
      return;
    }

    try {
      await profileApi.updatePassword(passwordData);
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordData({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to update password.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async () => {
    if (!profileImage) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('profile_image', profileImage);
      
      const response = await profileApi.updateProfileImage(formData);
      updateUser({ profile_image_url: response.data.profile_image_url });
      setProfileImage(null);
      setMessage({ type: 'success', text: 'Profile image updated successfully!' });
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to update image.' 
      });
    } finally {
      setLoading(false);
    }
  };

  async function handleThemeChange(mode) {
    setThemeMode(mode);
    try {
      const response = await profileApi.updateTheme(mode);
      updateUser(response.data.user);
      applyBranding({ theme_mode: mode });
      setMessage({ type: 'success', text: 'Theme saved!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to save theme.' 
      });
    }
  }

  return (
    <div className="client-profile-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Profile Settings</h1>
          <p>Manage your account information</p>
        </div>
      </div>

      {message.text && (
        <div className={`alert ${message.type}`}>
          {message.type === 'success' ? '✓' : '✕'} {message.text}
        </div>
      )}

      <div className="profile-grid">
        {/* Profile Information */}
        <div className="profile-section">
          <h2>
            <FaUser /> Profile Information
          </h2>
          
          <div className="profile-avatar-section">
            <div className="avatar-preview">
              <img 
                src={previewImage || assetUrl(user?.profile_image_url) || PROFILE_IMAGE_PLACEHOLDER} 
                alt="Profile"
              />
            </div>
            <div className="avatar-actions">
              <label className="upload-btn">
                <FaCamera /> Change Photo
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  hidden
                />
              </label>
              {profileImage && (
                <button 
                  className="save-image-btn"
                  onClick={handleUploadImage}
                  disabled={loading}
                >
                  <FaSave /> Save Image
                </button>
              )}
              <p className="hint">JPG or PNG. Max size 2MB.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="profile-form">
            <div className="form-group">
              <label>
                <FaUser /> Full Name
              </label>
              <input
                type="text"
                name="name"
                value={profile.name || ''}
                onChange={handleInputChange}
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
                value={profile.email || ''}
                onChange={handleInputChange}
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
                value={profile.phone || ''}
                onChange={handleInputChange}
                placeholder="Enter phone number"
              />
            </div>

<button 
              type="submit" 
              className="submit-btn"
              disabled={loading || message.type === 'error'}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>

            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading || message.type === 'error'}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="profile-section">
          <h2>
            <FaLock /> Change Password
          </h2>

          <form onSubmit={handleUpdatePassword} className="profile-form">
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                name="current_password"
                value={passwordData.current_password}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                name="password"
                value={passwordData.password}
                onChange={handlePasswordChange}
                required
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                name="password_confirmation"
                value={passwordData.password_confirmation}
                onChange={handlePasswordChange}
                required
                minLength={8}
              />
            </div>

            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Account Info */}
        <div className="profile-section full-width">
          <h2>Account Information</h2>
          <div className="account-info-grid">
            <div className="info-item">
              <span className="info-label">Account Type</span>
              <span className="info-value capitalize">{user?.role || 'Client'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Member Since</span>
              <span className="info-value">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email Verified</span>
              <span className={`info-value ${user?.email_verified_at ? 'verified' : 'unverified'}`}>
                {user?.email_verified_at ? 'Verified' : 'Not Verified'}
              </span>
            </div>
          </div>
        </div>

        {/* Theme Preference */}
        <div className="profile-section full-width">
          <h2>Theme Preference</h2>
          <p className="theme-hint">Choose your preferred theme mode.</p>
          <div className="theme-options">
            <button
              type="button"
              className={`theme-btn ${themeMode === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <Sun size={16} /> Light
            </button>
            <button
              type="button"
              className={`theme-btn ${themeMode === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <Moon size={16} /> Dark
            </button>
            <button
              type="button"
              className={`theme-btn ${themeMode === 'system' ? 'active' : ''}`}
              onClick={() => handleThemeChange('system')}
            >
              System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientProfilePage;
