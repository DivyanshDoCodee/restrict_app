// Load environment variables from .env file
require('dotenv').config();

const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const AppModel = require('./models/Application')
const FrequencyModel = require('./models/Frequency')
const multer = require("multer");
const XLSX = require("xlsx");
const EmployeeModel = require('./models/Employee')
const UserModel = require('./models/User')
const AuditModel = require('./models/Audit')
const ChangeLogModel = require('./models/ChangeLog');
const AppLogs = require('./models/AppLogs');
const CompletedReview = require('./models/CompletedReview');
const { sendEmail } = require('./services/emailService');
const setupChangeLogging = require('./middleware/setupChangeLogging');
const { FrequencyLog, EmployeeLog, ApplicationLog } = require('./models/logSchemas');

// require("dotenv").config();

const moment = require("moment");
const jwt = require('jsonwebtoken'); 
const secretKey = 'your-secret-key';
const checkAuth = require('./middleware/auth');
const nodemailer = require('nodemailer');

// TEMPORARY: Middleware to simulate authenticated user for testing
const simulateAuthMiddleware = (req, res, next) => {
    // Replace with your actual logic to get the logged-in user
    // This is a placeholder user. You should fetch the user from your database
    // based on a token or session and attach their full user object.
    req.user = {
        _id: '60a7c9f1b0e1a9001c8d4a5f', // Replace with a valid user ID from your DB
        role: 'admin', // Replace with the user's actual role (admin, hod, user)
        name: 'Test User',
        email: 'testuser@example.com'
    };
    next();
};

// Comment out the old email configuration
/*
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'divyanshsinghiscool@gmail.com',
    pass: 'edrx rwbw gkzw raky'
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 5 * 60 * 1000,
  greetingTimeout: 5 * 60 * 1000,
  socketTimeout: 5 * 60 * 1000
});
*/

const app = express()
app.use(cors({ 
  origin: '*',  // Allows all origins
  credentials: true }));
