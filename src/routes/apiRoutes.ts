import { Router } from 'express';
import { TerraformController } from '../controllers/TerraformController.js';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware.js';

const router = Router();

// Generate Terraform from raw JSON config (for testing and legacy support)
router.post('/generate-terraform-raw', TerraformController.generateTerraformFromRawConfig);

// Generate Terraform from JSON endpoint
router.post('/generate-terraform', 
  ValidationMiddleware.validateArchitectureData,
  TerraformController.generateTerraform
);

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
