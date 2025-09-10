# 🚀 Frontend API Integration Guide

## Terraform Generation API Documentation

This guide provides complete instructions for integrating the Terraform generation API into your frontend application.

---

## 📡 **API Endpoint**

**Base URL**: `http://localhost:5000` (development)  
**Endpoint**: `POST /api/generate-terraform`  
**Content-Type**: `application/json`

---

## 📥 **Request Format**

### **TypeScript Interface**

```typescript
interface TerraformAPIRequest {
  architectureData: {
    metadata: {
      name: string;                    // Architecture name
      description?: string;            // Optional description
      version: string;                 // Version (e.g., "1.0.0")
      createdAt: string;              // ISO date string
      lastModified: string;           // ISO date string
      provider: "aws" | "azure" | "gcp"; // Cloud provider
    };
    nodes: Array<{
      id: string;                     // Unique node identifier
      nodeType: "awsContainer" | "awsService"; // Node type
      resourceType: string;           // e.g., "aws-vpc", "aws-ec2"
      name: string;                   // Display name
      position: {
        x: number;
        y: number;
      };
      dimensions?: {                  // Optional
        width: number;
        height: number;
      };
      configuration: Record<string, any>; // Resource configuration
      parentId?: string;              // Optional parent reference
    }>;
    connections: Array<{              // Can be empty array
      id: string;
      source: string;
      target: string;
      type?: string;
    }>;
    variables?: Record<string, any>;  // Optional
    outputs?: Record<string, any>;   // Optional
  };
  projectName: string;                // Output directory name
}
```

### **Example Request**

```json
{
  "architectureData": {
    "metadata": {
      "name": "My Web Application",
      "description": "Simple web app infrastructure",
      "version": "1.0.0",
      "createdAt": "2025-09-10T18:00:00.000Z",
      "lastModified": "2025-09-10T18:00:00.000Z",
      "provider": "aws"
    },
    "nodes": [
      {
        "id": "vpc-main",
        "nodeType": "awsContainer",
        "resourceType": "aws-vpc",
        "name": "Main VPC",
        "position": { "x": 100, "y": 100 },
        "configuration": {
          "cidrBlock": "10.0.0.0/16",
          "enableDnsSupport": true,
          "enableDnsHostnames": true,
          "tags": {
            "Environment": "Production"
          }
        }
      },
      {
        "id": "subnet-public",
        "nodeType": "awsContainer",
        "resourceType": "aws-public-subnet",
        "name": "Public Subnet",
        "position": { "x": 150, "y": 150 },
        "configuration": {
          "cidrBlock": "10.0.1.0/24",
          "awsAvailabilityZone": "us-east-1a",
          "mapPublicIpOnLaunch": true,
          "tags": {
            "Type": "Public"
          }
        },
        "parentId": "vpc-main"
      },
      {
        "id": "ec2-web",
        "nodeType": "awsService",
        "resourceType": "aws-ec2",
        "name": "Web Server",
        "position": { "x": 200, "y": 200 },
        "configuration": {
          "instanceType": "t3.micro",
          "amiId": "ami-0c55b159cbfafe1d0",
          "subnetId": "subnet-public",
          "associatePublicIpAddress": true,
          "tags": {
            "Name": "Web Server",
            "Role": "WebServer"
          }
        },
        "parentId": "subnet-public"
      }
    ],
    "connections": [],
    "variables": {},
    "outputs": {}
  },
  "projectName": "my-web-app"
}
```

---

## 📤 **Response Format**

### **Success Response**

```typescript
interface SuccessResponse {
  success: true;
  data: {
    terraformConfiguration: {
      mainTf: string;              // main.tf file content
      variablesTf: string;         // variables.tf file content
      outputsTf: string;           // outputs.tf file content
      terraformTfvars: string;     // terraform.tfvars file content
      providersVersionsTf: string; // providers.tf file content
    };
    savedFiles: {
      projectDir: string;          // Output directory path
      files: string[];             // Generated file names
    };
    validation: {
      valid: boolean;
      errors: string[];
    };
    architectureValidation: {
      valid: boolean;
      errors: string[];
      warnings: Array<{
        type: string;
        message: string;
      }>;
    };
    moduleMapping: {
      modulesGenerated: number;
      dependencies: number;
      warnings: string[];
    };
    projectName: string;
    formatUsed: "frontend" | "legacy";
  };
  message: string;
  timestamp: string;
}
```

