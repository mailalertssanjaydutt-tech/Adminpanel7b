import React from "react";

export default function Navbar() {
  return (
    <header className="bg-white shadow-sm p-4 flex justify-between items-center">
      <h2 className="text-lg font-semibold text-gray-700">Dashboard</h2>
      <div className="flex items-center gap-3">
        <span className="text-gray-500 text-sm">Welcome, Admin</span>
        <img
          src="https://i.pravatar.cc/40"
          alt="profile"
          className="w-10 h-10 rounded-full border"
        />
      </div>
    </header>
  );
}
