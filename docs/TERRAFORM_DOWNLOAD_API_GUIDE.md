# 📦 Terraform Download API Guide

## Complete Frontend Integration for ZIP Downloads

This guide provides everything you need to implement Terraform file downloads in your frontend application.

---

## 🎯 **Quick Overview**

The Darch Backend provides multiple endpoints to download generated Terraform files:

1. **📋 List Projects** - Get all available projects
2. **📁 List Project Files** - Get files in a specific project  
3. **🗜️ Download Project ZIP** - Download entire project as ZIP
4. **📄 Download Individual Files** - Download single Terraform files

---

## 📡 **API Endpoints**

### **Base URL**: `http://localhost:5000`

| Method | Endpoint | Purpose | Response |
|--------|----------|---------|----------|
| `GET` | `/api/projects` | List all projects | JSON |
| `GET` | `/api/projects/{name}/files` | List files in project | JSON |
| `GET` | `/api/projects/{name}/download` | Download project ZIP | Binary |
| `GET` | `/api/terraform-files/{filename}/download` | Download single file | Binary |

---

## 📋 **1. List Available Projects**

### **Endpoint**: `GET /api/projects`

```typescript
interface Project {
  name: string;                    // e.g., "project-1-2025-09-10T18-14-24-421Z"
  path: string;                    // Relative path to project directory
  fileCount: number;               // Number of .tf files in project
  createdAt: string;               // ISO date string
  modifiedAt: string;              // ISO date string
  size: number;                    // Total size in bytes
  downloadUrl: string;             // Direct download URL
  filesUrl: string;                // URL to list files
}

interface ProjectsResponse {
  success: boolean;
  data: {
    projects: Project[];
  };
  message: string;
  timestamp: string;
}
```

### **Implementation**

```typescript
async function getProjects(): Promise<Project[]> {
  try {
    const response = await fetch('http://localhost:5000/api/projects');
    const result: ProjectsResponse = await response.json();
    
    if (result.success) {
      return result.data.projects;
    } else {
      console.error('Failed to fetch projects:', result.message);
      return [];
    }
  } catch (error) {
    console.error('API error:', error);
    return [];
  }
}

// Usage
const projects = await getProjects();
console.log(`Found ${projects.length} projects`);
```

### **React Hook**

```typescript
import { useState, useEffect } from 'react';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/projects');
      const result = await response.json();
      
      if (result.success) {
        setProjects(result.data.projects);
      } else {
        setError(result.message || 'Failed to load projects');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return { projects, loading, error, reload: loadProjects };
}

// Usage in component
function ProjectsList() {
  const { projects, loading, error, reload } = useProjects();

  if (loading) return <div>Loading projects...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={reload}>Refresh</button>
      {projects.map(project => (
        <div key={project.name}>
          <h3>{project.name}</h3>
          <p>Files: {project.fileCount}</p>
          <p>Size: {formatBytes(project.size)}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 📁 **2. List Files in Project**

### **Endpoint**: `GET /api/projects/{projectName}/files`

```typescript
interface TerraformFile {
  name: string;                    // e.g., "main.tf"
  path: string;                    // Full relative path
  size: number;                    // File size in bytes
  createdAt: string;               // ISO date string
  modifiedAt: string;              // ISO date string
}

interface ProjectFilesResponse {
  success: boolean;
  data: {
    files: TerraformFile[];
  };
  message?: string;
  timestamp: string;
}
```

### **Implementation**

```typescript
async function getProjectFiles(projectName: string): Promise<TerraformFile[]> {
  try {
    const response = await fetch(`http://localhost:5000/api/projects/${encodeURIComponent(projectName)}/files`);
    const result: ProjectFilesResponse = await response.json();
    
    if (result.success) {
      return result.data.files;
    } else {
      console.error('Failed to fetch project files:', result.message);
      return [];
    }
  } catch (error) {
    console.error('API error:', error);
    return [];
  }
}

