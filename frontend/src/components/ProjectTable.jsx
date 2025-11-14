import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const ProjectTable = ({ projects, searchTerm, onEditStatus, onDelete }) => {
  const navigate = useNavigate();

  // Filter projects based on search term
  const filteredProjects = projects.filter((project) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      project.projectId.toLowerCase().includes(searchLower) ||
      project.projectName.toLowerCase().includes(searchLower)
    );
  });

  // Calculate progress percentage
  const calculateProgress = (project) => {
    if (!project.stages || project.stages.length === 0) return 0;
    const totalWeight = project.stages.reduce((sum, stage) => sum + stage.weight, 0);
    const completedWeight = project.stages
      .filter((stage) => stage.status === "Completed")
      .reduce((sum, stage) => sum + stage.weight, 0);
    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  };

  // Calculate status summary
  const getStatusSummary = (project) => {
    if (!project.stages || project.stages.length === 0) return "0/0 Completed";
    const completed = project.stages.filter((stage) => stage.status === "Completed").length;
    return `${completed}/${project.stages.length} Completed`;
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700 border border-green-200";
      case "In Progress":
        return "bg-yellow-100 text-yellow-700 border border-yellow-200";
      case "Delayed":
        return "bg-red-100 text-red-700 border border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  // Get overall project status
  const getOverallStatus = (project) => {
    const statuses = project.stages?.map((s) => s.status) || [];
    if (statuses.includes("Delayed")) return "Delayed";
    if (statuses.includes("In Progress")) return "In Progress";
    if (statuses.every((s) => s === "Completed")) return "Completed";
    return "Yet to Start";
  };

  return (
    <div className="card-modern overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-gray-100">
          <thead className="bg-gray-50/50">
            <tr className="text-left text-[12px] font-semibold text-gray-600 uppercase tracking-wide">
              <th className="px-4 py-3 w-[9%]">Project ID</th>
              <th className="px-3 py-3 w-[16%]">Project Name</th>
              <th className="px-4 py-3 w-[12%]">Department</th>
              <th className="px-4 py-3 w-[12%]">Start Date</th>
              <th className="px-4 py-3 w-[12%]">End Date</th>
              <th className="px-3 py-3 w-[13%]">Overall Progress</th>
              <th className="px-4 py-3 w-[10%]">Status Summary</th>
              <th className="px-4 py-3 w-[8%]">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredProjects.length === 0 ? (
              <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-gray-400 text-sm mb-2">No projects found</p>
                    <p className="text-gray-300 text-xs">Try adjusting your search terms</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProjects.map((project, index) => {
                const progress = calculateProgress(project);
                const overallStatus = getOverallStatus(project);
                return (
                  <motion.tr
                    key={project._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className={`transition-colors duration-150 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                              } hover:bg-[#2563eb]/5`}
                  >
                    <td className="px-4 py-3 break-words">
                      <span className="text-sm font-semibold text-[#111827]">{project.projectId}</span>
                    </td>
                    <td className="px-3 py-3 break-words">
                      <span className="text-[13px] text-[#111827] leading-tight truncate block">{project.projectName}</span>
                    </td>
                    <td className="px-4 py-3 break-words">
                      <span className="text-sm text-gray-600 leading-tight">{project.department}</span>
                    </td>
                    <td className="px-4 py-3 break-words">
                      <span className="text-sm text-gray-600">{project.startDate || "-"}</span>
                    </td>
                    <td className="px-4 py-3 break-words">
                      <span className="text-sm text-gray-600">{project.endDate || "-"}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden min-w-[70px]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              progress === 100 ? "bg-[#10b981]" : progress >= 50 ? "bg-[#2563eb]" : "bg-yellow-500"
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-gray-700 min-w-[30px] text-right">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-3 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(overallStatus)}`}>
                        {getStatusSummary(project)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs whitespace-nowrap font-semibold">
                              <button
                                onClick={() => onEditStatus(project)}
                          className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors duration-200"
                              >
                                View / Edit Status
                              </button>
                        <button
                          onClick={() => onDelete(project)}
                          className="text-red-600 hover:text-red-700 transition-colors duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectTable;

