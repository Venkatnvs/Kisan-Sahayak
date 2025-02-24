import { Bell, Database, Gamepad, Home, Settings, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState("home");

  useEffect(() => {
    const path = location.pathname;
    if (path === "/") {
      setCurrentPage("home");
    } else if (path === "/controller") {
      setCurrentPage("controller");
    } else if (path === "/loc-data") {
      setCurrentPage("loc-data");
    }
  }, [location]);

  const handleNavigation = (page, path) => {
    setCurrentPage(page);
    navigate(path);
  };

  return (
    <nav className="border-t border-gray-200 bg-white fixed bottom-0 w-full">
      <div className="max-w-md mx-auto px-4">
        <div className="flex justify-between py-2">
          <button
            onClick={() => handleNavigation("home", "/")}
            className={`flex flex-col items-center gap-1 ${
              currentPage === "home"
                ? "text-primary"
                : "text-gray-600 hover:text-primary"
            }`}
          >
            <Home className="h-4 w-4" />
            <span className="text-xs">Home</span>
          </button>

          <button
            onClick={() => handleNavigation("controller", "/controller")}
            className={`flex flex-col items-center gap-1 ${
              currentPage === "controller"
                ? "text-primary"
                : "text-gray-600 hover:text-primary"
            }`}
          >
            <Gamepad className="h-4 w-4" />
            <span className="text-xs">Controller</span>
          </button>

          <button
            onClick={() => handleNavigation("loc-data", "/loc-data")}
            className={`flex flex-col items-center gap-1 ${
              currentPage === "loc-data"
                ? "text-primary"
                : "text-gray-600 hover:text-primary"
            }`}
          >
            <Database className="h-4 w-4" />
            <span className="text-xs">loc-data</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;