export interface ArchitectureMetadata {
	name: string;
	description?: string;
	version: string;
	createdAt: string;
	lastModified: string;
	provider: string;
	environment?: string;
	project?: string;
	tags?: Record<string, string>;
}

export interface ArchitectureData {
	metadata: ArchitectureMetadata;
	resources: ArchitectureResource[];
	connections: NodeConnection[];
	variables?: Record<string, any>;
	outputs?: Record<string, any>;
}

export interface ArchitectureResource {
	id: string;
	node_type?: string;
	resource_type: string;
	name: string;
	configuration: Record<string, any>;
	parent_id?: string;
}

export interface NodeConnection {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string;
	targetHandle?: string;
	type?: string;
}

export interface TerraformFile {
	name: string;
	path: string;
	size: number;
	createdAt: string;
	modifiedAt: string;
}

export interface GeneratedTerraform {
	terraformCode: string;
	filename: string;
	outputPath: string;
	generatedAt: string;
}

// ====================================
// Backend Resource Configuration Types
// ====================================

// Backend VPC Configuration
export interface BackendVPCConfiguration {
	cidr_block: string; // Required: IPv4 CIDR block
	description?: string;
	enable_dns_support?: boolean; // Default: true
	enable_dns_hostnames?: boolean; // Default: false
	instance_tenancy?: "default" | "dedicated"; // Default: "default"
	assign_generated_ipv6_cidr_block?: boolean; // Default: false
	ipv6_cidr_block?: string; // Optional: IPv6 CIDR block
	ipv6_ipam_pool_id?: string; // Optional: IPv6 IPAM pool ID
	ipv6_netmask_length?: number; // Optional: IPv6 netmask length
	tags?: Record<string, string>;
}

// Backend EC2 Configuration
export interface BackendEC2Configuration {
	// Basic Configuration
	instance_type: string; // Required: e.g., "t3.micro", "t2.micro"
	ami_id?: string; // Optional: Amazon Machine Image ID (if not provided, uses latest Amazon Linux AMI)
	key_name?: string;

	// Instance Details
	availability_zone?: string;
	subnet_id?: string;
	security_group_ids?: string[]; // VPC security group IDs
	iam_instance_profile?: string;

	// Storage
	root_block_device?: {
		volume_size?: number; // Default: 8 GB
		volume_type?: "gp2" | "gp3" | "io1" | "io2" | "st1" | "sc1" | "standard";
		delete_on_termination?: boolean; // Default: true
		encrypted?: boolean; // Default: false
	};
	ebs_block_device?: Array<{
		device_name: string;
		volume_size?: number;
		volume_type?: "gp2" | "gp3" | "io1" | "io2" | "st1" | "sc1" | "standard";
		delete_on_termination?: boolean;
		encrypted?: boolean;
	}>;
	ebs_optimized?: boolean; // Default: false

	// Monitoring & Management
	monitoring?: boolean; // Default: false
	disable_api_termination?: boolean; // Default: false
	shutdown_behavior?: "stop" | "terminate"; // Default: "stop"

	// User Data
	user_data?: string; // Base64 encoded user data script
	user_data_replace_on_change?: boolean; // Default: false

	// Network Settings
	associate_public_ip_address?: boolean; // Default: false
	private_ip?: string; // Primary private IPv4 address
	ipv6_address_count?: number; // Number of IPv6 addresses
	ipv6_addresses?: string[]; // Specific IPv6 addresses

	// Placement
	tenancy?: "default" | "dedicated" | "host"; // Default: "default"
	host_id?: string;
	placement_group?: string;

	// Instance Metadata Service (IMDSv2)
	metadata_options?: {
		http_endpoint?: "enabled" | "disabled"; // Default: "enabled"
		http_tokens?: "optional" | "required"; // Default: "optional"
		http_put_response_hop_limit?: number; // Default: 1
		instance_metadata_tags?: "enabled" | "disabled"; // Default: "disabled"
	};

