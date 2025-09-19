# Frontend API Integration### 4. Job Status Polling - CORRECTED & STREAMING LOGS

- **GET** `/api/terraform/plan-status/:jobId` ❌ Was: `/api/terraform/jobs/:jobId`
- **Purpose**: Poll job status for async operations with **streaming terraform logs**
- **Response**: `{ success: true, data: { jobId, status, progress, logs: string[], rawOutput?, error? } }`

## 🆕 NEW: Streaming Terraform Logs

The job polling now returns **real-time terraform command output** via the `logs` array:

## ⚠️ IMPORTANT: Safe Property Access

**Fix for "Cannot read properties of undefined (reading 'totalResources')" error:**

````typescript
// ❌ WRONG - Will cause error when job is still running
const totalResources = finalResult.result.resourceSummary.totalResources;

// ✅ CORRECT - Safe access with null checks
const totalResources = finalResult?.result?.resourceSummary?.totalResources || 0;

// ✅ OR - Check status first
if (jobStatus.status === 'completed' && jobStatus.result?.resourceSummary) {
  const totalResources = jobStatus.result.resourceSummary.totalResources;
}
```de - Correct Endpoints

This guide provides the **correct API endpoints** for integrating with the Darch Terraform backend.

## Backend URL
```javascript
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
````

## ⚠️ CORRECT API Endpoints

### 1. Generate Terraform

- **POST** `/api/terraform/generate`
- **Purpose**: Generate Terraform configuration files
- **Response**: Project info, file counts, validation status (no file content)

### 2. Quick Plan (Preview - No terraform init)

- **POST** `/api/terraform/plan`
- **Purpose**: Fast resource preview without terraform initialization
- **Response**: Resource summary, cost estimates, warnings

### 3. Full Plan (Async with terraform init) - CORRECTED

- **POST** `/api/terraform/plan` ❌ Was: `/api/terraform/plan-execute`
- **Purpose**: Start async terraform plan with actual terraform commands
- **Response**: `{ success: true, data: { jobId: "uuid", estimatedDuration: 30 } }`

### 4. Job Status Polling - CORRECTED

- **GET** `/api/terraform/plan-status/:jobId` ❌ Was: `/api/terraform/jobs/:jobId`
- **Purpose**: Poll job status for async operations
- **Response**: `{ success: true, data: { jobId, status, progress, result?, error?, duration? } }`---

## Request Format

```typescript
interface TerraformRequest {
	architectureData: {
		metadata: {
			name: string;
			version: string;
			provider: "aws" | "azure" | "gcp";
			createdAt: string;
			lastModified: string;
		};
		nodes: Array<{
			id: string;
			nodeType: "awsContainer" | "awsService";
			resourceType: string; // "aws-vpc", "aws-ec2", etc.
			name: string;
			position: { x: number; y: number };
			configuration: Record<string, any>;
			parentId?: string;
		}>;
		connections: Array<{
			id: string;
			source: string;
			target: string;
		}>;
	};
	projectName: string;
}
```

## Example Architecture Data

```json
{
	"architectureData": {
		"metadata": {
			"name": "Web App",
			"version": "1.0.0",
			"provider": "aws",
			"createdAt": "2025-09-13T08:00:00.000Z",
			"lastModified": "2025-09-13T08:00:00.000Z"
		},
		"nodes": [
			{
				"id": "vpc-1",
				"nodeType": "awsContainer",
				"resourceType": "aws-vpc",
				"name": "Main VPC",
				"position": { "x": 0, "y": 0 },
				"configuration": {
					"cidrBlock": "10.0.0.0/16",
					"enableDnsSupport": true,
					"enableDnsHostnames": true
				}
			},
			{
				"id": "ec2-1",
				"nodeType": "awsService",
				"resourceType": "aws-ec2",
				"name": "Web Server",
				"position": { "x": 100, "y": 100 },
				"configuration": {
					"instanceType": "t3.micro",
					"amiId": "ami-0c55b159cbfafe1d0"
				},
				"parentId": "vpc-1"
			}
		],
		"connections": []
	},
	"projectName": "my-web-app"
}
```

---

## Response Formats

### Generate Response (`POST /terraform/generate`)

```typescript
{
  success: true;
  data: {
    project: { name: string; path: string; generatedAt: string };
    files: { generated: number; list: string[] };
    validation: { syntaxValid: boolean; errors: string[] };
    status: "success";
  };
  message: string;
}
```

### Async Plan Response (`POST /terraform/plan-async`)

```typescript
{
	success: true;
	data: {
		jobId: string; // Use for polling
		status: "processing"; // Initial status
		estimatedDuration: 30; // Seconds
	}
	message: "Plan job started";
}
```

### Job Status Response (`GET /terraform/plan-status/{jobId}`) - WITH STREAMING LOGS

```typescript
{
  success: true;
  data: {
    jobId: string;
    status: "pending" | "running" | "completed" | "failed";
    progress: number;        // 0-100
    message: string;         // Current operation message
    logs: string[];          // 🆕 STREAMING TERRAFORM OUTPUT LINES
    rawOutput?: string;      // 🆕 Complete terraform output (when completed)
    result?: {               // Simple result when completed
      success: boolean;
      message: string;
      outputLines: number;
    };
    error?: string;          // When failed
    createdAt: string;
    updatedAt: string;
  };
}
```

