import React, { useEffect, useState } from "react";

interface Task {
  period: string;
  taskLabel: string;
  stock: string;
  type: string;
  price: number;
  extra: string;
  quantity: number;
  totalPrice: number;
}

interface TaskListProps {
  tasks: Task[];
  selectedPeriod: string;
  onTaskAction: (task: Task | null, action: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, selectedPeriod, onTaskAction }) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(6 * 60 * 60); // Set countdown timer to 6 hours

  useEffect(() => {
    setTimeRemaining(6 * 60 * 60); // Reset timer to 6 hours whenever the period changes
  }, [selectedPeriod]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer); // Cleanup interval on unmount
  }, [selectedPeriod]); // Reset timer when period changes

  // Progress bar width calculation
  const progressWidth = `${(timeRemaining / (6 * 60 * 60)) * 100}%`;

  const filteredTasks = tasks.filter((task) => task.period === selectedPeriod);

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mt-6">
      {/* Title */}
      <h2 className="text-xl font-semibold mb-2">Tasks (Period {selectedPeriod})</h2>

      {/* Countdown Timer */}
      <div className="text-gray-700 font-medium mb-2">
        Time Remaining: {Math.floor(timeRemaining / 3600)} hours {Math.floor((timeRemaining % 3600) / 60)} minutes {timeRemaining % 60} seconds
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-4 overflow-hidden mb-4">
        <div className="bg-blue-400 h-4 transition-all" style={{ width: progressWidth }}></div>
      </div>

      {/* Task Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="p-2 border">Task Label</th>
            <th className="p-2 border">Stock</th>
            <th className="p-2 border">Type</th>
            <th className="p-2 border">Price</th>
            <th className="p-2 border">Extra</th>
            <th className="p-2 border">Quantity</th>
            <th className="p-2 border">Total Price</th>
          </tr>
        </thead>
        <tbody>
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task, index) => (
              <tr key={index} className="border-b hover:bg-gray-100">
                <td className="p-3 border">{task.taskLabel}</td>
                <td className="p-3 border">{task.stock}</td>
                <td className="p-3 border">{task.type}</td>
                <td className="p-3 border">${task.price.toFixed(2)}</td>
                <td className="p-3 border">{task.extra}</td>
                <td className="p-3 border">{task.quantity}</td>
                <td className="p-3 border">${task.totalPrice.toFixed(2)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="p-3 text-center text-gray-500">
                No tasks available for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Acknowledge Button */}
      <div className="mt-4 text-left cursor-pointer">
        <button
          className="bg-green-500 hover:bg-green-600 text-white px-2 py-2 rounded-lg font-semibold cursor-pointer "
          onClick={() => onTaskAction(null, "acknowledge-all")}
        >
          Acknowledge All Tasks
        </button>
      </div>
    </div>
  );
};

export default TaskList;