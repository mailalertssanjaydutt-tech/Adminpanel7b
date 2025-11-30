import React from "react";
import { Home, Settings, LogOut } from "lucide-react";

export default function Sidebar({ handleLogout }) {
  return (
    <div className="bg-white w-full h-full lg:w-64 shadow-xl p-6 flex flex-col">
      <h1 className="text-2xl font-bold text-indigo-600 mb-10">Admin Panel</h1>
      <nav className="flex-1 space-y-4">
        <button className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 w-full">
          <Home size={20} /> Dashboard
        </button>
        <button className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 w-full">
          <Settings size={20} /> Settings
        </button>
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