	// CPU Options
	cpu_core_count?: number;
	cpu_threads_per_core?: number;
	cpu_credits?: "standard" | "unlimited"; // For T2/T3 instances

	// Tags
	tags?: Record<string, string>;
	volume_tags?: Record<string, string>; // Tags for EBS volumes
}

// Backend Subnet Configuration
export interface BackendSubnetConfiguration {
	cidr_block: string; // Required: IPv4 CIDR block
	vpc_id: string; // Required: VPC ID
	availability_zone: string; // Required: Availability Zone
	availability_zone_id?: string; // Optional: AZ ID
	description?: string;
	map_public_ip_on_launch?: boolean; // Default: false
	subnet_type?: "public" | "private"; // Custom field for Darch
	assign_ipv6_address_on_creation?: boolean; // Default: false
	customer_owned_ipv4_pool?: string; // Optional: Customer owned IPv4 pool
	enable_dns64?: boolean; // Default: false
	enable_resource_name_dns_a_record_on_launch?: boolean; // Default: false
	enable_resource_name_dns_aaaa_record_on_launch?: boolean; // Default: false
	ipv6_cidr_block?: string; // Optional: IPv6 CIDR block
	ipv6_native?: boolean; // Default: false (IPv6-only subnet)
	outpost_arn?: string; // Optional: Outpost ARN
	private_dns_hostname_type_on_launch?: "ip-name" | "resource-name"; // Default: "ip-name"
	tags?: Record<string, string>;
}

// Backend Security Group Configuration
export interface BackendSecurityGroupConfiguration {
	name?: string; // Security group name
	name_prefix?: string; // Creates unique name beginning with prefix
	group_id?: string; // The ID of the security group (output)
	vpc_id: string; // Required: VPC ID
	description?: string; // Default: "Managed by Terraform"
	ingress_rules?: BackendSecurityGroupRule[]; // Ingress rules
	egress_rules?: BackendSecurityGroupRule[]; // Egress rules
	revoke_rules_on_delete?: boolean; // Default: false
	tags?: Record<string, string>;
}

export interface BackendSecurityGroupRule {
	protocol: "tcp" | "udp" | "icmp" | "icmpv6" | "all" | string; // Protocol (-1 for all)
	from_port?: number; // Start of port range
	to_port?: number; // End of port range
	cidr_blocks?: string[]; // IPv4 CIDR blocks
	ipv6_cidr_blocks?: string[]; // IPv6 CIDR blocks
	source_security_group_id?: string; // Source security group ID
	self?: boolean; // Reference to the security group itself
	prefix_list_ids?: string[]; // Prefix list IDs
	description?: string;
}

// Backend Internet Gateway Configuration
export interface BackendInternetGatewayConfiguration {
	vpc_id?: string; // VPC ID to attach to
	description?: string;
	create_default_route_to_internet?: boolean; // Custom field for Darch
	tags?: Record<string, string>;
}

// Backend NAT Gateway Configuration
export interface BackendNATGatewayConfiguration {
	subnet_id: string; // Required: Subnet ID for the NAT Gateway
	allocation_id?: string; // Elastic IP allocation ID (required for public NAT Gateway)
	connectivity_type?: "public" | "private"; // Default: "public"
	private_ip?: string; // Private IPv4 address (for private NAT Gateway)
	create_eip?: boolean; // Custom field for Darch - whether to create EIP
	description?: string;
	tags?: Record<string, string>;
}

// Backend Route Table Configuration
export interface BackendRouteTableConfiguration {
	vpc_id: string; // Required: VPC ID
	routes?: Record<string, BackendRoute>; // Routes (map format, not array)
	associations?: Record<string, BackendRouteTableAssociation>; // Subnet associations (map format)
	propagating_vgws?: string[]; // List of virtual gateways for route propagation
	description?: string;
	tags?: Record<string, string>;
}