### **Error Response**

```typescript
interface ErrorResponse {
  success: false;
  error: string;                   // Main error message
  details?: string;                // Additional error details
  timestamp: string;               // ISO date string
}
```

---

## 🌐 **Frontend Implementation Examples**

### **1. Simple Fetch Implementation**

```typescript
async function generateTerraform(
  architectureData: any, 
  projectName: string
): Promise<{success: boolean, message: string}> {
  try {
    const response = await fetch('http://localhost:5000/api/generate-terraform', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        architectureData,
        projectName
      })
    });

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        message: `✅ Terraform configuration generated successfully! Files saved to: ${result.data.savedFiles.projectDir}`
      };
    } else {
      return {
        success: false,
        message: `❌ Generation failed: ${result.error}${result.details ? ` - ${result.details}` : ''}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `🚨 API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Usage
const result = await generateTerraform(yourArchitectureData, "my-project");
if (result.success) {
  showSuccessMessage(result.message);
} else {
  showErrorMessage(result.message);
}
```

### **2. Axios Implementation**

```typescript
import axios from 'axios';

async function generateTerraform(architectureData: any, projectName: string) {
  try {
    const response = await axios.post('http://localhost:5000/api/generate-terraform', {
      architectureData,
      projectName
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      return {
        success: true,
        message: '✅ Terraform generated successfully!',
        data: response.data.data
      };
    } else {
      throw new Error(response.data.error);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        message: `❌ ${error.response?.data?.error || error.message}`,
        data: null
      };
    } else {
      return {
        success: false,
        message: `🚨 Unexpected error: ${error}`,
        data: null
      };
    }
  }
}
```

### **3. React Hook**

```typescript
import { useState, useCallback } from 'react';

interface TerraformResult {
  success: boolean;
  message: string;
  data?: any;
}

export function useTerraformGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<TerraformResult | null>(null);

  const generateTerraform = useCallback(async (
    architectureData: any, 
    projectName: string
  ): Promise<TerraformResult> => {
    setIsGenerating(true);
    setResult(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/generate-terraform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architectureData, projectName })
      });

      const data = await response.json();
      
      const result: TerraformResult = {
        success: data.success,
        message: data.success 
          ? '✅ Terraform generated successfully!' 
          : `❌ ${data.error}`,
        data: data.success ? data.data : null
      };

      setResult(result);
      return result;
    } catch (error) {
      const result: TerraformResult = {
        success: false,
        message: `🚨 Failed to generate Terraform: ${error}`,
        data: null
      };

      setResult(result);
      return result;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { 
    generateTerraform, 
    isGenerating, 
    result,
    clearResult: () => setResult(null)
  };
}

// Usage in component
function MyComponent() {
  const { generateTerraform, isGenerating, result } = useTerraformGenerator();

  const handleGenerate = async () => {
    const result = await generateTerraform(architectureData, projectName);
    
    if (result.success) {
      // Handle success
      toast.success(result.message);
    } else {
      // Handle error
      toast.error(result.message);
    }
  };

  return (
    <div>
      <button 
        onClick={handleGenerate} 
        disabled={isGenerating}
      >
        {isGenerating ? 'Generating...' : 'Generate Terraform'}
      </button>
      
      {result && (
        <div className={result.success ? 'success' : 'error'}>
          {result.message}
        </div>
      )}
    </div>
  );
}
```

---

## ✅ **Configuration Requirements**

### **Keep Using Your Current Field Names!**

✅ **Good News**: You can continue using your existing frontend field names. The backend will automatically transform them.

**Frontend Format (Keep Using)**:
```json
{
  "cidrBlock": "10.0.0.0/16",
  "enableDnsSupport": true,
  "instanceType": "t3.micro",
  "amiId": "ami-0c55b159cbfafe1d0",
  "awsAvailabilityZone": "us-east-1a"
}
```

**Backend Format (Automatic Conversion)**:
```json
{
  "cidr_block": "10.0.0.0/16",
  "enable_dns_support": true,
  "instance_type": "t3.micro",
  "ami_id": "ami-0c55b159cbfafe1d0",
  "availability_zone": "us-east-1a"
}
```

### **Required Fields by Resource Type**

