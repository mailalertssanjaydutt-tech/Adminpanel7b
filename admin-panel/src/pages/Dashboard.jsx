import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import * as Lucide from "lucide-react";
import api from "../utils/api";

export default function Dashboard() {
  const [user, setUser] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile state
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch (err) {
        console.log(err.response?.data);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };
    fetchUser();
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const sidebarLinks = [
    { name: "Game", icon: <Lucide.Home size={20} />, path: "/dashboard/game" },
    {
      name: "ManageChart",
      icon: <Lucide.Users size={20} />,
      path: "/dashboard/managechart",
    },
    {
      name: "ManageResults",
      icon: <Lucide.Users size={20} />,
      path: "/dashboard/manageresults",
    },
    {
      name: "Grouping",
      icon: <Lucide.Users size={20} />,
      path: "/dashboard/group",
    },
    {
      name: "Custom ADS",
      icon: <Lucide.Users size={20} />,
      path: "/dashboard/custom",
    },
    {
      name: "Contacts",
      icon: <Lucide.Mail size={20} />, // Changed icon for context
      path: "/dashboard/contact",
    },
    {
      name: "Settings",
      icon: <Lucide.Settings size={20} />,
      path: "/dashboard/settings",
    },
  ];

  return (
    <div className="flex h-screen font-sans bg-gray-100 overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white flex flex-col shadow-lg transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 text-2xl font-bold border-b border-gray-700 flex items-center justify-between lg:justify-center">
          <span>Admin Panel</span>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Lucide.X size={24} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)} // Close on click mobile
                className={`flex items-center px-4 py-3 rounded transition duration-200 ${
                  isActive ? "bg-gray-800 font-semibold" : "hover:bg-gray-800"
                }`}
              >
                <span className="mr-3 min-w-[20px]">{link.icon}</span>
                {link.name}
              </Link>
            );
          })}

          <button
            onClick={logout}
            className="flex items-center w-full text-left px-4 py-3 rounded hover:bg-gray-800 transition duration-200 mt-auto"
          >
            <Lucide.LogOut size={20} className="mr-3 min-w-[20px]" />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white shadow-sm p-4 flex items-center lg:hidden z-10">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-gray-700 focus:outline-none mr-4"
          >
            <Lucide.Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}