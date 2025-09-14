import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
  logs: string[];  // Stream of terraform output lines
  rawOutput?: string;  // Full raw output for completed jobs
}

export interface TerraformPlanResult {
  success: boolean;
  planOutput?: string;
  resourceSummary?: {
    totalResources: number;
    resourceTypes: Record<string, number>;
    modules: number;
  };
  costEstimate?: {
    monthlyEstimate: number;
    breakdown: Record<string, number>;
    currency: string;
    disclaimer: string;
  };
  error?: string;
  warnings: string[];
}

export class TerraformExecutionService {
  private static jobs = new Map<string, JobStatus>();

  /**
   * Start terraform plan generation asynchronously
   */
  static async startTerraformPlan(
    projectPath: string,
    architectureData: any,
    projectName: string
  ): Promise<string> {
    const jobId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize job status
    this.jobs.set(jobId, {
      id: jobId,
      status: 'pending',
      progress: 0,
      message: 'Initializing terraform plan...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: []
    });

    // Start async processing
    this.processTerraformPlan(jobId, projectPath, architectureData, projectName);

    return jobId;
  }

  /**
   * Get job status by ID
   */
  static getJobStatus(jobId: string): JobStatus | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all active jobs
   */
  static getAllJobs(): JobStatus[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Delete completed job
   */
  static deleteJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  /**
   * Process terraform plan asynchronously
   */
  private static async processTerraformPlan(
    jobId: string,
    projectPath: string,
    architectureData: any,
    projectName: string
  ): Promise<void> {
    const updateJob = (updates: Partial<JobStatus>) => {
      const currentJob = this.jobs.get(jobId);
      if (currentJob) {
        this.jobs.set(jobId, {
          ...currentJob,
          ...updates,
          updatedAt: new Date().toISOString()
        });
      }
    };

    const addLog = (logLine: string) => {
      const currentJob = this.jobs.get(jobId);
      if (currentJob) {
        currentJob.logs.push(`${new Date().toISOString()}: ${logLine}`);
        // Keep only last 100 log lines to prevent memory issues
        if (currentJob.logs.length > 100) {
          currentJob.logs = currentJob.logs.slice(-100);
        }
        this.jobs.set(jobId, {
          ...currentJob,
          updatedAt: new Date().toISOString()
        });
      }
    };

    try {
      updateJob({ status: 'running', progress: 10, message: 'Checking terraform installation...' });
      addLog('🔍 Checking terraform installation...');

      // Step 1: Check if terraform is available
      const terraformAvailable = await this.checkTerraformInstallation();
      if (!terraformAvailable) {
        addLog('❌ Terraform is not installed or not available in PATH');
        throw new Error('Terraform is not installed or not available in PATH');
      }
      addLog('✅ Terraform installation verified');

      updateJob({ progress: 20, message: 'Preparing project files...' });
      addLog('📁 Preparing project files...');

      // Step 2: Verify project directory exists and has terraform files
      addLog(`📁 Using project directory: ${projectPath}`);

      updateJob({ progress: 30, message: 'Checking terraform initialization...' });
      addLog('🔍 Checking terraform initialization...');

      // Step 3: Check if terraform is initialized, if not - initialize
      const isInitialized = await this.checkTerraformInit(projectPath);
      if (!isInitialized) {
        updateJob({ progress: 40, message: 'Initializing terraform...' });
        addLog('🔧 Terraform not properly initialized, running terraform init...');
        await this.runTerraformInit(projectPath, addLog);
      } else {
        // Even if initialized, verify modules are properly installed
        updateJob({ progress: 35, message: 'Verifying module installation...' });
        addLog('🔍 Verifying terraform modules are installed...');
        
        const modulesInstalled = await this.checkModulesInstalled(projectPath);
        if (!modulesInstalled) {
          updateJob({ progress: 40, message: 'Reinstalling terraform modules...' });
          addLog('🔧 Modules not properly installed, running terraform init...');
          await this.runTerraformInit(projectPath, addLog);
        } else {
          addLog('✅ Terraform and modules properly initialized');
        }
      }

      updateJob({ progress: 60, message: 'Generating terraform plan...' });
      addLog('📊 Starting terraform plan generation...');

      // Step 4: Run terraform plan
      const planResult = await this.runTerraformPlan(projectPath, jobId, addLog);

      updateJob({ progress: 80, message: 'Processing plan output...' });

      // Step 5: Save the raw output and complete
      addLog('📋 Plan output processing completed');

      // Create a simple result that matches frontend expectations
      const result: TerraformPlanResult = {
        success: true,
        planOutput: planResult,
        resourceSummary: {
          totalResources: this.extractResourceCount(planResult),
          resourceTypes: { 'terraform-resources': this.extractResourceCount(planResult) },
          modules: this.extractModuleCount(planResult)
        },
        costEstimate: {
          monthlyEstimate: 0,
          breakdown: {},
          currency: 'USD',
          disclaimer: 'Cost estimation not available in streaming mode. View full plan output for details.'
        },
        warnings: this.extractWarnings(planResult)
      };

      updateJob({
        status: 'completed',
        progress: 100,
        message: 'Terraform plan completed successfully',
        rawOutput: planResult,
        result
      });

    } catch (error) {
      console.error(`❌ Terraform plan job ${jobId} failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Job failed: ${errorMessage}`);
      updateJob({
        status: 'failed',
        progress: 0,
        message: 'Terraform plan failed',
        error: errorMessage
      });
    }
  }

  /**
   * Check if terraform is installed
   */
  private static async checkTerraformInstallation(): Promise<boolean> {
    return new Promise((resolve) => {
      const terraform = spawn('terraform', ['version']);

      terraform.on('close', (code) => {
        resolve(code === 0);
      });

      terraform.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Ensure directory exists
   */
  private static async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Check if terraform is properly initialized in the directory
   */
  private static async checkTerraformInit(projectPath: string): Promise<boolean> {
    try {
      const terraformDir = path.join(projectPath, '.terraform');
      const terraformState = path.join(terraformDir, 'terraform.tfstate');
      
      // Check if .terraform directory exists
      await fs.access(terraformDir);
      
      // Check if terraform.tfstate exists (indicates successful init)
      await fs.access(terraformState);
      
      return true;
    } catch {
      // Any of the checks failed, need to run init
      return false;
    }
  }

  /**
   * Check if terraform modules are properly installed
   */
  private static async checkModulesInstalled(projectPath: string): Promise<boolean> {
    try {
      const terraformModulesDir = path.join(projectPath, '.terraform', 'modules');
      const moduleJsonFile = path.join(terraformModulesDir, 'modules.json');
      
      // Check if modules directory exists
      await fs.access(terraformModulesDir);
      
      // Check if modules.json exists (indicates modules were downloaded)
      await fs.access(moduleJsonFile);
      
      return true;
    } catch {
      // Modules not properly installed
      return false;
    }
  }

  /**
   * Run terraform init with streaming logs
   */
  private static async runTerraformInit(
    projectPath: string,
    addLog: (log: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      addLog('🔄 Starting terraform init with module upgrade...');

      const terraform = spawn('terraform', ['init', '-upgrade'], {
        cwd: projectPath,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      terraform.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;

        // Stream init output
        const lines = chunk.split('\n').filter((line: string) => line.trim());
        lines.forEach((line: string) => {
          addLog(`🔧 ${line}`);
        });
      });

      terraform.stderr?.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;

        // Stream error lines
        const lines = chunk.split('\n').filter((line: string) => line.trim());
        lines.forEach((line: string) => {
          addLog(`⚠️ ${line}`);
        });
      });

      terraform.on('close', (code) => {
        if (code === 0) {
          addLog('✅ Terraform init completed successfully');
          resolve();
        } else {
          addLog(`❌ Terraform init failed with exit code: ${code}`);
          reject(new Error(`Terraform init failed: ${errorOutput}`));
        }
      });

      terraform.on('error', (error) => {
        addLog(`❌ Failed to run terraform init: ${error.message}`);
        reject(new Error(`Failed to run terraform init: ${error.message}`));
      });
    });
  }

  /**
   * Run terraform plan with streaming logs
   */
  private static async runTerraformPlan(
    projectPath: string,
    jobId: string,
    addLog: (log: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      addLog('🔄 Starting terraform plan...');

      const terraform = spawn('terraform', ['plan', '-no-color'], {
        cwd: projectPath,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      terraform.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;

        // Stream each line as a log entry
        const lines = chunk.split('\n').filter((line: string) => line.trim());
        lines.forEach((line: string) => {
          addLog(`📄 ${line}`);
        });
      });

      terraform.stderr?.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;

        // Stream error lines as well
        const lines = chunk.split('\n').filter((line: string) => line.trim());
        lines.forEach((line: string) => {
          addLog(`⚠️ ${line}`);
        });
      });

      terraform.on('close', (code) => {
        if (code === 0) {
          addLog('✅ Terraform plan completed successfully');
          resolve(output);
        } else {
          addLog(`❌ Terraform plan failed with exit code: ${code}`);
          reject(new Error(`Terraform plan failed: ${errorOutput}`));
        }
      });

      terraform.on('error', (error) => {
        addLog(`❌ Failed to run terraform: ${error.message}`);
        reject(new Error(`Failed to run terraform plan: ${error.message}`));
      });
    });
  }

  /**
   * Simple extraction methods for basic plan information
   */
  private static extractResourceCount(planOutput: string): number {
    if (!planOutput) return 0;
    const planMatch = planOutput.match(/Plan: (\d+) to add/);
    return planMatch ? parseInt(planMatch[1], 10) || 0 : 0;
  }

  private static extractModuleCount(planOutput: string): number {
    if (!planOutput) return 0;
    const moduleMatches = planOutput.match(/# module\./g);
    return moduleMatches ? moduleMatches.length : 0;
  }

  private static extractWarnings(planOutput: string): string[] {
    if (!planOutput) return [];
    const warningMatches = planOutput.match(/Warning:.*$/gm);
    return warningMatches ? warningMatches : [];
  }

  /**
   * Clean up old completed jobs (run periodically)
   */
  static cleanupCompletedJobs(maxAge: number = 3600000): void { // 1 hour default
    const now = new Date().getTime();

    for (const [jobId, job] of this.jobs) {
      if (job.status === 'completed' || job.status === 'failed') {
        const jobAge = now - new Date(job.createdAt).getTime();
        if (jobAge > maxAge) {
          this.jobs.delete(jobId);
        }
      }
    }
  }
}
