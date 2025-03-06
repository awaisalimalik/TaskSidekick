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

  const handleAcknowledge = (task: Task | null) => {
    if (task) {
      onTaskAction(task, "acknowledge");
    } else {
      onTaskAction(null, "acknowledge-all");
    }
  };

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
            <th className="p-2 border">Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task, index) => (
              <tr key={task.id || index} className="border-b hover:bg-gray-100">
                <td className="p-3 border">{task.taskLabel || `Task ${index + 1}`}</td>
                <td className="p-3 border">{task.stock || '-'}</td>
                <td className="p-3 border">{task.type || '-'}</td>
                <td className="p-3 border">${(task.price || 0).toFixed(2)}</td>
                <td className="p-3 border">{task.extra || '-'}</td>
                <td className="p-3 border">{task.quantity || 0}</td>
                <td className="p-3 border">${(task.totalPrice || 0).toFixed(2)}</td>
                <td className="p-3 border">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm"
                    onClick={() => handleAcknowledge(task)}
                  >
                    Ack
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="p-3 text-center text-gray-500">
                No tasks available for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-4 text-left cursor-pointer">
        <button
          className="bg-[#28a05c] hover:bg-green-600 text-white px-2 py-2 rounded-lg font-semibold cursor-pointer"
          onClick={() => handleAcknowledge(null)}
          disabled={filteredTasks.length === 0}
        >
          Acknowledge All Tasks
        </button>
      </div>
    </div>
  );
};

export default TaskList;