import React, { useState, useEffect } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch current user email
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me"); // protected route
        setEmail(res.data.email);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch user info");
      }
    };
    fetchUser();
  }, []);

  const validateEmail = (email) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const handleUpdate = async () => {
    if (!email || !validateEmail(email)) return toast.error("Enter a valid email");
    if (newPassword && newPassword.length < 6)
      return toast.error("New password must be at least 6 characters");
    if (newPassword && !oldPassword)
      return toast.error("Enter old password to change password");

    try {
      setLoading(true);
      await api.put("/settings", {
        email,
        oldPassword: oldPassword || undefined,
        newPassword: newPassword || undefined,
      });
      toast.success("Settings updated successfully!");
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update settings");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/40 to-white py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-900">
            Admin Settings
          </h1>
        </header>

        {/* Settings Card */}
        <div className="bg-white border border-indigo-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-indigo-800 mb-4 sm:mb-6">
            Update Email & Password
          </h2>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Email */}
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">
                Email Address
              </label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            {/* Old Password */}
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">
                Old Password
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  className="w-full border border-gray-300 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 transition pr-10"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter old password to change password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                >
                  {showOldPassword ? 
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : 
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  }
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="w-full border border-gray-300 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 transition pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? 
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : 
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  }
                </button>
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="text-red-500 text-xs mt-1">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>

            {/* Update Button */}
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Updating Settings...</span>
                </>
              ) : (
                "Update Settings"
              )}
            </button>

            {/* Help Text */}
            <div className="text-xs sm:text-sm text-gray-500 mt-4">
              <p>• Leave password fields empty if you don't want to change your password</p>
              <p>• You must enter your old password to set a new one</p>
              <p>• New password must be at least 6 characters long</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}