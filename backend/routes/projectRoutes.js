import express from "express";
import Project from "../models/Project.js";
import ProjectLog from "../models/ProjectLog.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Default stages template
const defaultStages = [
  { name: "Concept", stageOwner: "", weight: 10, status: "Yet to Start", startDate: "", endDate: "", actualStartDate: "", actualEndDate: "", remarks: "" },
  { name: "Business case approval", stageOwner: "", weight: 5, status: "Yet to Start", startDate: "", endDate: "", actualStartDate: "", actualEndDate: "", remarks: "" },
  { name: "IT Infra and security", stageOwner: "", weight: 15, status: "Yet to Start", startDate: "", endDate: "", actualStartDate: "", actualEndDate: "", remarks: "" },
  { name: "Vendor onboarding", stageOwner: "", weight: 5, status: "Yet to Start", startDate: "", endDate: "", actualStartDate: "", actualEndDate: "", remarks: "" },
  { name: "Execution & Delivery", stageOwner: "", weight: 55, status: "Yet to Start", startDate: "", endDate: "", actualStartDate: "", actualEndDate: "", remarks: "" },
  { name: "UAT", stageOwner: "", weight: 5, status: "Yet to Start", startDate: "", endDate: "", actualStartDate: "", actualEndDate: "", remarks: "" },
  { name: "Go-Live and support", stageOwner: "", weight: 5, status: "Yet to Start", startDate: "", endDate: "", actualStartDate: "", actualEndDate: "", remarks: "" }
];

// Generate next project ID
async function generateProjectId() {
  const lastProject = await Project.findOne().sort({ projectId: -1 });
  if (!lastProject) return "PRJ001";
  
  const lastNumber = parseInt(lastProject.projectId.replace("PRJ", ""));
  const nextNumber = lastNumber + 1;
  return `PRJ${nextNumber.toString().padStart(3, "0")}`;
}

// Multer setup for Business Case uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.resolve("uploads", "business-cases");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-z0-9_\-\.]/gi, "_");
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${safeBase}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});

// GET all projects
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test route to verify DELETE is working
router.delete("/test/delete", (req, res) => {
  console.log("DELETE test route hit");
  res.json({ message: "DELETE route is working!" });
});

// DELETE project - placed before GET /:id to avoid route conflicts
router.delete("/:id", async (req, res) => {
  console.log(`DELETE request received for project ID: ${req.params.id}`);
  console.log(`Full URL: ${req.method} ${req.originalUrl}`);
  
  try {
    const { id } = req.params;
    
    if (!id) {
      console.log("Error: Project ID is missing");
      return res.status(400).json({ error: "Project ID is required" });
    }
    
    console.log(`Attempting to delete project with ID: ${id}`);
    
    // Find project first to delete file if exists
    const project = await Project.findById(id);
    if (!project) {
      console.log(`Project with ID ${id} not found in database`);
      return res.status(404).json({ error: "Project not found" });
    }

    const removeFileIfExists = (filePath) => {
      if (!filePath) return;
      const absolutePath = path.resolve(filePath);
      try {
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
          console.log(`🧹 Deleted business case file: ${absolutePath}`);
        }
      } catch (fileErr) {
        console.warn("Warning: Failed to delete business case file:", fileErr.message);
      }
    };

    // Delete associated business case file if present
    removeFileIfExists(project.businessCase?.filePath);

    if (Array.isArray(project.businessCases)) {
      project.businessCases.forEach(caseFile => {
        removeFileIfExists(caseFile?.filePath);
      });
    }

    // Delete the project
    await Project.findByIdAndDelete(id);
    
    console.log(`✅ Project ${project.projectId} (${id}) deleted successfully`);
    res.json({ 
      message: "Project deleted successfully", 
      project: {
        _id: project._id,
        projectId: project.projectId,
        projectName: project.projectName
      }
    });
  } catch (error) {
    console.error("❌ Error deleting project:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      kind: error.kind
    });
    
    // Handle mongoose cast errors
    if (error.name === "CastError" || error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid project ID format" });
    }
    
    res.status(500).json({ error: error.message || "Failed to delete project" });
  }
});

const buildBusinessCaseResponse = (caseItem, req) => {
  if (!caseItem) return null;
  const raw = caseItem.toObject ? caseItem.toObject() : caseItem;
  const fileName = raw.fileName;
  return {
    ...raw,
    url: `${req.protocol}://${req.get("host")}/uploads/business-cases/${fileName}`
  };
};

