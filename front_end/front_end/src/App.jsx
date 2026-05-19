import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginForm from "./components/ui/LoginForm";
import DashboardPage from "./pages/DriverDashboardPage";
import AdminDashboard from "./components/AdminDashboard";

// THIS IS WHERE THE FORM IS PLACED
function AppContent() {
  const { user, loading } = useAuth();

  // Show nothing or a spinner while checking localStorage
  if (loading) return null; 

  // IF NO USER, SHOW LOGIN
  if (!user) {
    return <LoginForm />;
  }

  if (user.role === "FINANCIER" || user.role === "ADMIN") {
    return <AdminDashboard />;
  }

  // IF USER EXISTS, SHOW THE DRIVER DASHBOARD
  return <DashboardPage />;
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }, []);

  return (
    <AuthProvider>
      <div className="bg-white text-zinc-950 antialiased selection:bg-emerald-700 selection:text-white">
        <AppContent />
      </div>
    </AuthProvider>
  );
}
