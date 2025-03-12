
import React, { useEffect, useState } from "react";

interface Task {
  id?: string | number;
  period: string;
  taskLabel: string;
  stock: string;
  type: string;
  price: number;
  extra: string;
  quantity: number;
  totalPrice: number;
  board?: string;
  cost?: number;
  userId?: string;
}

interface TaskListProps {
  tasks: any[];
  selectedPeriod: string;
  onTaskAction: (task: any, action: string) => Promise<void>;
  timeRemaining: number;
  totalPeriods: number;
  isWithinWorkingHours: boolean;
  loading: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  selectedPeriod,
  onTaskAction,
  timeRemaining: externalTimeRemaining,
  totalPeriods = 0,
   isWithinWorkingHours = false,
}) => {
  // Initialize with external time or 0 if not provided
  const [timeRemaining, setTimeRemaining] = useState<number>(
    externalTimeRemaining || 0
  );

  // Check if the user has periods and if we're in an active period
  const hasPeriods = totalPeriods > 0;
  const isActivePeriod = selectedPeriod !== "0" && isWithinWorkingHours;

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
  }, [externalTimeRemaining, selectedPeriod, hasPeriods, isActivePeriod, totalPeriods]);

  // Only use internal timer if no external time is provided
  useEffect(() => {
    // Skip timer if external time is provided, no periods exist, or outside working hours
    if (externalTimeRemaining !== undefined || !hasPeriods || !isActivePeriod) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer); // Cleanup interval on unmount
  }, [selectedPeriod, hasPeriods, isActivePeriod, externalTimeRemaining]);

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

  // Calculate period duration in hours
  const periodDurationHours = hasPeriods ? 8 / totalPeriods : 0;
  const periodDurationSeconds = periodDurationHours * 60 * 60;

  // Progress bar width calculation
  const timeProgressPercentage = hasPeriods && isActivePeriod && periodDurationSeconds > 0
    ? Math.max(
        0,
        Math.min(
          100,
          ((periodDurationSeconds - timeRemaining) / periodDurationSeconds) * 100
        )
      )
    : 0;

  // Get current period time range
   

  // Get tasks for the selected period and ensure they have all necessary fields
  const filteredTasks = tasks
    .filter((task) => task.period === selectedPeriod)
    .map((task, index) => {
      // Ensure task has an ID
      if (!task.id) {
        task.id = `task-${index}`;
      }

      // Use cost field as totalPrice if totalPrice is not defined
      if (!task.totalPrice && task.cost) {
        task.totalPrice = task.cost;
      }

      // Calculate totalPrice if neither is defined but we have price and quantity
      if (!task.totalPrice && !task.cost && task.price && task.quantity) {
        task.totalPrice = task.price * task.quantity;
      }

      // Set task label from the board field if needed
      if (!task.taskLabel && task.board) {
        task.taskLabel = task.board;
      }

      return task;
    });

  // Calculate total cost
  const totalCost = filteredTasks.reduce(
    (sum, task) => sum + (task.totalPrice || 0),
    0
  );

  const handleAcknowledge = (task: Task | null) => {
    if (task) {
      onTaskAction(task, "acknowledge");
    } else {
      onTaskAction(null, "acknowledge-all");
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-2 sm:p-4 mt-4 sm:mt-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg sm:text-xl font-semibold">
          Tasks {isActivePeriod ? `(Period ${selectedPeriod}/${totalPeriods})` : ""}
        </h2>
        {!hasPeriods ? (
          <span className="bg-red-100 text-red-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
            No Periods
          </span>
        ) : !isActivePeriod ? (
          <span className="bg-gray-100 text-gray-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
            Outside Working Hours
          </span>
        ) : (
         null
        )}
      </div>

      <div className="mb-4 sm:mb-6">
        <div
          className={`${
            !hasPeriods || !isActivePeriod ? "border border-gray-300 bg-gray-100" : ""
          } p-2 rounded-lg`}
        >
          {!hasPeriods ? (
            <div className="text-left p-1">
              <div className="font-medium text-sm sm:text-base">Time Remaining: 00:00:00</div>
              <div className="text-xs text-gray-500"> </div>
            </div>
          ) : !isActivePeriod ? (
            <div className="text-left p-1">
              <div className="font-medium text-sm sm:text-base">Outside Working Hours (9:00 - 17:00)</div>
               
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <div className="font-medium text-sm sm:text-base">
                  Time Remaining: {formatTimeRemaining(timeRemaining)}
                </div>
                
              </div>
              <div className="w-full bg-gray-200 h-4 sm:h-5 mt-2 sm:mt-3 mb-1 overflow-hidden ">
                <div
                  className="bg-green-500 h-4 sm:h-5  "
                  style={{ width: `${timeProgressPercentage}%` }}
                ></div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Task List Section */}
      <div className="overflow-x-auto md:overflow-visible">
        <div className="w-full">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="p-1 text-xs sm:text-sm">Task Label</th>
                <th className="p-1 text-xs sm:text-sm">Stock</th>
                <th className="p-1 text-xs sm:text-sm">Type</th>
                <th className="p-1 text-xs sm:text-sm">Price</th>
                <th className="p-1 text-xs sm:text-sm">Extra</th>
                <th className="p-1 text-xs sm:text-sm">Quantity</th>
                <th className="p-1 text-xs sm:text-sm">Total Price</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task, index) => (
                  <tr
                    key={task.id || index}
                    className="hover:bg-gray-100"
                  >
                    <td className="p-1 text-xs sm:text-sm">
                      {task.taskLabel || `Task ${index + 1}`}
                    </td>
                    <td className="p-1 text-xs sm:text-sm">{task.stock || "-"}</td>
                    <td className="p-1 text-xs sm:text-sm">{task.type || "-"}</td>
                    <td className="p-1 text-xs sm:text-sm">
                      ${(task.price || 0).toFixed(2)}
                    </td>
                    <td className="p-1 text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">{task.extra || "-"}</td>
                    <td className="p-1 text-xs sm:text-sm">{task.quantity || 0}</td>
                    <td className="p-1 text-xs sm:text-sm">
                      ${(task.totalPrice || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-gray-500 text-xs sm:text-sm">
                    {!hasPeriods
                      ? "No tasks available. Periods need to be configured to view tasks."
                      : !isActivePeriod
                      ? "No tasks available outside working hours."
                      : "No tasks available for this period."}
                  </td>
                </tr>
              )}

              {filteredTasks.length > 0 && (
                <tr>
                  <td colSpan={6} className="p-1 sm:p-2 text-right font-medium text-xs sm:text-sm">
                    Total:
                  </td>
                  <td className="p-1 sm:p-1 font-bold text-xs sm:text-sm">
                    ${totalCost.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTasks.length > 0 && isActivePeriod && (
        <div className="mt-4 text-left">
          <button
            className="bg-[#28a05c] hover:bg-[#6dad70] active:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 cursor-pointer rounded-lg font-semibold text-xs sm:text-sm"
            onClick={() => handleAcknowledge(null)}
          >
            Acknowledge All Tasks
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskList;