import React, { useEffect, useState } from "react";

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
  timeRemaining?: number; // Made optional like in TaskList
  periodTimes?: string[];
  isWithinWorkingHours?: boolean;
  loading?: boolean; // Add loading prop
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  financialData,
  currentPeriod,
  totalPeriods,
  timeRemaining: externalTimeRemaining,
  isWithinWorkingHours = false,
  loading = false,
}) => {
  // Initialize with external time or 0 if not provided
  const [timeRemaining, setTimeRemaining] = useState<number>(
    externalTimeRemaining || 0
  );

  // Check if the user has periods - explicitly check if totalPeriods is 0
  const hasPeriods = totalPeriods > 0;
  const isActivePeriod = currentPeriod !== "0" && isWithinWorkingHours;

  // Update internal time when external time changes
  useEffect(() => {
    if (externalTimeRemaining !== undefined) {
      setTimeRemaining(externalTimeRemaining);
    } else if (hasPeriods && isActivePeriod) {
      // Calculate period duration based on total periods (8 working hours / number of periods)
      const periodDurationHours = 8 / totalPeriods;
      setTimeRemaining(periodDurationHours * 60 * 60);
    } else {
      // No periods or outside working hours, set to 0
      setTimeRemaining(0);
    }
  }, [externalTimeRemaining, currentPeriod, hasPeriods, isActivePeriod, totalPeriods]);

  // Only use internal timer if no external time is provided
  useEffect(() => {
    // Skip timer if external time is provided, no periods exist, or outside working hours
    if (externalTimeRemaining !== undefined || !hasPeriods || !isActivePeriod) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer); // Cleanup interval on unmount
  }, [currentPeriod, hasPeriods, isActivePeriod, externalTimeRemaining]);

  // Format time remaining (in seconds) to HH:MM:SS
  const formatTimeRemaining = (seconds: number) => {
    if (!hasPeriods || !isActivePeriod) return "00:00:00";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate period duration in hours (8 working hours / number of periods)
  const periodDurationHours = hasPeriods ? 8 / totalPeriods : 0;
  const periodDurationSeconds = periodDurationHours * 60 * 60;

  // Calculate time progress percentage within the current period
  const timeProgressPercentage = hasPeriods && isActivePeriod && periodDurationSeconds > 0
    ? Math.max(
        0,
        Math.min(
          100,
          ((periodDurationSeconds - timeRemaining) / periodDurationSeconds) * 100
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
          {loading ? (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              Loading...
            </span>
          ) : !hasPeriods ? (
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              No Periods
            </span>
          ) : !isActivePeriod ? (
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
              Outside Working Hours
            </span>
          ) : (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Active Period
            </span>
          )}
        </div>

        <div className={`bg-gray-100 p-4 rounded-xl ${!hasPeriods ? "border border-gray-300" : ""}`}>
          {loading ? (
            <div className="py-4 flex flex-col items-center justify-center">
              <div className="animate-pulse flex space-x-4">
                <div className="h-4 bg-blue-200 rounded w-24"></div>
                <div className="h-4 bg-blue-200 rounded w-24"></div>
              </div>
              <div className="animate-pulse mt-4">
                <div className="h-4 bg-blue-200 rounded w-56"></div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3 mb-1 overflow-hidden">
                <div className="bg-blue-200 h-2.5 rounded-full animate-pulse"></div>
              </div>
            </div>
          ) : !hasPeriods ? (
            <div className="text-left py-4">
              <div className="text-gray-500 font-medium mb-2">
                Active Period: 0/0
              </div>
              <div className="font-medium">Time Remaining: 00:00:00</div>
            </div>
          ) : !isActivePeriod ? (
            <div className="text-left py-4">
              <div className="text-gray-500 font-medium mb-2">
                No Active Period ({totalPeriods} periods/day)
              </div>
              <div className="font-medium">Outside Working Hours (9:00 - 17:00)</div>
            </div>
          ) : (
            <>
              <div className="font-medium">
                Active Period: {currentPeriod}/{totalPeriods}
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