import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from './ui.jsx';
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth(); const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <div role="alert" className="card mx-auto max-w-md text-center"><h2 className="font-bold">Access denied</h2><p className="text-sm text-stone-500">Your account type cannot open this page.</p></div>;
  return children;
}