// Usage
const files = await getProjectFiles('project-1-2025-09-10T18-14-24-421Z');
console.log(`Project contains ${files.length} files`);
```

---

## 🗜️ **3. Download Project as ZIP**

### **Endpoint**: `GET /api/projects/{projectName}/download`

**Response Headers**:
- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="{projectName}-terraform.zip"`
- `Content-Length: {size}`

### **Implementation**

```typescript
async function downloadProjectZip(projectName: string): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:5000/api/projects/${encodeURIComponent(projectName)}/download`);
    
    if (!response.ok) {
      console.error('Download failed:', response.status, response.statusText);
      return false;
    }

    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}-terraform.zip`;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return true;
  } catch (error) {
    console.error('Download error:', error);
    return false;
  }
}

// Usage
const success = await downloadProjectZip('project-1-2025-09-10T18-14-24-421Z');
if (success) {
  showNotification('✅ Download started!');
} else {
  showNotification('❌ Download failed!');
}
```

### **React Hook for Downloads**

```typescript
import { useState } from 'react';

export function useDownload() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadProject = async (projectName: string): Promise<boolean> => {
    setDownloading(projectName);
    
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${encodeURIComponent(projectName)}/download`);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}-terraform.zip`;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return true;
    } catch (error) {
      console.error('Download error:', error);
      return false;
    } finally {
      setDownloading(null);
    }
  };

  return { downloadProject, downloading };
}

// Usage in component
function DownloadButton({ projectName }: { projectName: string }) {
  const { downloadProject, downloading } = useDownload();

  const handleDownload = async () => {
    const success = await downloadProject(projectName);
    if (success) {
      toast.success('Download started!');
    } else {
      toast.error('Download failed!');
    }
  };

  return (
    <button 
      onClick={handleDownload}
      disabled={downloading === projectName}
    >
      {downloading === projectName ? '⬇️ Downloading...' : '📦 Download ZIP'}
    </button>
  );
}
```

---

## 📄 **4. Download Individual Files**

### **Endpoint**: `GET /api/terraform-files/{filename}/download`

```typescript
async function downloadTerraformFile(filename: string): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:5000/api/terraform-files/${encodeURIComponent(filename)}/download`);
    
    if (!response.ok) {
      console.error('File download failed:', response.statusText);
      return false;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return true;
  } catch (error) {
    console.error('Download error:', error);
    return false;
  }
}

// Usage
const success = await downloadTerraformFile('main.tf');
```

---

## 🎯 **Complete React Component Example**

```typescript
import React, { useState, useEffect } from 'react';

interface Project {
  name: string;
  fileCount: number;
  createdAt: string;
  modifiedAt: string;
  size: number;
  downloadUrl: string;
  filesUrl: string;
}

