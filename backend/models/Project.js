import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  stageName: { type: String, default: "" },
  owner: { type: String, default: "" },
  remarks: { type: String, default: "" }
}, { _id: false });

const stageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  stageOwner: { type: String, default: "" },
  weight: { type: Number, required: true },
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
  actualStartDate: { type: String, default: "" },
  actualEndDate: { type: String, default: "" },
  remarks: { type: String, default: "" },
  status: { 
    type: String, 
    enum: ["Yet to Start", "In Progress", "Completed", "Delayed"],
    default: "Yet to Start"
  },
  milestones: { type: [milestoneSchema], default: [] }
});

const businessCaseFileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  originalName: { type: String, default: "" },
  filePath: { type: String, default: "" },
  fileType: { type: String, default: "" },
  fileSize: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true },
  projectName: { type: String, required: true },
  businessCaseLink: { type: String, default: "" },
  objectives: { type: String, default: "" },
  department: { type: String, required: true },
  techDepartment: { type: String, required: true },
  projectStatus: { 
    type: String, 
    enum: ["Work in Progress", "Completed", "On Hold", "Delay"],
    default: "Work in Progress"
  },
  projectOwner: { type: String, required: true },
  projectOwnerPrimaryEmail: { type: String, default: "" },
  projectOwnerPrimaryContact: { type: String, default: "" },
  projectOwnerAlternateEmail: { type: String, default: "" },
  businessOwner: { type: String, required: true },
  businessOwnerPrimaryEmail: { type: String, default: "" },
  businessOwnerPrimaryContact: { type: String, default: "" },
  businessOwnerAlternateEmail: { type: String, default: "" },
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
  priority: { 
    type: String, 
    enum: ["P1", "P2", "P3"],
    default: "P3"
  },
  overallProjectSummary: { type: String, default: "" },
  businessCase: {
    fileName: { type: String, default: "" },
    originalName: { type: String, default: "" },
    filePath: { type: String, default: "" },
    fileType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: null }
  },
  businessCases: { type: [businessCaseFileSchema], default: [] },
  stages: [stageSchema]
}, { timestamps: true });

// Calculate progress percentage
projectSchema.virtual('progress').get(function() {
  if (!this.stages || this.stages.length === 0) return 0;
  const totalWeight = this.stages.reduce((sum, stage) => sum + stage.weight, 0);
  const completedWeight = this.stages
    .filter(stage => stage.status === "Completed")
    .reduce((sum, stage) => sum + stage.weight, 0);
  return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
});

// Calculate status summary
projectSchema.virtual('statusSummary').get(function() {
  if (!this.stages || this.stages.length === 0) return "0/0 Completed";
  const completed = this.stages.filter(stage => stage.status === "Completed").length;
  return `${completed}/${this.stages.length} Completed`;
});

projectSchema.set('toJSON', { virtuals: true });

const Project = mongoose.model("Project", projectSchema);

export default Project;

