import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllProjects, deleteProject } from "../api/projectAPI";
import ProjectTable from "../components/ProjectTable";
import EditStatusModal from "../components/EditStatusModal";
import { toast } from "react-toastify";
import { LogOut } from "lucide-react";

const LandingPage = () => {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState("all");
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

  // Filter projects based on filterType
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

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((project) => {
        return (
          project.projectId.toLowerCase().includes(searchLower) ||
          project.projectName.toLowerCase().includes(searchLower)
        );
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
  }, [filterType, searchTerm]);

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

        {/* Search and Add Project Section */}
        <div className="card-modern p-6 mb-6 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search by Project ID or Project Name..."
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