app.use(express.json({ limit: '50mb' }));

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/restrict_app")
.then(() => {
  console.log('Connected to MongoDB');
  // Initialize change logging
  setupChangeLogging();
  // Start the server only after successful database connection
  app.listen(3002, () => {
    console.log("Server is running on port 3002");
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Exit the process if database connection fails
});


async function calculateNextAuditDate(frequency_id){

  const frequency = await FrequencyModel.findById(frequency_id);
  
  if (!frequency) {
    console.error(`Frequency with ID ${frequency_id} not found.`);
    return null; // Or throw an error, depending on desired behavior
  }

  const today = new Date();
  const triggerDay = frequency.trigger_days;
  const intervalDays = frequency.interval_days || 30;

  const nextAuditBaseDate = new Date(today);
  let nextAuditDate;

  // 7  = week
  // 30 =  month
  // 90 =  3 months
  // 180 =  6 months

  //Month
  if(intervalDays == "30"){
    nextAuditDate = new Date(nextAuditBaseDate);
      nextAuditDate.setMonth(today.getMonth() + 1);    
      nextAuditDate.setDate(triggerDay);
  }
  else if(intervalDays == "90"){
    nextAuditDate = new Date(nextAuditBaseDate);
    nextAuditDate.setMonth(today.getMonth() + 3);    
      nextAuditDate.setDate(triggerDay);
  }
  else if(intervalDays == "180"){
      nextAuditDate = new Date(nextAuditBaseDate);
      nextAuditDate.setMonth(today.getMonth() + 6);    
      nextAuditDate.setDate(triggerDay);
  }
  else if(intervalDays == "365"){
      nextAuditDate = new Date(nextAuditBaseDate);
      nextAuditDate.setFullYear(today.getFullYear() + 1);
      nextAuditDate.setDate(triggerDay);
  }
  else if (intervalDays == "7") { //Weeek

    nextAuditDate = new Date(nextAuditBaseDate);
    nextAuditDate.setDate(today.getDate() + (7 - today.getDay()));
    
    nextAuditDate.setDate(nextAuditDate.getDate() + (triggerDay));

  } else {
    nextAuditDate = new Date(today);
  }
  return nextAuditDate;
}

app.get("/getNextAuditDate", async (req, res) => {
  const { frequency_id } = req.query; 
  
  res.status(200).json({
    message: await calculateNextAuditDate(frequency_id)
  });
});

app.get("/getApplicationDataForReview", async (req, res) => {
  const { application_id } = req.query; 
  const application = await AppModel.findById(application_id);
  let freq = null; // Initialize freq to null
  if (application && application.frequency_id) {
    freq = await calculateNextAuditDate(application.frequency_id);
  }
  res.status(200).json({
    // message: await calculateNextAuditDate(frequency_id)
    message: (application),
    nextAuditDate: freq
  });
});


app.post("/createApplication", async (req, res) => {
    // Ensure required fields are in the request body
    const { appName, app_rights, frequency_id, adminEmail } = req.body;
  
    // Check if all required fields are provided
    if (!appName  || !app_rights || !adminEmail) {
      return res.status(400).json({
        message: 'Missing required fields: appName, roles, status ,app_rights, or last_audit_date. ',
      });
    }

    // Ensure app_rights is stored as a nested object if it's a simple array
    let formattedAppRights = app_rights;
    if (Array.isArray(app_rights)) {
        formattedAppRights = { 'default': app_rights };
    } else if (app_rights && typeof app_rights === 'object' && !Array.isArray(app_rights)) {
        // If it's already an object, ensure values are arrays or convert them
        Object.keys(app_rights).forEach(key => {
            if (!Array.isArray(app_rights[key])) {
                // Convert non-array values to arrays, or handle as needed
                app_rights[key] = app_rights[key] ? [app_rights[key]] : [];
            }
        });
         formattedAppRights = app_rights; // Use the potentially cleaned-up object
    } else {
        // If app_rights is null, undefined, or unexpected, default to empty object
         formattedAppRights = {};
    }

    let nextAuditDate = await calculateNextAuditDate(frequency_id);

    const newApplication = {
      ...req.body,
      app_rights: formattedAppRights, // Use the formatted app_rights
      status: true,  // Set status to active
      next_audit_date: nextAuditDate,
      last_audit_date: null,
      adminEmail: adminEmail // Save the admin email
    };

    // Create a new App using the request body
    AppModel.create(newApplication)
      .then(async (app) => {

        // Log the creation in ChangeLog
        const changeLogEntry = new ChangeLogModel({
          userId: null, // User ID is null as authentication is removed
          actionType: 'Create',
          documentModel: 'Application',
          documentId: app._id,
        });
        await changeLogEntry.save();
        console.log(`Change logged: Created Application ${app._id} by user unknown`);

        res.status(201).json({
          message: 'App created successfully!',
          app: app,
        });
      })
      .catch((err) => {
        // Handle validation or other errors
        console.error(err);
        res.status(500).json({
          message: 'Error creating the app.',
          error: err.message,
        });
      });
  });


  app.get("/creating", async (req, res) => {
    try {
      const apps = await AppModel.find().sort({ created_at: -1 }).populate("frequency_id");
      // console.log(users);
      // return "";
      res.json(apps);
    } catch (error) {
      res.status(500).json({ message: "Error fetching apps" });
    }
  });

  app.get("/register", async (req, res) => {
    try {
      const users = await UserModel.find();
      // console.log(users);
      // return "";
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching usessrs" });
    }
  });
  

  // HOD
  app.get("/hods", async (req, res) => {
    try {
      // Find all users with the role "hod"
      const hods = await UserModel.find({ role: "hod" }).lean(); // Use .lean() for performance

      // For each HOD, find all employees whose user_id matches the HOD's _id
      const hodsWithEmployees = await Promise.all(hods.map(async (hod) => {
        const employeesUnderHod = await EmployeeModel.find({ user_id: hod._id }).lean(); // Use .lean()
        // Return the HOD data with an added 'employees' array
        return {
          ...hod,
          employees: employeesUnderHod
        };
      }));

      // console.log(hodsWithEmployees);
      res.json(hodsWithEmployees);
    } catch (error) {
      console.error("Error fetching HODs with employees:", error);
      res.status(500).json({ message: "Error fetching HODs with employees" });
    }
  });
  // if (yes == "yes"){
  //   console.log("Hey");
  // }
  // else {
  //   console.log("No");
  // }
  app.post('/submitReview', async (req, res) => {
    const { auditID, remark, rights, reviewer, emp, app, action } = req.body;

    if (!action || !['retain', 'revoke', 'modify'].includes(action)) {
      return res.status(400).json({ message: 'Action (retain/revoke/modify) is required.' });
    }

    // Prevent duplicate submission
    const audit = await AuditModel.findById(auditID).populate('emp_id').populate('user_id').populate('application_id');
    if (!audit) {
      return res.status(404).json({ message: 'Audit not found' });
    }
    if (audit.status === false) {
      return res.status(409).json({ message: 'Review already submitted.' });
    }

    // Update audit as completed
    audit.reviewer_rightsGiven = rights;
    audit.reviewer_reviewAt = new Date();
    audit.reviewer_actionTaken = action;
    audit.reviewer_remarks = remark;
    audit.status = false;
    await audit.save();

    // Persist completed review
    const reviewedRights = audit.reviewer_rightsGiven || audit.excelRightsData || {};
    const branchRights = reviewedRights['Branch Rights'] || reviewedRights['branchRights'] || null;
    const completedReview = new CompletedReview({
      employeeId: audit.emp_id?._id,
      employeeName: audit.emp_id?.name || '',
      menuRights: reviewedRights,
      branchRights: branchRights,
      reviewerRemarks: remark,
      actionTaken: action,
      reviewerName: audit.user_id?.name || '',
      applicationName: audit.application_id?.appName || '',
      submittedAt: new Date()
    });
    await completedReview.save();

    // --- Email Notification Logic ---
    try {
      const adminEmail = audit.application_id?.adminEmail;
      if (adminEmail) {
        const actionText = action === 'revoke' ? 'Revoked' : action === 'modify' ? 'Modified' : 'Retained';
        const subject = `Review ${audit.application_id?.appName || ''} : ${actionText} by ${audit.user_id?.name || ''} for ${audit.emp_id?.name || ''}`;
        // Format rights as HTML
        let rightsHtml = '';
        if (typeof rights === 'object' && rights !== null) {
          rightsHtml = Object.entries(rights)
            .map(([key, value]) => `<div><b>${key}:</b> ${value}</div>`)
            .join('');
        } else {
          rightsHtml = `<div>${rights}</div>`;
        }
        const html = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Review Action Notification</h2>
            <p>Dear Application Admin,</p>

            <b>Application:</b> ${audit.application_id?.appName || ''}
            <p>
              This email is to notify you that <b>${audit.user_id?.name || ''}</b> has reviewed the rights for employee <b>${audit.emp_id?.name || ''}</b> and taken the action: <b>${actionText}</b>.<br>
            </p>
            <h3>Reviewed Rights:</h3>
            ${rightsHtml}
            <h3>Reviewer Remarks:</h3>
            <div>${remark}</div>
            <br>
            <p>Please take necessary action in your application.</p>
            <p>Regards,<br>ER Admin</p>
          </div>
        `;
        // Use the new email service with HTML
        await sendEmail({
          to: adminEmail,
          subject,
          html
        });
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return res.status(200).json({
        message: 'Review submitted and saved, but failed to send email notification.',
        completedReview,
        emailError: emailError.message
      });
    }

    res.json({ message: 'Review submitted, saved, and email notification sent.', completedReview });
  });



    app.post('/register', checkAuth, async (req, res) => {
      const newUser = {
        ...req.body,
        status: true,  // Set status to active
        role: "hod"        // Set role to hod
    };

    UserModel.create(newUser)
    .then(async (register) => {

        // Log the creation in ChangeLog
        const changeLogEntry = new ChangeLogModel({
          userId: null, // User ID is null as authentication is removed
          actionType: 'Create',
          documentModel: 'User', // Model is User for HODs
          documentId: register._id,
        });
        await changeLogEntry.save();
        console.log(`Change logged: Created User (HOD) ${register._id} by user unknown`);

        // Log to applicationlogs with admin and form details
        await ApplicationLog.create({
          changed_by: req.user ? req.user.email : 'unknown',
          oldValue: null,
          newValue: {
            name: newUser.name,
            email: newUser.email,
            password: newUser.password,
            created_by: req.user ? {
              _id: req.user._id,
              name: req.user.name,
              email: req.user.email,
              role: req.user.role
            } : 'unknown',
            created_at: new Date()
          },
          timestamp: new Date()
        });

        res.json(register)
    })
    .catch(err => res.status(500).json({ error: err.message }));

      });


app.post("/login", async (req, res) => {
  
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ email: email });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.password !== password) {
      return res.json({ success: false, message: "Incorrect password"});
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, secretKey, {
      expiresIn: '1h',
    });

    return res.json({ success: true, message: "Login successful", token: token, user: user});
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});



app.post('/frequency', async (req, res) => {
  try {
    const { name, interval_days, trigger_days } = req.body;
    console.log('Received frequency data:', { name, interval_days, trigger_days });

    // Validate required fields
    if (!name || !interval_days || !trigger_days) {
      console.log('Missing fields:', { name: !!name, interval_days: !!interval_days, trigger_days: !!trigger_days });
      return res.status(400).json({ 
        error: 'Missing required fields: name, interval_days, and trigger_days are required' 
      });
    }

    // Validate interval_days is one of the allowed values
    const allowedIntervals = ['7', '30', '90', '180', '365'];
    if (!allowedIntervals.includes(interval_days.toString())) {
      console.log('Invalid interval_days:', interval_days);
      return res.status(400).json({ 
        error: 'Invalid interval_days. Must be one of: 7, 30, 90, 180, 365' 
      });
    }

    // Validate trigger_days is a valid number
    const triggerDay = parseInt(trigger_days);
    if (isNaN(triggerDay) || triggerDay < 1 || triggerDay > 31) {
      console.log('Invalid trigger_days:', trigger_days);
      return res.status(400).json({ 
        error: 'Invalid trigger_days. Must be a number between 1 and 31' 
      });
    }

    // Check if frequency with same name already exists
    const existingFrequency = await FrequencyModel.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existingFrequency) {
      console.log('Frequency with same name exists:', name);
      return res.status(400).json({ 
        error: 'A frequency with this name already exists' 
      });
    }

    // Create new frequency
    const newFrequency = await FrequencyModel.create({
      name,
      interval_days: interval_days.toString(),
      trigger_days: trigger_days.toString()
    });

    // Log the creation in ChangeLog
    const changeLogEntry = new ChangeLogModel({
      userId: null, // User ID is null as authentication is removed
      actionType: 'Create',
      documentModel: 'Frequency',
      documentId: newFrequency._id,
    });
    await changeLogEntry.save();
    console.log(`Change logged: Created Frequency ${newFrequency._id} by user unknown`);

    console.log('Successfully created frequency:', newFrequency);
    res.status(201).json(newFrequency);
  } catch (err) {
    console.error('Error creating frequency:', err);
    res.status(500).json({ 
      error: 'Failed to create frequency. Please try again.',
      details: err.message 
    });
  }
});

app.get("/frequency", async (req, res) => {
  try {
    const frequencies = await FrequencyModel.find(); // Fetch data from the database
    res.json(frequencies); // Return the frequency data as a JSON array
  } catch (error) {
    res.status(500).json({ message: "Error fetching frequency" });
  }
});



app.post('/employee', async (req, res) => {
  console.log('Received employee data:', req.body); // Debug log
  // Ensure a default status of true (Enabled) is set, allow explicit false
  const newEmployeeData = {
    ...req.body,
    status: req.body.status === false ? false : true // Set status to false only if explicitly false, otherwise true
  };
  EmployeeModel.create(newEmployeeData)
    .then(async (employee) => {

        // Log the creation in ChangeLog
        const changeLogEntry = new ChangeLogModel({
          userId: null, // User ID is null as authentication is removed
          actionType: 'Create',
          documentModel: 'Employee',
          documentId: employee._id,
        });
        await changeLogEntry.save();
        console.log(`Change logged: Created Employee ${employee._id} by user unknown`);

        res.json(employee)
    })
    .catch(err => res.status(500).json({ error: err.message })); 
});


app.get("/employee", async (req, res) => {
  try {
    // Fetch all employees regardless of status
    const employees = await EmployeeModel.find().populate('user_id').lean(); // Use .lean() to get plain JS objects for easier modification
    
    // Map through employees to ensure status is true or false for frontend display
    const formattedEmployees = employees.map(employee => {
      let status = employee.status;
      // Ensure status is true if it's not explicitly boolean false
      status = (typeof employee.status === 'boolean' && employee.status === false) ? false : true; // If status is explicitly boolean false in DB, keep false, otherwise true for display
      return { ...employee, status: status };
    });

    res.json(formattedEmployees);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ message: 'Error fetching employee data', error: error.message });
  }
});
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.post("/uploadEmployees", upload.single("file"), async (req, res) => {
  console.log('POST /uploadEmployees route hit');
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log('Excel row keys:', Object.keys(jsonData[0] || {}));

    const errors = [];
    const results = [];

    for (const row of jsonData) {
      try {
        // 1. Process Reviewer (HOD)
        const reviewerEmail = row['Reviewer Email'];
        if (!reviewerEmail) {
          errors.push(`Row ${row.__rowNum__}: 'Reviewer Email' is missing.`);
          continue;
        }

        // Find or create Reviewer (HOD)
        let reviewer = await UserModel.findOne({ email: reviewerEmail });
        if (!reviewer) {
          // Create new reviewer with their own email and name
          reviewer = new UserModel({
            name: row['Reviewer Name'] || reviewerEmail.split('@')[0], // Use Reviewer Name if provided, otherwise use email prefix
            email: reviewerEmail,
            password: reviewerEmail, // Set password same as email
            role: 'hod'
          });
          await reviewer.save();
          console.log(`Created new Reviewer (HOD): ${reviewerEmail}`);
        }

        // 2. Process Employee
        const employeeEmail = row['Emp Email'];
        if (!employeeEmail) {
          errors.push(`Row ${row.__rowNum__}: 'Emp Email' is missing.`);
          continue;
        }

        // Find or create Employee
        let employee = await EmployeeModel.findOne({ email: employeeEmail });
        if (!employee) {
          employee = new EmployeeModel({
            name: row['Emp Name'],
            email: employeeEmail,
            hod: reviewerEmail, // Set HOD email reference
            user_id: reviewer._id, // Set user_id reference to Reviewer (HOD)
            status: true
          });
          await employee.save();
          console.log(`Created new Employee: ${employeeEmail}`);
        } else {
          // Update existing employee's HOD reference and user_id
          employee.hod = reviewerEmail;
          employee.user_id = reviewer._id; // Update user_id reference
          await employee.save();
          console.log(`Updated Employee's HOD reference and user_id: ${employeeEmail}`);
        }

        // 3. Create User Account for HOD if Role includes "Reviewer"
        const role = row['Role'] || '';
        if (role.toLowerCase().includes('reviewer')) {
          // Check if user account already exists
          let userAccount = await UserModel.findOne({ email: employeeEmail });
          if (!userAccount) {
            userAccount = new UserModel({
              name: row['Emp Name'], // Use employee's name for their user account
              email: employeeEmail,
              password: employeeEmail, // Set password same as email
              role: 'hod'
            });
            await userAccount.save();
            console.log(`Created new User account for HOD: ${employeeEmail}`);
          }
        }

        // Log the changes
        const changeLogEntry = new ChangeLogModel({
          userId: null,
          actionType: employee.isNew ? 'Create' : 'Update',
          documentModel: 'Employee',
          documentId: employee._id,
        });
        await changeLogEntry.save();

        results.push({
          employee: employee,
          reviewer: reviewer
        });

      } catch (innerError) {
        errors.push(`Row ${row.__rowNum__}: ${innerError.message}`);
        console.error(`Error processing row ${row.__rowNum__}:`, innerError);
      }
    }

    console.log('Employee upload processing complete. Errors:', errors);

    if (errors.length > 0) {
      res.status(200).json({ 
        message: 'Employee upload completed with some errors.', 
        errors: errors, 
        processedCount: results.length 
      });
    } else {
      res.status(200).json({ 
        message: 'Employee data uploaded successfully.', 
        results: results 
      });
    }

  } catch (error) {
    console.error('Error during employee upload:', error);
    res.status(500).send('Error processing file.');
  }
});


