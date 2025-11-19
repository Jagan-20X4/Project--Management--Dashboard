import axios from "axios";

const API_URL = "/api/projects";

export const getAllProjects = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const getProjectById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

export const createProject = async (projectData) => {
  const response = await axios.post(API_URL, projectData);
  return response.data;
};

export const updateProjectStages = async (id, stages, startDate, endDate, logs = [], overallProjectSummary = undefined, priority = undefined, projectOwnerPrimaryEmail = undefined, projectOwnerAlternateEmail = undefined, businessOwnerPrimaryEmail = undefined, businessOwnerAlternateEmail = undefined) => {
  const response = await axios.patch(`${API_URL}/${id}/stages`, {
    stages,
    startDate,
    endDate,
    overallProjectSummary,
    priority,
    projectOwnerPrimaryEmail,
    projectOwnerAlternateEmail,
    businessOwnerPrimaryEmail,
    businessOwnerAlternateEmail,
    logs
  });
  return response.data;
};

export const getProjectLogs = async (id) => {
  const response = await axios.get(`${API_URL}/${id}/logs`);
  return response.data;
};

export const deleteProject = async (id) => {
  const url = `${API_URL}/${id}`;
  console.log(`Attempting to delete project at: ${url}`);
  console.log(`Project ID: ${id}`);
  
  try {
    const response = await axios.delete(url);
    console.log("Delete response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Delete error details:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    
    // Extract error message from response
    const errorMessage = error.response?.data?.error || error.message || "Failed to delete project";
    throw new Error(errorMessage);
  }
};

export const uploadBusinessCase = async (projectId, files, onUploadProgress) => {
  const formData = new FormData();
  const fileList = Array.isArray(files) ? files : files ? [files] : [];
  fileList.forEach((file) => {
    formData.append("files", file);
  });
  if (fileList.length === 0) {
    throw new Error("No files provided for upload");
  }
  const response = await axios.post(`${API_URL}/${projectId}/upload-business-case`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress
  });
  return response.data;
};

export const getBusinessCase = async (projectId) => {
  const response = await axios.get(`${API_URL}/${projectId}/business-case`);
  return response.data;
};

export const updateProjectPriority = async (id, priority, stages) => {
  const response = await axios.patch(`${API_URL}/${id}/stages`, {
    stages: stages || [],
    priority,
    logs: []
  });
  return response.data;
};

