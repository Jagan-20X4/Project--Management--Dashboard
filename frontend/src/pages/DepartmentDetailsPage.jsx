import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAllProjects } from "../api/projectAPI";
import { toast } from "react-toastify";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const DepartmentDetailsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
    
    // Refetch data when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchProjects();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getAllProjects();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load department details");
    } finally {
      setLoading(false);
    }
  };

  // Group projects by department, then by owner, and count projects
  const departmentDetails = useMemo(() => {
    const departmentMap = {};

    projects.forEach((project) => {
      if (!project.department || !project.projectOwner) return;

      const department = project.department.trim();
      const owner = project.projectOwner.trim();

      if (!departmentMap[department]) {
        departmentMap[department] = {};
      }

      if (!departmentMap[department][owner]) {
        departmentMap[department][owner] = 0;
      }

      departmentMap[department][owner]++;
    });

    // Convert to array format for display
    const result = [];
    Object.keys(departmentMap)
      .sort()
      .forEach((department) => {
        const owners = Object.entries(departmentMap[department])
          .map(([owner, count]) => ({ owner, count }))
          .sort((a, b) => a.owner.localeCompare(b.owner));

        owners.forEach((ownerData, index) => {
          result.push({
            department: index === 0 ? department : "", // Only show department name in first row
            owner: ownerData.owner,
            count: ownerData.count,
            isFirstInDepartment: index === 0,
          });
        });
      });

    return result;
  }, [projects]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header Section */}
        <div className="mb-8 animate-fade-in">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 mb-6 text-[#2563eb] hover:text-[#1d4ed8] transition-colors duration-200 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-semibold mb-3 tracking-tight" style={{ color: '#FFFFFF' }}>
            Department Details
          </h1>
          <p className="text-lg font-medium" style={{ color: '#FFFFFF' }}>
            Complete breakdown of projects by department and project owner
          </p>
        </div>

        {/* Department Details Table */}
        {loading ? (
          <div className="card-modern p-12 text-center animate-fade-in">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb] mb-4"></div>
              <p className="text-gray-500">Loading department details...</p>
            </div>
          </div>
        ) : departmentDetails.length === 0 ? (
          <div className="card-modern p-12 text-center animate-fade-in">
            <p className="text-gray-400 text-sm">No department data available</p>
          </div>
        ) : (
          <div className="card-modern overflow-hidden animate-fade-in">
            <div className="w-full overflow-x-auto">
              <table className="w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr className="text-left text-[12px] font-semibold text-gray-600 uppercase tracking-wide">
                    <th className="px-6 py-4 w-[33%]">Department Name</th>
                    <th className="px-6 py-4 w-[33%]">Project Owner</th>
                    <th className="px-6 py-4 w-[34%]">Number of Projects</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {departmentDetails.map((row, index) => (
                    <motion.tr
                      key={`${row.department}-${row.owner}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className={`transition-colors duration-150 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      } hover:bg-[#2563eb]/5`}
                    >
                      <td className="px-6 py-4">
                        {row.isFirstInDepartment ? (
                          <span className="text-sm font-semibold text-[#111827]">
                            {row.department}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{row.owner}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-[#111827]">{row.count}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentDetailsPage;

