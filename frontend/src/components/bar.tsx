import React from "react";

interface BarSectionProps {
  setActiveTab: React.Dispatch<React.SetStateAction<"financialSummary" | "tasks">>;
  activeTab: "financialSummary" | "tasks";
}

const BarSection: React.FC<BarSectionProps> = ({ setActiveTab, activeTab }) => {
  return (
    <nav className="bg-[#28a05c] text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-center items-center">
        <ul className="flex gap-10">
          {(["financialSummary", "tasks"] as const).map((tab) => (
            <li key={tab} className="relative">
              <button
                onClick={() => setActiveTab(tab)}
                className="relative text-white-800 font-[500] hover:text-gray-300 transition-all duration-300 cursor-pointer"
              >
                <span className="relative inline-block">
                  {tab === "financialSummary" ? "Home" : "Tasks List"}
                  <span
                    className={`absolute left-0 bottom-[-4px] h-[3px] bg-white transition-all duration-300 ${
                      activeTab === tab ? "w-full scale-x-100" : "w-0 scale-x-0"
                    }`}
                  ></span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default BarSection;