export interface BackendRoute {
	// Destination (one required)
	destination_cidr_block?: string; // IPv4 CIDR block
	destination_ipv6_cidr_block?: string; // IPv6 CIDR block
	destination_prefix_list_id?: string; // Prefix list ID

	// Target (one required)
	gateway_id?: string; // Internet Gateway or Virtual Private Gateway ID
	egress_only_gateway_id?: string; // Egress Only Internet Gateway ID (IPv6)
	instance_id?: string; // EC2 instance ID
	nat_gateway_id?: string; // NAT Gateway ID
	local_gateway_id?: string; // Local Gateway ID
	network_interface_id?: string; // Network Interface ID
	transit_gateway_id?: string; // Transit Gateway ID
	vpc_endpoint_id?: string; // VPC Endpoint ID
	vpc_peering_connection_id?: string; // VPC Peering Connection ID
	carrier_gateway_id?: string; // Carrier Gateway ID
	core_network_arn?: string; // Core Network ARN
}

export interface BackendRouteTableAssociation {
	subnet_id?: string; // Subnet ID to associate
	gateway_id?: string; // Gateway ID to associate
}

// Backend S3 Configuration
export interface BackendS3Configuration {
	bucket_name?: string; // S3 bucket name
	acl?: string; // Access control list
	versioning_enabled?: boolean; // Enable versioning
	encryption?: {
		enabled?: boolean;
		kms_key_id?: string;
	};
	lifecycle_rules?: Array<{
		id: string;
		enabled: boolean;
		prefix?: string;
		transition?: {
			days: number;
			storage_class: string;
		};
	}>;
	tags?: Record<string, string>;
}

// Backend RDS Configuration
export interface BackendRDSConfiguration {
	engine: string; // Database engine (mysql, postgres, etc.)
	engine_version?: string;
	instance_class: string; // Instance type
	allocated_storage?: number; // Storage in GB
	storage_type?: string; // gp2, gp3, io1
	db_name?: string; // Database name
	username?: string; // Master username
	password?: string; // Master password
	vpc_security_group_ids?: string[];
	db_subnet_group_name?: string;
	multi_az?: boolean;
	publicly_accessible?: boolean;
	backup_retention_period?: number;
	tags?: Record<string, string>;
}

// Backend AWS Region Configuration
export interface BackendAWSRegionConfiguration {
	region: string;
	region_name: string;
	description: string;
	is_enabled: boolean;
	is_default: boolean;
	tags?: Record<string, string>;
}

// Backend Availability Zone Configuration
export interface BackendAvailabilityZoneConfiguration {
	availability_zone: string;
	description: string;
	is_enabled: boolean;
	is_preferred: boolean;
	tags?: Record<string, string>;
}

// Union type for all backend resource configurations
export type BackendAWSResourceConfiguration =
	| BackendVPCConfiguration
	| BackendEC2Configuration
	| BackendSubnetConfiguration
	| BackendSecurityGroupConfiguration
	| BackendInternetGatewayConfiguration
	| BackendNATGatewayConfiguration
	| BackendRouteTableConfiguration
	| BackendS3Configuration
	| BackendRDSConfiguration
	| BackendAWSRegionConfiguration
	| BackendAvailabilityZoneConfiguration
	| Record<string, any>;

// ====================================
// Frontend Resource Type Definitions
// ====================================

export interface FrontendPosition {
	x: number;
	y: number;
}

export interface FrontendDimensions {
	width: number;
	height: number;
}

export interface FrontendResourceConnection {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string;
	targetHandle?: string;
	type?: string;
}

export interface FrontendArchitectureMetadata {
	name: string;
	description?: string;
	version: string;
	createdAt: string;
	lastModified: string;
	provider: string; // e.g., 'aws', 'azure', 'gcp'
	region?: string;
	environment?: string;
	project?: string;
	tags?: Record<string, string>;
	formatVersion?: "v1" | "v2"; // v1 = legacy camelCase, v2 = aligned snake_case
	[key: string]: any;
}

