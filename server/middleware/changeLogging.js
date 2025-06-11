const { createChangeLog } = require('../utils/changeLogger');

/**
 * Create change logging middleware for a schema
 * @param {String} collectionName - Name of the collection to monitor
 * @returns {Function} Mongoose middleware function
 */
const createChangeLoggingMiddleware = (collectionName) => {
  return async function(next) {
    try {
      const updateData = this.getUpdate();
      const documentId = this.getQuery()._id;
      
      // Get the current document state
      const currentDoc = await this.model.findOne({ _id: documentId });
      if (!currentDoc) {
        return next();
      }

      // Get user info from the request context
      // This assumes you have user info in the request object
      const userInfo = this.options.userInfo || {
        username: 'system',
        role: 'admin'
      };

      // Create the change log
      await createChangeLog(
        collectionName,
        documentId,
        currentDoc,
        updateData,
        userInfo
      );

      next();
    } catch (error) {
      console.error(`Error in change logging middleware for ${collectionName}:`, error);
      next(error);
    }
  };
};

module.exports = createChangeLoggingMiddleware; 