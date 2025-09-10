import { FrontendArchitectureTransformerService } from './dist/services/FrontendArchitectureTransformerService.js';

// Test data in frontend format (from your example)
const frontendData = {
  "metadata": {
    "name": "Untitled Architecture",
    "description": "",
    "version": "1.0.0",
    "createdAt": "2025-09-09T17:46:05.882Z",
    "lastModified": "2025-09-10T16:36:46.563Z",
    "provider": "aws"
  },
  "nodes": [
    {
      "id": "aws-region-skyk18",
      "nodeType": "awsContainer",
      "resourceType": "aws-region",
      "name": "Region",
      "icon": "/aws_icons/architecture_group_icons/AWS-Cloud_32.svg",
      "position": {
        "x": 540.5993024327678,
        "y": 37.958883892428446
      },
      "dimensions": {
        "width": 709,
        "height": 522
      },
      "configuration": {
        "awsRegionId": "AWS Region",
        "region": "us-east-1",
        "regionName": "US East (N. Virginia)",
        "description": "",
        "isEnabled": true,
        "isDefault": true,
        "tags": "Type=Region"
      }
    },
    {
      "id": "aws-availability-zone-vgb4nk",
      "nodeType": "awsContainer",
      "resourceType": "aws-availability-zone",
      "name": "AvailabilityZone",
      "icon": "/aws_icons/architecture_group_icons/Region_32.svg",
      "position": {
        "x": 28.914606878359336,
        "y": 29.975476709083168
      },
      "dimensions": {
        "width": 652,
        "height": 462
      },
      "configuration": {
        "awsAvailabilityZoneId": "AWS Availability Zone",
        "awsRegionId": "us-east-1",
        "availabilityZone": "us-east-1a",
        "description": "",
        "isEnabled": true,
        "isPreferred": false,
        "tags": "Type=AvailabilityZone"
      },
      "parentId": "aws-region-skyk18"
    },
    {
      "id": "aws-vpc-1t162u",
      "nodeType": "awsContainer",
      "resourceType": "aws-vpc",
      "name": "VPC",
      "icon": "/aws_icons/architecture_service_icons/Arch_Networking-Content-Delivery/32/Arch_Amazon-Virtual-Private-Cloud_32.svg",
      "position": {
        "x": 27.04087825331112,
        "y": 33.25789392232603
      },
      "dimensions": {
        "width": 596,
        "height": 399
      },
      "configuration": {
        "awsVpcId": "AWS VPC",
        "cidrBlock": "10.0.0.0/16",
        "awsRegionId": "us-east-1",
        "enableDnsSupport": true,
        "enableDnsHostnames": true,
        "tags": "Environment=Development"
      },
      "parentId": "aws-availability-zone-vgb4nk"
    },
    {
      "id": "aws-public-subnet-mvg3y1",
      "nodeType": "awsContainer",
      "resourceType": "aws-public-subnet",
      "name": "PublicSubnet",
      "icon": "/aws_icons/architecture_group_icons/Public-subnet_32.svg",
      "position": {
        "x": 31.348830524972072,
        "y": 35.367911361506856
      },
      "dimensions": {
        "width": 250,
        "height": 334
      },
      "configuration": {
        "awsPublicSubnetId": "AWS Public Subnet",
        "cidrBlock": "10.0.0.0/24",
        "awsAvailabilityZone": "us-east-1a",
        "awsVpcId": "aws-vpc-1t162u",
        "awsRegionId": "us-east-1",
        "description": "",
        "mapPublicIpOnLaunch": true,
        "tags": "Type=Public"
      },
      "parentId": "aws-vpc-1t162u"
    },
    {
      "id": "aws-private-subnet-bisawk",
      "nodeType": "awsContainer",
      "resourceType": "aws-private-subnet",
      "name": "PrivateSubnet",
      "icon": "/aws_icons/architecture_group_icons/Private-subnet_32.svg",
      "position": {
        "x": 307.861592078571,
        "y": 35.367911361506856
      },
      "dimensions": {
        "width": 250,
        "height": 331
      },
      "configuration": {
        "awsPrivateSubnetId": "AWS Private Subnet",
        "cidrBlock": "10.0.1.0/24",
        "awsAvailabilityZone": "us-east-1a",
        "awsVpcId": "aws-vpc-1t162u",
        "awsRegionId": "us-east-1",
        "description": "",
        "mapPublicIpOnLaunch": false,
        "enableNatGateway": false,
        "tags": "Type=Private"
      },
      "parentId": "aws-vpc-1t162u"
    },
    {
      "id": "aws-ec2-0yz8bk",
      "nodeType": "awsService",
      "resourceType": "aws-ec2",
      "name": "EC2",
      "icon": "/aws_icons/architecture_service_icons/Arch_Compute/32/Arch_Amazon-EC2_32.svg",
      "position": {
        "x": 85.2045137345392,
        "y": 118.16097659412515
      },
      "configuration": {
        "awsEc2Id": "AWS EC2",
        "instanceType": "t3.micro",
        "amiId": "ami-0c55b159cbfafe1d0",
        "keyPairName": "",
        "awsRegionId": "us-east-1",
        "awsAvailabilityZone": "us-east-1a",
        "subnetId": "aws-public-subnet-mvg3y1",
        "securityGroups": [],
        "rootVolumeSize": 8,
        "rootVolumeType": "gp3",
        "deleteOnTermination": true,
        "encrypted": false,
        "detailedMonitoring": false,
        "terminationProtection": false,
        "autoRecovery": true,
        "associatePublicIpAddress": false,
        "tenancy": "default",
        "tags": {}
      },
      "parentId": "aws-public-subnet-mvg3y1"
    },
    {
      "id": "aws-ec2-9li58x",
      "nodeType": "awsService",
      "resourceType": "aws-ec2",
      "name": "EC2",
      "icon": "/aws_icons/architecture_service_icons/Arch_Compute/32/Arch_Amazon-EC2_32.svg",
      "position": {
        "x": 80.38161673069737,
        "y": 106.10373408452054
      },
      "configuration": {
        "awsEc2Id": "AWS EC2",
        "instanceType": "t3.micro",
        "amiId": "ami-0c55b159cbfafe1d0",
        "keyPairName": "",
        "awsRegionId": "us-east-1",
        "awsAvailabilityZone": "us-east-1a",
        "subnetId": "aws-private-subnet-bisawk",
        "securityGroups": [],
        "rootVolumeSize": 8,
        "rootVolumeType": "gp3",
        "deleteOnTermination": true,
        "encrypted": false,
        "detailedMonitoring": false,
        "terminationProtection": false,
        "autoRecovery": true,
        "associatePublicIpAddress": false,
        "tenancy": "default",
        "tags": {}
      },
      "parentId": "aws-private-subnet-bisawk"
    }
  ],
  "connections": [],
  "variables": {},
  "outputs": {}
};

