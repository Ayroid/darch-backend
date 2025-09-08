import { Router } from 'express';
import { TerraformController } from '../controllers/TerraformController.js';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware.js';

const router = Router();

// =====================================
// TERRAFORM GENERATION ENDPOINTS
// =====================================

// Generate Terraform from architecture data
router.post('/generate-terraform',
  ValidationMiddleware.validateArchitectureData,
  TerraformController.generateModularTerraform
);

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

// Generate Terraform plan (dry run)
router.post('/terraform/plan',
  ValidationMiddleware.validateArchitectureData,
  TerraformController.generateTerraformPlan
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
