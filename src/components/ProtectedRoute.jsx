import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";


// Accepts optional allowedRoles prop
const ProtectedRoute = ({ children, allowedRoles }) => {
  const [ready, setReady] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [roleAllowed, setRoleAllowed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token) setTokenValid(true);
    if (allowedRoles) {
      setRoleAllowed(allowedRoles.includes(role));
    } else {
      setRoleAllowed(true); // No role restriction
    }
    setReady(true);
  }, [allowedRoles]);

  if (!ready) return null; // prevent redirect before checking

  if (!tokenValid) return <Navigate to="/login" replace />;
  if (!roleAllowed) return <Navigate to="/dashboard/manageresults" replace />;

  return children;
};

export default ProtectedRoute;