### Example Streaming Log Output:

```json
{
	"success": true,
	"data": {
		"jobId": "plan_1694594400000_abc123",
		"status": "running",
		"progress": 60,
		"message": "Generating terraform plan...",
		"logs": [
			"2025-09-13T10:30:15.123Z: 🔍 Checking terraform installation...",
			"2025-09-13T10:30:15.200Z: ✅ Terraform installation verified",
			"2025-09-13T10:30:15.300Z: 📁 Preparing project files...",
			"2025-09-13T10:30:15.400Z: 🔧 Terraform not initialized, running terraform init...",
			"2025-09-13T10:30:16.000Z: 🔧 Initializing the backend...",
			"2025-09-13T10:30:17.000Z: 🔧 Initializing provider plugins...",
			"2025-09-13T10:30:18.000Z: ✅ Terraform init completed successfully",
			"2025-09-13T10:30:18.100Z: 🔄 Starting terraform plan...",
			"2025-09-13T10:30:19.000Z: 📄 Terraform used the selected providers to generate the following execution plan",
			"2025-09-13T10:30:19.100Z: 📄 # module.vpc_75z69v.aws_vpc.this will be created",
			"2025-09-13T10:30:19.200Z: 📄 + resource \"aws_vpc\" \"this\" {",
			"2025-09-13T10:30:19.300Z: 📄 + cidr_block = \"10.0.0.0/16\""
		],
		"createdAt": "2025-09-13T10:30:15.000Z",
		"updatedAt": "2025-09-13T10:30:19.300Z"
	}
}
```

### Quick Plan Response (`POST /terraform/plan`)

```typescript
{
  success: true;
  data: {
    resourceSummary: { totalResources: number; resourceTypes: Record<string, number> };
    costEstimate: { monthlyEstimate: number; breakdown: Record<string, number> };
    modules: Array<{ name: string; source: string }>;
    warnings: string[];
  };
}
```

## Implementation Examples

### 1. Async Plan with Streaming Logs (Recommended)

```typescript
async function generateAsyncPlanWithLogs(
	architectureData: any,
	projectName: string
) {
	// Start async plan job
	const startResponse = await fetch("/api/terraform/plan", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ architectureData, projectName }),
	});

	const {
		data: { jobId },
	} = await startResponse.json();
	let lastLogCount = 0;

	// Simple 2-second polling with streaming logs
	while (true) {
		await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

		const statusResponse = await fetch(`/api/terraform/plan-status/${jobId}`);
		const { data: job } = await statusResponse.json();

		// Display new log entries since last poll
		if (job.logs.length > lastLogCount) {
			const newLogs = job.logs.slice(lastLogCount);
			newLogs.forEach((log) => console.log(log));
			lastLogCount = job.logs.length;
		}

		console.log(
			`Job ${jobId}: ${job.status} (${job.progress}%) - ${job.message}`
		);

		if (job.status === "completed") {
			console.log("✅ Plan completed! Full output available in job.rawOutput");

			// ⚠️ SAFE ACCESS: Always check if result exists
			if (job.result && job.result.resourceSummary) {
				console.log(`Resources: ${job.result.resourceSummary.totalResources}`);
			}

			return { success: true, data: job.result, rawOutput: job.rawOutput };
		}

		if (job.status === "failed") {
			console.log("❌ Plan failed:", job.error);
			return { success: false, error: job.error };
		}

		// Continue polling if still processing
	}
}
```

### 2. Quick Plan (No Terraform Init)

```typescript
async function generateQuickPlan(architectureData: any, projectName: string) {
	const response = await fetch("/api/terraform/plan", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ architectureData, projectName }),
	});

	return await response.json();
}
```

### 3. Generate Terraform Files

```typescript
async function generateTerraform(architectureData: any, projectName: string) {
	const response = await fetch("/api/terraform/generate", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ architectureData, projectName }),
	});

	return await response.json();
}
```

### 4. Complete Workflow (Plan → Generate)

```typescript
async function fullTerraformWorkflow(
	architectureData: any,
	projectName: string
) {
	// 1. Start async plan with terraform init
	const planResult = await generateAsyncPlan(architectureData, projectName);

	if (!planResult.success) {
		throw new Error(`Plan failed: ${planResult.error}`);
	}

	// 2. Show plan summary to user
	const { resourceSummary, costEstimate } = planResult.data;
	console.log(
		`Plan: ${resourceSummary.totalResources} resources, $${costEstimate.monthlyEstimate}/month`
	);

	// 3. Generate files if user approves
	const generateResult = await generateTerraform(architectureData, projectName);

	if (generateResult.success) {
		console.log(
			`Generated ${generateResult.data.files.generated} files at ${generateResult.data.project.path}`
		);
		return generateResult.data;
	} else {
		throw new Error(`Generation failed: ${generateResult.error}`);
	}
}
```

## Configuration Requirements

### Required Fields by Resource