console.log('🧪 Testing Frontend Architecture Transformation...\n');

try {
  // Test validation first
  console.log('📋 Validating frontend data...');
  const validation = FrontendArchitectureTransformerService.validateFrontendData(frontendData);
  console.log('Validation result:', validation);

  if (!validation.valid) {
    console.error('❌ Validation failed:', validation.errors);
    process.exit(1);
  }

  console.log('✅ Frontend data is valid\n');

  // Test transformation
  console.log('🔄 Transforming frontend data to backend format...');
  const result = FrontendArchitectureTransformerService.transformToBackendFormat(frontendData);

  console.log('\n📊 Transformation Summary:');
  const summary = FrontendArchitectureTransformerService.generateTransformationSummary(result);
  console.log(JSON.stringify(summary, null, 2));

  console.log('\n⚠️  Warnings:');
  result.warnings.forEach(warning => console.log(`  - ${warning}`));

  console.log('\n❌ Errors:');
  result.errors.forEach(error => console.log(`  - ${error}`));

  console.log('\n🔗 Resource Mappings:');
  result.mappings.forEach(mapping => {
    console.log(`  ${mapping.frontendId} → ${mapping.backendId} (${mapping.resourceType})`);
    mapping.transformations.forEach(transform => console.log(`    ↳ ${transform}`));
  });

  console.log('\n📝 Transformed Architecture (first 3 nodes):');
  console.log(JSON.stringify({
    metadata: result.transformed.metadata,
    nodes: result.transformed.nodes.slice(0, 3),
    connections: result.transformed.connections
  }, null, 2));

  console.log('\n✅ Transformation completed successfully!');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
