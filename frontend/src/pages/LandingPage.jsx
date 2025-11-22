import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAllProjects, deleteProject } from "../api/projectAPI";
import ProjectTable from "../components/ProjectTable";
import EditStatusModal from "../components/EditStatusModal";
import { toast } from "react-toastify";
import { LogOut } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const LandingPage = () => {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [projectOwnerFilter, setProjectOwnerFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const navigate = useNavigate();

  // Get user role from localStorage
  const getUserRole = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.role || "admin"; // default to admin if role not found
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
    return "admin"; // default to admin
  };

  const userRole = getUserRole();
  const isAdmin = userRole === "admin";
  const isHod = userRole === "hod";

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getAllProjects();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStatus = (project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  const handleUpdate = () => {
    fetchProjects();
    // Toast notification is handled in EditStatusModal component
  };

  const handleDelete = async (project) => {
    if (!project || !project._id) {
      toast.error("Invalid project data");
      return;
    }

    if (window.confirm(`Are you sure you want to delete project "${project.projectName}" (${project.projectId})? This action cannot be undone.`)) {
      try {
        // Optimistically remove from UI immediately
        const projectIdToDelete = project._id;
        setProjects(prevProjects => prevProjects.filter(p => p._id !== projectIdToDelete));
        
        // Delete from database
        await deleteProject(project._id);
        
        // Show success message
        toast.success(`Project "${project.projectName}" deleted successfully!`);
        
        // Refresh the list to ensure consistency with database
        await fetchProjects();
      } catch (error) {
        console.error("Error deleting project:", error);
        
        // If deletion failed, restore the project in the UI by refreshing
        fetchProjects();
        
        const errorMessage = error.message || "Failed to delete project";
        toast.error(errorMessage);
      }
    }
  };

  // Helper function to get overall project status
  const getOverallStatus = (project) => {
    const statuses = project.stages?.map((s) => s.status) || [];
    if (statuses.includes("Delayed")) return "Delayed";
    if (statuses.includes("In Progress")) return "In Progress";
    if (statuses.every((s) => s === "Completed")) return "Completed";
    return "Yet to Start";
  };

  // Extract unique values for filters
  const getUniqueDepartments = () => {
    const departments = projects
      .map((p) => p.department)
      .filter((d) => d && d.trim() !== "");
    return [...new Set(departments)].sort();
  };

  const getUniqueProjectOwners = () => {
    const owners = projects
      .map((p) => p.projectOwner)
      .filter((o) => o && o.trim() !== "");
    return [...new Set(owners)].sort();
  };

  const getUniquePriorities = () => {
    const priorities = projects
      .map((p) => p.priority)
      .filter((p) => p && p.trim() !== "");
    return [...new Set(priorities)].sort();
  };

  // Calculate department-wise project counts (from all projects, not filtered)
  const departmentProjectCounts = useMemo(() => {
    const departmentMap = {};
    
    projects.forEach((project) => {
      if (project.department && project.department.trim() !== "") {
        departmentMap[project.department] = (departmentMap[project.department] || 0) + 1;
      }
    });

    // Convert to array format for chart
    return Object.entries(departmentMap)
      .map(([department, count]) => ({
        department,
        count
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [projects]);

  // Filter projects based on filterType, dropdown filters, and search
  const getFilteredProjects = () => {
    let filtered = projects;

    // Apply status filter
    if (filterType === "completed") {
      filtered = projects.filter((p) => getOverallStatus(p) === "Completed");
    } else if (filterType === "inProgress") {
      filtered = projects.filter((p) => getOverallStatus(p) === "In Progress");
    } else if (filterType === "delayed") {
      filtered = projects.filter((p) => getOverallStatus(p) === "Delayed");
    }

    // Apply dropdown filters (AND logic)
    if (departmentFilter) {
      filtered = filtered.filter((project) => project.department === departmentFilter);
    }
    if (projectOwnerFilter) {
      // Normalize comparison to handle whitespace differences
      const normalizedFilter = projectOwnerFilter.trim();
      filtered = filtered.filter((project) => {
        const normalizedOwner = project.projectOwner ? project.projectOwner.trim() : "";
        return normalizedOwner === normalizedFilter;
      });
    }
    if (priorityFilter) {
      filtered = filtered.filter((project) => project.priority === priorityFilter);
    }

    // Apply search filter - only by project name (partial match, case-insensitive)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((project) => {
        return project.projectName && project.projectName.toLowerCase().includes(searchLower);
      });
    }

    return filtered;
  };

  // Calculate dashboard stats
  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => getOverallStatus(p) === "Completed").length;
  const inProgressProjects = projects.filter((p) => getOverallStatus(p) === "In Progress").length;
  const delayedProjects = projects.filter((p) => getOverallStatus(p) === "Delayed").length;

  // Pagination logic
  const filteredProjects = getFilteredProjects();
  const projectsPerPage = 10;
  const indexOfLastProject = currentPage * projectsPerPage;
  const indexOfFirstProject = indexOfLastProject - projectsPerPage;
  const currentProjects = filteredProjects.slice(indexOfFirstProject, indexOfLastProject);
  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchTerm, departmentFilter, projectOwnerFilter, priorityFilter]);

  // Handle filter change
  const handleFilterChange = (filter) => {
    setFilterType(filter);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header Section with Logout Button */}
        <div className="mb-10 animate-fade-in relative">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-semibold mb-3 tracking-tight" style={{ color: '#FFFFFF' }}>Project Management Dashboard</h1>
              <p className="text-lg font-medium" style={{ color: '#FFFFFF' }}>Manage and track all your projects in one place</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg backdrop-blur-sm border border-white/20 hover:border-white/30"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>

        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div 
            className={`card-modern p-6 border-l-4 border-[#2563eb] animate-fade-in cursor-pointer transition-all duration-200 ${
              filterType === "all" ? "ring-2 ring-[#2563eb] ring-opacity-50 shadow-lg" : "hover:shadow-md"
            }`}
            onClick={() => handleFilterChange("all")}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Projects</p>
                <p className="text-3xl font-semibold text-[#111827]">{totalProjects}</p>
              </div>
              <div className="text-[#2563eb] text-4xl opacity-80">📊</div>
            </div>
          </div>
          <div 
            className={`card-modern p-6 border-l-4 border-[#10b981] animate-fade-in cursor-pointer transition-all duration-200 ${
              filterType === "completed" ? "ring-2 ring-[#10b981] ring-opacity-50 shadow-lg" : "hover:shadow-md"
            }`}
            style={{ animationDelay: '0.1s' }}
            onClick={() => handleFilterChange("completed")}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-semibold text-[#111827]">{completedProjects}</p>
              </div>
              <div className="text-[#10b981] text-4xl opacity-80">✅</div>
            </div>
          </div>
          <div 
            className={`card-modern p-6 border-l-4 border-yellow-500 animate-fade-in cursor-pointer transition-all duration-200 ${
              filterType === "inProgress" ? "ring-2 ring-yellow-500 ring-opacity-50 shadow-lg" : "hover:shadow-md"
            }`}
            style={{ animationDelay: '0.2s' }}
            onClick={() => handleFilterChange("inProgress")}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">In Progress</p>
                <p className="text-3xl font-semibold text-[#111827]">{inProgressProjects}</p>
              </div>
              <div className="text-yellow-500 text-4xl opacity-80">🔄</div>
            </div>
          </div>
          <div 
            className={`card-modern p-6 border-l-4 border-red-500 animate-fade-in cursor-pointer transition-all duration-200 ${
              filterType === "delayed" ? "ring-2 ring-red-500 ring-opacity-50 shadow-lg" : "hover:shadow-md"
            }`}
            style={{ animationDelay: '0.3s' }}
            onClick={() => handleFilterChange("delayed")}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Delayed</p>
                <p className="text-3xl font-semibold text-[#111827]">{delayedProjects}</p>
              </div>
              <div className="text-red-500 text-4xl opacity-80">⏰</div>
            </div>
          </div>
        </div>

        {/* Department-Wise Project Distribution Chart */}
        <div className="card-modern p-6 mb-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-xl font-semibold text-[#111827] mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Department-Wise Project Distribution
          </h2>
          {departmentProjectCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={departmentProjectCounts}
                margin={{ top: 15, right: 20, left: 50, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                <XAxis
                  dataKey="department"
                  angle={0}
                  textAnchor="middle"
                  tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
                  interval={0}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
                  label={{ value: 'Number of Projects', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 11, fontWeight: 500 } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    padding: '10px 12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                  }}
                  labelStyle={{ color: '#ffffff', fontWeight: 600, marginBottom: '4px' }}
                  itemStyle={{ color: '#ffffff' }}
                  formatter={(value, name) => [value, 'Projects']}
                  labelFormatter={(label) => `Department: ${label}`}
                />
                <Bar
                  dataKey="count"
                  radius={[8, 8, 0, 0]}
                  strokeWidth={0}
                  barSize={40}
                >
                  {departmentProjectCounts.map((entry, index) => {
                    // Gradient colors: red/black neon vibe
                    const colors = [
                      'url(#colorGradient1)',
                      'url(#colorGradient2)',
                      'url(#colorGradient3)',
                      'url(#colorGradient4)',
                      'url(#colorGradient5)',
                    ];
                    return (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    );
                  })}
                </Bar>
                <defs>
                  <linearGradient id="colorGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#991b1b" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="colorGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#7f1d1d" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="colorGradient3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b91c1c" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#991b1b" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="colorGradient4" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#991b1b" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#7f1d1d" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="colorGradient5" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7f1d1d" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#450a0a" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <p className="text-sm">No department data available</p>
            </div>
          )}
          <div className="flex justify-center mt-6">
            <button
              onClick={() => navigate("/department-details")}
              className="btn-primary px-6 py-2.5 text-sm font-medium"
            >
              Show More
            </button>
          </div>
        </div>

        {/* Search and Add Project Section */}
        <div className="card-modern p-6 mb-6 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search by Project Name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-modern"
              />
            </div>
            {isAdmin && (
              <button
                onClick={() => navigate("/add-project")}
                className="btn-primary w-full md:w-auto"
              >
                <span className="mr-2">➕</span> Add New Project
              </button>
            )}
          </div>
        </div>

        {/* Projects Table */}
        {loading ? (
          <div className="card-modern p-12 text-center animate-fade-in">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb] mb-4"></div>
              <p className="text-gray-500">Loading projects...</p>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <ProjectTable
              projects={currentProjects}
              searchTerm={searchTerm}
              onEditStatus={handleEditStatus}
              onDelete={handleDelete}
              userRole={userRole}
              onUpdate={fetchProjects}
              allProjects={projects}
              departmentFilter={departmentFilter}
              projectOwnerFilter={projectOwnerFilter}
              priorityFilter={priorityFilter}
              onDepartmentFilterChange={setDepartmentFilter}
              onProjectOwnerFilterChange={setProjectOwnerFilter}
              onPriorityFilterChange={setPriorityFilter}
            />
            {/* Pagination */}
            {filteredProjects.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-blue-600">
                  Showing {indexOfFirstProject + 1} to {Math.min(indexOfLastProject, filteredProjects.length)} of {filteredProjects.length} projects
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      currentPage === 1
                        ? "bg-gray-100 text-grey-400 cursor-not-allowed"
                        : "bg-white text-grey-700 hover:bg-grey-50 border border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                              currentPage === page
                                ? "bg-[#2563eb] text-white"
                                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="px-2 text-gray-400">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      currentPage === totalPages
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit Status Modal */}
        <EditStatusModal
          project={selectedProject}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onUpdate={handleUpdate}
          userRole={userRole}
        />
      </div>
    </div>
  );
};

export default LandingPage;

