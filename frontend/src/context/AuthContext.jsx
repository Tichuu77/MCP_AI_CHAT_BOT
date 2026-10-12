import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [permissions, setPermissions] = useState(() => {
    const savedUser = localStorage.getItem("user");
    const parsed = savedUser ? JSON.parse(savedUser) : null;
    return parsed?.permissions || [];
  });
  const [permissionDetails, setPermissionDetails] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    setLoadingProfile(true);
    try {
      const [meRes, permRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/permissions/me"),
      ]);
      const nextUser = meRes.data.user;
      const nextPerms = permRes.data.permissions || nextUser.permissions || [];
      const mergedUser = { ...nextUser, permissions: nextPerms };

      localStorage.setItem("user", JSON.stringify(mergedUser));
      setUser(mergedUser);
      setPermissions(nextPerms);
      setPermissionDetails(permRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
        setPermissions([]);
        setPermissionDetails(null);
      }
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshProfile();
    }
  }, [token, refreshProfile]);

  const login = (authData) => {
    const nextToken = authData.token;
    const nextUser = authData.user;

    if (!nextToken || !nextUser) {
      throw new Error("Login response must include a token and user.");
    }

    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    setPermissions(nextUser.permissions || []);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setPermissions([]);
    setPermissionDetails(null);
  };

  const hasRole = useCallback(
    (...roles) => {
      if (!user?.role) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const hasPermission = useCallback(
    (permission) => {
      if (!user) return false;
      if (user.role === "admin") return true;
      if (permissions.includes("*")) return true;
      return permissions.includes(permission);
    },
    [user, permissions]
  );

  const value = useMemo(
    () => ({
      token,
      user,
      permissions,
      permissionDetails,
      loadingProfile,
      isAuthenticated: Boolean(token),
      login,
      logout,
      hasRole,
      hasPermission,
      refreshProfile,
    }),
    [
      token,
      user,
      permissions,
      permissionDetails,
      loadingProfile,
      hasRole,
      hasPermission,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
};