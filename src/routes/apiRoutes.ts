import { Router } from 'express';
import { TerraformController } from '../controllers/TerraformController.js';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware.js';

const router = Router();

// =====================================
// TERRAFORM GENERATION ENDPOINTS
// =====================================

// Generate Terraform from architecture data
router.post('/terraform/generate',
  ValidationMiddleware.validateArchitectureData,
  TerraformController.generateModularTerraform
);

// Generate Terraform plan (dry run - quick preview)
router.post('/terraform/plan',
  ValidationMiddleware.validateArchitectureData,
  TerraformController.generateTerraformPlan
);

// Start async Terraform plan execution with actual terraform commands
router.post('/terraform/plan-execute',
  ValidationMiddleware.validateArchitectureData,
  TerraformController.startTerraformPlanExecution
);

// Get terraform plan job status (polling)
router.get('/terraform/plan-status/:jobId', TerraformController.getTerraformPlanStatus);

// Get all terraform plan jobs
router.get('/terraform/plan-jobs', TerraformController.getAllTerraformPlanJobs);

// Delete completed terraform plan job
router.delete('/terraform/plan-jobs/:jobId', TerraformController.deleteTerraformPlanJob);

// Validate architecture design
router.post('/validate/architecture',
  ValidationMiddleware.validateArchitectureData,
  TerraformController.validateArchitecture
);

// Validate resource dependencies
router.post('/validate/dependencies',
  ValidationMiddleware.validateArchitectureData,
  TerraformController.validateDependencies
);



// =====================================
// MODULE MANAGEMENT ENDPOINTS
// =====================================

// Get available Terraform modules
router.get('/modules', TerraformController.getAvailableModules);

// Get specific module details
router.get('/modules/:category/:name', TerraformController.getModuleDetails);

// Validate module configuration
router.post('/modules/validate',
  TerraformController.validateModuleConfiguration
);

// Refresh module registry
router.post('/modules/refresh', TerraformController.refreshModuleRegistry);

// =====================================
// FILE MANAGEMENT ENDPOINTS
// =====================================

// Get list of available projects
router.get('/projects', TerraformController.getProjects);

// Get files in a specific project
router.get('/projects/:projectName/files', TerraformController.getProjectFiles);

// Get project workspace structure
router.get('/projects/:projectName/structure', TerraformController.getProjectStructure);

// Delete a project
router.delete('/projects/:projectName', TerraformController.deleteProject);

// Download project as ZIP
router.get('/projects/:projectName/download', TerraformController.downloadProjectZip);

// Get generated terraform files
router.get('/terraform-files', TerraformController.getTerraformFiles);

// Get specific terraform file content
router.get('/terraform-files/:filename',
  ValidationMiddleware.validateFileName,
  TerraformController.getTerraformFileContent
);

// Download terraform file as attachment
router.get('/terraform-files/:filename/download',
  ValidationMiddleware.validateFileName,
  TerraformController.downloadTerraformFile
);

export default router;