| Resource Type | Required Fields |
|---|---|
| **aws-vpc** | `cidrBlock`, `enableDnsSupport`, `enableDnsHostnames` |
| **aws-public-subnet** | `cidrBlock`, `awsAvailabilityZone`, `mapPublicIpOnLaunch` |
| **aws-private-subnet** | `cidrBlock`, `awsAvailabilityZone`, `mapPublicIpOnLaunch` |
| **aws-ec2** | `instanceType`, `amiId`, `subnetId` |
| **aws-security-group** | `name`, `awsVpcId` |

### **Optional but Recommended Fields**

- **tags**: Use object format: `{"Environment": "Production", "Owner": "Team"}`
- **description**: Meaningful descriptions for resources
- **keyPairName**: For EC2 instances (if SSH access needed)

---

## 🧪 **Testing**

### **Test with cURL**

```bash
curl -X POST http://localhost:5000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d '{
    "architectureData": {
      "metadata": {
        "name": "Test Architecture",
        "version": "1.0.0",
        "createdAt": "2025-09-10T18:00:00.000Z",
        "lastModified": "2025-09-10T18:00:00.000Z",
        "provider": "aws"
      },
      "nodes": [],
      "connections": []
    },
    "projectName": "test-project"
  }'
```

### **Expected Responses**

**Success**:
```json
{
  "success": true,
  "message": "Modular Terraform configuration generated successfully",
  "data": { /* ... */ }
}
```

**Error**:
```json
{
  "success": false,
  "error": "Architecture validation failed",
  "details": "Required field 'cidrBlock' is missing for vpc"
}
```

---

## 📦 **File Download API Endpoints**

### **1. Download Project as ZIP**

**Endpoint**: `GET /api/projects/{projectName}/download`  
**Response**: Binary ZIP file  
**Headers**: `Content-Type: application/zip`, `Content-Disposition: attachment`

```typescript
async function downloadProjectZip(projectName: string): Promise<Blob | null> {
  try {
    const response = await fetch(`http://localhost:5000/api/projects/${projectName}/download`);
    
    if (response.ok) {
      return await response.blob();
    } else {
      console.error('Download failed:', response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Download error:', error);
    return null;
  }
}

// Usage - trigger download in browser
async function triggerDownload(projectName: string) {
  const blob = await downloadProjectZip(projectName);
  
  if (blob) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}-terraform.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}
```

### **2. List Available Projects**

**Endpoint**: `GET /api/projects`  
**Response**: JSON list of all generated projects

```typescript
interface Project {
  name: string;
  path: string;
  fileCount: number;
  createdAt: string;
  modifiedAt: string;
  size: number;
  downloadUrl: string;
  filesUrl: string;
}