export interface FrontendResource {
	id: string;
	node_type: "aws_service" | "aws_container";
	resource_type: string; // e.g., 'ec2', 'vpc', 's3', 'subnet'
	name: string;
	icon: string;
	position: FrontendPosition;
	dimensions?: FrontendDimensions;
	configuration: FrontendAWSResourceConfiguration;
	parent_id?: string; // For nodes inside containers
}

export interface FrontendArchitectureData {
	metadata: FrontendArchitectureMetadata;
	resources?: FrontendResource[];
	connections: FrontendResourceConnection[];
	variables?: {
		[key: string]: {
			description: string;
			type: string;
			default?: string | number | boolean;
		};
	};
	outputs?: {
		[key: string]: {
			description: string;
			value: string;
		};
	};
}

// Frontend AWS Resource Configuration types
export interface FrontendVPCConfiguration {
	cidr_block: string; // Required: IPv4 CIDR block
	description?: string;
	enable_dns_support?: boolean; // Default: true
	enable_dns_hostnames?: boolean; // Default: false
	instance_tenancy?: "default" | "dedicated"; // Default: "default"
	assign_generated_ipv6_cidr_block?: boolean; // Default: false
	ipv6_cidr_block?: string; // Optional: IPv6 CIDR block
	ipv6_ipam_pool_id?: string; // Optional: IPv6 IPAM pool ID
	ipv6_netmask_length?: number; // Optional: IPv6 netmask length
	tags?: Record<string, string>;
}

export interface FrontendEC2Configuration {
	// Basic Configuration
	instance_type: string; // Required: e.g., "t3.micro", "t2.micro"
	ami_id?: string; // Optional: Amazon Machine Image ID (if not provided, uses latest Amazon Linux AMI)
	key_name?: string;

	// Instance Details
	availability_zone?: string;
	subnet_id?: string;
	security_group_ids?: string[]; // VPC security group IDs
	iam_instance_profile?: string;

	// Storage
	root_block_device?: {
		volume_size?: number; // Default: 8 GB
		volume_type?: "gp2" | "gp3" | "io1" | "io2" | "st1" | "sc1" | "standard";
		delete_on_termination?: boolean; // Default: true
		encrypted?: boolean; // Default: false
	};
	ebs_block_device?: Array<{
		device_name: string;
		volume_size?: number;
		volume_type?: "gp2" | "gp3" | "io1" | "io2" | "st1" | "sc1" | "standard";
		delete_on_termination?: boolean;
		encrypted?: boolean;
	}>;
	ebs_optimized?: boolean; // Default: false

	// Monitoring & Management
	monitoring?: boolean; // Default: false
	disable_api_termination?: boolean; // Default: false
	shutdown_behavior?: "stop" | "terminate"; // Default: "stop"

	// User Data
	user_data?: string; // Base64 encoded user data script
	user_data_replace_on_change?: boolean; // Default: false

	// Network Settings
	associate_public_ip_address?: boolean; // Default: false
	private_ip?: string; // Primary private IPv4 address
	ipv6_address_count?: number; // Number of IPv6 addresses
	ipv6_addresses?: string[]; // Specific IPv6 addresses

	// Placement
	tenancy?: "default" | "dedicated" | "host"; // Default: "default"
	host_id?: string;
	placement_group?: string;

	// Instance Metadata Service (IMDSv2)
	metadata_options?: {
		http_endpoint?: "enabled" | "disabled"; // Default: "enabled"
		http_tokens?: "optional" | "required"; // Default: "optional"
		http_put_response_hop_limit?: number; // Default: 1
		instance_metadata_tags?: "enabled" | "disabled"; // Default: "disabled"
	};

	// CPU Options
	cpu_core_count?: number;
	cpu_threads_per_core?: number;
	cpu_credits?: "standard" | "unlimited"; // For T2/T3 instances

	// Tags
	tags?: Record<string, string>;
	volume_tags?: Record<string, string>; // Tags for EBS volumes
}

