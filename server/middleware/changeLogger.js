const mongoose = require('mongoose');

/**
 * Deep diff between two objects
 * @param {Object} oldObj - The original object
 * @param {Object} newObj - The updated object
 * @returns {Array} Array of changes with field, oldValue, and newValue
 */
const getDeepDiff = (oldObj, newObj) => {
    const changes = [];
    
    const compareObjects = (oldVal, newVal, path = '') => {
        if (oldVal === newVal) return;
        
        if (typeof oldVal !== 'object' || typeof newVal !== 'object' || 
            oldVal === null || newVal === null) {
            changes.push({
                field: path,
                oldValue: oldVal,
                newValue: newVal
            });
            return;
        }

        const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);
        
        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            if (!(key in oldVal)) {
                changes.push({
                    field: currentPath,
                    oldValue: undefined,
                    newValue: newVal[key]
                });
            } else if (!(key in newVal)) {
                changes.push({
                    field: currentPath,
                    oldValue: oldVal[key],
                    newValue: undefined
                });
            } else {
                compareObjects(oldVal[key], newVal[key], currentPath);
            }
        }
    };

    compareObjects(oldObj, newObj);
    return changes;
};

/**
 * Creates a change log entry
 * @param {Object} options - Configuration options
 * @param {mongoose.Model} options.logModel - The log collection model
 * @param {Object} options.doc - The original document
 * @param {Object} options.update - The update payload
 * @param {Object} options.user - The user making the changes
 * @returns {Promise} Promise resolving to the created log entry
 */
const createChangeLog = async ({ logModel, doc, update, user }) => {
    // Convert update to a plain object if it's using $set
    const updateObj = update.$set || update;
    const changes = getDeepDiff(doc.toObject(), updateObj);
    
    if (changes.length === 0) return null;

    const logEntry = {
        document_id: doc._id,
        changed_by: user.email || user._id,
        role: user.role,
        timestamp: new Date(),
        changes
    };

    return await logModel.create(logEntry);
};

/**
 * Creates a change logging middleware for a collection
 * @param {Object} options - Configuration options
 * @param {mongoose.Model} options.model - The main collection model
 * @param {mongoose.Model} options.logModel - The log collection model
 * @returns {Function} Mongoose middleware function
 */
const createChangeLoggerMiddleware = ({ model, logModel }) => {
    return async function(next) {
        try {
            const filter = this.getQuery();
            const update = this.getUpdate();
            const options = this.getOptions();
            
            // Skip if no update operation
            if (!update || Object.keys(update).length === 0) {
                return next();
            }

            // Get the original document
            const doc = await model.findOne(filter);
            if (!doc) {
                return next();
            }

            // Get user from context (assuming it's set in the request)
            const user = options.user || this.getOptions().user;
            if (!user) {
                console.warn('No user context found for change logging');
                return next();
            }

            // Create log entry
            await createChangeLog({
                logModel,
                doc,
                update,
                user
            });

            next();
        } catch (error) {
            console.error('Error in change logging middleware:', error);
            next(error);
        }
    };
};

module.exports = {
    createChangeLoggerMiddleware,
    getDeepDiff
}; 