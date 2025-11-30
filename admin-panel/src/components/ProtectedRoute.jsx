import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setTokenValid(true);
    setReady(true);
  }, []);

  if (!ready) return null; // prevent redirect before checking

  if (!tokenValid) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
