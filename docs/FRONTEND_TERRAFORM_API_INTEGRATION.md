# Frontend Terraform API Integration Guide

This document provides comprehensive guidance for frontend developers integrating with the Darch Terraform backend APIs. It covers all Terraform lifecycle operations: plan, apply, and destroy.

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Integration Patterns](#integration-patterns)
4. [Streaming Architecture](#streaming-architecture)
5. [Implementation Examples](#implementation-examples)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [UI/UX Recommendations](#uiux-recommendations)

## Overview

The Darch backend provides a complete Terraform management API with real-time streaming logs and asynchronous job processing. All operations follow the same pattern:

1. **Initiate Operation**: Start a Terraform operation (plan/apply/destroy)
2. **Get Job ID**: Receive a unique job identifier
3. **Poll Status**: Continuously poll the status endpoint for updates
4. **Stream Logs**: Display real-time logs and progress to users
5. **Handle Completion**: Process final results or errors

## API Endpoints

### Terraform Plan Operations

```http
POST /api/terraform/plan
GET /api/terraform/plan-status/:jobId
```

### Terraform Apply Operations

```http
POST /api/terraform/apply
GET /api/terraform/apply-status/:jobId
```

### Terraform Destroy Operations

```http
POST /api/terraform/destroy
GET /api/terraform/destroy-status/:jobId
```

## Integration Patterns

### 1. Basic Request Flow

```javascript
// Step 1: Initiate Terraform Operation
const response = await fetch('/api/terraform/plan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    projectName: 'my-infrastructure',
    architecture: architectureData
  })
});

const { jobId } = await response.json();

// Step 2: Poll for Status Updates
const pollStatus = async () => {
  const statusResponse = await fetch(`/api/terraform/plan-status/${jobId}`);
  const status = await statusResponse.json();
  
  // Update UI with status
  updateProgressUI(status);
  
  if (status.status === 'running') {
    // Continue polling
    setTimeout(pollStatus, 1000);
  } else {
    // Handle completion or failure
    handleCompletion(status);
  }
};

pollStatus();
```

### 2. React Hook Implementation

```javascript
import { useState, useEffect, useCallback } from 'react';

export const useTerraformOperation = () => {
  const [job, setJob] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  const startOperation = useCallback(async (operation, data) => {
    try {
      const response = await fetch(`/api/terraform/${operation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start ${operation}`);
      }
      
      const { jobId } = await response.json();
      setJob({ id: jobId, operation, status: 'pending' });
      setIsPolling(true);
      
      return jobId;
    } catch (error) {
      console.error(`Error starting ${operation}:`, error);
      throw error;
    }
  }, []);

  const pollStatus = useCallback(async (jobId, operation) => {
    try {
      const response = await fetch(`/api/terraform/${operation}-status/${jobId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      
      const status = await response.json();
      setJob(prevJob => ({ ...prevJob, ...status }));
      
      if (status.status === 'completed' || status.status === 'failed') {
        setIsPolling(false);
      }
      
      return status;
    } catch (error) {
      console.error('Error polling status:', error);
      setIsPolling(false);
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!isPolling || !job?.id) return;

    const interval = setInterval(() => {
      pollStatus(job.id, job.operation);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPolling, job?.id, job?.operation, pollStatus]);

  return {
    job,
    isPolling,
    startOperation,
    startPlan: (data) => startOperation('plan', data),
    startApply: (data) => startOperation('apply', data),
    startDestroy: (data) => startOperation('destroy', data),
  };
};
```

### 3. Vue 3 Composition API

```javascript
import { ref, watch } from 'vue';

export function useTerraformOperation() {
  const job = ref(null);
  const isPolling = ref(false);
  const error = ref(null);

  const startOperation = async (operation, data) => {
    try {
      error.value = null;
      
      const response = await fetch(`/api/terraform/${operation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start ${operation}`);
      }
      
      const { jobId } = await response.json();
      job.value = { id: jobId, operation, status: 'pending' };
      isPolling.value = true;
      
      return jobId;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };

  const pollStatus = async () => {
    if (!job.value?.id) return;
    
    try {
      const response = await fetch(
        `/api/terraform/${job.value.operation}-status/${job.value.id}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      
      const status = await response.json();
      job.value = { ...job.value, ...status };
      
      if (status.status === 'completed' || status.status === 'failed') {
        isPolling.value = false;
      }
    } catch (err) {
      error.value = err.message;
      isPolling.value = false;
    }
  };

  // Auto-polling when polling is active
  let pollInterval;
  watch(isPolling, (newValue) => {
    if (newValue) {
      pollInterval = setInterval(pollStatus, 1000);
    } else {
      clearInterval(pollInterval);
    }
  });

  return {
    job,
    isPolling,
    error,
    startOperation,
    startPlan: (data) => startOperation('plan', data),
    startApply: (data) => startOperation('apply', data),
    startDestroy: (data) => startOperation('destroy', data),
  };
}
```

## Streaming Architecture

### Job Status Response Format

```json
{
  "id": "plan_1704891234567_abc123def",
  "status": "running",
  "progress": 75,
  "message": "Analyzing resource dependencies...",
  "createdAt": "2024-01-10T10:30:00.000Z",
  "updatedAt": "2024-01-10T10:31:15.000Z",
  "logs": [
    "2024-01-10T10:30:00.000Z: 🔍 Checking terraform installation...",
    "2024-01-10T10:30:01.000Z: ✅ Terraform installation verified",
    "2024-01-10T10:30:02.000Z: [PLAN] Refreshing state...",
    "2024-01-10T10:31:15.000Z: [PLAN] Plan: 5 to add, 0 to change, 0 to destroy"
  ],
  "result": null,
  "error": null,
  "rawOutput": "..."
}
```

### Status Values

- **`pending`**: Operation queued but not started
- **`running`**: Operation in progress
- **`completed`**: Operation finished successfully
- **`failed`**: Operation failed with errors

### Progress Indicators

Progress values are percentages (0-100) that provide visual feedback:
- **0-20%**: Initialization and validation
- **20-60%**: Terraform execution
- **60-100%**: Processing results and cleanup

## Implementation Examples

### 1. React Progress Component

```jsx
import React from 'react';
import { useTerraformOperation } from './hooks/useTerraformOperation';

const TerraformProgress = ({ operation, data }) => {
  const { job, isPolling, startOperation } = useTerraformOperation();

  const handleStart = async () => {
    try {
      await startOperation(operation, data);
    } catch (error) {
      console.error('Failed to start operation:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'blue';
      case 'completed': return 'green';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return '⏳';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '⚪';
    }
  };

  return (
    <div className="terraform-progress">
      {!job && (
        <button onClick={handleStart} className="start-btn">
          Start {operation.charAt(0).toUpperCase() + operation.slice(1)}
        </button>
      )}
      
      {job && (
        <div className="progress-container">
          <div className="status-header">
            <span className={`status-icon ${getStatusColor(job.status)}`}>
              {getStatusIcon(job.status)}
            </span>
            <span className="status-text">
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </span>
            <span className="progress-text">{job.progress}%</span>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${job.progress}%`,
                backgroundColor: getStatusColor(job.status)
              }}
            />
          </div>
          
          <div className="current-message">
            {job.message}
          </div>
          
          <div className="logs-container">
            <h4>Live Logs:</h4>
            <div className="logs-output">
              {job.logs?.map((log, index) => (
                <div key={index} className="log-line">
                  {log}
                </div>
              ))}
            </div>
          </div>
          
          {job.status === 'completed' && job.result && (
            <div className="results-section">
              <h4>Results:</h4>
              <pre>{JSON.stringify(job.result, null, 2)}</pre>
            </div>
          )}
          
          {job.status === 'failed' && job.error && (
            <div className="error-section">
              <h4>Error:</h4>
              <div className="error-message">{job.error}</div>
              {job.rawOutput && (
                <details>
                  <summary>Raw Output</summary>
                  <pre>{job.rawOutput}</pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TerraformProgress;
```

### 2. Vue 3 Component

```vue
<template>
  <div class="terraform-progress">
    <button 
      v-if="!job" 
      @click="handleStart"
      class="start-btn"
    >
      Start {{ operation.charAt(0).toUpperCase() + operation.slice(1) }}
    </button>
    
    <div v-if="job" class="progress-container">
      <div class="status-header">
        <span :class="`status-icon ${getStatusColor(job.status)}`">
          {{ getStatusIcon(job.status) }}
        </span>
        <span class="status-text">
          {{ job.status.charAt(0).toUpperCase() + job.status.slice(1) }}
        </span>
        <span class="progress-text">{{ job.progress }}%</span>
      </div>
      
      <div class="progress-bar">
        <div 
          class="progress-fill"
          :style="{ 
            width: `${job.progress}%`,
            backgroundColor: getStatusColor(job.status)
          }"
        />
      </div>
      
      <div class="current-message">
        {{ job.message }}
      </div>
      
      <div class="logs-container">
        <h4>Live Logs:</h4>
        <div class="logs-output" ref="logsContainer">
          <div 
            v-for="(log, index) in job.logs" 
            :key="index"
            class="log-line"
          >
            {{ log }}
          </div>
        </div>
      </div>
      
      <div v-if="job.status === 'completed' && job.result" class="results-section">
        <h4>Results:</h4>
        <pre>{{ JSON.stringify(job.result, null, 2) }}</pre>
      </div>
      
      <div v-if="job.status === 'failed' && job.error" class="error-section">
        <h4>Error:</h4>
        <div class="error-message">{{ job.error }}</div>
        <details v-if="job.rawOutput">
          <summary>Raw Output</summary>
          <pre>{{ job.rawOutput }}</pre>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch, nextTick, ref } from 'vue';
import { useTerraformOperation } from './composables/useTerraformOperation';

const props = defineProps(['operation', 'data']);
const { job, startOperation } = useTerraformOperation();
const logsContainer = ref(null);

const handleStart = async () => {
  try {
    await startOperation(props.operation, props.data);
  } catch (error) {
    console.error('Failed to start operation:', error);
  }
};

const getStatusColor = (status) => {
  const colors = {
    running: 'blue',
    completed: 'green',
    failed: 'red'
  };
  return colors[status] || 'gray';
};

const getStatusIcon = (status) => {
  const icons = {
    running: '⏳',
    completed: '✅',
    failed: '❌'
  };
  return icons[status] || '⚪';
};

// Auto-scroll logs to bottom
watch(() => job.value?.logs, () => {
  nextTick(() => {
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
    }
  });
}, { deep: true });
</script>
```

### 3. Vanilla JavaScript Implementation

```javascript
class TerraformOperationUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.job = null;
    this.isPolling = false;
    this.pollInterval = null;
  }

  async startOperation(operation, data) {
    try {
      // Clear previous job
      this.job = null;
      this.renderUI();

      // Start operation
      const response = await fetch(`/api/terraform/${operation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Failed to start ${operation}`);
      }

      const { jobId } = await response.json();
      this.job = { id: jobId, operation, status: 'pending' };
      this.startPolling();
      this.renderUI();

      return jobId;
    } catch (error) {
      console.error('Error starting operation:', error);
      this.renderError(error.message);
      throw error;
    }
  }

  startPolling() {
    if (this.isPolling) return;

    this.isPolling = true;
    this.pollInterval = setInterval(() => {
      this.pollStatus();
    }, 1000);
  }

  stopPolling() {
    this.isPolling = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async pollStatus() {
    if (!this.job?.id) return;

    try {
      const response = await fetch(
        `/api/terraform/${this.job.operation}-status/${this.job.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const status = await response.json();
      this.job = { ...this.job, ...status };
      this.renderUI();

      if (status.status === 'completed' || status.status === 'failed') {
        this.stopPolling();
      }
    } catch (error) {
      console.error('Error polling status:', error);
      this.stopPolling();
      this.renderError(error.message);
    }
  }

  renderUI() {
    if (!this.job) {
      this.container.innerHTML = `
        <button onclick="window.terraformUI.startPlan()">Start Plan</button>
        <button onclick="window.terraformUI.startApply()">Start Apply</button>
        <button onclick="window.terraformUI.startDestroy()">Start Destroy</button>
      `;
      return;
    }

    const statusColor = this.getStatusColor(this.job.status);
    const statusIcon = this.getStatusIcon(this.job.status);

    this.container.innerHTML = `
      <div class="progress-container">
        <div class="status-header">
          <span class="status-icon ${statusColor}">${statusIcon}</span>
          <span class="status-text">${this.capitalize(this.job.status)}</span>
          <span class="progress-text">${this.job.progress || 0}%</span>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${this.job.progress || 0}%; background-color: ${statusColor};"></div>
        </div>
        
        <div class="current-message">${this.job.message || ''}</div>
        
        <div class="logs-container">
          <h4>Live Logs:</h4>
          <div class="logs-output" id="logs-output">
            ${(this.job.logs || []).map(log => `<div class="log-line">${log}</div>`).join('')}
          </div>
        </div>
        
        ${this.job.status === 'completed' && this.job.result ? `
          <div class="results-section">
            <h4>Results:</h4>
            <pre>${JSON.stringify(this.job.result, null, 2)}</pre>
          </div>
        ` : ''}
        
        ${this.job.status === 'failed' && this.job.error ? `
          <div class="error-section">
            <h4>Error:</h4>
            <div class="error-message">${this.job.error}</div>
            ${this.job.rawOutput ? `
              <details>
                <summary>Raw Output</summary>
                <pre>${this.job.rawOutput}</pre>
              </details>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;

    // Auto-scroll logs
    const logsOutput = document.getElementById('logs-output');
    if (logsOutput) {
      logsOutput.scrollTop = logsOutput.scrollHeight;
    }
  }

  renderError(message) {
    this.container.innerHTML = `
      <div class="error-section">
        <h4>Error:</h4>
        <div class="error-message">${message}</div>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }

  getStatusColor(status) {
    const colors = {
      running: 'blue',
      completed: 'green',
      failed: 'red'
    };
    return colors[status] || 'gray';
  }

  getStatusIcon(status) {
    const icons = {
      running: '⏳',
      completed: '✅',
      failed: '❌'
    };
    return icons[status] || '⚪';
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Convenience methods
  async startPlan(architectureData) {
    return this.startOperation('plan', {
      projectName: 'my-infrastructure',
      architecture: architectureData
    });
  }

  async startApply(architectureData) {
    return this.startOperation('apply', {
      projectName: 'my-infrastructure',
      architecture: architectureData
    });
  }

  async startDestroy() {
    return this.startOperation('destroy', {
      projectName: 'my-infrastructure'
    });
  }
}

// Initialize global instance
window.terraformUI = new TerraformOperationUI('terraform-container');
```

## Error Handling

### Common Error Scenarios

1. **Network Errors**: Handle connection failures gracefully
2. **Validation Errors**: Display field-specific validation messages
3. **Terraform Errors**: Show detailed error information from terraform output
4. **Job Not Found**: Handle cases where job IDs become invalid
5. **Timeout Errors**: Handle long-running operations that may timeout

### Error Handling Best Practices

```javascript
const handleTerraformOperation = async (operation, data) => {
  try {
    // Validate input data
    if (!data.projectName) {
      throw new ValidationError('Project name is required');
    }

    // Start operation
    const jobId = await startOperation(operation, data);
    
    // Set up timeout for long operations
    const timeout = setTimeout(() => {
      throw new TimeoutError(`${operation} operation timed out`);
    }, 600000); // 10 minutes

    // Poll until completion
    const result = await pollUntilComplete(jobId, operation);
    clearTimeout(timeout);
    
    return result;
  } catch (error) {
    if (error instanceof ValidationError) {
      showValidationError(error.message);
    } else if (error instanceof TimeoutError) {
      showTimeoutError(error.message);
    } else if (error instanceof NetworkError) {
      showNetworkError('Please check your connection and try again');
    } else {
      showGenericError('An unexpected error occurred');
    }
    
    console.error('Terraform operation failed:', error);
    throw error;
  }
};
```

## Best Practices

### 1. Polling Strategy

- **Interval**: Poll every 1-2 seconds for active operations
- **Backoff**: Increase polling interval for long-running operations
- **Cleanup**: Always clean up polling intervals when components unmount
- **Error Recovery**: Implement exponential backoff for polling failures

### 2. User Experience

- **Progress Indicators**: Always show progress bars and status messages
- **Real-time Logs**: Display live logs for transparency
- **Cancellation**: Provide ability to cancel long-running operations (if supported)
- **Persistence**: Consider persisting job state across browser refreshes

### 3. Performance

- **Log Limiting**: Limit displayed logs to prevent memory issues
- **Lazy Loading**: Only load full results when requested
- **Caching**: Cache completed job results locally
- **Debouncing**: Debounce rapid status updates to prevent UI flicker

### 4. Security

- **Input Validation**: Validate all user inputs before sending to API
- **Error Sanitization**: Don't expose sensitive information in error messages
- **Rate Limiting**: Respect rate limits and implement client-side throttling

## UI/UX Recommendations

### 1. Visual Design

```css
.terraform-progress {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.status-icon {
  font-size: 24px;
}

.status-icon.blue { color: #007bff; }
.status-icon.green { color: #28a745; }
.status-icon.red { color: #dc3545; }
.status-icon.gray { color: #6c757d; }

.progress-bar {
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 4px;
}

.current-message {
  font-weight: 500;
  margin-bottom: 16px;
  color: #495057;
}

.logs-container {
  margin-bottom: 16px;
}

.logs-output {
  max-height: 300px;
  overflow-y: auto;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
}

.log-line {
  margin-bottom: 4px;
  word-break: break-all;
}

.results-section, .error-section {
  padding: 16px;
  border-radius: 4px;
  margin-top: 16px;
}

.results-section {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

.error-section {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

.error-message {
  color: #721c24;
  font-weight: 500;
  margin-bottom: 8px;
}

.start-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
}

.start-btn:hover {
  background-color: #0056b3;
}

.start-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}
```

### 2. Accessibility

- Use semantic HTML elements
- Provide ARIA labels for screen readers
- Ensure keyboard navigation works
- Use sufficient color contrast ratios
- Provide text alternatives for icons

### 3. Mobile Responsiveness

```css
@media (max-width: 768px) {
  .terraform-progress {
    padding: 16px;
    margin: 10px;
  }
  
  .status-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .logs-output {
    font-size: 11px;
    max-height: 200px;
  }
}
```

### 4. Loading States

Always provide loading states and skeleton screens while operations are pending:

```jsx
const LoadingSkeleton = () => (
  <div className="loading-skeleton">
    <div className="skeleton-bar skeleton-header" />
    <div className="skeleton-bar skeleton-progress" />
    <div className="skeleton-bar skeleton-message" />
    <div className="skeleton-logs">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton-bar skeleton-log" />
      ))}
    </div>
  </div>
);
```

## Conclusion

This guide provides a comprehensive foundation for integrating with the Darch Terraform APIs. The key to success is:

1. **Follow the async pattern**: Always use the job ID polling approach
2. **Provide real-time feedback**: Stream logs and progress to users
3. **Handle errors gracefully**: Provide meaningful error messages and recovery options
4. **Optimize for performance**: Implement proper polling strategies and cleanup
5. **Focus on UX**: Make the interface intuitive and responsive

For additional support or questions, refer to the main API documentation or contact the development team.
