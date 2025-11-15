import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject, uploadBusinessCase } from "../api/projectAPI";
import { toast } from "react-toastify";
import { LogOut } from "lucide-react";

const AddProjectPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [businessCaseFiles, setBusinessCaseFiles] = useState([]);
  const [dateError, setDateError] = useState("");
  const [formData, setFormData] = useState({
    projectName: "",
    businessCaseLink: "",
    objectives: "",
    department: "",
    techDepartment: "",
    projectStatus: "",
    projectOwner: "",
    projectOwnerPrimaryEmail: "",
    projectOwnerPrimaryContact: "",
    projectOwnerAlternateEmail: "",
    businessOwner: "",
    businessOwnerPrimaryEmail: "",
    businessOwnerPrimaryContact: "",
    businessOwnerAlternateEmail: "",
    startDate: "",
    endDate: "",
  });

  const departments = [
    "IT",
    "Finance",
    "HR",
    "Operations",
    "Marketing",
    "Sales",
    "Engineering",
    "Product",
  ];

  const techDepartments = [
    "ERP",
    "DATA",
    "CISO",
    "HIS",
    "Infrastrucure",
    "GTM",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value,
    });

    // Validate dates when either date field changes
    if (name === "startDate" || name === "endDate") {
      const startDate = name === "startDate" ? value : formData.startDate;
      const endDate = name === "endDate" ? value : formData.endDate;
      
      if (startDate && endDate) {
        if (new Date(endDate) < new Date(startDate)) {
          setDateError("End date cannot be earlier than start date");
        } else {
          setDateError("");
        }
      } else {
        setDateError("");
      }
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) {
      return;
    }
    const maxBytes = 20 * 1024 * 1024; // 20 MB
    const validFiles = [];
    files.forEach((file) => {
      if (file.size > maxBytes) {
        toast.error(`${file.name} exceeds 20 MB limit. Please choose a smaller file.`);
      } else {
        validFiles.push(file);
      }
    });
    if (validFiles.length > 0) {
      setBusinessCaseFiles((prev) => [...prev, ...validFiles]);
    }
    e.target.value = "";
  };

  const handleRemoveFile = (index) => {
    setBusinessCaseFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate dates before submission
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        setDateError("End date cannot be earlier than start date");
        toast.error("Please correct the date range. End date must be on or after start date.");
        return;
      }
    }
    
    setLoading(true);
    setDateError("");
    try {
      // Log form data for debugging
      console.log("Submitting project data:", formData);
      const created = await createProject(formData);
      toast.success("Project created successfully!");

      if (businessCaseFiles.length > 0) {
        setUploading(true);
        setUploadProgress(0);
        try {
          await uploadBusinessCase(created._id, businessCaseFiles, (progressEvent) => {
            if (progressEvent && progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          });
          toast.success(`Uploaded ${businessCaseFiles.length} Business Case file${businessCaseFiles.length > 1 ? "s" : ""} successfully`);
        } catch (uploadErr) {
          console.error("Upload error:", uploadErr);
          toast.error(uploadErr?.response?.data?.error || "Failed to upload Business Case");
        } finally {
          setUploading(false);
          setBusinessCaseFiles([]);
          setUploadProgress(0);
        }
      }

      navigate("/");
    } catch (error) {
      console.error("Error creating project:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to create project. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div className="min-h-screen py-8 lg:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-modern p-8 lg:p-10 animate-fade-in">
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-[#111827] mb-2 tracking-tight">Add New Project</h1>
                <p className="text-gray-600 font-medium">Fill in the details to create a new project</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-[#111827] mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleChange}
                  required
                  className="input-modern"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#111827] mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="input-modern"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Business Case Approval Upload */}
            <div className="card-modern p-5">
              <label className="block text-sm font-semibold text-[#111827] mb-3">
                Business Case Approval
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-[#2563eb] text-white text-sm font-semibold cursor-pointer hover:bg-[#1d4ed8] transition-colors duration-200 w-full sm:w-auto">
                  Browse
                  <input
                    type="file"
                    accept="*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <div className="flex-1 space-y-2">
                  {businessCaseFiles.length > 0 ? (
                    businessCaseFiles.map((file, index) => (
                      <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between bg-gray-50 rounded-2xl px-3 py-2">
                        <span className="text-sm text-gray-600 break-all">
                          {file.name} ({Math.round(file.size / 1024)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="text-xs text-red-500 font-semibold hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">No files selected</span>
                  )}
                </div>
              </div>
              {uploading && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#2563eb] h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{uploadProgress}%</div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#111827] mb-2">
                Business Case Link
              </label>
              <input
                type="text"
                name="businessCaseLink"
                value={formData.businessCaseLink}
                onChange={handleChange}
                className="input-modern"
                placeholder="Enter business case link"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#111827] mb-2">
                Objectives <span className="text-red-500">*</span>
              </label>
              <textarea
                name="objectives"
                value={formData.objectives}
                onChange={handleChange}
                rows={5}
                required
                className="input-modern resize-none"
                placeholder="Enter project objectives and goals..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-[#111827] mb-2">
                  Tech Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="techDepartment"
                  value={formData.techDepartment}
                  onChange={handleChange}
                  required
                  className="input-modern"
                >
                  <option value="">Select Tech Department</option>
                  {techDepartments.map((techDept) => (
                    <option key={techDept} value={techDept}>
                      {techDept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#111827] mb-2">
                  Project Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="projectStatus"
                  value={formData.projectStatus}
                  onChange={handleChange}
                  required
                  className="input-modern"
                >
                  <option value="">Select Project Status</option>
                  <option value="Work in Progress">Work in Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Delay">Delay</option>
                </select>
              </div>
            </div>

            {/* Project Owner Section */}
            <div className="space-y-4">
              {/*<h3 className="text-lg font-semibold text-[#111827]">Project Owner</h3>*/}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#111827] mb-2">
                    Project Owner <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="projectOwner"
                    value={formData.projectOwner}
                    onChange={handleChange}
                    required
                    className="input-modern"
                    placeholder="Enter project owner name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#111827] mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="projectOwnerPrimaryEmail"
                    value={formData.projectOwnerPrimaryEmail}
                    onChange={handleChange}
                    required
                    className="input-modern"
                    placeholder="Enter email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#111827] mb-2">
                    Primary Contact of Project Owner
                  </label>
                  <input
                    type="text"
                    name="projectOwnerPrimaryContact"
                    value={formData.projectOwnerPrimaryContact}
                    onChange={handleChange}
                    className="input-modern"
                    placeholder="Enter primary contact number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#111827] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="projectOwnerAlternateEmail"
                    value={formData.projectOwnerAlternateEmail}
                    onChange={handleChange}
                    className="input-modern"
                    placeholder="Enter email"
                  />
                </div>
              </div>
            </div>

            {/* Business Owner Section */}
            <div className="space-y-4">
              {/*<h3 className="text-lg font-semibold text-[#111827]">Business Owner</h3>*/}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#111827] mb-2">
                    Business Owner <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="businessOwner"
                    value={formData.businessOwner}
                    onChange={handleChange}
                    required
                    className="input-modern"
                    placeholder="Enter business owner name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#111827] mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="businessOwnerPrimaryEmail"
                    value={formData.businessOwnerPrimaryEmail}
                    onChange={handleChange}
                    required
                    className="input-modern"
                    placeholder="Enter email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#111827] mb-2">
                    Primary Contact of Business Owner
                  </label>
                  <input
                    type="text"
                    name="businessOwnerPrimaryContact"
                    value={formData.businessOwnerPrimaryContact}
                    onChange={handleChange}
                    className="input-modern"
                    placeholder="Enter primary contact number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#111827] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="businessOwnerAlternateEmail"
                    value={formData.businessOwnerAlternateEmail}
                    onChange={handleChange}
                    className="input-modern"
                    placeholder="Enter email"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-[#111827] mb-2">
                  Project Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="input-modern"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#111827] mb-2">
                  Project End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  min={formData.startDate || undefined}
                  className={`input-modern ${dateError ? 'border-red-500' : ''}`}
                />
                {dateError && (
                  <p className="text-red-500 text-sm mt-1">{dateError}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProjectPage;