export interface FrontendSubnetConfiguration {
	cidr_block: string; // Required: IPv4 CIDR block
	vpc_id: string; // Required: VPC ID
	availability_zone: string; // Required: Availability Zone
	availability_zone_id?: string; // Optional: AZ ID
	description?: string;
	subnet_type?: "public" | "private"; // Required: Subnet type
	map_public_ip_on_launch?: boolean; // Default based on subnet_type
	assign_ipv6_address_on_creation?: boolean; // Default: false
	customer_owned_ipv4_pool?: string; // Optional: Customer owned IPv4 pool
	enable_dns64?: boolean; // Default: false
	enable_resource_name_dns_a_record_on_launch?: boolean; // Default: false
	enable_resource_name_dns_aaaa_record_on_launch?: boolean; // Default: false
	ipv6_cidr_block?: string; // Optional: IPv6 CIDR block
	ipv6_native?: boolean; // Default: false (IPv6-only subnet)
	outpost_arn?: string; // Optional: Outpost ARN
	private_dns_hostname_type_on_launch?: "ip-name" | "resource-name"; // Default: "ip-name"
	tags?: Record<string, string>;
}

export interface FrontendAWSRegionConfiguration {
	region: string;
	region_name: string;
	description: string;
	is_enabled: boolean;
	is_default: boolean;
	tags: Record<string, string>;
}

export interface FrontendAvailabilityZoneConfiguration {
	availability_zone: string;
	description: string;
	is_enabled: boolean;
	is_preferred: boolean;
	tags: Record<string, string>;
}

export interface FrontendSecurityGroupConfiguration {
	name?: string; // Security group name
	name_prefix?: string; // Creates unique name beginning with prefix
	group_id?: string; // The ID of the security group (output)
	vpc_id: string; // Required: VPC ID
	description?: string; // Default: "Managed by Terraform"
	ingress_rules: FrontendSecurityGroupRule[]; // Ingress rules
	egress_rules: FrontendSecurityGroupRule[]; // Egress rules
	revoke_rules_on_delete?: boolean; // Default: false
	tags?: Record<string, string>;
}

export interface FrontendSecurityGroupRule {
	protocol: "tcp" | "udp" | "icmp" | "icmpv6" | "all" | string; // Protocol (-1 for all)
	from_port?: number; // Start of port range
	to_port?: number; // End of port range
	cidr_blocks?: string[]; // IPv4 CIDR blocks
	ipv6_cidr_blocks?: string[]; // IPv6 CIDR blocks
	source_security_group_id?: string; // Source security group ID
	self?: boolean; // Reference to the security group itself
	prefix_list_ids?: string[]; // Prefix list IDs
	description?: string;
}

export interface FrontendInternetGatewayConfiguration {
	vpc_id?: string;
	description?: string;
	create_default_route_to_internet?: boolean; // Custom field for Darch
	tags?: Record<string, string>;
}

export interface FrontendNATGatewayConfiguration {
	subnet_id: string; // Required: Subnet ID for the NAT Gateway
	allocation_id?: string; // Elastic IP allocation ID (required for public NAT Gateway)
	connectivity_type?: "public" | "private"; // Default: "public"
	private_ip?: string; // Private IPv4 address (for private NAT Gateway)
	create_eip?: boolean; // Custom field for Darch - whether to create EIP
	description?: string;
	tags?: Record<string, string>;
}

export interface FrontendRouteTableConfiguration {
	vpc_id: string; // Required: VPC ID
	routes?: Record<string, FrontendRoute>; // Routes (map format, not array)
	associations?: Record<string, FrontendRouteTableAssociation>; // Subnet associations (map format)
	propagating_vgws?: string[]; // List of virtual gateways for route propagation
	description?: string;
	tags?: Record<string, string>;
}

export interface FrontendRoute {
	// Destination (one required)
	destination_cidr_block?: string; // IPv4 CIDR block
	destination_ipv6_cidr_block?: string; // IPv6 CIDR block
	destination_prefix_list_id?: string; // Prefix list ID

