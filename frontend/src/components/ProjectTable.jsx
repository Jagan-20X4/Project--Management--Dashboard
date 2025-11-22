import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Edit, Trash2, X } from "lucide-react";
import { updateProjectPriority } from "../api/projectAPI";
import { toast } from "react-toastify";

const ProjectTable = ({ 
  projects, 
  searchTerm, 
  onEditStatus, 
  onDelete, 
  userRole = "admin", 
  onUpdate,
  allProjects = [],
  departmentFilter = "",
  projectOwnerFilter = "",
  priorityFilter = "",
  onDepartmentFilterChange,
  onProjectOwnerFilterChange,
  onPriorityFilterChange
}) => {
  const navigate = useNavigate();
  const isAdmin = userRole === "admin";
  const isHod = userRole === "hod";
  const [updatingPriority, setUpdatingPriority] = useState({});

  // Extract unique values for filters
  const getUniqueDepartments = () => {
    const departments = allProjects
      .map((p) => p.department)
      .filter((d) => d && d.trim() !== "");
    return [...new Set(departments)].sort();
  };

  const getUniqueProjectOwners = () => {
    // Normalize owners by trimming whitespace to handle duplicates like "Dattatray" vs "Dattatray "
    const normalizedOwnersMap = new Map();
    
    allProjects.forEach((project) => {
      if (project.projectOwner && project.projectOwner.trim() !== "") {
        const normalized = project.projectOwner.trim();
        // Store the first occurrence (or you could store the most common version)
        if (!normalizedOwnersMap.has(normalized)) {
          normalizedOwnersMap.set(normalized, project.projectOwner.trim());
        }
      }
    });
    
    // Return unique, normalized owners sorted alphabetically
    return Array.from(normalizedOwnersMap.values()).sort();
  };

  const getUniquePriorities = () => {
    const priorities = allProjects
      .map((p) => p.priority)
      .filter((p) => p && p.trim() !== "");
    return [...new Set(priorities)].sort();
  };

  // Filter dropdown component
  const FilterDropdown = ({ value, onChange, options, placeholder, onClear }) => {
    return (
      <div className="relative flex items-center gap-1 w-full">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-[11px] font-medium text-gray-700 leading-tight px-2 py-1.5 pr-6 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-200 cursor-pointer w-full"
          style={{ minWidth: '100px' }}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute right-6 p-0.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200 z-10"
            title="Clear filter"
            aria-label="Clear filter"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

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

  // Handle priority change
  const handlePriorityChange = async (project, newPriority) => {
    if (newPriority === project.priority) return;
    
    const projectId = project._id;
    setUpdatingPriority(prev => ({ ...prev, [projectId]: true }));
    
    try {
      await updateProjectPriority(projectId, newPriority, project.stages || []);
      
      // Update local state optimistically
      if (onUpdate) {
        onUpdate();
      }
      
      toast.success("Priority updated successfully");
    } catch (error) {
      console.error("Error updating priority:", error);
      toast.error(error?.response?.data?.error || "Failed to update priority");
    } finally {
      setUpdatingPriority(prev => {
        const updated = { ...prev };
        delete updated[projectId];
        return updated;
      });
    }
  };

  return (
    <div className="card-modern overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-gray-100">
          <thead className="bg-gray-50/50">
            <tr className="text-left text-[12px] font-semibold text-gray-600 uppercase tracking-wide">
              <th className="px-3 py-3 w-[18%]">Project Name</th>
              <th className="px-4 py-3 w-[12%]">
                <div className="flex flex-col gap-1.5">
                  <span>Department</span>
                  <FilterDropdown
                    value={departmentFilter}
                    onChange={onDepartmentFilterChange}
                    options={getUniqueDepartments()}
                    placeholder="Filter"
                    onClear={() => onDepartmentFilterChange("")}
                  />
                </div>
              </th>
              <th className="px-4 py-3 w-[12%]">
                <div className="flex flex-col gap-1.5">
                  <span>Project Owner</span>
                  <FilterDropdown
                    value={projectOwnerFilter}
                    onChange={onProjectOwnerFilterChange}
                    options={getUniqueProjectOwners()}
                    placeholder="Filter"
                    onClear={() => onProjectOwnerFilterChange("")}
                  />
                </div>
              </th>
              <th className="px-4 py-3 w-[10%]">
                <div className="flex flex-col gap-1.5">
                  <span>Priority</span>
                  <FilterDropdown
                    value={priorityFilter}
                    onChange={onPriorityFilterChange}
                    options={getUniquePriorities()}
                    placeholder="Filter"
                    onClear={() => onPriorityFilterChange("")}
                  />
                </div>
              </th>
              <th className="px-4 py-3 w-[11%]">Start Date</th>
              <th className="px-4 py-3 w-[11%]">End Date</th>
              <th className="px-3 py-3 w-[12%]">Overall Progress</th>
              <th className="px-4 py-3 w-[10%]">Status Summary</th>
              <th className="px-4 py-3 w-[8%]">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {projects.length === 0 ? (
              <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-gray-400 text-sm mb-2">No projects found</p>
                    <p className="text-gray-300 text-xs">Try adjusting your search terms or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              projects.map((project, index) => {
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
                    <td className="px-3 py-3 break-words">
                      <span className="text-[13px] text-[#111827] leading-tight truncate block">{project.projectName}</span>
                    </td>
                    <td className="px-4 py-3 break-words">
                      <span className="text-sm text-gray-600 leading-tight">{project.department}</span>
                    </td>
                    <td className="px-4 py-3 break-words">
                      <span className="text-sm text-gray-600 leading-tight">{project.projectOwner || "-"}</span>
                    </td>
                    <td className="px-4 py-3 break-words">
                      {isAdmin ? (
                        <select
                          value={project.priority || "P3"}
                          onChange={(e) => handlePriorityChange(project, e.target.value)}
                          disabled={updatingPriority[project._id]}
                          className="text-sm font-medium text-gray-700 leading-tight px-2 py-1 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="P1">P1</option>
                          <option value="P2">P2</option>
                          <option value="P3">P3</option>
                        </select>
                      ) : (
                        <span className="text-sm font-medium text-gray-700 leading-tight">{project.priority || "P3"}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 break-words">
                      <span className="text-sm text-gray-600">{project.startDate || "-"}</span>
                    </td>
                    <td className="px-3 py-3 break-words">
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
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-3 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(overallStatus)}`}>
                        {getStatusSummary(project)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => onEditStatus(project)}
                              className="relative group p-2 rounded-lg text-[#2563eb] hover:bg-blue-50 hover:text-[#1d4ed8] transition-all duration-200"
                              aria-label="Edit Status"
                            >
                              <Edit className="w-5 h-5" />
                              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                Edit Status
                                <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></span>
                              </span>
                            </button>
                            <button
                              onClick={() => onDelete(project)}
                              className="relative group p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                              aria-label="Delete Project"
                            >
                              <Trash2 className="w-5 h-5" />
                              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                Delete 
                                <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></span>
                              </span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onEditStatus(project)}
                            className="relative group p-2 rounded-lg text-[#2563eb] hover:bg-blue-50 hover:text-[#1d4ed8] transition-all duration-200"
                            aria-label="View Details"
                            title="View project details (read-only)"
                          >
                            <Edit className="w-5 h-5" />
                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                              View Details
                              <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></span>
                            </span>
                          </button>
                        )}
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

