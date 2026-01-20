import React from "react";
import { Home, Settings, LogOut } from "lucide-react";

import { useNavigate } from "react-router-dom";

export default function Sidebar({ handleLogout }) {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  return (
    <div className="bg-white w-full h-full lg:w-64 shadow-xl p-6 flex flex-col">
      <h1 className="text-2xl font-bold text-indigo-600 mb-10">Admin Panel</h1>
      <nav className="flex-1 space-y-4">
        {role === "admin" && (
          <>
            <button className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 w-full" onClick={() => navigate("/dashboard/game")}> <Home size={20} /> Dashboard </button>
            <button className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 w-full" onClick={() => navigate("/dashboard/managechart")}> Manage Chart </button>
            <button className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 w-full" onClick={() => navigate("/dashboard/group")}> Group </button>
            <button className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 w-full" onClick={() => navigate("/dashboard/custom")}> Custom Ads </button>
            <button className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 w-full" onClick={() => navigate("/dashboard/contact")}> Contact </button>
            <button className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 w-full" onClick={() => navigate("/dashboard/settings")}> <Settings size={20} /> Settings </button>
            <button className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 w-full" onClick={() => navigate("/dashboard/manageseo")}> Manage SEO </button>
          </>
        )}
        <button className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 w-full" onClick={() => navigate("/dashboard/manageresults")}> Manage Results </button>
      </nav>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 text-red-500 hover:text-red-700 mt-auto w-full"
      >
        <LogOut size={20} /> Logout
      </button>
    </div>
  );
}