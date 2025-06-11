const mongoose = require('mongoose');

/**
 * Process MongoDB update operators to get the final state
 * @param {Object} currentDoc - Current document state
 * @param {Object} updateData - Update operations
 * @returns {Object} Processed document state
 */
const processUpdateOperators = (currentDoc, updateData) => {
  const result = { ...currentDoc.toObject() };
  if (updateData.$set) Object.assign(result, updateData.$set);
  if (updateData.$unset) Object.keys(updateData.$unset).forEach(key => delete result[key]);
  return result;
};

/**
 * Create a change log entry
 * @param {String} collection - Collection name
 * @param {ObjectId} documentId - Document ID
 * @param {Object} currentDoc - Current document state
 * @param {Object} updateData - Update operations
 * @param {Object} userInfo - User information
 * @returns {Promise} Promise resolving to the created log entry
 */
const createChangeLog = async (collection, documentId, currentDoc, updateData, userInfo) => {
  try {
    let logCollection;
    if (collection === 'frequency') logCollection = mongoose.model('frequencyLogs');
    else if (collection === 'employee') logCollection = mongoose.model('employeeLogs');
    else if (collection === 'application' || collection === 'app') logCollection = mongoose.model('applicationLogs');
    else return null;

    const processedDoc = processUpdateOperators(currentDoc, updateData);
    if (JSON.stringify(currentDoc.toObject()) === JSON.stringify(processedDoc)) return null;

    const changed_by = userInfo?.name || userInfo?.email || 'system';
    const logEntry = new logCollection({
      changed_by,
      oldValue: currentDoc.toObject(),
      newValue: processedDoc,
      timestamp: new Date()
    });
    await logEntry.save();
    return logEntry;
  } catch (err) {
    console.error('Error creating change log:', err);
    return null;
  }
};

module.exports = { createChangeLog, processUpdateOperators }; 