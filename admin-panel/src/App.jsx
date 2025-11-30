import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Game from "./pages/Game";
import ManageChart from "./pages/ManageChart";
import ManageResults from "./pages/ManageResults";
import CustomAds from "./pages/CustomAds";
import Settings from "./pages/Settings";
import Group from "./pages/Group";
import Contact from "./pages/Contact";
import Login from "./pages/Login";

import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />

      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<Game />} />
            <Route path="game" element={<Game />} />
            <Route path="managechart" element={<ManageChart />} />
            <Route path="manageresults" element={<ManageResults />} />
            <Route path="group" element={<Group />} />
            <Route path="custom" element={<CustomAds />} />
            <Route path="contact" element={<Contact />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