| Resource Type        | Required Configuration Fields                             |
| -------------------- | --------------------------------------------------------- |
| `aws-vpc`            | `cidrBlock`, `enableDnsSupport`, `enableDnsHostnames`     |
| `aws-public-subnet`  | `cidrBlock`, `awsAvailabilityZone`, `mapPublicIpOnLaunch` |
| `aws-private-subnet` | `cidrBlock`, `awsAvailabilityZone`, `mapPublicIpOnLaunch` |
| `aws-ec2`            | `instanceType`, `amiId`, `subnetId`                       |
| `aws-security-group` | `name`, `awsVpcId`                                        |

### Field Name Conversion

Frontend camelCase is automatically converted to Terraform snake_case:

- `cidrBlock` → `cidr_block`
- `enableDnsSupport` → `enable_dns_support`
- `instanceType` → `instance_type`

## Testing Examples

### Start Async Plan

```bash
curl -X POST http://localhost:5000/api/terraform/plan-async \
  -H "Content-Type: application/json" \
  -d '{"architectureData": {...}, "projectName": "test"}'
# Response: {"success": true, "data": {"jobId": "job-123", "status": "processing"}}
```

### Poll Job Status

```bash
curl http://localhost:5000/api/terraform/jobs/job-123
# Response: {"success": true, "data": {"status": "completed", "result": {...}}}
```

### Generate Files

```bash
curl -X POST http://localhost:5000/api/terraform/generate \
  -H "Content-Type: application/json" \
  -d '{"architectureData": {...}, "projectName": "test"}'
```

### Download Project

```bash
curl -o project.zip http://localhost:5000/api/projects/test-2025-09-13T08-01-11-036Z/download
```

## Core API Endpoints

| Method | Endpoint                    | Purpose                              |
| ------ | --------------------------- | ------------------------------------ |
| `POST` | `/terraform/plan-async`     | Start async plan with terraform init |
| `GET`  | `/terraform/jobs/{jobId}`   | Poll async job status                |
| `POST` | `/terraform/plan`           | Quick plan preview (sync)            |
| `POST` | `/terraform/generate`       | Generate Terraform files             |
| `GET`  | `/projects`                 | List generated projects              |
| `GET`  | `/projects/{name}/download` | Download project ZIP                 |

## Key Features

### Async Plan Process

- Runs `terraform init` automatically
- Returns job ID for polling
- Includes progress updates
- Better for complex architectures

### Quick Plan Process

- Fast preview without terraform init
- Good for simple validation
- Immediate response

### File Generation

- Creates complete Terraform workspace
- Includes all required files
- Ready for terraform commands

## Frontend Resource Type Mappings

The backend automatically transforms frontend resource types to backend format via `FrontendArchitectureTransformerService`:

### Supported Resource Types

| Frontend Resource Type | Backend Type | Terraform Module |
|----------------------|--------------|------------------|
| `aws-vpc` | `vpc` | `networking/vpc` |
| `aws-public-subnet` | `subnet` | `networking/subnet` |
| `aws-private-subnet` | `subnet` | `networking/subnet` |
| `aws-ec2` | `ec2` | `compute/ec2` |
| `aws-security-group` | `security-group` | `security/security-group` |
| `aws-internet-gateway` | `internet-gateway` | `networking/internet-gateway` |
| `aws-route-table` | `route-table` | `networking/route-table` |
| `aws-s3` | `s3` | `storage/s3` |

### Configuration Transformation

Frontend configurations are automatically transformed:

```typescript
// Frontend format
{
  "resourceType": "aws-internet-gateway",
  "configuration": {
    "awsVpcId": "main-vpc",
    "createDefaultRoute": true
  }
}

// Backend format (auto-transformed)
{
  "resourceType": "internet-gateway", 
  "configuration": {
    "vpc_id": "main-vpc",
    "create_default_route_to_internet": true
  }
}
```

### Required Fields by Resource Type

| Resource Type | Required Fields |
|---------------|----------------|
| `aws-vpc` | `cidrBlock` |
| `aws-subnet` | `cidrBlock`, `awsAvailabilityZone` |
| `aws-internet-gateway` | `awsVpcId` |
| `aws-route-table` | `awsVpcId` |
| `aws-ec2` | `instanceType` |
| `aws-security-group` | `name` |
| `aws-s3` | `bucketName` |

## Error Handling

```typescript
if (!response.success) {
	throw new Error(response.error);
}
```

## Essential Usage Pattern

1. Start async plan: `POST /terraform/plan-async` → Returns `{jobId: "job-123"}`
2. Poll every 2 seconds: `GET /terraform/jobs/{jobId}` → Until `status: "completed"`
3. Generate files: `POST /terraform/generate` → Returns project info
4. Download: `GET /projects/{name}/download` → ZIP file

## Simple Polling Implementation

```typescript
// Poll job status every 2 seconds until completion
async function pollJob(jobId: string) {
	while (true) {
		await new Promise((r) => setTimeout(r, 2000)); // Wait 2s

		const response = await fetch(`/api/terraform/jobs/${jobId}`);
		const { data: job } = await response.json();

		if (job.status !== "processing") return job;
	}
}
```
