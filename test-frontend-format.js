// Test with the actual frontend format provided by the user
import { ArchitectureConverterService } from './dist/services/ArchitectureConverterService.js';

console.log('🧪 Testing Real Frontend Format Conversion...');
console.log('==============================================\n');

// The actual frontend format data provided by the user
const frontendFormatData = {
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
      "nodeType": "awsContainer",
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
      "nodeType": "awsContainer",
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
      "nodeType": "awsContainer",
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
      "nodeType": "awsContainer",
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
      "nodeType": "awsContainer",
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
      "nodeType": "awsService",
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
      "nodeType": "awsService",
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

try {
  console.log('📥 Converting frontend format to clean format...');
  const cleanData = ArchitectureConverterService.convertFromLegacy(frontendFormatData);
  console.log('✅ Conversion successful!\n');
  
  console.log('📋 Clean Architecture Data:');
  console.log('===========================');
  console.log(`Project: ${cleanData.metadata.name}`);
  console.log(`Description: ${cleanData.metadata.description}`);
  console.log(`Provider: ${cleanData.metadata.provider.name} (${cleanData.metadata.provider.region})`);
  console.log(`Environment: ${cleanData.metadata.environment}\n`);
  
  console.log('🌐 Network Infrastructure:');
  console.log(`  VPC: ${cleanData.infrastructure.network.vpc.name} (${cleanData.infrastructure.network.vpc.cidr_block})`);
  console.log(`  Subnets: ${cleanData.infrastructure.network.subnets.length}`);
  cleanData.infrastructure.network.subnets.forEach((subnet, i) => {
    console.log(`    ${i+1}. ${subnet.name} (${subnet.type}): ${subnet.cidr_block} - AZ: ${subnet.availability_zone}`);
  });
  
  console.log('\n💻 Compute Infrastructure:');
  console.log(`  EC2 Instances: ${cleanData.infrastructure.compute.instances.length}`);
  cleanData.infrastructure.compute.instances.forEach((instance, i) => {
    console.log(`    ${i+1}. ${instance.name}: ${instance.instance_type} in ${instance.subnet_id}`);
    console.log(`       AMI: ${instance.ami_id}, Storage: ${instance.root_volume_size}GB ${instance.root_volume_type}`);
  });
  
  console.log('\n🔒 Security Infrastructure:');
  console.log(`  Security Groups: ${cleanData.infrastructure.security.security_groups.length}`);
  
  console.log('\n📦 Deployment Configuration:');
  console.log(`  Dependencies: ${cleanData.deployment.dependencies.length}`);
  console.log(`  Strategy: ${cleanData.deployment.strategy.type}`);
  console.log(`  Variables: ${Object.keys(cleanData.deployment.variables).length}`);
  console.log(`  Outputs: ${Object.keys(cleanData.deployment.outputs).length}`);
  
  // Show variables and outputs
  if (Object.keys(cleanData.deployment.variables).length > 0) {
    console.log('\n📝 Variables:');
    Object.entries(cleanData.deployment.variables).forEach(([key, variable]) => {
      console.log(`  - ${key}: ${variable.description} (${variable.type}) = ${variable.default_value}`);
    });
  }
  
  if (Object.keys(cleanData.deployment.outputs).length > 0) {
    console.log('\n📤 Outputs:');
    Object.entries(cleanData.deployment.outputs).forEach(([key, output]) => {
      console.log(`  - ${key}: ${output.description} = ${output.value}`);
    });
  }
  
  console.log('\n🔍 Validating clean architecture...');
  const validation = ArchitectureConverterService.validateCleanArchitecture(cleanData);
  
  if (validation.valid) {
    console.log('✅ Clean architecture validation passed!');
  } else {
    console.log('⚠️ Clean architecture validation issues:');
    validation.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  console.log('\n🔄 Testing reverse conversion...');
  const backToLegacy = ArchitectureConverterService.convertToLegacy(cleanData);
  console.log(`✅ Reverse conversion successful! (${backToLegacy.nodes.length} nodes, ${backToLegacy.connections.length} connections)`);
  
  console.log('\n📄 Complete Clean Format Sample:');
  console.log('=================================');
  console.log(JSON.stringify(cleanData, null, 2));
  
} catch (error) {
  console.error('❌ Error during conversion:', error.message);
  console.error('Stack trace:', error.stack);
}

console.log('\n🎉 Frontend format conversion test completed!');
