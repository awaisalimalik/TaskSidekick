import React from "react";
import { useNavigate } from "react-router-dom";

interface NavbarProps {
  email?: string;
  onLogout: () => void; // ✅ Added logout function prop
}

const Navbar: React.FC<NavbarProps> = ({ email, onLogout }) => {
  return (
    <nav className="flex items-center justify-between bg-white text-[#28a05c] px-6 py-4 shadow-lg">
     <div className="text-2xl font-bold flex items-center gap-4 cursor-pointer">
  <div className="w-auto px-4 h-10 bg-white text-[#28a05c] flex items-center justify-center rounded-full font-bold">
    Task Sidekick
  </div>
</div>


      {/* User Profile, Email & Logout Button */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 text-[#28a05c]">
          <div className="w-10 h-10 bg-gray-300 text-gray-600 flex items-center justify-center rounded-full">
            {/* Profile Placeholder SVG */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l-4 4m8-8l-4 4m-4-4a4 4 0 118 0m-4-4a4 4 0 100 8"></path>
            </svg>
          </div>
          <span>{email || "No Email"}</span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 text-[#28a05c] rounded-lg hover:text-black transition cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 11-4 0v-1m0-4V7a2 2 0 114 0v1"></path>
          </svg>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
