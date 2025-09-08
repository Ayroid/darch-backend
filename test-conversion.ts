import { ArchitectureConverterService } from './src/services/ArchitectureConverterService.js';
import { ArchitectureData } from './src/models/Architecture.js';

// Test data in the new frontend format (similar to what the user provided)
const newFrontendFormat: ArchitectureData = {
  "metadata": {
    "name": "Single EC2 Instance",
    "description": "Minimal setup with just an EC2 instance in a VPC for learning",
    "version": "1.0.0",
    "createdAt": "2025-09-04T12:00:00.000Z",
    "lastModified": "2025-09-08T18:21:55.899Z",
    "provider": "aws"
  },
  "nodes": [
    {
      "id": "aws-region-2hvs9l",
      "nodeType": "awsContainer" as const,
      "resourceType": "aws-region",
      "name": "Region",
      "icon": "/aws_icons/architecture_group_icons/AWS-Cloud_32.svg",
      "position": { "x": 174, "y": -44 },
      "dimensions": { "width": 684, "height": 482 },
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
      "id": "aws-availability-zone-bb98jb",
      "nodeType": "awsContainer" as const,
      "resourceType": "aws-availability-zone",
      "name": "AvailabilityZone",
      "icon": "/aws_icons/architecture_group_icons/Region_32.svg",
      "position": { "x": 23.993912512871475, "y": 26.91866346689732 },
      "dimensions": { "width": 638, "height": 435 },
      "configuration": {
        "awsAvailabilityZoneId": "AWS Availability Zone",
        "awsRegionId": "us-east-1",
        "availabilityZone": "us-east-1a",
        "description": "",
        "isEnabled": true,
        "isPreferred": false,
        "tags": "Type=AvailabilityZone"
      },
      "parentId": "aws-region-2hvs9l"
    },
    {
      "id": "aws-vpc-h2utlh",
      "nodeType": "awsContainer" as const,
      "resourceType": "aws-vpc",
      "name": "VPC",
      "icon": "/aws_icons/architecture_service_icons/Arch_Networking-Content-Delivery/32/Arch_Amazon-Virtual-Private-Cloud_32.svg",
      "position": { "x": 25.840731443095706, "y": 25.84073144309572 },
      "dimensions": { "width": 585, "height": 383 },
      "configuration": {
        "awsVpcId": "AWS VPC",
        "cidrBlock": "10.0.0.0/16",
        "awsRegionId": "us-east-1",
        "enableDnsSupport": true,
        "enableDnsHostnames": true,
        "tags": "Environment=Development"
      },
      "parentId": "aws-availability-zone-bb98jb"
    },
    {
      "id": "aws-private-subnet-ssc8mk",
      "nodeType": "awsContainer" as const,
      "resourceType": "aws-private-subnet",
      "name": "PrivateSubnet",
      "icon": "/aws_icons/architecture_group_icons/Private-subnet_32.svg",
      "position": { "x": 26.797795570617836, "y": 27.754859698139875 },
      "dimensions": { "width": 250, "height": 328 },
      "configuration": {
        "awsPrivateSubnetId": "AWS Private Subnet",
        "cidrBlock": "10.0.1.0/24",
        "awsAvailabilityZone": "us-east-1a",
        "awsVpcId": "aws-vpc-h2utlh",
        "awsRegionId": "us-east-1",
        "description": "",
        "mapPublicIpOnLaunch": false,
        "enableNatGateway": false,
        "tags": "Type=Private"
      },
      "parentId": "aws-vpc-h2utlh"
    },
    {
      "id": "aws-public-subnet-dyp8kv",
      "nodeType": "awsContainer" as const,
      "resourceType": "aws-public-subnet",
      "name": "PublicSubnet",
      "icon": "/aws_icons/architecture_group_icons/Public-subnet_32.svg",
      "position": { "x": 301.4752001694502, "y": 26.797795570617787 },
      "dimensions": { "width": 250, "height": 326 },
      "configuration": {
        "awsPublicSubnetId": "AWS Public Subnet",
        "cidrBlock": "10.0.0.0/24",
        "awsAvailabilityZone": "us-east-1a",
        "awsVpcId": "aws-vpc-h2utlh",
        "awsRegionId": "us-east-1",
        "description": "",
        "mapPublicIpOnLaunch": true,
        "tags": "Type=Public"
      },
      "parentId": "aws-vpc-h2utlh"
    },
    {
      "id": "aws-ec2-gcj38r",
      "nodeType": "awsService" as const,
      "resourceType": "aws-ec2",
      "name": "EC2",
      "icon": "/aws_icons/architecture_service_icons/Arch_Compute/32/Arch_Amazon-EC2_32.svg",
      "position": { "x": 77.52219432928712, "y": 111.97650292008151 },
      "configuration": {
        "awsEc2Id": "AWS EC2",
        "instanceType": "t3.micro",
        "amiId": "ami-0c55b159cbfafe1d0",
        "keyPairName": "",
        "awsRegionId": "us-east-1",
        "awsAvailabilityZone": "us-east-1a",
        "subnetId": "aws-private-subnet-ssc8mk",
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
      "parentId": "aws-private-subnet-ssc8mk"
    },
    {
      "id": "aws-ec2-ch5w7u",
      "nodeType": "awsService" as const,
      "resourceType": "aws-ec2",
      "name": "EC2",
      "icon": "/aws_icons/architecture_service_icons/Arch_Compute/32/Arch_Amazon-EC2_32.svg",
      "position": { "x": 77.75485969813985, "y": 111.25210416141213 },
      "configuration": {
        "awsEc2Id": "AWS EC2",
        "instanceType": "t3.micro",
        "amiId": "ami-0c55b159cbfafe1d0",
        "keyPairName": "",
        "awsRegionId": "us-east-1",
        "awsAvailabilityZone": "us-east-1a",
        "subnetId": "aws-public-subnet-dyp8kv",
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
      "parentId": "aws-public-subnet-dyp8kv"
    }
  ],
  "connections": [],
  "variables": {
    "environment": {
      "description": "Environment name",
      "type": "string",
      "default": "dev"
    },
    "instance_type": {
      "description": "EC2 instance type",
      "type": "string",
      "default": "t3.micro"
    }
  },
  "outputs": {
    "vpc_id": {
      "description": "ID of the VPC",
      "value": "vpc_simple"
    },
    "instance_ip": {
      "description": "Public IP of instance",
      "value": "${ec2_single.public_ip}"
    }
  }
};

// Test the conversion
console.log('🧪 Testing New Frontend Format Conversion...');
console.log('================================================\n');

try {
  // Convert to clean format
  console.log('📥 Converting new frontend format to clean format...');
  const cleanData = ArchitectureConverterService.convertFromLegacy(newFrontendFormat);
  
  console.log('✅ Conversion successful!\n');
  
  // Display results
  console.log('📋 Clean Format Results:');
  console.log('------------------------');
  console.log(`Project: ${cleanData.metadata.name}`);
  console.log(`Provider: ${cleanData.metadata.provider.name} (${cleanData.metadata.provider.region})`);
  console.log(`Environment: ${cleanData.metadata.environment}\n`);
  
  console.log('🌐 Network Infrastructure:');
  console.log(`  VPC: ${cleanData.infrastructure.network.vpc.name} (${cleanData.infrastructure.network.vpc.cidr_block})`);
  console.log(`  Subnets: ${cleanData.infrastructure.network.subnets.length}`);
  cleanData.infrastructure.network.subnets.forEach(subnet => {
    console.log(`    - ${subnet.name} (${subnet.type}): ${subnet.cidr_block}`);
  });
  
  console.log('\n💻 Compute Infrastructure:');
  console.log(`  EC2 Instances: ${cleanData.infrastructure.compute.instances.length}`);
  cleanData.infrastructure.compute.instances.forEach(instance => {
    console.log(`    - ${instance.name}: ${instance.instance_type} in ${instance.subnet_id}`);
  });
  
  console.log('\n🔒 Security Infrastructure:');
  console.log(`  Security Groups: ${cleanData.infrastructure.security.security_groups.length}`);
  
  console.log('\n📦 Deployment Configuration:');
  console.log(`  Dependencies: ${cleanData.deployment.dependencies.length}`);
  console.log(`  Strategy: ${cleanData.deployment.strategy.type}`);
  
  // Validate the clean data
  console.log('\n🔍 Validating clean format...');
  const validation = ArchitectureConverterService.validateCleanArchitecture(cleanData);
  
  if (validation.valid) {
    console.log('✅ Clean format validation passed!');
  } else {
    console.log('❌ Clean format validation failed:');
    validation.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // Test conversion back to legacy
  console.log('\n🔄 Testing conversion back to legacy format...');
  const backToLegacy = ArchitectureConverterService.convertToLegacy(cleanData);
  
  console.log('✅ Round-trip conversion successful!');
  console.log(`Legacy format nodes: ${backToLegacy.nodes.length}`);
  console.log(`Legacy format connections: ${backToLegacy.connections.length}`);
  
  // Show the final clean format (formatted)
  console.log('\n📄 Final Clean Format (sample):');
  console.log('================================');
  console.log(JSON.stringify({
    metadata: cleanData.metadata,
    infrastructure: {
      network: {
        vpc: cleanData.infrastructure.network.vpc,
        subnets: cleanData.infrastructure.network.subnets.slice(0, 2) // Show first 2 subnets
      },
      compute: {
        instances: cleanData.infrastructure.compute.instances.slice(0, 1) // Show first instance
      }
    }
  }, null, 2));
  
} catch (error) {
  console.error('❌ Conversion failed:', error);
  console.error(error instanceof Error ? error.stack : error);
}

console.log('\n🎉 Test completed!');
