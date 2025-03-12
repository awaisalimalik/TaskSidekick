// Update the FinancialSummary component to handle the silent refresh

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
  timeRemaining?: number;
  periodTimes?: string[];
  isWithinWorkingHours?: boolean;
  loading?: boolean;
  periodDataLoading?: boolean;
  transactionPerDay?: number;
  allPeriodsCount?: number;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  financialData,
  currentPeriod,
  totalPeriods,
  timeRemaining: externalTimeRemaining,
  isWithinWorkingHours = false,
  periodDataLoading = false,
  transactionPerDay = 4,
  allPeriodsCount = 0,
}) => {
  // Initialize with external time or 0 if not provided
  const [timeRemaining, setTimeRemaining] = useState<number>(
    externalTimeRemaining || 0
  );
  
  // Track previous values to avoid unnecessary UI updates
  const [prevPeriodInfo, setPrevPeriodInfo] = useState({
    currentPeriod,
    timeRemaining: externalTimeRemaining || 0,
  });

  // Check if the user has periods - explicitly check if totalPeriods is 0
  const hasPeriods = totalPeriods > 0;
  
  // Period is only considered active if:
  // 1. It's not "0" (indicating no active period)
  // 2. We're within working hours
  // 3. The current period number is within the transaction per day limit
  const currentPeriodNumber = parseInt(currentPeriod) || 0;
  const isActivePeriod = currentPeriod !== "0" && 
                          isWithinWorkingHours && 
                          currentPeriodNumber <= transactionPerDay;

  // Update internal time when external time changes
  useEffect(() => {
    if (externalTimeRemaining !== undefined) {
      setTimeRemaining(externalTimeRemaining);
    } else if (hasPeriods && isActivePeriod) {
      // Calculate period duration based on transaction per day (8 working hours / transaction per day)
      const periodDurationHours = 8 / transactionPerDay;
      setTimeRemaining(periodDurationHours * 60 * 60);
    } else {
      // No periods or outside working hours, set to 0
      setTimeRemaining(0);
    }
    
    // Update previous values for comparison
    setPrevPeriodInfo({
      currentPeriod,
      timeRemaining: externalTimeRemaining || 0,
    });
  }, [externalTimeRemaining, currentPeriod, hasPeriods, isActivePeriod, transactionPerDay]);

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

  // Calculate period duration in hours (8 working hours / transaction per day)
  const periodDurationHours = hasPeriods ? (8 / transactionPerDay) : 0;
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

  // Render different content based on loading state for period section
  const renderPeriodContent = () => {
    // Show loading spinner if periodDataLoading is true (now only during manual refreshes)
    if (periodDataLoading) {
      return (
        <div className="relative min-h-[60px] flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            className="w-6 h-6 animate-spin fill-[#28a05c]"
            aria-hidden="true"
          >
            <path d="M304 48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zm0 416a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM48 304a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm464-48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM142.9 437A48 48 0 1 0 75 369.1 48 48 0 1 0 142.9 437zm0-294.2A48 48 0 1 0 75 75a48 48 0 1 0 67.9 67.9zM369.1 437A48 48 0 1 0 437 369.1 48 48 0 1 0 369.1 437z" />
          </svg>
        </div>
      );
    } else if (!hasPeriods || !isActivePeriod) {
      return (
        <div className="text-left py-4">
          <div className="text-gray-500 font-medium mb-2">
            Active Period: 0/0
          </div>
          <div className="font-medium">Time Remaining: 00:00:00</div>
        </div>
      );
    } else {
      return (
        <>
          <div className="font-medium">
            Active Period: {currentPeriod}/{totalPeriods}
            {allPeriodsCount > transactionPerDay && (
              <span className="text-xs ml-2 text-gray-600">
                (Only first {transactionPerDay} of {allPeriodsCount} periods are active)
              </span>
            )}
          </div>
          
         
          
          {/* Show inactive message if period exists but is beyond transaction per day limit */}
          {currentPeriodNumber > transactionPerDay && currentPeriodNumber <= allPeriodsCount && (
            <div className="text-xs text-amber-600 mt-1 font-semibold">
              This period exists but is inactive due to the transaction per day limit ({transactionPerDay})
            </div>
          )}

          {/* Time Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3 mb-1 overflow-hidden">
            <div
              className="bg-green-500 h-2.5 rounded-full transition-all duration-1000"
              style={{ width: `${timeProgressPercentage}%` }}
            ></div>
          </div>

          <div className="font-medium">
            Time Remaining: {formatTimeRemaining(timeRemaining)}
          </div>
        </>
      );
    }
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
          {periodDataLoading ? (
            null
          ) : !hasPeriods ? (
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              No Periods
            </span>
          ) : !isActivePeriod ? (
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              No Active Period
            </span>
          ) : (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Active Period
            </span>
          )}
        </div>

        <div className={`bg-gray-100 p-4 rounded-xl ${!hasPeriods ? "border border-gray-300" : ""}`}>
          {renderPeriodContent()}
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;