	// Target (one required)
	gateway_id?: string; // Internet Gateway or Virtual Private Gateway ID
	egress_only_gateway_id?: string; // Egress Only Internet Gateway ID (IPv6)
	instance_id?: string; // EC2 instance ID
	nat_gateway_id?: string; // NAT Gateway ID
	local_gateway_id?: string; // Local Gateway ID
	network_interface_id?: string; // Network Interface ID
	transit_gateway_id?: string; // Transit Gateway ID
	vpc_endpoint_id?: string; // VPC Endpoint ID
	vpc_peering_connection_id?: string; // VPC Peering Connection ID
	carrier_gateway_id?: string; // Carrier Gateway ID
	core_network_arn?: string; // Core Network ARN
}

export interface FrontendRouteTableAssociation {
	subnet_id?: string; // Subnet ID to associate
	gateway_id?: string; // Gateway ID to associate
}

export type FrontendAWSResourceConfiguration =
	| FrontendVPCConfiguration
	| FrontendEC2Configuration
	| FrontendSubnetConfiguration
	| FrontendAWSRegionConfiguration
	| FrontendAvailabilityZoneConfiguration
	| FrontendSecurityGroupConfiguration
	| FrontendInternetGatewayConfiguration
	| FrontendNATGatewayConfiguration
	| FrontendRouteTableConfiguration
	| Record<string, any>;

// ====================================
// Format Version Type Definitions
// ====================================

// V1 (Legacy) - camelCase with aws- prefix
export type FrontendV1ArchitectureData = FrontendArchitectureData;
export type FrontendV1Resource = FrontendResource;
export type FrontendV1ArchitectureMetadata = FrontendArchitectureMetadata;

// V2 (Aligned) - snake_case, no aws- prefix, matches Backend format closely
// For V2, the Frontend types align with Backend types, reducing transformation overhead
// V2 uses Backend-like snake_case field names and simplified resource types
export type FrontendV2ArchitectureData = ArchitectureData; // Reuses backend structure
export type FrontendV2Resource = ArchitectureResource;
export type FrontendV2ArchitectureMetadata = ArchitectureMetadata & { formatVersion: "v2" };

// Union type for accepting both versions
export type AnyFrontendArchitectureData = FrontendV1ArchitectureData | FrontendV2ArchitectureData;

// Type guard to distinguish between V1 and V2
export function isFrontendV1Format(data: any): data is FrontendV1ArchitectureData {
	// V1 has resources array with resourceType containing 'aws-' prefix
	if (data?.metadata?.formatVersion === "v1") return true;
	if (data?.metadata?.formatVersion === "v2") return false;

	// Fallback detection: check for V1 characteristics
	const hasV1ResourceTypes = data?.resources?.some(
		(r: any) => r.resourceType?.startsWith("aws-")
	);
	const hasCamelCaseFields = data?.resources?.some(
		(r: any) => r.configuration?.cidrBlock !== undefined ||
			r.configuration?.awsVpcId !== undefined
	);

	return hasV1ResourceTypes || hasCamelCaseFields;
}

export function isFrontendV2Format(data: any): data is FrontendV2ArchitectureData {
	// V2 explicitly marked
	if (data?.metadata?.formatVersion === "v2") return true;
	if (data?.metadata?.formatVersion === "v1") return false;

	// Fallback detection: check for V2 characteristics
	const hasV2ResourceTypes = data?.resources?.some(
		(r: any) => !r.resourceType?.startsWith("aws-") &&
			["ec2", "vpc", "subnet", "security-group"].includes(r.resourceType)
	);
	const hasSnakeCaseFields = data?.resources?.some(
		(r: any) => r.configuration?.cidr_block !== undefined ||
			r.configuration?.instance_type !== undefined
	);

	return hasV2ResourceTypes && hasSnakeCaseFields;
}