interface TerraformFile {
  name: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

export function TerraformDownloadManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<TerraformFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load project files when project is selected
  useEffect(() => {
    if (selectedProject) {
      loadProjectFiles(selectedProject);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/projects');
      const result = await response.json();
      
      if (result.success) {
        setProjects(result.data.projects);
      } else {
        setError('Failed to load projects');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectFiles = async (projectName: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${encodeURIComponent(projectName)}/files`);
      const result = await response.json();
      
      if (result.success) {
        setProjectFiles(result.data.files);
      } else {
        setProjectFiles([]);
      }
    } catch (err) {
      setProjectFiles([]);
    }
  };

  const downloadProject = async (projectName: string) => {
    setDownloading(projectName);
    
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${encodeURIComponent(projectName)}/download`);
      
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
        
        showNotification('✅ Download started!', 'success');
      } else {
        showNotification('❌ Download failed!', 'error');
      }
    } catch (error) {
      showNotification('❌ Download failed!', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const downloadFile = async (filename: string) => {
    setDownloading(filename);
    
    try {
      const response = await fetch(`http://localhost:5000/api/terraform-files/${encodeURIComponent(filename)}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification(`✅ ${filename} downloaded!`, 'success');
      } else {
        showNotification(`❌ Failed to download ${filename}!`, 'error');
      }
    } catch (error) {
      showNotification(`❌ Failed to download ${filename}!`, 'error');
    } finally {
      setDownloading(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    // Implement your notification system here
    console.log(`${type}: ${message}`);
  };

  if (loading) {
    return <div className="loading">Loading projects...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>Error: {error}</p>
        <button onClick={loadProjects}>Retry</button>
      </div>
    );
  }

  return (
    <div className="terraform-download-manager">
      <div className="header">
        <h2>📦 Terraform Projects</h2>
        <button onClick={loadProjects} disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      <div className="content">
        {/* Projects List */}
        <div className="projects-section">
          <h3>Projects ({projects.length})</h3>
          
          {projects.length === 0 ? (
            <p className="empty-state">
              No projects found. Generate some Terraform configurations first!
            </p>
          ) : (
            <div className="projects-grid">
              {projects.map((project) => (
                <div 
                  key={project.name} 
                  className={`project-card ${selectedProject === project.name ? 'selected' : ''}`}
                  onClick={() => setSelectedProject(project.name)}
                >
                  <div className="project-header">
                    <h4>{project.name}</h4>
                    <span className="file-count">{project.fileCount} files</span>
                  </div>
                  
                  <div className="project-meta">
                    <p><strong>Size:</strong> {formatBytes(project.size)}</p>
                    <p><strong>Created:</strong> {formatDate(project.createdAt)}</p>
                    <p><strong>Modified:</strong> {formatDate(project.modifiedAt)}</p>
                  </div>
                  
                  <button
                    className="download-project-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadProject(project.name);
                    }}
                    disabled={downloading === project.name}
                  >
                    {downloading === project.name ? (
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

        {/* Project Files */}
        {selectedProject && (
          <div className="files-section">
            <h3>Files in {selectedProject}</h3>
            
            {projectFiles.length === 0 ? (
              <p className="empty-state">No files found in this project.</p>
            ) : (
              <div className="files-list">
                {projectFiles.map((file) => (
                  <div key={file.name} className="file-item">
                    <div className="file-info">
                      <span className="file-name">📄 {file.name}</span>
                      <span className="file-size">{formatBytes(file.size)}</span>
                      <span className="file-date">{formatDate(file.modifiedAt)}</span>
                    </div>
                    
                    <button
                      className="download-file-btn"
                      onClick={() => downloadFile(file.name)}
                      disabled={downloading === file.name}
                    >
                      {downloading === file.name ? '⬇️' : '📥'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🎨 **CSS Styles**

```css
.terraform-download-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e1e5e9;
}

.header h2 {
  margin: 0;
  color: #24292e;
}

.header button {
  background: #0366d6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.header button:hover:not(:disabled) {
  background: #0256cc;
}

.header button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .content {
    grid-template-columns: 1fr;
  }
}

.projects-section h3,
.files-section h3 {
  margin: 0 0 16px 0;
  color: #24292e;
  font-size: 18px;
}

.projects-grid {
  display: grid;
  gap: 12px;
}

.project-card {
  border: 1px solid #d1d5da;
  border-radius: 8px;
  padding: 16px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.project-card:hover {
  border-color: #0366d6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.project-card.selected {
  border-color: #0366d6;
  background: #f1f8ff;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.project-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #24292e;
  word-break: break-all;
}

.file-count {
  background: #e1e5e9;
  color: #586069;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.project-meta p {
  margin: 4px 0;
  font-size: 12px;
  color: #586069;
}

.download-project-btn {
  width: 100%;
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  margin-top: 12px;
}

.download-project-btn:hover:not(:disabled) {
  background: #22863a;
}

.download-project-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.files-list {
  display: grid;
  gap: 8px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f6f8fa;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
}

.file-info {
  flex: 1;
  display: grid;
  gap: 4px;
}

.file-name {
  font-weight: 500;
  color: #24292e;
  font-size: 14px;
}

.file-size,
.file-date {
  font-size: 12px;
  color: #586069;
}

.download-file-btn {
  background: #0366d6;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.download-file-btn:hover:not(:disabled) {
  background: #0256cc;
}

.download-file-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #586069;
}

.error {
  text-align: center;
  padding: 40px;
  color: #d73a49;
}

.error button {
  background: #d73a49;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #586069;
  font-style: italic;
}
```

---

## 🧪 **Testing Commands**

### **Test All Endpoints**

```bash
# 1. Test projects list
curl -s http://localhost:5000/api/projects | jq '.data.projects | length'

# 2. Test project files (replace with actual project name)
curl -s http://localhost:5000/api/projects/project-1-2025-09-10T18-14-24-421Z/files | jq '.data.files | length'

# 3. Test ZIP download headers
curl -I http://localhost:5000/api/projects/project-1-2025-09-10T18-14-24-421Z/download

# 4. Test actual ZIP download
curl -o test-project.zip http://localhost:5000/api/projects/project-1-2025-09-10T18-14-24-421Z/download

# 5. Verify ZIP contents
unzip -l test-project.zip
```

### **Test Error Handling**

```bash
# Test non-existent project
curl -s http://localhost:5000/api/projects/non-existent-project/download

# Test non-existent file
curl -s http://localhost:5000/api/terraform-files/non-existent.tf/download
```

---

## ⚡ **Quick Integration Steps**

1. **Copy the React component** above into your project
2. **Add the CSS styles** to your stylesheet
3. **Update the base URL** to match your environment
4. **Add your notification system** (toast, alert, etc.)
5. **Test with your existing projects**

---

## 🚨 **Error Handling**

```typescript
// Handle network errors
async function safeApiCall<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`API call failed: ${response.status} ${response.statusText}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}

// Handle download errors
async function safeDownload(url: string, filename: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Check if blob is actually a ZIP file
    if (blob.type === 'application/zip' || filename.endsWith('.zip')) {
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      return true;
    } else {
      throw new Error('Invalid file type received');
    }
  } catch (error) {
    console.error('Download error:', error);
    return false;
  }
}
```

---

## 📱 **Mobile Considerations**

```typescript
// Check if running on mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Handle mobile downloads differently
async function mobileDownload(url: string, filename: string) {
  if (isMobile) {
    // Open in new tab for mobile
    window.open(url, '_blank');
  } else {
    // Normal download for desktop
    return safeDownload(url, filename);
  }
}
```

---

## 🔧 **Customization Options**

### **Custom Download Progress**

```typescript
async function downloadWithProgress(url: string, filename: string, onProgress?: (progress: number) => void) {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }
  
  const total = parseInt(response.headers.get('content-length') || '0', 10);
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      received += value.length;
      
      if (onProgress && total > 0) {
        onProgress((received / total) * 100);
      }
    }
  }
  
  const blob = new Blob(chunks);
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  
  window.URL.revokeObjectURL(downloadUrl);
  document.body.removeChild(a);
}
```

### **Batch Downloads**

```typescript
async function downloadMultipleProjects(projectNames: string[]) {
  const downloads = projectNames.map(name => 
    downloadProject(name).then(success => ({ name, success }))
  );
  
  const results = await Promise.all(downloads);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Downloads completed: ${successful} successful, ${failed} failed`);
  
  return results;
}
```

---

## 📞 **Support & Troubleshooting**

### **Common Issues**

1. **CORS Errors**: Make sure your frontend URL is allowed by the backend
2. **Large File Downloads**: Increase timeout for large projects
3. **Mobile Downloads**: Use `window.open()` for mobile compatibility
4. **Empty ZIP Files**: Check if project has .tf files before downloading

### **Debug Information**

```typescript
// Enable debug logging
const DEBUG = true;

function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[TerraformDownload] ${message}`, data);
  }
}

// Use in your functions
debugLog('Starting project download', { projectName });
```

This guide provides everything you need to implement Terraform file downloads in your frontend! 🚀