// POST upload Business Case files (supports multiple)
router.post("/:id/upload-business-case", upload.array("files", 10), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      if (req.files?.length) {
        req.files.forEach(file => {
          if (file?.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(404).json({ error: "Project not found" });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // migrate legacy single field if present
    if (project.businessCase?.fileName) {
      project.businessCases = project.businessCases || [];
      project.businessCases.push({
        fileName: project.businessCase.fileName,
        originalName: project.businessCase.originalName || project.businessCase.fileName,
        filePath: project.businessCase.filePath,
        fileType: project.businessCase.fileType,
        fileSize: project.businessCase.fileSize,
        uploadedAt: project.businessCase.uploadedAt || new Date()
      });
      project.businessCase = undefined;
      project.markModified("businessCase");
    }

    const newCases = files.map(file => ({
        fileName: file.filename,
        originalName: file.originalname,
        filePath: file.path.replace(/\\/g, "/"),
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedAt: new Date()
      }));

    project.businessCases = [
      ...(Array.isArray(project.businessCases) ? project.businessCases.map(item => ({
        fileName: item.fileName,
        originalName: item.originalName || item.fileName,
        filePath: item.filePath,
        fileType: item.fileType,
        fileSize: item.fileSize,
        uploadedAt: item.uploadedAt || new Date()
      })) : []),
      ...newCases
    ];

    project.markModified("businessCases");

    await project.save();

    const responseCases = (project.businessCases || []).map(item => buildBusinessCaseResponse(item, req));

    res.status(201).json({
      message: `Business Case${files.length > 1 ? "s" : ""} uploaded successfully`,
      businessCases: responseCases
    });
  } catch (error) {
    console.error("Error uploading business case:", error);
    res.status(500).json({ error: error.message || "Failed to upload business case" });
  }
});

// GET business case metadata (or download via static path)
router.get("/:id/business-case", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    let businessCases = Array.isArray(project.businessCases) ? project.businessCases : [];

    if ((!businessCases || businessCases.length === 0) && project.businessCase?.fileName) {
      businessCases = [{
        fileName: project.businessCase.fileName,
        originalName: project.businessCase.originalName || project.businessCase.fileName,
        filePath: project.businessCase.filePath,
        fileType: project.businessCase.fileType,
        fileSize: project.businessCase.fileSize,
        uploadedAt: project.businessCase.uploadedAt
      }];
    }

    if (!businessCases || businessCases.length === 0) {
      return res.json([]);
    }

    const responseCases = businessCases.map(item => buildBusinessCaseResponse(item, req));
    res.json(responseCases);
  } catch (error) {
    console.error("Error fetching business case:", error);
    res.status(500).json({ error: error.message || "Failed to fetch business case" });
  }
});

// GET single project
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new project
router.post("/", async (req, res) => {
  try {
    const projectId = await generateProjectId();
    
    // Clean up the request body - ensure projectStatus is valid
    const validStatuses = ["Work in Progress", "Completed", "On Hold", "Delay"];
    let projectStatus = req.body.projectStatus;
    
    // If projectStatus is empty or invalid, use default
    if (!projectStatus || !validStatuses.includes(projectStatus)) {
      projectStatus = "Work in Progress";
    }
    
    // Prepare project data
    const projectData = {
      ...req.body,
      projectId,
      projectStatus,
      stages: defaultStages.map(stage => ({ ...stage }))
    };
    
    // Remove empty string values for optional fields to use defaults
    const optionalFields = [
      'businessCaseLink',
      'objectives',
      'projectOwnerPrimaryEmail',
      'projectOwnerPrimaryContact',
      'projectOwnerAlternateEmail',
      'businessOwnerPrimaryEmail',
      'businessOwnerPrimaryContact',
      'businessOwnerAlternateEmail',
      'overallProjectSummary'
    ];
    
    optionalFields.forEach(field => {
      if (projectData[field] === '') {
        delete projectData[field]; // Let Mongoose use default values
      }
    });
    
    const project = new Project(projectData);
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    // Provide more detailed error message
    const errorMessage = error.message || "Failed to create project";
    res.status(400).json({ error: errorMessage });
  }
});

// PATCH update project stages
router.patch("/:id/stages", async (req, res) => {
  try {
    const { stages, logs } = req.body;
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Update stages
    if (stages && Array.isArray(stages)) {
      project.stages = stages;
    }
    
    // Update project dates if provided
    if (req.body.startDate !== undefined) {
      project.startDate = req.body.startDate;
    }
    if (req.body.endDate !== undefined) {
      project.endDate = req.body.endDate;
    }
    
    // Update overall project summary if provided
    if (req.body.overallProjectSummary !== undefined) {
      project.overallProjectSummary = req.body.overallProjectSummary;
    }
    
    // Update priority if provided
    if (req.body.priority !== undefined) {
      project.priority = req.body.priority;
    }
    
    await project.save();
    
    // Save logs to database permanently
    if (logs && Array.isArray(logs) && logs.length > 0) {
      console.log("Saving logs to database:", logs.length, "logs");
      const logEntries = logs.map(log => ({
        projectId: project._id,
        stageName: log.stageName || "N/A",
        fieldChanged: log.fieldName || log.fieldChanged,
        oldValue: log.previousValue || log.oldValue || "",
        newValue: log.newValue || "",
        changedAt: new Date(),
        changedBy: log.user || log.changedBy || "System"
      }));
      
      const savedLogs = await ProjectLog.insertMany(logEntries);
      console.log("Logs saved successfully:", savedLogs.length, "logs");
    } else {
      console.log("No logs to save");
    }
    
    res.json(project);
  } catch (error) {
    console.error("Error updating project stages:", error);
    res.status(400).json({ error: error.message });
  }
});

// GET project logs - fetch all logs for a project
router.get("/:id/logs", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Fetch all logs for this project, sorted by most recent first
    const logs = await ProjectLog.find({ projectId: project._id })
      .sort({ changedAt: -1 })
      .limit(1000); // Limit to last 1000 logs
    
    // Transform logs to match frontend format
    const formattedLogs = logs.map(log => ({
      id: log._id.toString(),
      fieldName: log.fieldChanged,
      previousValue: log.oldValue,
      newValue: log.newValue,
      timestamp: log.changedAt.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
      projectName: project.projectName,
      stageName: log.stageName,
      user: log.changedBy
    }));
    
    res.json(formattedLogs);
  } catch (error) {
    console.error("Error fetching project logs:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