// API Endpoint to Upload HODs
app.post("/uploadHods", upload.single("file"), async (req, res) => {
  try {
    console.log("Received HOD upload request."); // Debug log
    if (!req.file) {
      console.log("No file uploaded."); // Debug log
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Read the file from buffer
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log("Parsed Excel data:", data); // Debug log: show the parsed data

    const createdHods = [];

    for (const row of data) {
        try {
    // Convert sheet data to match schema
            const newHodData = {
      name: row.Name, // Use the 'Name' column
      email: row.Email, // Use the 'Email' column
      password: row.Password, // Use the 'Password' column
      role: "hod", // Assigning "hod" role (lowercase)
            };

            // Create HOD in MongoDB
            const createdHod = await UserModel.create(newHodData);
            createdHods.push(createdHod);

            // Log the creation in ChangeLog
            const changeLogEntry = new ChangeLogModel({
              userId: null, // User ID is null as authentication is removed
              actionType: 'Create',
              documentModel: 'User', // Model is User for HODs
              documentId: createdHod._id,
            });
            await changeLogEntry.save();
            console.log(`Change logged: Created User (HOD) ${createdHod._id} via HOD Upload by user unknown`);

        } catch (error) {
            console.error(`Error processing HOD upload row: ${JSON.stringify(row)}`, error);
            // Decide how to handle errors - either push to an errors array or stop
            // For now, we'll just log and continue with the next row.
        }
    }

    console.log("HODs processed."); // Debug log

    if (createdHods.length > 0) {
        res.status(200).json({ message: "HODs uploaded successfully", createdCount: createdHods.length });
    } else {
        res.status(400).json({ message: "No HODs were successfully uploaded. Check server logs for details." });
    }

  } catch (error) {
    console.error("Upload HODs Error:", error); // Debug log: log the full error object
    res.status(500).json({ message: "Error uploading HODs", error: error.message }); // Include error message in response
  }
});


app.post('/audit', async (req, res) => {
  
  const {application_id} = req.body;
  const frequency = await AppModel.findById(application_id).select('frequency_id'); // Populate the user_id field

  const newReview = {
    ...req.body,
    status: true,        // Set status to true for new manual audits
    audit_date: await calculateNextAuditDate(frequency.frequency_id),
    frequency_id:frequency.frequency_id
  };

  console.log('Saving manual audit with data:', newReview); // Add this log for manual creation route
  const audit = await AuditModel.create(newReview)
  .then(audit => res.json(audit)) 
  .catch(err => res.status(500).json({ error: err.message })); 
});

app.get("/pendingAudits", async (req, res) => {
  try {
    const todayStart = moment().startOf("day").toDate(); // Get today's start time (00:00:00)
    const todayEnd = moment().endOf("day").toDate(); // Get today's end time (23:59:59)

    // Fetch audits and use .lean() to get plain JavaScript objects
    const audits = await AuditModel.find({
      status: true,         // Ensure status is true
      reviewer_rightsGiven: null, // Ensure reviewer_rightsGiven is null
      audit_date: { $gte: todayStart, $lt: todayEnd } // Re-add date filtering
    })  
    .populate("frequency_id", "name") 
    .populate("application_id", "appName app_rights") 
    .populate("emp_id", "name") 
 
    res.json(audits);
    return;
    // Transform the app_rights array into an object with each right set to false
    const transformedAudits = audits.map(audit => {
      if (audit.application_id && audit.application_id.app_rights) {
        // Convert the app_rights array into an object with all rights set to false
        const appRights = audit.application_id.app_rights.reduce((acc, right) => {
          acc[right] = false;
          return acc;
        }, {});
        audit.application_id.app_rights = appRights; // Replace the array with the transformed object
      }
      return audit;
    });

    res.json(transformedAudits); // Send the transformed audits as a JSON response
    
  } catch (error) {
    console.error("Error fetching audits:", error);
    res.status(500).json({ message: "Error fetching audits" + error });
  }
});

app.get("/pastAudits", async (req, res) => {
  try {
    const { user, application } = req.query;
    let filter = { status: true }; // Only fetch pending reviews

    // Debug: Log application filter value
    console.log('Application filter value:', application);

    // Only apply application filter if not 'All' and is a valid string
    if (application && application !== 'All') {
      try {
        // Try to convert to ObjectId if possible
        filter.application_id = mongoose.Types.ObjectId(application);
        console.log('Filtering with ObjectId for application:', filter.application_id);
      } catch (e) {
        // Fallback: use as string if not a valid ObjectId
        filter.application_id = application;
        console.log('Filtering with string for application:', filter.application_id);
      }
    }
    // Debug: Log final filter object
    console.log('Final filter object:', filter);

    // Fetch audits and use .lean() to get plain JavaScript objects
    const audits = await AuditModel.find(filter)
      .sort({ reviewer_reviewAt: -1 })
      .populate({
        path: 'application_id',
        match: { status: true },
        select: 'appName app_rights adminEmail'
      })
      .populate({
        path: 'emp_id',
        select: 'name email status'
      })
      .populate({
        path: 'user_id',
        select: 'name email'
      });

    // Filter out audits where application_id population failed (due to status: false match)
    const filteredAudits = audits.filter(audit => audit.application_id !== null);
    console.log('Audits data before sending to frontend:', filteredAudits); // Add logging
    res.json(filteredAudits);
    
  } catch (error) {
    console.error("Error fetching audits:", error);
    res.status(500).json({ message: "Error fetching audits" + error });
  }
});




app.post('/excelUpload', async (req, res) => {
  const data = req.body;
  let errorArr = [];
  let processedEmployees = [];
  let reviewerEmail = null;

  try {
    for (const row of data) {
      try {
        // Extract required fields
        const applicationName = row['Application'];
        const employeeEmail = row['Email ID'];
        const hodEmail = row['HOD'];
        reviewerEmail = hodEmail; // For summary email later

        if (!applicationName || !employeeEmail || !hodEmail) {
          errorArr.push({ error: `Missing required fields in row: ${JSON.stringify(row)}` });
          continue;
        }

        // Find application
        const app = await AppModel.findOne({ appName: applicationName });
        if (!app) {
          errorArr.push({ error: `Application not found: ${applicationName}` });
          continue;
        }

        // Find employee
        const employee = await EmployeeModel.findOne({ email: employeeEmail });
        if (!employee) {
          errorArr.push({ error: `Employee not found: ${employeeEmail}` });
          continue;
        }

        // Find reviewer (HOD)
        const reviewer = await UserModel.findOne({ email: hodEmail });
        if (!reviewer) {
          errorArr.push({ error: `Reviewer (HOD) not found: ${hodEmail}` });
          continue;
        }

        // Dynamically collect all rights data from the Excel row
        const rightsData = {};
        for (const key in row) {
          // Skip non-rights columns
          if (['Application', 'Email ID', 'HOD', 'Emp Name'].includes(key)) {
            continue;
          }
          // Store the right value if it exists
          if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            rightsData[key] = row[key];
          }
        }

        // Create audit
        const audit = new AuditModel({
          emp_id: employee._id,
          user_id: reviewer._id,
          application_id: app._id,
          excelRightsData: rightsData,
          status: true,
          audit_date: await calculateNextAuditDate(app.frequency_id),
          frequency_id: app.frequency_id
        });
        await audit.save();
        processedEmployees.push({ employee: employeeEmail, reviewer: hodEmail, application: applicationName });
      } catch (rowError) {
        errorArr.push({ error: rowError.message });
      }
    }

    // After processing all rows, send email to reviewer (if any audits were created)
    if (reviewerEmail && processedEmployees.length > 0) {
      try {
        const subject = 'Entitlement Review Notification';
        const html = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Entitlement Review Required</h2>
            <p>Dear Reviewer,</p>
            <p>New employee data has been uploaded and requires your review. Please log in to the system to review the entitlements.</p>
            <p>Number of employees to review: ${processedEmployees.length}</p>
            <p>Best regards,<br>ER Admin</p>
          </div>
        `;
        await sendEmail({ to: reviewerEmail, subject, html });
      } catch (emailError) {
        errorArr.push({ error: 'Failed to send email: ' + emailError.message });
      }
    }

    res.json({
      message: 'Excel file processed successfully',
      processedEmployees,
      errors: errorArr
    });
  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({
      message: 'Error processing Excel file',
      error: error.message
    });
  }
});

app.put('/employee/:id', checkAuth, async (req, res) => {
  try {
    console.log('PUT /employee/:id route hit');
    console.log('req.user:', req.user);
    const employeeId = req.params.id;
    const updateData = req.body;

    // Use findOneAndUpdate to trigger the logging middleware
    const updatedEmployee = await EmployeeModel.findOneAndUpdate(
      { _id: employeeId },
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        userInfo: req.user // Pass user info to the middleware
      }
    );

    if (!updatedEmployee) {
      return res.status(404).send('Employee not found');
    }

    res.json(updatedEmployee);
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/apps/:id', checkAuth, async (req, res) => {
  console.log('PUT /apps/:id route hit');
  console.log('req.user:', req.user);
  try {
    const appId = req.params.id;
    const updateData = req.body;

    // Use findOneAndUpdate to trigger the logging middleware
    const updatedApp = await AppModel.findOneAndUpdate(
      { _id: appId },
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        userInfo: req.user // Pass user info to the middleware
      }
    );

    if (!updatedApp) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Repopulate frequency_id for the response if needed (optional depending on frontend needs)
    await updatedApp.populate('frequency_id');

    res.json(updatedApp);
  } catch (err) {
    console.error('Error updating application:', err);
    res.status(500).json({ message: 'Failed to update application', error: err.message });
  }
});

app.delete('/apps/:id', async (req, res) => {
  try {
    const appId = req.params.id;

    // Find the application by ID and delete it
    const deletedApp = await AppModel.findByIdAndDelete(appId);

    if (!deletedApp) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Log the deletion in ChangeLog
    const changeLogEntry = new ChangeLogModel({
      userId: null, // User ID is null as authentication is removed
      actionType: 'Delete',
      documentModel: 'Application',
      documentId: deletedApp._id,
    });
    await changeLogEntry.save();
    console.log(`Change logged: Deleted Application ${deletedApp._id} by user unknown`);

    res.json({ message: 'Application deleted successfully', deletedApp });
  } catch (err) {
    console.error('Error deleting application:', err);
    res.status(500).json({ message: 'Failed to delete application', error: err.message });
  }
});

app.put('/hods/:id', async (req, res) => {
  try {
    const hodId = req.params.id;
    const updateData = req.body;

    // Find the HOD by ID
    const existingHod = await UserModel.findById(hodId);
    if (!existingHod) {
       return res.status(404).json({ message: 'HOD/Reviewer not found' });
    }

    // Capture old data before update
    const oldHodData = existingHod.toObject();

    // Find the HOD by ID and update it with the new data
    // Assuming HODs are stored in the UserModel collection
    const updatedHod = await UserModel.findByIdAndUpdate(
      hodId,
      updateData,
      { new: true }
    )

    // Log the update in ChangeLog
    const changeLogEntry = new ChangeLogModel({
      userId: null, // User ID is null as authentication is removed
      actionType: 'Update',
      documentModel: 'User', // Model is User for HODs
      documentId: updatedHod._id,
      // Optionally, add details about what changed:
      // details: { oldData: oldHodData, newData: updatedHod.toObject() }
    });
    await changeLogEntry.save();
    console.log(`Change logged: Updated User (HOD) ${updatedHod._id} by user unknown`);

    // Although we don't populate employees in the update response,
    // the frontend's initial fetch of hods will have populated employees
    // and the update will correctly modify the employee IDs array in the database.
    res.json(updatedHod);
  } catch (err) {
    console.error('Error updating HOD/Reviewer:', err);
    res.status(500).json({ message: 'Failed to update HOD/Reviewer', error: err.message });
  }
});

// Add PUT route to update frequency by ID
app.put('/frequency/:id', checkAuth, async (req, res) => {
  try {
    console.log('PUT /frequency/:id route hit');
    console.log('req.user:', req.user);
    const frequencyId = req.params.id;
    const updateData = req.body;

    // Use findOneAndUpdate instead of save
    const updatedFrequency = await FrequencyModel.findOneAndUpdate(
      { _id: frequencyId },
      { 
        $set: {
          ...updateData,
          updated_at: new Date()
        }
      },
      { 
        new: true,
        runValidators: true,
        userInfo: req.user // Pass user info to the middleware
      }
    );

    if (!updatedFrequency) {
      return res.status(404).json({ message: 'Frequency not found' });
    }

    res.json(updatedFrequency);
  } catch (err) {
    console.error('Error updating frequency:', err);
    res.status(500).json({ message: 'Failed to update frequency', error: err.message });
  }
});

// Add DELETE route to delete frequency by ID
app.delete('/frequency/:id', async (req, res) => {
  try {
    const frequencyId = req.params.id;

    // Find the frequency by ID and delete it
    const deletedFrequency = await FrequencyModel.findByIdAndDelete(frequencyId);

    if (!deletedFrequency) {
      return res.status(404).json({ message: 'Frequency not found' });
    }

    // Log the deletion in ChangeLog
    const changeLogEntry = new ChangeLogModel({
      userId: null, // User ID is null as authentication is removed
      actionType: 'Delete',
      documentModel: 'Frequency',
      documentId: deletedFrequency._id,
    });
    await changeLogEntry.save();
    console.log(`Change logged: Deleted Frequency ${deletedFrequency._id} by user unknown`);

    res.json({ message: 'Frequency deleted successfully', deletedFrequency });
  } catch (err) {
    console.error('Error deleting frequency:', err);
    res.status(500).json({ message: 'Failed to delete frequency', error: err.message });
  }
});

// Add PUT route to update application status (Enable/Disable)
app.put('/apps/:id/status', async (req, res) => {
  try {
    const appId = req.params.id;
    const { status } = req.body; // Expecting a boolean status in the request body

    // Validate status is a boolean
    if (typeof status !== 'boolean') {
      return res.status(400).json({ message: 'Invalid status value. Status must be a boolean.' });
    }

    // Find the application by ID and update its status
    const updatedApp = await AppModel.findByIdAndUpdate(
      appId,
      { status: status }, // Update only the status field
      { new: true } // Return the updated document
    );

    if (!updatedApp) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Determine action type for ChangeLog
    const actionType = status ? 'Enable' : 'Disable';

    // Log the status change in ChangeLog
    const changeLogEntry = new ChangeLogModel({
      userId: null, // User ID is null as authentication is removed
      actionType: actionType,
      documentModel: 'Application',
      documentId: updatedApp._id,
      details: { status: status }, // Log the new status
    });
    await changeLogEntry.save();
    console.log(`Change logged: ${actionType} Application ${updatedApp._id} by user unknown`);

    res.json({ message: `Application ${actionType}d successfully`, updatedApp });

  } catch (err) {
    console.error(`Error updating application status:`, err);
    res.status(500).json({ message: 'Failed to update application status', error: err.message });
  }
});

app.post('/updateAuditRights', async (req, res) => {
  try {
    const { auditId, rights } = req.body;

    // Find the audit by ID and update the excelRightsData field
    const updatedAudit = await AuditModel.findByIdAndUpdate(
      auditId,
      { excelRightsData: rights },
      { new: true } // Return the updated document
    );

    if (!updatedAudit) {
      return res.status(404).json({ message: 'Audit not found' });
    }

    res.json({ success: true, message: 'Audit rights updated successfully', audit: updatedAudit });
  } catch (error) {
    console.error('Error updating audit rights:', error);
    res.status(500).json({ success: false, message: 'Failed to update audit rights', error: error.message });
  }
});

// Add this error handling middleware towards the end of your file, but BEFORE any other error handlers you might have.
// It should be placed after all your routes are defined.

app.use((err, req, res, next) => {
  console.error('General Backend Error:', err);
  if (!res.headersSent) { // Check if response headers have already been sent
    res.status(500).json({
      message: 'An unexpected error occurred on the server.',
      error: err.message
    });
  }
});

app.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;

    // Find the user by ID
    const user = await UserModel.findById(userId);

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify the old password
    if (user.password !== oldPassword) {
      return res.status(400).json({ message: 'Invalid old password' });
    }

    // Update the password
    user.password = newPassword;
    await user.save();

    // Log the password change in ChangeLog
    const changeLogEntry = new ChangeLogModel({
      userId: user._id, // Log the user who changed their password
      actionType: 'Update', // Use 'Update' as the action type
      documentModel: 'User',
      documentId: user._id,
    });
    await changeLogEntry.save();
    console.log(`Change logged: User ${user._id} changed their password`);

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
});

app.post('/create-admin', async (req, res) => {
  try {
    // Basic authentication check (assuming user info is available in req.user from middleware)
    // You would typically have a more robust authentication and authorization middleware here
    // if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ message: 'Unauthorized: Only admins can create new admins' });
    // }

    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields (name, email, password)' });
    }

    // Check if user with the same email already exists
    const existingUser = await UserModel.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const newAdmin = new UserModel({
      name,
      email,
      password, // In a real application, you should hash the password
      role: 'admin', // Explicitly set the role to admin
      status: true, // Admins are active by default
      company_name: '' // Or set a default company name if applicable
    });

    await newAdmin.save();

    // Log the creation in ChangeLog
    const changeLogEntry = new ChangeLogModel({
      userId: null, // Or req.user._id if authentication middleware is used
      actionType: 'Create', // Use the 'Create' action type
      documentModel: 'User', // The model is User
      documentId: newAdmin._id,
    });
    await changeLogEntry.save();
    console.log(`Change logged: Created new Admin user ${newAdmin._id}`);

    res.status(201).json({ message: 'Admin user created successfully', user: newAdmin });

  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ message: 'Failed to create admin user', error: error.message });
  }
});

app.post('/sendReviewNotification', async (req, res) => {
  const { auditId, selectedAction, remark, employeeName, adminEmail, rightsDetails, reviewerName } = req.body;

  try {
    // Use the selected action text in the subject and body
    const actionText = selectedAction === 'revoke' ? 'Revoked' : 'Retained';
    const subject = `Review Action: ${actionText} by ${reviewerName} for ${employeeName}`;
    const body = `Dear Application Admin,\n\nThis email is to notify you that ${reviewerName} has reviewed the rights for employee ${employeeName} and taken the action: ${actionText}.\n\nThe reviewed rights were:\n${rightsDetails}\n\nReviewer Remarks:\n${remark}\n\nPlease take necessary action in your application.\n\nRegards,\nER Admin `;

    const mailOptions = {
      from: 'divyanshsinghiscool@gmail.com', // Sender address
      to: adminEmail, // Receiver address (Application Admin)
      subject: subject, // Subject line
      text: body, // Plain text body
      // html: '<b>Hello world?</b>' // html body
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, message: 'Failed to send email notification.' });
      } else {
        console.log('Email sent:', info.response);
        res.json({ success: true, message: 'Review action recorded and email notification sent.' });
      }
    });

  } catch (error) {
    console.error('Error processing review notification:', error);
    res.status(500).json({ success: false, message: 'Failed to process review notification.' });
  }
});

// API endpoint to get application logs
app.get("/appLogs", async (req, res) => {
    try {
        const {
            documentId,
            documentType,
            action,
            userRole,
            startDate,
            endDate,
            page = 1,
            limit = 10
        } = req.query;

        // Build query
        const query = {};
        if (documentId) query.documentId = documentId;
        if (documentType) query.documentType = documentType;
        if (action) query.action = action;
        if (userRole) query.userRole = userRole;
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Get logs with pagination
        const logs = await AppLogs.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('updatedBy', 'name email role');

        // Get total count for pagination
        const total = await AppLogs.countDocuments(query);

        res.json({
            logs,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching app logs:', error);
        res.status(500).json({ message: "Error fetching application logs" });
    }
});

app.get('/completedReviews', checkAuth, async (req, res) => {
  try {
    // Use req.user if available, fallback to req.userData
    const userId = req.user?._id || req.user?.userId || req.userData?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    let reviews;
    if (user.role === 'admin') {
      // Admin sees all
      reviews = await CompletedReview.find().sort({ submittedAt: -1 });
    } else if (user.role === 'hod') {
      // HOD/Reviewer: only see reviews for their employees
      const employees = await EmployeeModel.find({ user_id: user._id });
      const employeeIds = employees.map(e => e._id);
      reviews = await CompletedReview.find({ employeeId: { $in: employeeIds } }).sort({ submittedAt: -1 });
    } else {
      reviews = [];
    }
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch completed reviews', error: err.message });
  }
});
