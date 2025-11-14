import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { ChevronDown, X, Plus } from "lucide-react";
import { updateProjectStages, getProjectLogs, getBusinessCase } from "../api/projectAPI";
import { calculatePhaseDates, validateDateRange } from "../utils/dateCalculator";

const EditStatusModal = ({ project, isOpen, onClose, onUpdate }) => {
  const [stages, setStages] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [overallProjectSummary, setOverallProjectSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [initialStages, setInitialStages] = useState([]);
  const [initialStartDate, setInitialStartDate] = useState("");
  const [initialEndDate, setInitialEndDate] = useState("");
  const [initialOverallProjectSummary, setInitialOverallProjectSummary] = useState("");
  const [highlightedFields, setHighlightedFields] = useState(new Set());
  const [recalculatedDateFields, setRecalculatedDateFields] = useState(new Set());
  const [expandedStages, setExpandedStages] = useState(new Set());
  const [milestoneNotes, setMilestoneNotes] = useState({});
  const [initialMilestoneNotes, setInitialMilestoneNotes] = useState({});
  const [businessCases, setBusinessCases] = useState([]);
  const logsSectionRef = useRef(null);
  const [milestoneCounters, setMilestoneCounters] = useState({});

  useEffect(() => {
    if (project) {
      const projectStages = project.stages || [];
      const projectStartDate = project.startDate || "";
      const projectEndDate = project.endDate || "";
      const projectSummary = project.overallProjectSummary || "";
      
      setStartDate(projectStartDate);
      setEndDate(projectEndDate);
      setOverallProjectSummary(projectSummary);
      
      // Initialize milestones for Development stage
      const developmentIndex = projectStages.findIndex(s => s.name === "Development");
      if (developmentIndex !== -1) {
        const developmentStage = projectStages[developmentIndex];
        // If milestones don't exist, initialize with default ones
        if (!developmentStage.milestones || developmentStage.milestones.length === 0) {
          const defaultMilestones = [
            { id: 1, title: "Milestone 1", stageName: "", owner: "", remarks: "" },
            { id: 2, title: "Milestone 2", stageName: "", owner: "", remarks: "" },
            { id: 3, title: "Milestone 3", stageName: "", owner: "", remarks: "" }
          ];
          projectStages[developmentIndex] = {
            ...developmentStage,
            milestones: defaultMilestones
          };
        } else {
          // Ensure milestones have IDs and proper structure
          // Clear stageName if it matches the parent stage name (to start empty)
          const parentStageName = developmentStage.name || "Development";
          const milestonesWithIds = developmentStage.milestones.map((milestone, idx) => ({
            id: milestone.id || idx + 1,
            title: milestone.title || `Milestone ${milestone.id || idx + 1}`,
            stageName: (milestone.stageName && milestone.stageName !== parentStageName) ? milestone.stageName : "",
            owner: milestone.owner || "",
            remarks: milestone.remarks || ""
          }));
          projectStages[developmentIndex] = {
            ...developmentStage,
            milestones: milestonesWithIds
          };
        }
        // Set milestone counter for this stage
        const maxId = Math.max(...(projectStages[developmentIndex].milestones.map(m => m.id || 0)), 0);
        setMilestoneCounters(prev => ({
          ...prev,
          [developmentIndex]: maxId + 1
        }));
      }
      
      setStages(projectStages);
      
      // Store initial values for comparison (after milestones are initialized)
      setInitialStages(JSON.parse(JSON.stringify(projectStages)));
      setInitialStartDate(projectStartDate);
      setInitialEndDate(projectEndDate);
      setInitialOverallProjectSummary(projectSummary);
      
      // Clear pending changes when opening a new project
      setPendingChanges([]);
      
      // Fetch all existing logs from database (they persist forever)
      fetchLogs();
      // Fetch business case metadata
      fetchBusinessCase();
    }
  }, [project]);

  // Debug: Log when logs state changes
  useEffect(() => {
    console.log("Logs state updated:", logs.length, "logs");
    if (logs.length > 0) {
      console.log("First log:", logs[0]);
    }
  }, [logs]);

  // Helper function to format date from yyyy-mm-dd to dd-mm-yyyy
  const formatDateForDisplay = (value) => {
    if (!value || value === "(empty)") return value;
    
    // Check if value matches yyyy-mm-dd format
    const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = value.match(datePattern);
    
    if (match) {
      const [, year, month, day] = match;
      return `${day}-${month}-${year}`;
    }
    
    return value;
  };

  const formatDateObject = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    const day = `${date.getDate()}`.padStart(2, "0");
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const parseDateSafe = (value) => {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return null;
    return date;
  };


  const fetchBusinessCase = async () => {
    if (!project?._id) return;
    try {
      const bc = await getBusinessCase(project._id);
      const normalized = Array.isArray(bc)
        ? bc
        : Array.isArray(bc?.businessCases)
          ? bc.businessCases
          : bc
            ? [bc]
            : [];
      setBusinessCases(normalized);
    } catch (err) {
      setBusinessCases([]);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const fetchLogs = async () => {
    if (!project?._id) return;
    
    try {
      const projectLogs = await getProjectLogs(project._id);
      console.log("Fetched logs from backend:", projectLogs);
      // Ensure logs are properly formatted
      const formattedLogs = projectLogs.map(log => ({
        id: log.id || log._id,
        fieldName: log.fieldName || log.fieldChanged,
        previousValue: formatDateForDisplay(log.previousValue || log.oldValue || "(empty)"),
        newValue: formatDateForDisplay(log.newValue || "(empty)"),
        timestamp: log.timestamp || new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }),
        projectName: log.projectName || project?.projectName || "Unknown",
        stageName: log.stageName || "N/A",
        user: log.user || log.changedBy || "System"
      }));
      setLogs(formattedLogs);
      console.log("Formatted logs set:", formattedLogs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      // If fetching fails, start with empty logs
      setLogs([]);
    }
  };

  const addPendingChange = (fieldName, previousValue, newValue, stageName = "N/A") => {
    setPendingChanges(prev => {
      // Check if a pending change already exists for this field and stage
      const existingIndex = prev.findIndex(
        change => 
          change.fieldName === fieldName && 
          change.stageName === stageName
      );

      if (existingIndex !== -1) {
        // Update existing pending change with new value (for remarks, this updates as user types)
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          newValue: newValue || "(empty)"
        };
        return updated;
      } else {
        // Create new pending change
        return [
          ...prev,
          {
            id: Date.now() + Math.random(),
            fieldName,
            previousValue: previousValue || "(empty)",
            newValue: newValue || "(empty)",
            stageName
          }
        ];
      }
    });
  };

  const createLogsFromChanges = (changes) => {
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    return changes.map(change => ({
      id: Date.now() + Math.random() + change.id,
      fieldName: change.fieldName,
      previousValue: change.previousValue,
      newValue: change.newValue,
      timestamp,
      projectName: project?.projectName || "Unknown",
      stageName: change.stageName,
      user: "Current User"
    }));
  };

  const handleWeightChange = (index, value) => {
    // Remove % sign if present and extract numeric value
    const numericValue = parseFloat(value.toString().replace('%', '').trim());
    
    // Validate: must be a valid number and non-negative
    if (isNaN(numericValue) || numericValue < 0) {
      return; // Don't update if invalid
    }

    const initialStage = initialStages[index] || stages[index];
    const initialWeight = initialStage?.weight || 0;
    const stageName = stages[index]?.name || "Unknown Stage";

    const otherStagesTotal = stages.reduce((sum, stage, idx) => {
      if (idx === index) return sum;
      const weight = parseFloat(stage.weight);
      return sum + (isNaN(weight) ? 0 : weight);
    }, 0);

    if (otherStagesTotal + numericValue > 100) {
      toast.error("Total stage weight cannot exceed 100%");
      return;
    }

    // Update the weight
    const updatedStages = [...stages];
    updatedStages[index] = { ...updatedStages[index], weight: numericValue };
    
    // Check if we have valid project dates to recalculate
    if (startDate && endDate && validateDateRange(startDate, endDate)) {
      // Recalculate all dates based on updated weights
      const recalculatedStages = calculatePhaseDates(startDate, endDate, updatedStages);
      
      // Track which date fields were recalculated for animation
      const updatedDateFields = new Set();
      recalculatedStages.forEach((calculatedStage, idx) => {
        const currentStage = updatedStages[idx];
        if (currentStage.startDate !== calculatedStage.startDate) {
          updatedDateFields.add(`planned-start-${idx}`);
        }
        if (currentStage.endDate !== calculatedStage.endDate) {
          updatedDateFields.add(`planned-end-${idx}`);
        }
      });
      
      // Set animation state
      setRecalculatedDateFields(updatedDateFields);
      // Clear animation after transition
      setTimeout(() => {
        setRecalculatedDateFields(new Set());
      }, 1000);
      
      // Track changes to weight and dates
      if (initialWeight !== numericValue) {
        addPendingChange("Weight", `${initialWeight}%`, `${numericValue}%`, stageName);
        
        // Track date changes for all stages
        recalculatedStages.forEach((calculatedStage, idx) => {
          const currentStage = updatedStages[idx];
          const stageNameForDate = calculatedStage.name;
          
          if (currentStage.startDate !== calculatedStage.startDate) {
            addPendingChange("Planned Start Date", currentStage.startDate || "", calculatedStage.startDate, stageNameForDate);
          }
          if (currentStage.endDate !== calculatedStage.endDate) {
            addPendingChange("Planned End Date", currentStage.endDate || "", calculatedStage.endDate, stageNameForDate);
          }
        });
      }
      
      setStages(recalculatedStages);
    } else {
      // Just update weight without recalculating dates if dates are not set
      setStages(updatedStages);
      if (initialWeight !== numericValue) {
        addPendingChange("Weight", `${initialWeight}%`, `${numericValue}%`, stageName);
      }
    }
  };

  const toggleStageExpansion = (index) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleMilestoneChange = (stageIndex, milestoneId, field, value) => {
    const updatedStages = [...stages];
    const stage = updatedStages[stageIndex];
    if (!stage.milestones) {
      stage.milestones = [];
    }
    
    const milestoneIndex = stage.milestones.findIndex(m => m.id === milestoneId);
    if (milestoneIndex !== -1) {
      const initialMilestone = initialStages[stageIndex]?.milestones?.[milestoneIndex];
      const initialValue = initialMilestone?.[field] || "";
      
      stage.milestones[milestoneIndex] = {
        ...stage.milestones[milestoneIndex],
        [field]: value
      };
      
      setStages(updatedStages);
      
      // Track as pending change
      const stageName = stage.name || "Development";
      const milestoneTitle = stage.milestones[milestoneIndex].title || `Milestone ${milestoneId}`;
      const fieldDisplayName = {
        stageName: "Milestone Stage Name",
        owner: "Milestone Owner",
        remarks: "Milestone Remarks"
      }[field] || field;
      
      if (initialValue !== value) {
        addPendingChange(fieldDisplayName, initialValue || "(empty)", value || "(empty)", `${stageName} - ${milestoneTitle}`);
      } else {
        setPendingChanges(prev => 
          prev.filter(change => 
            !(change.fieldName === fieldDisplayName && 
              change.stageName === `${stageName} - ${milestoneTitle}`)
          )
        );
      }
    }
  };

  const handleAddMilestone = (stageIndex) => {
    const updatedStages = [...stages];
    const stage = updatedStages[stageIndex];
    if (!stage.milestones) {
      stage.milestones = [];
    }
    
    const nextId = milestoneCounters[stageIndex] || stage.milestones.length + 1;
    const newMilestone = {
      id: nextId,
      title: `Milestone ${nextId}`,
      stageName: "",
      owner: "",
      remarks: ""
    };
    
    stage.milestones = [...stage.milestones, newMilestone];
    setStages(updatedStages);
    setMilestoneCounters(prev => ({
      ...prev,
      [stageIndex]: nextId + 1
    }));
  };

  const handleDeleteMilestone = (stageIndex, milestoneId) => {
    const updatedStages = [...stages];
    const stage = updatedStages[stageIndex];
    if (stage.milestones) {
      const milestone = stage.milestones.find(m => m.id === milestoneId);
      const milestoneTitle = milestone?.title || `Milestone ${milestoneId}`;
      const stageName = stage.name || "Development";
      
      stage.milestones = stage.milestones.filter(m => m.id !== milestoneId);
      setStages(updatedStages);
      
      // Track deletion as pending change
      addPendingChange("Milestone Deleted", milestoneTitle, "(deleted)", `${stageName} - ${milestoneTitle}`);
    }
  };

  const handleStageChange = (index, field, value) => {
    const initialStage = initialStages[index] || stages[index];
    const initialValue = initialStage?.[field] || "";
    const stageName = stages[index]?.name || "Unknown Stage";

    const updatedStages = [...stages];
    updatedStages[index] = { ...updatedStages[index], [field]: value };
    setStages(updatedStages);

    // Track as pending change (don't log immediately)
    if (initialValue !== value) {
      const fieldDisplayName = {
        status: "Status",
        stageOwner: "Stage Owner",
        actualStartDate: "Actual Start Date",
        actualEndDate: "Actual End Date",
        remarks: "Remarks",
        startDate: "Planned Start Date",
        endDate: "Planned End Date"
      }[field] || field;

      addPendingChange(fieldDisplayName, initialValue, value, stageName);
    } else {
      // Remove from pending if reverted to initial value
      setPendingChanges(prev => 
        prev.filter(change => 
          !(change.fieldName === (field === "status" ? "Status" : 
            field === "stageOwner" ? "Stage Owner" :
            field === "actualStartDate" ? "Actual Start Date" :
            field === "actualEndDate" ? "Actual End Date" :
            field === "remarks" ? "Remarks" : field) && 
            change.stageName === stageName)
        )
      );
    }
  };

  const handleAutoCalculateDates = () => {
    if (!startDate || !endDate) {
      toast.warning("Please enter both Planned Start Date and Planned End Date first.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (!validateDateRange(startDate, endDate)) {
      toast.warning("Invalid date range. Please ensure Start Date is before or equal to End Date.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (!stages || stages.length === 0) {
      toast.warning("No stages found to calculate dates for.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // Calculate dates based on overall project dates and stage weights
    const calculatedStages = calculatePhaseDates(startDate, endDate, stages);
    
    // Track changes to planned dates for each stage (don't log immediately)
    let hasChanges = false;
    calculatedStages.forEach((calculatedStage, index) => {
      const initialStage = initialStages[index] || stages[index];
      const stageName = calculatedStage.name;

      if (initialStage?.startDate !== calculatedStage.startDate) {
        addPendingChange("Planned Start Date", initialStage?.startDate || "", calculatedStage.startDate, stageName);
        hasChanges = true;
      }
      if (initialStage?.endDate !== calculatedStage.endDate) {
        addPendingChange("Planned End Date", initialStage?.endDate || "", calculatedStage.endDate, stageName);
        hasChanges = true;
      }
    });

    setStages(calculatedStages);
    
    if (hasChanges) {
      toast.success("Stage dates calculated successfully!", {
        position: "top-right",
        autoClose: 2000,
      });
    }
    // No toast shown when no date changes are needed
  };

  const collectAllChanges = () => {
    const allChanges = [];
    const changeKeys = new Set(); // Track unique changes to avoid duplicates
    
    // Add all pending changes
    pendingChanges.forEach(change => {
      const key = `${change.fieldName}-${change.stageName}-${change.previousValue}-${change.newValue}`;
      if (!changeKeys.has(key)) {
        changeKeys.add(key);
        allChanges.push(change);
      }
    });
    
    // Check for changes to project-level dates
    if (initialStartDate !== startDate) {
      const key = `Planned Start Date-N/A-${initialStartDate}-${startDate}`;
      if (!changeKeys.has(key)) {
        changeKeys.add(key);
        allChanges.push({
          id: Date.now() + Math.random(),
          fieldName: "Planned Start Date",
          previousValue: initialStartDate || "(empty)",
          newValue: startDate || "(empty)",
          stageName: "N/A"
        });
      }
    }
    
    if (initialEndDate !== endDate) {
      const key = `Planned End Date-N/A-${initialEndDate}-${endDate}`;
      if (!changeKeys.has(key)) {
        changeKeys.add(key);
        allChanges.push({
          id: Date.now() + Math.random(),
          fieldName: "Planned End Date",
          previousValue: initialEndDate || "(empty)",
          newValue: endDate || "(empty)",
          stageName: "N/A"
        });
      }
    }
    
    // Check for changes to overall project summary
    if (initialOverallProjectSummary !== overallProjectSummary) {
      const key = `Overall Project Summary-N/A-${initialOverallProjectSummary}-${overallProjectSummary}`;
      if (!changeKeys.has(key)) {
        changeKeys.add(key);
        allChanges.push({
          id: Date.now() + Math.random(),
          fieldName: "Overall Project Summary",
          previousValue: initialOverallProjectSummary || "(empty)",
          newValue: overallProjectSummary || "(empty)",
          stageName: "N/A"
        });
      }
    }
    
    // Check for changes in stages that might not be in pendingChanges
    stages.forEach((stage, index) => {
      const initialStage = initialStages[index];
      if (!initialStage) return;
      
      const stageName = stage.name;
      
      const fieldsToCheck = [
        { field: "status", displayName: "Status" },
        { field: "stageOwner", displayName: "Stage Owner" },
        { field: "actualStartDate", displayName: "Actual Start Date" },
        { field: "actualEndDate", displayName: "Actual End Date" },
        { field: "remarks", displayName: "Remarks" }
      ];
      
      fieldsToCheck.forEach(({ field, displayName }) => {
        const initialValue = initialStage[field] || "";
        const currentValue = stage[field] || "";
        
        if (initialValue !== currentValue) {
          const key = `${displayName}-${stageName}-${initialValue}-${currentValue}`;
          if (!changeKeys.has(key)) {
            changeKeys.add(key);
            allChanges.push({
              id: Date.now() + Math.random(),
              fieldName: displayName,
              previousValue: initialValue,
              newValue: currentValue,
              stageName
            });
          }
        }
      });
    });
    
    // Check for milestone changes
    stages.forEach((stage, stageIndex) => {
      if (stage.milestones && stage.milestones.length > 0) {
        const initialStage = initialStages[stageIndex];
        const initialMilestones = initialStage?.milestones || [];
        const stageName = stage.name || "Development";
        
        stage.milestones.forEach((milestone, milestoneIndex) => {
          const initialMilestone = initialMilestones.find(m => m.id === milestone.id) || {};
          const milestoneTitle = milestone.title || `Milestone ${milestone.id}`;
          const fullStageName = `${stageName} - ${milestoneTitle}`;
          
          // Check each field
          ['stageName', 'owner', 'remarks'].forEach(field => {
            const initialValue = initialMilestone[field] || "";
            const currentValue = milestone[field] || "";
            
            if (initialValue !== currentValue) {
              const fieldDisplayName = {
                stageName: "Milestone Stage Name",
                owner: "Milestone Owner",
                remarks: "Milestone Remarks"
              }[field] || field;
              
              const key = `${fieldDisplayName}-${fullStageName}-${initialValue}-${currentValue}`;
              if (!changeKeys.has(key)) {
                changeKeys.add(key);
                allChanges.push({
                  id: Date.now() + Math.random(),
                  fieldName: fieldDisplayName,
                  previousValue: initialValue || "(empty)",
                  newValue: currentValue || "(empty)",
                  stageName: fullStageName
                });
              }
            }
          });
        });
        
        // Check for deleted milestones
        initialMilestones.forEach(initialMilestone => {
          const exists = stage.milestones.find(m => m.id === initialMilestone.id);
          if (!exists) {
            const milestoneTitle = initialMilestone.title || `Milestone ${initialMilestone.id}`;
            const fullStageName = `${stageName} - ${milestoneTitle}`;
            const key = `Milestone Deleted-${fullStageName}-${milestoneTitle}-(deleted)`;
            if (!changeKeys.has(key)) {
              changeKeys.add(key);
              allChanges.push({
                id: Date.now() + Math.random(),
                fieldName: "Milestone Deleted",
                previousValue: milestoneTitle,
                newValue: "(deleted)",
                stageName: fullStageName
              });
            }
          }
        });
      }
    });
    
    console.log("Collected changes:", allChanges);
    return allChanges;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Collect all changes and prepare logs for permanent storage
      const allChanges = collectAllChanges();
      console.log("All changes collected:", allChanges);
      
      if (allChanges.length === 0) {
        // No changes detected, just save the project silently
        await updateProjectStages(project._id, stages, startDate, endDate, [], overallProjectSummary);
        onUpdate();
        setLoading(false);
        return;
      }
      
      const logsToSave = createLogsFromChanges(allChanges);
      console.log("Logs to save:", logsToSave);
      
      // Highlight changed fields
      const changedFieldKeys = new Set();
      allChanges.forEach(change => {
        if (change.stageName !== "N/A") {
          // For stage fields, create a unique key
          const stageIndex = stages.findIndex(s => s.name === change.stageName);
          if (stageIndex !== -1) {
            const fieldMap = {
              "Status": "status",
              "Stage Owner": "stageOwner",
              "Planned Start Date": "startDate",
              "Planned End Date": "endDate",
              "Actual Start Date": "actualStartDate",
              "Actual End Date": "actualEndDate",
              "Remarks": "remarks"
            };
            const fieldKey = fieldMap[change.fieldName] || change.fieldName;
            changedFieldKeys.add(`${stageIndex}-${fieldKey}`);
          }
        } else {
          // For project-level fields
          if (change.fieldName === "Planned Start Date") {
            changedFieldKeys.add("project-startDate");
          } else if (change.fieldName === "Planned End Date") {
            changedFieldKeys.add("project-endDate");
          } else if (change.fieldName === "Overall Project Summary") {
            changedFieldKeys.add("project-overallProjectSummary");
          }
        }
      });
      
      setHighlightedFields(changedFieldKeys);
      
      // Save changes to backend along with logs (logs are saved permanently to database)
      await updateProjectStages(project._id, stages, startDate, endDate, logsToSave, overallProjectSummary);
      console.log("Project and logs saved successfully");
      
      // Wait a bit to ensure database write is complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Fetch all logs from database (includes new logs + all previous logs)
      await fetchLogs();
      console.log("Logs fetched and displayed");
      
      // Update initial values to current values
      setInitialStages(JSON.parse(JSON.stringify(stages)));
      setInitialStartDate(startDate);
      setInitialEndDate(endDate);
      setInitialOverallProjectSummary(overallProjectSummary);
      setInitialMilestoneNotes(JSON.parse(JSON.stringify(milestoneNotes)));
      
      // Update milestone counters based on current milestones
      stages.forEach((stage, stageIndex) => {
        if (stage.milestones && stage.milestones.length > 0) {
          const maxId = Math.max(...(stage.milestones.map(m => m.id || 0)), 0);
          setMilestoneCounters(prev => ({
            ...prev,
            [stageIndex]: maxId + 1
          }));
        }
      });
      
      // Clear pending changes
      setPendingChanges([]);
      
      // Show success toast only when actual changes are made
      toast.success("Project status updated successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
      
      // Remove highlights after 2 seconds
      setTimeout(() => {
        setHighlightedFields(new Set());
      }, 2000);
      
      // Smooth scroll to logs section
      setTimeout(() => {
        if (logsSectionRef.current) {
          logsSectionRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
          });
        }
      }, 500);
      
      onUpdate();
      // Don't close modal - let user see the logs
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

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

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-[98vw] max-w-[98vw] h-[94vh] max-h-[94vh] flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-5 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-[#111827]">Edit Project Status - {project.projectName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl font-semibold transition-colors duration-200 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex-shrink-0">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-[#111827] mb-2">Planned Start Date</label>
                  <motion.input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                    }}
                    animate={highlightedFields.has("project-startDate") ? {
                      backgroundColor: ["#fef3c7", "#ffffff"],
                    } : {}}
                    transition={{ duration: 2 }}
                    className={`input-modern ${highlightedFields.has("project-startDate") ? 'bg-yellow-100' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#111827] mb-2">Planned End Date</label>
                  <motion.input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                    }}
                    animate={highlightedFields.has("project-endDate") ? {
                      backgroundColor: ["#fef3c7", "#ffffff"],
                    } : {}}
                    transition={{ duration: 2 }}
                    className={`input-modern ${highlightedFields.has("project-endDate") ? 'bg-yellow-100' : ''}`}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAutoCalculateDates}
                  className="btn-success"
                  title="Auto-calculate stage dates based on project dates and stage weights"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Auto-Calculate Stage Dates
                </button>
              </div>
            </div>

            {/* Project Details Section */}
            <div className="card-modern p-5 flex-shrink-0">
              <div className="space-y-4">
                <div className="flex items-start">
                  <span className="text-base font-semibold text-[#111827] min-w-[160px]">Objectives:</span>
                  <span className="text-base text-gray-700 flex-1">
                    {project.objectives || <span className="text-gray-400 italic">No objectives specified</span>}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-base font-semibold text-[#111827] min-w-[160px]">Project Owner:</span>
                  <span className="text-base text-gray-700">
                    {project.projectOwner || <span className="text-gray-400 italic">Not specified</span>}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-base font-semibold text-[#111827] min-w-[160px]">IT Owner:</span>
                  <span className="text-base text-gray-700">
                    {project.itOwner || <span className="text-gray-400 italic">Not specified</span>}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-base font-semibold text-[#111827] min-w-[160px]">Business Owner:</span>
                  <span className="text-base text-gray-700">
                    {project.businessOwner || <span className="text-gray-400 italic">Not specified</span>}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col flex-shrink-0">
              <h3 className="text-lg font-semibold text-[#111827] mb-4">Project Stages</h3>
              <div className="card-modern overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse table-fixed">
                    <thead className="bg-gray-50/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r" style={{width: '14%'}}>Stage Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r whitespace-nowrap" style={{width: '13%'}}>Stage Owner</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r whitespace-nowrap" style={{width: '6%'}}>Weight</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r whitespace-nowrap" style={{width: '12%'}}>Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r whitespace-nowrap" style={{width: '11%'}}>Planned Start Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r whitespace-nowrap" style={{width: '11%'}}>Planned End Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r whitespace-nowrap" style={{width: '11%'}}>Actual Start Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r whitespace-nowrap" style={{width: '11%'}}>Actual End Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b whitespace-nowrap" style={{width: '11%'}}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      <AnimatePresence>
                        {stages.map((stage, index) => {
                          const isStatusHighlighted = highlightedFields.has(`${index}-status`);
                          const isStageOwnerHighlighted = highlightedFields.has(`${index}-stageOwner`);
                          const isActualStartHighlighted = highlightedFields.has(`${index}-actualStartDate`);
                          const isActualEndHighlighted = highlightedFields.has(`${index}-actualEndDate`);
                          const isRemarksHighlighted = highlightedFields.has(`${index}-remarks`);
                          
                          const isDevelopmentStage = stage.name === "Development";
                          const showMilestones = isDevelopmentStage && expandedStages.has(index);
                          const milestones = showMilestones ? (stage.milestones || []) : [];

                          return [
                            <motion.tr
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2, delay: index * 0.05 }}
                              className={`transition-colors duration-150 ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                              } hover:bg-[#2563eb]/5`}
                            >
                              <td className="px-4 py-3 text-base font-semibold text-[#111827] border-r break-words">
                                <div className="flex items-center gap-2">
                                  {stage.name === "Development" && (
                                    <button
                                      onClick={() => toggleStageExpansion(index)}
                                      className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 transition-colors duration-200"
                                      aria-label={expandedStages.has(index) ? "Collapse milestones" : "Expand milestones"}
                                    >
                                      <motion.div
                                        animate={{ rotate: expandedStages.has(index) ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                      >
                                        <ChevronDown className="w-4 h-4 text-gray-600" />
                                      </motion.div>
                                    </button>
                                  )}
                                  <span>{stage.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r">
                                <motion.textarea
                                  value={stage.stageOwner || ""}
                                  onChange={(e) => handleStageChange(index, "stageOwner", e.target.value)}
                                  placeholder="Enter owner..."
                                  animate={isStageOwnerHighlighted ? {
                                    backgroundColor: ["#fef3c7", "#ffffff"],
                                  } : {}}
                                  transition={{ duration: 2 }}
                                  className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-2xl bg-white text-[#111827] placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-200 resize-none overflow-hidden ${isStageOwnerHighlighted ? 'bg-yellow-100' : ''}`}
                                  style={{ minWidth: '150px', minHeight: '38px', maxHeight: '76px' }}
                                  rows={1}
                                  onInput={(e) => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 76) + 'px';
                                  }}
                                />
                              </td>
                              <td className="px-4 py-3 border-r">
                                <div className="relative">
                                  <motion.input
                                    type="text"
                                    value={stage.weight !== undefined && stage.weight !== null ? stage.weight : ""}
                                    onChange={(e) => {
                                      const inputValue = e.target.value;
                                      // Remove % if user types it
                                      const cleanValue = inputValue.replace('%', '').trim();
                                      // Allow empty input while typing
                                      if (cleanValue === "") {
                                      handleWeightChange(index, "0");
                                        return;
                                      }
                                      handleWeightChange(index, cleanValue);
                                    }}
                                    onBlur={(e) => {
                                      // Ensure valid number on blur - validate and update if needed
                                      const value = e.target.value.toString().replace('%', '').trim();
                                      const numericValue = parseFloat(value);
                                      if (isNaN(numericValue) || numericValue < 0) {
                                        // Reset to current weight if invalid
                                        handleWeightChange(index, stage.weight || "0");
                                      }
                                    }}
                                    placeholder="0"
                                    className="w-full px-3 py-2 pr-6 text-sm border border-gray-200 rounded-2xl bg-white text-[#111827] placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-200 text-center"
                                    style={{ minWidth: '60px' }}
                                  />
                                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 pointer-events-none">%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r">
                                <motion.div
                                  animate={isStatusHighlighted ? {
                                    backgroundColor: ["#fef3c7", "#ffffff"],
                                  } : {}}
                                  transition={{ duration: 2 }}
                                >
                                  <select
                                    value={stage.status}
                                    onChange={(e) => handleStageChange(index, "status", e.target.value)}
                                    className={`w-full px-3 py-2 text-sm border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] transition-all duration-200 font-medium whitespace-nowrap ${getStatusColor(stage.status)} ${isStatusHighlighted ? 'bg-yellow-100' : ''}`}
                                    style={{ minWidth: '130px' }}
                                  >
                                    <option value="Yet to Start">Yet to Start</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Delayed">Delayed</option>
                                  </select>
                                </motion.div>
                              </td>
                              <td className="px-4 py-3 border-r">
                                <motion.input
                                  type="date"
                                  value={stage.startDate || ""}
                                  readOnly
                                  disabled
                                  animate={recalculatedDateFields.has(`planned-start-${index}`) ? {
                                    backgroundColor: ["#dbeafe", "#f3f4f6"],
                                    scale: [1, 1.02, 1],
                                  } : {}}
                                  transition={{ duration: 0.5 }}
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-2xl bg-gray-50 text-gray-500 cursor-not-allowed font-medium"
                                  title="Planned dates are calculated automatically based on project dates and stage weights"
                                  style={{ minWidth: '140px' }}
                                />
                              </td>
                              <td className="px-4 py-3 border-r">
                                <motion.input
                                  type="date"
                                  value={stage.endDate || ""}
                                  readOnly
                                  disabled
                                  animate={recalculatedDateFields.has(`planned-end-${index}`) ? {
                                    backgroundColor: ["#dbeafe", "#f3f4f6"],
                                    scale: [1, 1.02, 1],
                                  } : {}}
                                  transition={{ duration: 0.5 }}
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-2xl bg-gray-50 text-gray-500 cursor-not-allowed font-medium"
                                  title="Planned dates are calculated automatically based on project dates and stage weights"
                                  style={{ minWidth: '140px' }}
                                />
                              </td>
                              <td className="px-4 py-3 border-r">
                                <motion.input
                                  type="date"
                                  value={stage.actualStartDate || ""}
                                  onChange={(e) => handleStageChange(index, "actualStartDate", e.target.value)}
                                  animate={isActualStartHighlighted ? {
                                    backgroundColor: ["#fef3c7", "#ffffff"],
                                  } : {}}
                                  transition={{ duration: 2 }}
                                  className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-2xl bg-white text-[#111827] placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-200 ${isActualStartHighlighted ? 'bg-yellow-100' : ''}`}
                                  style={{ minWidth: '140px' }}
                                />
                              </td>
                              <td className="px-4 py-3 border-r">
                                <motion.input
                                  type="date"
                                  value={stage.actualEndDate || ""}
                                  onChange={(e) => handleStageChange(index, "actualEndDate", e.target.value)}
                                  animate={isActualEndHighlighted ? {
                                    backgroundColor: ["#fef3c7", "#ffffff"],
                                  } : {}}
                                  transition={{ duration: 2 }}
                                  className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-2xl bg-white text-[#111827] placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-200 ${isActualEndHighlighted ? 'bg-yellow-100' : ''}`}
                                  style={{ minWidth: '140px' }}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <motion.input
                                  type="text"
                                  value={stage.remarks || ""}
                                  onChange={(e) => handleStageChange(index, "remarks", e.target.value)}
                                  placeholder="Remarks..."
                                  animate={isRemarksHighlighted ? {
                                    backgroundColor: ["#fef3c7", "#ffffff"],
                                  } : {}}
                                  transition={{ duration: 2 }}
                                  className={`input-modern text-sm ${isRemarksHighlighted ? 'bg-yellow-100' : ''}`}
                                />
                              </td>
                            </motion.tr>,
                            ...(showMilestones
                              ? [
                                  <motion.tr
                                    key={`milestones-header-${index}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-white"
                                  >
                                    <td colSpan="9" className="px-6 py-3 border-t border-gray-200 bg-gray-50">
                                      <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        <div className="col-span-2">Milestone Title</div>
                                        <div className="col-span-3">Stage Name</div>
                                        <div className="col-span-3">Stage Owner</div>
                                        <div className="col-span-3">Remarks</div>
                                        <div className="col-span-1"></div>
                                      </div>
                                    </td>
                                  </motion.tr>,
                                  ...milestones.map((milestone, milestoneIndex) => (
                                    <motion.tr
                                      key={`milestone-${milestone.id || milestoneIndex}`}
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.3, delay: milestoneIndex * 0.05 }}
                                      className="bg-white hover:bg-gray-50/50 transition-colors duration-150 border-b border-gray-100"
                                    >
                                      <td colSpan="9" className="px-6 py-4">
                                        <div className="grid grid-cols-12 gap-3 items-center">
                                          <div className="col-span-2">
                                            <div className="text-sm font-semibold text-[#111827]">
                                              {milestone.title || `Milestone ${milestone.id || milestoneIndex + 1}`}
                                            </div>
                                          </div>
                                          <div className="col-span-3">
                                            <input
                                              type="text"
                                              value={milestone.stageName || ""}
                                              onChange={(e) => handleMilestoneChange(index, milestone.id, "stageName", e.target.value)}
                                              placeholder="Enter stage name..."
                                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-[#111827] placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-200"
                                            />
                                          </div>
                                          <div className="col-span-3">
                                            <input
                                              type="text"
                                              value={milestone.owner || ""}
                                              onChange={(e) => handleMilestoneChange(index, milestone.id, "owner", e.target.value)}
                                              placeholder="Enter owner..."
                                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-[#111827] placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-200"
                                            />
                                          </div>
                                          <div className="col-span-3">
                                            <input
                                              type="text"
                                              value={milestone.remarks || ""}
                                              onChange={(e) => handleMilestoneChange(index, milestone.id, "remarks", e.target.value)}
                                              placeholder="Enter remarks..."
                                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-[#111827] placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-200"
                                            />
                                          </div>
                                          <div className="col-span-1 flex justify-end">
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteMilestone(index, milestone.id)}
                                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                              aria-label="Delete milestone"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      </td>
                                    </motion.tr>
                                  )),
                                  <motion.tr
                                    key={`add-milestone-${index}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-white"
                                  >
                                    <td colSpan="9" className="px-6 py-3 border-t border-gray-200">
                                      <button
                                        type="button"
                                        onClick={() => handleAddMilestone(index)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] hover:bg-blue-50 rounded-xl transition-colors duration-200"
                                      >
                                        <Plus className="w-4 h-4" />
                                        Add More Milestone
                                      </button>
                                    </td>
                                  </motion.tr>
                                ]
                              : []
                            )
                          ];
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Business Case Approval Section */}
            <div className="flex-shrink-0">
              <div className="card-modern p-5">
                <div className="text-base font-semibold text-[#111827] mb-3">📎 Business Case Approval</div>
                {businessCases.length > 0 ? (
                  <div className="space-y-3">
                    {businessCases.map((caseItem, index) => (
                      <div
                        key={`${caseItem.fileName}-${index}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50 rounded-2xl px-4 py-3"
                      >
                        <div className="text-sm text-gray-700">
                          <div className="font-semibold text-[#111827]">
                            File {index + 1}: {caseItem.originalName || caseItem.fileName}
                          </div>
                          <div className="text-gray-600">
                            Stored as: <span className="font-medium break-all">{caseItem.fileName}</span>
                            {caseItem.fileSize ? (
                              <span className="text-gray-500"> ({formatBytes(caseItem.fileSize)})</span>
                            ) : null}
                          </div>
                          {caseItem.uploadedAt && (
                            <div className="text-gray-500">
                              Uploaded on{" "}
                              {new Date(caseItem.uploadedAt).toLocaleDateString("en-GB")}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <a
                            href={caseItem.url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary"
                          >
                            View File
                          </a>
                          <a
                            href={caseItem.url}
                            download={caseItem.originalName || caseItem.fileName}
                            className="btn-primary"
                          >
                            Download File
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">No Business Case files uploaded.</div>
                )}
              </div>
            </div>

            {/* Overall Project Summary Section */}
            <div className="flex-shrink-0">
              <h3 className="text-lg font-semibold text-[#111827] mb-4">Overall Project Summary</h3>
              <div className="card-modern p-5">
                <motion.textarea
                  value={overallProjectSummary}
                  onChange={(e) => {
                    setOverallProjectSummary(e.target.value);
                  }}
                  placeholder="Enter overall project summary here..."
                  animate={highlightedFields.has("project-overallProjectSummary") ? {
                    backgroundColor: ["#fef3c7", "#ffffff"],
                  } : {}}
                  transition={{ duration: 2 }}
                  className={`w-full px-4 py-3 text-base border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] transition-all duration-200 resize-y min-h-[120px] font-medium ${highlightedFields.has("project-overallProjectSummary") ? 'bg-yellow-100' : ''}`}
                  rows={5}
                />
              </div>
            </div>

            {/* Logs Section */}
            <div className="flex-shrink-0" ref={logsSectionRef}>
              <h3 className="text-lg font-semibold text-[#111827] mb-4">Logs</h3>
              <div className="card-modern p-4 max-h-[250px] overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-8">
                    No changes logged yet. Changes to Project Stages and Overall Project Summary will appear here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {logs.map((log, index) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ 
                            duration: 0.3,
                            delay: index * 0.05,
                            type: "spring",
                            stiffness: 100
                          }}
                          className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm"
                        >
                        <div className="flex flex-wrap items-start gap-2 mb-2">
                          <span className="font-semibold text-gray-600">Field:</span>
                          <span className="text-[#111827]">{log.fieldName}</span>
                          {log.stageName && log.stageName !== "N/A" && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="font-semibold text-gray-600">Stage:</span>
                              <span className="text-[#111827]">{log.stageName}</span>
                            </>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-600">Previous:</span>
                          <span className="text-gray-500 line-through">{log.previousValue}</span>
                          <span className="text-gray-300">→</span>
                          <span className="font-semibold text-gray-600">New:</span>
                          <span className="text-[#2563eb] font-medium">{log.newValue}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-200">
                          <span className="font-semibold">Time:</span>
                          <span>{log.timestamp}</span>
                          <span className="text-gray-300">•</span>
                          <span className="font-semibold">User:</span>
                          <span>{log.user}</span>
                          <span className="text-gray-300">•</span>
                          <span className="font-semibold">Project:</span>
                          <span>{log.projectName}</span>
                        </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Footer with Save Changes Button */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3 shadow-lg">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStatusModal;
