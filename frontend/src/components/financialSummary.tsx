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
  timeRemaining: number;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  financialData,
  currentPeriod,
  totalPeriods,
  timeRemaining,
}) => {
  // Check if the user has periods - explicitly check if totalPeriods is 0
  const hasPeriods = totalPeriods > 0;

  // Format time remaining (in seconds) to HH:MM:SS
  const formatTimeRemaining = (seconds: number) => {
    if (!hasPeriods) return "00:00:00";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Determine total period duration (assuming 6 hours per period)
  const periodDurationSeconds = 6 * 60 * 60; // 6 hours in seconds

  // Calculate time progress percentage within the current period
  // For users without periods, ensure time progress is always 0
  const timeProgressPercentage = hasPeriods
    ? Math.max(
        0,
        Math.min(
          100,
          ((periodDurationSeconds - timeRemaining) / periodDurationSeconds) *
            100
        )
      )
    : 0;

  // Format financial values with commas and 2 decimal places
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mt-4">
      <h2 className="text-xl font-semibold">Financial Summary</h2>
      <div className="mt-2 p-4 bg-gray-100 flex flex-col rounded-xl gap-[10px]">
        <div className="flex gap-[10px] w-full">
          <div className="bg-green-200 w-full p-2 rounded-md">
            <span className="font-medium">Allowance:</span> $
            {formatCurrency(financialData.allowance)}
          </div>
          <div className="bg-yellow-100 w-full p-2 rounded-md">
            <span className="font-medium">Commission:</span> $
            {formatCurrency(financialData.commission)}
          </div>
        </div>
        <div className="flex gap-[10px] w-full">
          <div className="bg-red-100 w-full p-2 rounded-md">
            <span className="font-medium">Spent:</span> $
            {formatCurrency(financialData.spent)}
          </div>
          <div className="bg-orange-100 w-full p-2 rounded-md">
            <span className="font-medium">Remaining:</span> $
            {formatCurrency(financialData.remaining)}
          </div>
        </div>
      </div>

      {/* Period Information */}
      <div className="mt-4">
        <div className="flex justify-between items-center pt-2 pb-4">
          <h2 className="text-xl font-semibold">Period Information</h2>
          {!hasPeriods && (
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
              No Periods
            </span>
          )}
        </div>

        <div
          className={`bg-gray-100 p-4 rounded-xl ${
            !hasPeriods ? "border border-gray-300" : ""
          }`}
        >
          {!hasPeriods ? (
            <div className="text-left py-4">
              <div className="text-gray-500 font-medium mb-2">
              Active Period: 0/0
              </div>
              <div className="font-medium">Time Remaining: 00:00:00</div>
            </div>
          ) : (
            <>
              <div className="font-medium">
                Active Period: {currentPeriod} / {totalPeriods}
              </div>

              {/* Time Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3 mb-1 overflow-hidden">
                <div
                  className="bg-green-500 h-2.5 rounded-full"
                  style={{ width: `${timeProgressPercentage}%` }}
                ></div>
              </div>

              <div className="font-medium">
                Time Remaining: {formatTimeRemaining(timeRemaining)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
