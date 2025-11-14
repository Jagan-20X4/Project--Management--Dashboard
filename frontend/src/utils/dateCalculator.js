/**
 * Calculates phase dates based on overall project dates and phase weights
 * @param {string} overallStartDate - Overall project start date (YYYY-MM-DD format)
 * @param {string} overallEndDate - Overall project end date (YYYY-MM-DD format)
 * @param {Array} stages - Array of stage objects with name, weight, and optionally startDate/endDate
 * @returns {Array} - Updated stages array with calculated startDate and endDate for each stage
 */
export function calculatePhaseDates(overallStartDate, overallEndDate, stages) {
  if (!overallStartDate || !overallEndDate || !stages || stages.length === 0) {
    return stages;
  }

  // Parse dates
  const start = new Date(overallStartDate);
  const end = new Date(overallEndDate);

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    console.error("Invalid date range");
    return stages;
  }

  // Calculate total days (inclusive of both start and end dates)
  // Add 1 to include both start and end dates
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  // Calculate total weight
  const totalWeight = stages.reduce((sum, stage) => sum + (stage.weight || 0), 0);

  if (totalWeight === 0) {
    console.error("Total weight is zero");
    return stages;
  }

  // Create a copy of stages to avoid mutating the original
  const updatedStages = stages.map(stage => ({ ...stage }));

  // Calculate days allocation for each phase
  const phaseDaysAllocation = [];
  let allocatedDays = 0;
  
  // First pass: calculate days for each phase (using floor to avoid over-allocation)
  for (let i = 0; i < updatedStages.length; i++) {
    const weight = updatedStages[i].weight || 0;
    const calculatedDays = Math.floor((weight / totalWeight) * totalDays);
    const daysForPhase = Math.max(1, calculatedDays);
    phaseDaysAllocation.push(daysForPhase);
    allocatedDays += daysForPhase;
  }
  
  // Distribute any remaining days due to rounding
  const remainingDays = totalDays - allocatedDays;
  if (remainingDays > 0) {
    // Add remaining days to phases with largest weights first
    const stagesWithWeights = updatedStages.map((stage, index) => ({
      index,
      weight: stage.weight || 0,
      days: phaseDaysAllocation[index]
    })).sort((a, b) => b.weight - a.weight);
    
    for (let i = 0; i < Math.min(remainingDays, stagesWithWeights.length); i++) {
      phaseDaysAllocation[stagesWithWeights[i].index]++;
    }
  }

  // Calculate and assign dates sequentially
  let currentDate = new Date(start);
  
  for (let i = 0; i < updatedStages.length; i++) {
    const stage = updatedStages[i];
    const daysForPhase = phaseDaysAllocation[i];
    
    // Set start date
    const phaseStartDate = new Date(currentDate);
    stage.startDate = formatDate(phaseStartDate);
    
    // Calculate end date (subtract 1 because we're counting inclusive)
    const phaseEndDate = new Date(phaseStartDate);
    phaseEndDate.setDate(phaseEndDate.getDate() + daysForPhase - 1);
    
    // Ensure we don't exceed the overall end date
    if (phaseEndDate > end) {
      phaseEndDate.setTime(end.getTime());
    }
    
    stage.endDate = formatDate(phaseEndDate);
    
    // Move to the next day after this phase ends
    currentDate = new Date(phaseEndDate);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Ensure the last stage always ends on the overall end date
  if (updatedStages.length > 0) {
    updatedStages[updatedStages.length - 1].endDate = formatDate(end);
  }

  return updatedStages;
}

/**
 * Formats a Date object to YYYY-MM-DD string format
 * @param {Date} date - Date object to format
 * @returns {string} - Formatted date string (YYYY-MM-DD)
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates if dates are in correct format and range
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {boolean} - True if dates are valid
 */
export function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
}

