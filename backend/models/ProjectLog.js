import mongoose from "mongoose";

const projectLogSchema = new mongoose.Schema({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Project", 
    required: true 
  },
  stageName: { type: String, default: "N/A" },
  fieldChanged: { type: String, required: true },
  oldValue: { type: String, default: "" },
  newValue: { type: String, default: "" },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: String, default: "System" }
}, { timestamps: true });

// Index for faster queries
projectLogSchema.index({ projectId: 1, changedAt: -1 });

const ProjectLog = mongoose.model("ProjectLog", projectLogSchema);

export default ProjectLog;

