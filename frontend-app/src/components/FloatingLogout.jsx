import React from "react";
import { FaSignOutAlt } from "react-icons/fa";
import "./FloatingLogout.css";

const FloatingLogout = () => {
  const handleLogout = () => {
    localStorage.removeItem("token"); // ✅ correct key
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <button
      className="floating-logout"
      onClick={handleLogout}
      title="Logout"
      aria-label="Logout"
    >
      <FaSignOutAlt />
    </button>
  );
};

export default FloatingLogout;
