import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject, uploadBusinessCase } from "../api/projectAPI";
import { toast } from "react-toastify";

const AddProjectPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [businessCaseFiles, setBusinessCaseFiles] = useState([]);
  const [formData, setFormData] = useState({
    projectName: "",
    objectives: "",
    department: "",
    techDepartment: "",
    projectOwner: "",
    itOwner: "",
    businessOwner: "",
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
    "Frontend",
    "Backend",
    "Full Stack",
    "DevOps",
    "QA",
    "Mobile",
    "Data Science",
    "AI/ML",
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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
    setLoading(true);
    try {
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
      toast.error("Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 lg:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-modern p-8 lg:p-10 animate-fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-[#111827] mb-2 tracking-tight">Add New Project</h1>
            <p className="text-gray-600 font-medium">Fill in the details to create a new project</p>
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
                Objectives
              </label>
              <textarea
                name="objectives"
                value={formData.objectives}
                onChange={handleChange}
                rows={5}
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
                  IT Owner <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="itOwner"
                  value={formData.itOwner}
                  onChange={handleChange}
                  required
                  className="input-modern"
                  placeholder="Enter IT owner name"
                />
              </div>

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
                  Project Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="input-modern"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#111827] mb-2">
                  Project End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="input-modern"
                />
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

