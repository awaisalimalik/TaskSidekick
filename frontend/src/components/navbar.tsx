import React from "react";

interface NavbarProps {
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  return (
    <nav className="flex items-center justify-between bg-white text-[#28a05c] px-6 py-4 shadow-lg">
      <div className=" text-[20px] font-sans leading-[2px] font-bold flex items-center gap-4 cursor-pointer">
        <div className="w-auto px-4 h-10 bg-white text-[#28a05c] flex items-center justify-center rounded-full font-bold">
          Task Sidekick
        </div>
      </div>
      
      {/* Logout Button */}
      <button
        onClick={onLogout}
        className="flex items-center gap-2 px-4 py-2 text-[#28a05c] rounded-lg hover:text-black transition cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 11-4 0v-1m0-4V7a2 2 0 114 0v1"></path>
        </svg>
        Logout
      </button>
    </nav>
  );
};

export default Navbar;
