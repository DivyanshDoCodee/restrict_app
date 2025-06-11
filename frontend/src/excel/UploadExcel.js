import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

function UploadExcel() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [report, setReport] = useState([]);
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [applications, setApplications] = useState([]);
    const [selectedApplication, setSelectedApplication] = useState('');
    const [selectedApplicationName, setSelectedApplicationName] = useState('');
    const [selectedApplicationRights, setSelectedApplicationRights] = useState([]);

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const response = await axios.get('http://localhost:3002/creating');
                setApplications(response.data);
            } catch (error) {
                console.error('Error fetching applications:', error);
                setMessage('Failed to load applications.');
            }
        };

        fetchApplications();
    }, []);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSelectedFile(file);
        setMessage("");
        setReport([]);

        const reader = new FileReader();

        reader.onload = (evt) => {
            const binaryString = evt.target.result;
            const wb = XLSX.read(binaryString, { type: 'binary' });

            // Get the first sheet data
            const ws = wb.Sheets[wb.SheetNames[0]];
            if (!ws) {
                setMessage(`Sheet not found in the Excel file.`);
                setPreviewData([]);
                return;
            }
            const data = XLSX.utils.sheet_to_json(ws);
            setPreviewData(data);

            // No longer sending data to backend immediately
            // sendJsonToBackend(data);
        };

        reader.readAsBinaryString(file);
    };

    const handleApplicationChange = async (e) => {
        const applicationId = e.target.value;
        setSelectedApplication(applicationId);

        // Fetch application data when an application is selected
        if (applicationId) {
            try {
                const response = await axios.get(`http://localhost:3002/getApplicationDataForReview`, {
                    params: { application_id: applicationId }
                });
                // Assuming the response data structure is response.data.message contains application details
                const appData = response.data.message; // Assuming appData contains appName and app_rights
                setSelectedApplicationName(appData?.appName || '');

                // Flatten app_rights into a simple array of strings
                const rights = [];
                if (appData?.app_rights) {
                    // Assuming app_rights can be an array of strings or an object with string values
                    if (Array.isArray(appData.app_rights)) {
                        rights.push(...appData.app_rights.map(right => String(right).trim()));
                    } else if (typeof appData.app_rights === 'object') {
                        // If it's an object, iterate through its values
                        Object.values(appData.app_rights).forEach(value => {
                            if (Array.isArray(value)) {
                                rights.push(...value.map(right => String(right).trim()));
                            } else if (typeof value === 'string') {
                                rights.push(value.trim());
                            }
                        });
                    }
                }
                const uniqueRights = [...new Set(rights.filter(right => right !== ''))]; // Remove duplicates and empty strings
                setSelectedApplicationRights(uniqueRights);

                setMessage(''); // Clear any previous messages
            } catch (error) {
                console.error('Error fetching application data:', error);
                setMessage('Failed to fetch application data.');
                setSelectedApplicationName('');
                setSelectedApplicationRights([]);
            }
        } else {
            setSelectedApplicationName('');
            setSelectedApplicationRights([]);
            setMessage('');
        }
    };

    const handleDownloadTemplate = () => {
        console.log("Download template logic not implemented yet");
        const standardHeaders = ['Emp Name', 'Email ID', 'HOD', 'Application'];
        const appRightsHeaders = Array.isArray(selectedApplicationRights) ? selectedApplicationRights : [];
        const headers = [...standardHeaders, ...appRightsHeaders];

        // Create data rows with pre-filled application name
        const numExampleRows = 1; // You can adjust this number
        const dataRows = [];
        for (let i = 0; i < numExampleRows; i++) {
            const row = new Array(headers.length).fill('');
            // Find the index of the 'Application' header
            const applicationIndex = headers.indexOf('Application');
            if (applicationIndex !== -1) {
                row[applicationIndex] = selectedApplicationName; // Pre-fill application name
            }
            dataRows.push(row);
        }

        // Create a workbook and a worksheet
        const wb = XLSX.utils.book_new();
        // Combine headers and data rows
        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(wb, ws, "Template");

        // Generate the Excel file and trigger download
        XLSX.writeFile(wb, `${selectedApplicationName}_Template.xlsx`);
    };

    const handleUploadClick = async () => {
        if (previewData.length === 0) {
            setMessage("No data to upload. Please select a file first.");
            return;
        }

        if (!selectedApplication) {
            setMessage("Please select an application before uploading.");
            return;
        }

        setIsLoading(true);
        setMessage("");
        setReport([]);

        try {
            // Get all unique column headers from the Excel data (excluding standard columns)
            const standardColumns = ['Emp Name', 'Email ID', 'HOD', 'Application'];
            const excelHeaders = Object.keys(previewData[0] || {}).filter(header => !standardColumns.includes(header));

            // Process the data
            const response = await axios.post('http://localhost:3002/excelUpload', previewData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.data.errors && response.data.errors.length > 0) {
                setMessage(`Upload completed with ${response.data.errors.length} errors.`);
                setReport(response.data.errors);
            } else {
                setMessage("Upload completed successfully!");
                setReport(response.data.processedEmployees || []);
            }
        } catch (error) {
            console.error('Upload error:', error);
            setMessage(error.response?.data?.message || "Error uploading file. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="app">
            <Navbar />
            <div className="content-wrapper">
                <Sidebar />
                <div className="dashboard-container">
                    <div className="container mt-5">
                        <h2>Upload Excel For Reviews</h2>
                        <div className="mb-3">
                            <label htmlFor="applicationSelect" className="form-label">Select Application:</label>
                            <select 
                                id="applicationSelect"
                                className="form-select"
                                value={selectedApplication}
                                onChange={handleApplicationChange}
                                required
                            >
                                <option value="">--Select Application--</option>
                                {applications.map((app) => (
                                    <option key={app._id} value={app._id}>
                                        {app.appName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-3">
                            <label htmlFor="excelFile" className="form-label">Upload Excel File:</label>
                            <input 
                                id="excelFile"
                                type="file" 
                                accept=".xlsx, .xls" 
                                onChange={handleFileUpload} 
                                className="form-control"
                            />
                        </div>

                        {selectedApplicationName && (
                            <div className="mb-3">
                                <button 
                                    className="btn btn-secondary"
                                    onClick={handleDownloadTemplate}
                                >
                                    Download Template
                                </button>
                            </div>
                        )}

                        {message && <p className="alert alert-info">{message}</p>}

                        {previewData.length > 0 && (
                            <div className="table-responsive mt-4">
                                                                <button 
                                    onClick={handleUploadClick} 
                                    className="btn btn-primary mt-3" 
                                    disabled={isLoading || previewData.length === 0}
                                >
                                    {isLoading ? 'Uploading...' : 'Upload to Database'}
                                </button>
                                <h4>Preview Data ({previewData.length} rows):</h4>
                                <table className="table table-bordered table-striped">
                                    <thead className="table-dark">
                                        <tr>
                                            {/* Dynamically generate table headers from previewData keys */}
                                            {Object.keys(previewData[0] || {}).map(key => (
                                                <th key={key}>{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Dynamically generate table rows and cells */}
                                        {previewData.map((item, rowIndex) => (
                                            <tr key={rowIndex}> {/* Using rowIndex as key is okay for simple previews */}
                                                {Object.keys(item).map(key => (
                                                    <td key={key}>{item[key] || "N/A"}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                            </div>
                        )}

                        {report && (
                        <div className="container mt-4">
                        <h3>Upload Report:</h3>
                        {report.succesData?.length > 0 && (
                            <div>
                                <h4>Successfuly Created Following Entries:</h4>
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped">
                                        <thead className="table-dark">
                                            <tr>
                                                <th>Employee Name</th>
                                                <th>Employee Email</th>
                                                <th>Application</th>
                                                <th>Initial Rights</th>
                                                <th>Audit Date</th>
                                                <th>HOD</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.succesData.map((item) => (
                                                <tr key={item._id}>
                                                    <td>{item.emp_id?.name || "N/A"}</td>
                                                    <td>{item.emp_id?.email || "N/A"}</td>
                                                    <td>{item.application_id?.appName || "N/A"}</td>
                                                    <td>{item.initialRights || "N/A"}</td>
                                                    <td>{item.audit_date ? new Date(item.audit_date).toLocaleDateString() : 'N/A'}</td>
                                                    <td>{item.hod || "N/A"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        
                        {report.errors?.length > 0 && (
                            <div className="mt-4">
                                <h4>Issues Reported While Importing:</h4>
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped">
                                        <thead className="table-dark">
                                            <tr>
                                                <th>Row Index</th>
                                                <th>Issue Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.errors.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{item.row || "N/A"}</td>
                                                    <td>{item.Error || "N/A"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    )}

                    </div>
                </div>
            </div>
        </div>
    );
}

export default UploadExcel;
