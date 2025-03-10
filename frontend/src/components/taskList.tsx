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
  tasks: Task[];
  selectedPeriod: string;
  onTaskAction: (task: Task | null, action: string) => void;
  timeRemaining?: number; // Add timeRemaining as an optional prop
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  selectedPeriod,
  onTaskAction,
  timeRemaining: externalTimeRemaining, // Rename to avoid conflict with state
}) => {
  // Initialize with external time or 0 if not provided
  const [timeRemaining, setTimeRemaining] = useState<number>(
    externalTimeRemaining || 0
  );

  // Check if the user has periods - if selectedPeriod is "0", there are no periods
  const hasPeriods = selectedPeriod !== "0";

  // Update internal time when external time changes
  useEffect(() => {
    if (externalTimeRemaining !== undefined) {
      setTimeRemaining(externalTimeRemaining);
    } else if (hasPeriods) {
      // Fallback to 6 hours only if periods exist and no external time is provided
      setTimeRemaining(2 * 60 * 60);
    } else {
      // No periods, set to 0
      setTimeRemaining(0);
    }
  }, [externalTimeRemaining, selectedPeriod, hasPeriods]);

  // Only use internal timer if no external time is provided
  useEffect(() => {
    // Skip timer if external time is provided or no periods exist
    if (externalTimeRemaining !== undefined || !hasPeriods) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer); // Cleanup interval on unmount
  }, [selectedPeriod, hasPeriods, externalTimeRemaining]);

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

  // Progress bar width calculation - if no periods, show 0%
  // For users with periods, calculate based on 6 hour period duration
  const periodDurationSeconds = 6 * 60 * 60; // 6 hours in seconds
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
   <div className="bg-white shadow-md rounded-lg p-3 sm:p-4 mt-4 sm:mt-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-2">
        Tasks (Period {selectedPeriod})
      </h2>
      <div className="mb-4 sm:mb-6">
        <div className="flex justify-between pt-2 pb-4">
          {!hasPeriods && (
            <span className="bg-gray-100 text-gray-700 px-2 sm:px-3 py-1 border border-gray-300 text-xs sm:text-sm font-medium">
              No Periods
            </span>
          )}
        </div>

        <div
          className={`${
            !hasPeriods ? "border border-gray-300 bg-gray-100" : ""
          }`}
        >
          {!hasPeriods ? (
            <div className="text-left p-2">
              <div className="font-medium text-sm sm:text-base">Time Remaining: 00:00:00</div>
            </div>
          ) : (
            <>
              <div className="font-medium text-sm sm:text-base">
                Time Remaining: {formatTimeRemaining(timeRemaining)}
              </div>
              <div className="w-full bg-gray-200 h-4 sm:h-5 mt-2 sm:mt-3 mb-1 overflow-hidden">
                <div
                  className="bg-green-500 h-4 sm:h-5"
                  style={{ width: `${timeProgressPercentage}%` }}
                ></div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Task List Section */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">
          Tasks {hasPeriods ? `(Period ${selectedPeriod})` : ""}
        </h2>

        {/* Task Table - Make it responsive with a scrollable container */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="p-2 border text-xs sm:text-sm">Task Label</th>
                <th className="p-2 border text-xs sm:text-sm">Stock</th>
                <th className="p-2 border text-xs sm:text-sm">Type</th>
                <th className="p-2 border text-xs sm:text-sm">Price</th>
                <th className="p-2 border text-xs sm:text-sm">Extra</th>
                <th className="p-2 border text-xs sm:text-sm">Quantity</th>
                <th className="p-2 border text-xs sm:text-sm">Total Price</th>
                <th className="p-2 border text-xs sm:text-sm">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task, index) => (
                  <tr
                    key={task.id || index}
                    className="border-b hover:bg-gray-100"
                  >
                    <td className="p-2 sm:p-3 border text-xs sm:text-sm">
                      {task.taskLabel || `Task ${index + 1}`}
                    </td>
                    <td className="p-2 sm:p-3 border text-xs sm:text-sm">{task.stock || "-"}</td>
                    <td className="p-2 sm:p-3 border text-xs sm:text-sm">{task.type || "-"}</td>
                    <td className="p-2 sm:p-3 border text-xs sm:text-sm">
                      ${(task.price || 0).toFixed(2)}
                    </td>
                    <td className="p-2 sm:p-3 border text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">{task.extra || "-"}</td>
                    <td className="p-2 sm:p-3 border text-xs sm:text-sm">{task.quantity || 0}</td>
                    <td className="p-2 sm:p-3 border text-xs sm:text-sm">
                      ${(task.totalPrice || 0).toFixed(2)}
                    </td>
                    <td className="p-2 sm:p-3 border">
                      <button
                        className="bg-blue-500 hover:bg-blue-600 active:bg-[#6dad70] cursor-pointer text-white px-2 py-1 rounded text-xs sm:text-sm"
                        onClick={() => handleAcknowledge(task)}
                      >
                        Ack
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-3 text-center text-gray-500 text-xs sm:text-sm">
                    {hasPeriods
                      ? "No tasks available for this period."
                      : "No tasks available. Periods need to be configured to view tasks."}
                  </td>
                </tr>
              )}

              {filteredTasks.length > 0 && (
                <tr className="bg-gray-100">
                  <td colSpan={6} className="p-2 sm:p-3 text-right font-medium text-xs sm:text-sm">
                    Total:
                  </td>
                  <td className="p-2 sm:p-3 border font-bold text-xs sm:text-sm">
                    ${totalCost.toFixed(2)}
                  </td>
                  <td className="p-2 sm:p-3 border"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredTasks.length > 0 && (
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
    </div>
  );
};

export default TaskList;
