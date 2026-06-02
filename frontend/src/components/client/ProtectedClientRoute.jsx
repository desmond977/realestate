import { Navigate, useLocation } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';

const ProtectedClientRoute = ({ children }) => {
  const { isAuthenticated, loading } = useClient();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login but save the location they were trying to access
    return <Navigate to="/client/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedClientRoute;
