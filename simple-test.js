// Simple test without TypeScript compilation issues
import { ArchitectureConverterService } from './dist/services/ArchitectureConverterService.js';

console.log('🧪 Testing ArchitectureConverterService...');

// Simple test data
const testData = {
  "metadata": {
    "name": "Test Project",
    "description": "A test project",
    "version": "1.0.0",
    "createdAt": "2025-09-04T12:00:00.000Z",
    "lastModified": "2025-09-08T18:21:55.899Z",
    "provider": "aws"
  },
  "nodes": [
    {
      "id": "test-vpc",
      "nodeType": "container", 
      "resourceType": "aws-vpc",
      "name": "Test VPC",
      "position": { "x": 0, "y": 0 },
      "dimensions": { "width": 500, "height": 300 },
      "configuration": {
        "cidrBlock": "10.0.0.0/16",
        "enableDnsSupport": true,
        "enableDnsHostnames": true
      }
    }
  ],
  "connections": [],
  "variables": {},
  "outputs": {}
};

try {
  console.log('Testing ArchitectureConverterService import...');
  console.log('Service:', typeof ArchitectureConverterService);
  console.log('convertFromLegacy method:', typeof ArchitectureConverterService.convertFromLegacy);
  
  console.log('\n🔄 Converting from legacy format to clean format...');
  const cleanData = ArchitectureConverterService.convertFromLegacy(testData);
  console.log('✅ Conversion to clean format completed');
  
  console.log('\n📋 Clean Format Results:');
  console.log('========================');
  console.log('Project name:', cleanData.metadata.name);
  console.log('Description:', cleanData.metadata.description);
  console.log('Provider:', cleanData.metadata.provider.name);
  console.log('Region:', cleanData.metadata.provider.region);
  console.log('Environment:', cleanData.metadata.environment);
  
  console.log('\n🌐 Infrastructure:');
  console.log('Network VPC name:', cleanData.infrastructure.network.vpc.name);
  console.log('Network VPC CIDR:', cleanData.infrastructure.network.vpc.cidr_block);
  console.log('Network subnets count:', cleanData.infrastructure.network.subnets.length);
  console.log('Compute instances count:', cleanData.infrastructure.compute.instances.length);
  console.log('Security groups count:', cleanData.infrastructure.security.security_groups.length);
  
  console.log('\n📦 Deployment:');
  console.log('Dependencies count:', cleanData.deployment.dependencies.length);
  console.log('Strategy type:', cleanData.deployment.strategy.type);
  
  console.log('\n🔍 Testing validation...');
  const validation = ArchitectureConverterService.validateCleanArchitecture(cleanData);
  if (validation.valid) {
    console.log('✅ Validation passed!');
  } else {
    console.log('❌ Validation failed:');
    validation.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  console.log('\n🔄 Testing reverse conversion...');
  const backToLegacy = ArchitectureConverterService.convertToLegacy(cleanData);
  console.log('✅ Reverse conversion successful!');
  console.log('Legacy nodes count:', backToLegacy.nodes.length);
  console.log('Legacy connections count:', backToLegacy.connections.length);
  
  console.log('\n📄 Sample Clean Format JSON:');
  console.log('=============================');
  console.log(JSON.stringify({
    metadata: cleanData.metadata,
    infrastructure: {
      network: cleanData.infrastructure.network,
      compute: cleanData.infrastructure.compute
    }
  }, null, 2));
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
