const AppLogs = require('../models/AppLogs');

const appLogsMiddleware = (schema) => {
    // Pre-save middleware to store the original document and user info
    schema.pre('save', async function(next) {
        console.log('AppLogs Middleware: pre save hook triggered');
        // Access user from the document instance property set in the route handler
        const user = this.__user || (this.options ? this.options.user : null);

        console.log('AppLogs Middleware: pre save: retrieved user:', user);

        // Store user information in $locals for post hooks, using a reliable method
        this.$locals.user = user;
        console.log('AppLogs Middleware: pre save: stored user in $locals:', this.$locals.user);

        if (this.isNew) {
            this._original = {};
        } else {
            try {
                // Use lean() to get a plain JavaScript object
                const originalDoc = await this.constructor.findById(this._id).lean();
                this._original = originalDoc;
                 console.log('AppLogs Middleware: pre save: fetched original doc', this._original);
            } catch (err) {
                console.error('AppLogs Middleware Pre-save Error: Error fetching original document:', err);
                return next(err);
            }
        }
        next();
    });

    // Post-save middleware to log changes
    schema.post('save', async function(doc, next) {
        console.log('AppLogs Middleware: post save hook triggered');
        console.log('AppLogs Middleware: post save: this.$locals.user:', this.$locals.user);
        try {
            const action = this.isNew ? 'create' : 'update';
            const modelName = this.constructor.modelName;
            const documentId = doc._id;
            
            console.log('AppLogs Middleware: Action: ' + action + ', Model: ' + modelName + ', DocumentId: ' + documentId);

            // Get user information from $locals
            const user = this.$locals.user || null; // Use the user stored in $locals
            
            console.log('AppLogs Middleware: User info:', user);

            // Check if user information is valid and contains _id and role
            if (!user || !user._id || !user.role) {
                console.warn('AppLogs Middleware: Skipping log - No valid user information provided or user ID/role missing.');
                return next();
            }

            let changes = {};
            if (action === 'update' && this._original) {
                const original = this._original;
                const updated = doc.toObject({ getters: false });

                console.log('AppLogs Middleware: Original Doc (for update comparison): ', original);
                console.log('AppLogs Middleware: Updated Doc (for update comparison): ', updated);

                for (const key in updated) {
                    if (updated.hasOwnProperty(key) && key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt' && key !== 'created_at' && key !== 'updated_at' && key !== 'deleted_at') {
                        const originalValue = original ? original[key] : undefined;
                        const updatedValue = updated[key];

                        const originalString = originalValue !== undefined && originalValue !== null ? JSON.stringify(originalValue) : String(originalValue);
                        const updatedString = updatedValue !== undefined && updatedValue !== null ? JSON.stringify(updatedValue) : String(updatedValue);

                        if (originalString !== updatedString) {
                            console.log('AppLogs Middleware: Change detected for field: ' + key + '. Old: ' + originalString + ', New: ' + updatedString);
                            const logData = {
                                action: 'update',
                                field: key,
                                oldValue: originalValue,
                                newValue: updatedValue,
                                updatedBy: user._id, 
                                userName: user.name, // Include user name
                                userRole: user.role, 
                                documentId: documentId,
                                documentType: modelName
                            };

                            console.log('AppLogs Middleware: Data for AppLogs.create (update): ', logData);

                            await AppLogs.create(logData);
                            console.log('AppLogs Middleware: Log created successfully for field: ' + key);
                        }
                    }
                }
                if(original) {
                    for(const key in original) {
                        if(original.hasOwnProperty(key) && !updated.hasOwnProperty(key) && key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt' && key !== 'created_at' && key !== 'updated_at' && key !== 'deleted_at') {
                            console.log('AppLogs Middleware: Field removed: ' + key + '. Old value: ' + JSON.stringify(original[key]));
                            const logData = {
                                action: 'update',
                                field: key,
                                oldValue: original[key],
                                newValue: null,
                                updatedBy: user._id,
                                userName: user.name, // Include user name
                                userRole: user.role,
                                documentId: documentId,
                                documentType: modelName
                            };

                            console.log('AppLogs Middleware: Data for AppLogs.create (removed field): ', logData);

                            await AppLogs.create(logData);
                            console.log('AppLogs Middleware: Log created successfully for removed field: ' + key);
                        }
                    }
                }
            } else if (action === 'create') {
                console.log('AppLogs Middleware: Handling Create action');
                const createdDoc = doc.toObject({ getters: false });
                console.log('AppLogs Middleware: Created Doc (for create): ', createdDoc);
                for (const key in createdDoc) {
                    if (createdDoc.hasOwnProperty(key) && key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt' && key !== 'created_at' && key !== 'updated_at' && key !== 'deleted_at') {
                        const logData = {
                            action: 'create',
                            field: key,
                            oldValue: null,
                            newValue: createdDoc[key],
                            updatedBy: user._id,
                            userName: user.name, // Include user name
                            userRole: user.role,
                            documentId: documentId,
                            documentType: modelName
                        };

                        console.log('AppLogs Middleware: Data for AppLogs.create (create): ', logData);

                        await AppLogs.create(logData);
                        console.log('AppLogs Middleware: Log created successfully for new field: ' + key);
                    }
                }
            }

        } catch (error) {
            console.error('AppLogs Middleware: Error creating app logs in post-save:', error);
        }
        next();
    });

    // Post-remove middleware to log deletions
    schema.post('remove', async function(doc, next) {
        console.log('AppLogs Middleware: post remove hook triggered');
        console.log('AppLogs Middleware: post remove: this.$locals.user:', this.$locals.user);
        try {
             // Get user information from $locals
            const user = this.$locals.user || null; // Use the user stored in $locals

            console.log('AppLogs Middleware: User info for delete:', user);
            
            if (!user || !user._id || !user.role) {
                console.warn('AppLogs Middleware: Skipping delete log - No valid user information provided or user ID/role missing.');
                return next();
            }
            
            const modelName = this.constructor.modelName;
            console.log('AppLogs Middleware: Deleting Model: ' + modelName + ', DocumentId: ' + doc._id);

            const logData = {
                action: 'delete',
                field: 'document',
                oldValue: doc.toObject({ getters: false }),
                newValue: null,
                updatedBy: user._id,
                userName: user.name, // Include user name
                userRole: user.role,
                documentId: doc._id,
                documentType: modelName
            };

            console.log('AppLogs Middleware: Data for AppLogs.create (delete): ', logData);

            await AppLogs.create(logData);
            console.log('AppLogs Middleware: Delete log created successfully');

        } catch (error) {
            console.error('AppLogs Middleware: Error creating delete app log in post-remove:', error);
        }
        next();
    });
};

module.exports = appLogsMiddleware; 