async function getProjects(): Promise<Project[]> {
  try {
    const response = await fetch('http://localhost:5000/api/projects');
    const result = await response.json();
    
    if (result.success) {
      return result.data.projects;
    } else {
      console.error('Failed to fetch projects:', result.error);
      return [];
    }
  } catch (error) {
    console.error('API error:', error);
    return [];
  }
}
```

### **3. List Files in Specific Project**

**Endpoint**: `GET /api/projects/{projectName}/files`  
**Response**: JSON list of Terraform files in the project

```typescript
interface TerraformFile {
  name: string;
  path: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

async function getProjectFiles(projectName: string): Promise<TerraformFile[]> {
  try {
    const response = await fetch(`http://localhost:5000/api/projects/${projectName}/files`);
    const result = await response.json();
    
    if (result.success) {
      return result.data.files;
    } else {
      console.error('Failed to fetch project files:', result.error);
      return [];
    }
  } catch (error) {
    console.error('API error:', error);
    return [];
  }
}
```

### **4. Download Individual File**

**Endpoint**: `GET /api/terraform-files/{filename}/download`  
**Response**: Individual file download

```typescript
async function downloadTerraformFile(filename: string): Promise<Blob | null> {
  try {
    const response = await fetch(`http://localhost:5000/api/terraform-files/${filename}/download`);
    
    if (response.ok) {
      return await response.blob();
    } else {
      console.error('File download failed:', response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Download error:', error);
    return null;
  }
}
```

---

## 🎯 **Complete Frontend Integration Example**

### **React Component with Download Functionality**

```typescript
import React, { useState, useEffect } from 'react';

interface Project {
  name: string;
  fileCount: number;
  createdAt: string;
  size: number;
  downloadUrl: string;
}

export function TerraformManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/projects');
      const result = await response.json();
      
      if (result.success) {
        setProjects(result.data.projects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadProject = async (projectName: string) => {
    setIsDownloading(projectName);
    
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectName}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}-terraform.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed');
    } finally {
      setIsDownloading(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString();
  };

  if (isLoading) {
    return <div>Loading projects...</div>;
  }

  return (
    <div className="terraform-manager">
      <h2>Generated Terraform Projects</h2>
      
      <button onClick={loadProjects} disabled={isLoading}>
        {isLoading ? 'Refreshing...' : 'Refresh'}
      </button>

      {projects.length === 0 ? (
        <p>No projects found. Generate some Terraform configurations first!</p>
      ) : (
        <div className="projects-list">
          {projects.map((project) => (
            <div key={project.name} className="project-card">
              <h3>{project.name}</h3>
              <div className="project-info">
                <p><strong>Files:</strong> {project.fileCount}</p>
                <p><strong>Size:</strong> {formatFileSize(project.size)}</p>
                <p><strong>Created:</strong> {formatDate(project.createdAt)}</p>
              </div>
              <button
                onClick={() => downloadProject(project.name)}
                disabled={isDownloading === project.name}
                className="download-btn"
              >
                {isDownloading === project.name ? (
                  '⬇️ Downloading...'
                ) : (
                  '📦 Download ZIP'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### **Styling (CSS)**

```css
.terraform-manager {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.projects-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.project-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  background: #f9f9f9;
}

.project-card h3 {
  margin: 0 0 12px 0;
  color: #333;
}

.project-info p {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

.download-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 12px;
}

.download-btn:hover:not(:disabled) {
  background: #0056b3;
}

.download-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

---

## 📋 **API Endpoints Summary**

| Method | Endpoint | Purpose | Response Type |
|--------|----------|---------|---------------|
| `POST` | `/api/generate-terraform` | Generate Terraform from architecture | JSON |
| `GET` | `/api/projects` | List all generated projects | JSON |
| `GET` | `/api/projects/{name}/files` | List files in specific project | JSON |
| `GET` | `/api/projects/{name}/download` | Download project as ZIP | Binary (ZIP) |
| `GET` | `/api/terraform-files` | List all terraform files | JSON |
| `GET` | `/api/terraform-files/{filename}` | Get file content | JSON |
| `GET` | `/api/terraform-files/{filename}/download` | Download individual file | Binary |
| `GET` | `/health` | Health check | JSON |

---

## 🧪 **Testing the Download Endpoints**

### **Test Project List**
```bash
curl -s http://localhost:5000/api/projects | jq .
```

### **Test Project Files**
```bash
curl -s http://localhost:5000/api/projects/project-1-2025-09-10T18-14-24-421Z/files | jq .
```

### **Test ZIP Download**
```bash
curl -o terraform-project.zip http://localhost:5000/api/projects/project-1-2025-09-10T18-14-24-421Z/download
```

### **Test Individual File Download**
```bash
curl -o main.tf http://localhost:5000/api/terraform-files/main.tf/download
```

---

## ⚠️ **Error Handling**

### **Common Error Types**

1. **Validation Errors**: Missing required fields
2. **Network Errors**: API unavailable
3. **Server Errors**: Internal processing errors

### **Error Handling Pattern**

```typescript
try {
  const result = await generateTerraform(data, projectName);
  
  if (result.success) {
    // Show success notification
    showToast('✅ Terraform generated successfully!', 'success');
  } else {
    // Show error notification
    showToast(`❌ ${result.message}`, 'error');
  }
} catch (error) {
  // Handle network/unexpected errors
  showToast('🚨 Unable to connect to the server', 'error');
}
```

---

## 🚀 **Integration Checklist**

- [ ] Set up API endpoint URL
- [ ] Implement request/response interfaces
- [ ] Add error handling for network issues
- [ ] Add loading states for UI
- [ ] Test with minimal architecture data
- [ ] Test with complex architecture data
- [ ] Add success/error notifications
- [ ] Handle validation errors gracefully

---

## 📞 **Support**

If you encounter any issues:

1. **Check the API is running**: `curl http://localhost:5000/health`
2. **Validate your JSON**: Ensure all required fields are present
3. **Check browser console**: Look for network errors
4. **Review the error message**: It will indicate missing fields or validation issues

The backend handles all field transformations automatically, so focus on sending your architecture data in your current format! 🎉
