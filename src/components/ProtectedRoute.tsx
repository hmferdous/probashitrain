import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading, profile } = useAuth();
  const location = useLocation();

  // Still resolving session from storage
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  // User is authenticated but loadContext hasn't finished yet (profile still null).
  // Show spinner instead of incorrectly redirecting to /onboarding.
  if (profile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile.center_id && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
