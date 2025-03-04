import React from "react";

interface FinancialData {
  allowance: number;
  commission: number;
  spent: number;
  remaining: number;
}

interface FinancialSummaryProps {
  financialData: FinancialData;
  currentPeriod: string; 
  totalPeriods: number; 
  timeRemaining: number; // Add timeRemaining prop (in seconds)
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  financialData,
  currentPeriod,
  totalPeriods,
  timeRemaining,
}) => {
  // Convert time remaining (in seconds) to minutes and seconds
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  // Calculate progress percentage
  const totalTime = 6 * 60 * 60; // 6 hours in seconds
  const progressPercentage = ((totalTime - timeRemaining) / totalTime) * 100;

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mt-4">
      <h2 className="text-xl font-semibold">Financial Summary</h2>
      <div className="mt-2 p-4 bg-gray-100 flex flex-col rounded-xl gap-[10px]">
        <div className="flex gap-[10px]  w-full">
          <div className="bg-green-200  w-full p-2">
            Allowance: ${financialData.allowance}
          </div>
          <div className="bg-yellow-100  w-full p-2">
            Commission: ${financialData.commission}
          </div>
        </div>
        <div className="flex gap-[10px]  w-full">
          <div className="bg-red-100 w-full p-2">Spent: ${financialData.spent}</div>
          <div className="bg-orange-100 w-full p-2">
            Remaining: ${financialData.remaining}
          </div>
        </div>


      </div>

      {/* Period Information */}
      <div className="mt-1 ">
        <h2 className="text-xl pt-6 pb-4 font-semibold">Period Information</h2>
        <div className="mt-0 bg-gray-100 p-4 rounded-xl">
          <div className="  ">
            Active Period: {currentPeriod} / {totalPeriods}
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-blue-500 rounded-2xl h-2 overflow-hidden mt-2">
            <div
              className="bg-gray-200 h-2 rounded-2xl transition-all"
              style={{
                width: `${progressPercentage}%`,
                marginLeft: "auto", // Align to the right
                transform: "scaleX(-1)", // Reverse the direction
              }}
            ></div>
          </div>
          <div>
            Time Remaining: {minutes.toString().padStart(2, "0")}:
            {seconds.toString().padStart(2, "0")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
