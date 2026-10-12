import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Chat from "./pages/Chat.jsx";
import Organization from "./pages/Organization.jsx";
import Permissions from "./pages/Permissions.jsx";
import Diagnostics from "./pages/Diagnostics.jsx";

import { useAuth } from "./context/AuthContext.jsx";

const ProtectedRoute = ({ children, requiredAnyPermissions }) => {
  const { isAuthenticated, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (
    Array.isArray(requiredAnyPermissions) &&
    requiredAnyPermissions.length > 0 &&
    !requiredAnyPermissions.some((perm) => hasPermission(perm))
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat/:conversationId"
          element={
            <ProtectedRoute requiredAnyPermissions={["conversation:read"]}>
              <Chat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/organization"
          element={
            <ProtectedRoute
              requiredAnyPermissions={["organization:read", "member:read"]}
            >
              <Organization />
            </ProtectedRoute>
          }
        />

        <Route
          path="/permissions"
          element={
            <ProtectedRoute>
              <Permissions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/diagnostics"
          element={
            <ProtectedRoute>
              <Diagnostics />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;