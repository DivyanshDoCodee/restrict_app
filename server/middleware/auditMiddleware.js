const AuditLog = require('../models/AuditLog');

// Reusable middleware function to apply to Mongoose schemas
const auditMiddleware = (schema) => {

  // Middleware for 'save' operation (create and update)
  schema.pre('save', async function(next) {
    // Store the original document before changes for comparison in post-save
    if (this.isNew) {
      // For new documents, store the data that will be saved
      this._original = this.toObject({ getters: false });
    } else {
      // For existing documents, fetch the original data from DB
      try {
        const originalDoc = await this.constructor.findById(this._id).lean();
        this._original = originalDoc;
        next();
      } catch (err) {
        console.error('Error fetching original document for audit:', err);
        return next(err);
      }
    }
  });

  schema.post('save', async function(doc, next) {
    const action = this.isNew ? 'create' : 'update';
    const modelName = this.constructor.modelName;
    const documentId = doc._id;

    // Get user information from options passed during save
    // Assuming user info is passed as { user: { username, email } } in save options
    const user = this.options && this.options.user ? this.options.user : {};

    let changes = {};
    if (action === 'update' && this._original) {
      // Compare original and updated documents to find changes
      const original = this._original;
      const updated = doc.toObject({ getters: false });

      for (const key in updated) {
        // Check if the field exists in original and is not deleted
        if (original.hasOwnProperty(key) && updated.hasOwnProperty(key)) {
           // Perform a deep comparison for objects and arrays, shallow for others
           // Simple comparison first
          if (JSON.stringify(original[key]) !== JSON.stringify(updated[key])) {
             // Log the new value
              changes[key] = updated[key];
           }
        } else if (updated.hasOwnProperty(key) && !original.hasOwnProperty(key)){
            // Handle newly added fields during an update
             changes[key] = updated[key];
        }
      }
      // Also check for deleted fields in the update
      for(const key in original){
          if(original.hasOwnProperty(key) && !updated.hasOwnProperty(key)){
              changes[key] = null; // Indicate field was removed
          }
      }
    } else if(action === 'create'){
        // For creation, log all fields with their initial values (excluding internal fields)
         const createdDoc = doc.toObject({ getters: false });
         for(const key in createdDoc){
             if(createdDoc.hasOwnProperty(key) && key !== '_id' && key !== '__v'){
                 changes[key] = createdDoc[key];
             }
         }
    }
     // Only create a log if there were changes (for updates) or it's a creation
     if(action === 'create' || Object.keys(changes).length > 0){
         const log = new AuditLog({
            action: action,
            modelName: modelName,
            documentId: documentId,
            user: user,
            changes: changes,
            timestamp: new Date()
         });
          try {
             await log.save();
          } catch (logError) {
             console.error('Error saving audit log:', logError);
          }
     }
    
    next();
  });

   // Middleware for delete operations (using pre/post remove or deleteOne/deleteMany hooks)
   // Note: deleteMany and deleteOne hooks don't have access to the document by default
   // We'll use post remove for single document deletion which has access to the doc
   schema.post('deleteOne', async function(result, next) {
       // result contains info like deletedCount
        // For deleteOne, this hook is called after deletion. Access to the doc requires a pre hook or finding it before deletion.
        // Since we capture changes in the pre-save for update, for delete we can rely on either a pre-remove capturing or modify the route to pass doc data.
        // A simpler approach for delete is to log the ID and indicate deletion.
         const modelName = this.constructor.modelName; // This might not work as expected in post delete hooks depending on how delete is called
          // A more reliable way is to capture in pre-remove if deleting a single doc via doc.remove()
           // Or get the ID from the query filter in deleteOne/deleteMany hooks (more complex).

          // Let's adjust to use post('remove') which is called on document.remove()
          // If using Model.deleteOne or Model.deleteMany, we might need a different approach.
          // Assuming common usage is doc.remove() for single deletes or find and then remove.

          // If using Model.deleteOne({ _id: someId }), we can get the ID from the filter
          const documentId = this.getFilter()._id; // This works for Model.deleteOne({_id: ...})

          if(documentId){ // Only log if we have a document ID
             const user = this.options && this.options.user ? this.options.user : {}; // Get user from options if passed
              const log = new AuditLog({
                action: 'delete',
                 // modelName: modelName, // modelName might be tricky here, rely on the collection name maybe?
                 // Let's pass modelName in options if using Model.deleteOne/deleteMany from routes
                 modelName: this.options && this.options.modelName ? this.options.modelName : 'UnknownModel', // Pass modelName in options from route
                documentId: documentId,
                user: user,
                changes: { message: `Document with ID ${documentId} was deleted.` }, // Log a simple message for delete
                timestamp: new Date()
              });

              try {
                 await log.save();
              } catch (logError) {
                 console.error('Error saving delete audit log:', logError);
              }
          }
          next();
   });


    // Let's add a helper to apply this middleware easily
    schema.statics.audit = function() {
      auditMiddleware(this.schema);
    };

};

module.exports = auditMiddleware; 