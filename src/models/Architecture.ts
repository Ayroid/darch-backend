/**
 * Metadata for an architecture definition
 * @interface ArchitectureMetadata
 * @property {string} name - Architecture name
 * @property {string} [description] - Optional description
 * @property {string} version - Version identifier
 * @property {string} created_at - Creation timestamp
 * @property {string} last_modified - Last modification timestamp
 * @property {string} provider - Cloud provider (e.g., 'aws', 'azure', 'gcp')
 * @property {string} [environment] - Deployment environment (e.g., 'dev', 'prod')
 * @property {string} [project] - Project name
 * @property {Record<string, string>} [tags] - Additional metadata tags
 */
export interface ArchitectureMetadata {
	name: string;
	description?: string;
	version: string;
	created_at: string;
	last_modified: string;
	provider: string;
	environment?: string;
	project?: string;
	tags?: Record<string, string>;
}

/**
 * Complete architecture definition with resources and connections
 * @interface ArchitectureData
 * @property {ArchitectureMetadata} metadata - Architecture metadata
 * @property {ArchitectureResource[]} resources - List of infrastructure resources
 * @property {NodeConnection[]} connections - Connections between resources
 * @property {Record<string, any>} [variables] - Terraform input variables
 * @property {Record<string, any>} [outputs] - Terraform output values
 */
export interface ArchitectureData {
	metadata: ArchitectureMetadata;
	resources: ArchitectureResource[];
	connections: NodeConnection[];
	variables?: Record<string, any>;
	outputs?: Record<string, any>;
}

/**
 * A single infrastructure resource in the architecture
 * @interface ArchitectureResource
 * @property {string} id - Unique resource identifier
 * @property {string} [node_type] - Type of node (e.g., 'aws_service', 'aws_container')
 * @property {string} resource_type - Type of resource (e.g., 'vpc', 'ec2', 'subnet')
 * @property {string} name - Resource name
 * @property {Record<string, any>} configuration - Resource-specific configuration
 * @property {string} [parent_id] - ID of parent resource (for nested resources)
 */
export interface ArchitectureResource {
	id: string;
	node_type?: string;
	resource_type: string;
	name: string;
	configuration: Record<string, any>;
	parent_id?: string;
}

/**
 * Connection between two resources in the architecture
 * @interface NodeConnection
 * @property {string} id - Unique connection identifier
 * @property {string} source - Source resource ID
 * @property {string} target - Target resource ID
 * @property {string} [sourceHandle] - Source connection point
 * @property {string} [targetHandle] - Target connection point
 * @property {string} [type] - Connection type (e.g., 'dependency', 'network')
 */
export interface NodeConnection {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string;
	targetHandle?: string;
	type?: string;
}

/**
 * Frontend connection/edge structure
 * @interface FrontendConnection
 * @property {string} id - Unique identifier for the connection
 * @property {string} source - Source resource ID
 * @property {string} target - Target resource ID
 * @property {string} [source_handle] - Source handle position (e.g., 'left-source', 'right-source')
 * @property {string} [target_handle] - Target handle position (e.g., 'left-target', 'right-target')
 * @property {string} [type] - Connection type (e.g., 'smoothstep', 'dependency')
 */
export interface FrontendConnection {
	id: string;
	source: string;
	target: string;
	source_handle?: string;
	target_handle?: string;
	type?: string;
}

/**
 * Route table association structure
 * @interface RouteTableAssociation
 * @property {string} [subnet_id] - Associated subnet ID
 */
export interface RouteTableAssociation {
	subnet_id?: string;
	[key: string]: unknown;
}

/**
 * Mapping information for a single resource transformation
 * @interface ResourceMapping
 * @property {string} frontendId - The resource ID from the frontend
 * @property {string} backendId - The resource ID used in the backend
 * @property {string} resourceType - The backend resource type (e.g., 'vpc', 'ec2')
 * @property {string[]} transformations - List of transformations applied to this resource
 */
export interface ResourceMapping {
	frontendId: string;
	backendId: string;
	resourceType: string;
	transformations: string[];
}

/**
 * Result of transforming frontend architecture data to backend format
 * @interface TransformationResult
 * @property {ArchitectureData} transformed - The transformed architecture data in backend format
 * @property {string[]} warnings - Non-critical issues encountered during transformation
 * @property {string[]} errors - Critical errors that occurred during transformation
 * @property {ResourceMapping[]} mappings - Mappings between frontend and backend resource IDs with transformation details
 */
export interface TransformationResult {
	transformed: ArchitectureData;
	warnings: string[];
	errors: string[];
	mappings: ResourceMapping[];
}

/**
 * Statistical summary of transformation process
 * @interface TransformationSummary
 * @property {number} totalResources - Total number of transformed resources
 * @property {number} totalConnections - Total number of connections
 * @property {Record<string, number>} resourceTypes - Count of each resource type
 * @property {Record<string, number>} transformations - Count of each transformation type applied
 * @property {number} warningsCount - Total number of warnings
 * @property {number} errorsCount - Total number of errors
 * @property {number} mappings - Total number of resource mappings
 */
export interface TransformationSummary {
	totalResources: number;
	totalConnections: number;
	resourceTypes: Record<string, number>;
	transformations: Record<string, number>;
	warningsCount: number;
	errorsCount: number;
	mappings: number;
}

// Frontend to Backend Resource Type Mapping
export const FRONTEND_TO_BACKEND_RESOURCE_TYPE_MAP: Record<string, string> = {
	"aws-region": "aws-region",
	"aws-availability-zone": "aws-availability-zone",
	"aws-vpc": "aws-vpc",
	"aws-subnet": "aws-subnet",
	"aws-public-subnet": "aws-subnet",
	"aws-private-subnet": "aws-subnet",
	"aws-ec2": "aws-ec2",
	"aws-security-group": "aws-security-group",
	"aws-internet-gateway": "aws-internet-gateway",
	"aws-nat-gateway": "aws-nat-gateway",
	"aws-route-table": "aws-route-table",
	"aws-s3": "aws-s3",
	"aws-rds": "aws-rds",
};

/**
 * Information about a generated Terraform file
 * @interface TerraformFile
 * @property {string} name - File name
 * @property {string} path - Full file path
 * @property {number} size - File size in bytes
 * @property {string} createdAt - Creation timestamp
 * @property {string} modifiedAt - Last modification timestamp
 */
export interface TerraformFile {
	name: string;
	path: string;
	size: number;
	createdAt: string;
	modifiedAt: string;
}

/**
 * Generated Terraform code and metadata
 * @interface GeneratedTerraform
 * @property {string} terraformCode - Generated Terraform HCL code
 * @property {string} filename - Generated file name
 * @property {string} outputPath - Full output path
 * @property {string} generatedAt - Generation timestamp
 */
export interface GeneratedTerraform {
	terraformCode: string;
	filename: string;
	outputPath: string;
	generatedAt: string;
}

// ====================================
// Backend Resource Configuration Types
// ====================================

/**
 * Backend VPC (Virtual Private Cloud) configuration
 * @interface BackendVPCConfiguration
 * @property {string} cidr_block - Required IPv4 CIDR block for the VPC
 * @property {string} [description] - VPC description
 * @property {boolean} [enable_dns_support] - Enable DNS resolution (default: true)
 * @property {boolean} [enable_dns_hostnames] - Enable DNS hostnames (default: false)
 * @property {string} [instance_tenancy] - Instance tenancy: 'default' or 'dedicated'
 * @property {boolean} [assign_generated_ipv6_cidr_block] - Assign auto-generated IPv6 CIDR block
 * @property {string} [ipv6_cidr_block] - Custom IPv6 CIDR block
 * @property {string} [ipv6_ipam_pool_id] - IPv6 IPAM pool ID
 * @property {number} [ipv6_netmask_length] - IPv6 netmask length
 * @property {Record<string, string>} [tags] - Resource tags
 */
export interface BackendVPCConfiguration {
	cidr_block: string;
	description?: string;
	enable_dns_support?: boolean;
	enable_dns_hostnames?: boolean;
	instance_tenancy?: "default" | "dedicated";
	assign_generated_ipv6_cidr_block?: boolean;
	ipv6_cidr_block?: string;
	ipv6_ipam_pool_id?: string;
	ipv6_netmask_length?: number;
	tags?: Record<string, string>;
}

/**
 * Backend EC2 (Elastic Compute Cloud) instance configuration
 * @interface BackendEC2Configuration
 * @property {string} instance_type - Required instance type (e.g., 't3.micro', 't2.micro')
 * @property {string} [ami_id] - Amazon Machine Image ID (uses latest Amazon Linux if not provided)
 * @property {string} [key_name] - SSH key pair name
 * @property {string} [availability_zone] - Availability zone for the instance
 * @property {string} [subnet_id] - Subnet ID where instance will be launched
 * @property {string[]} [security_group_ids] - List of VPC security group IDs
 * @property {string} [iam_instance_profile] - IAM instance profile name or ARN
 * @property {object} [root_block_device] - Root volume configuration
 * @property {Array} [ebs_block_device] - Additional EBS volumes
 * @property {boolean} [ebs_optimized] - Enable EBS optimization
 * @property {boolean} [monitoring] - Enable detailed CloudWatch monitoring
 * @property {boolean} [disable_api_termination] - Prevent accidental termination
 * @property {string} [shutdown_behavior] - Instance shutdown behavior: 'stop' or 'terminate'
 * @property {string} [user_data] - Base64 encoded user data script
 * @property {boolean} [user_data_replace_on_change] - Replace instance if user data changes
 * @property {boolean} [associate_public_ip_address] - Assign public IP address
 * @property {string} [private_ip] - Primary private IPv4 address
 * @property {number} [ipv6_address_count] - Number of IPv6 addresses to assign
 * @property {string[]} [ipv6_addresses] - Specific IPv6 addresses
 * @property {string} [tenancy] - Instance tenancy: 'default', 'dedicated', or 'host'
 * @property {string} [host_id] - Dedicated host ID
 * @property {string} [placement_group] - Placement group name
 * @property {object} [metadata_options] - Instance Metadata Service (IMDSv2) configuration
 * @property {number} [cpu_core_count] - Number of CPU cores
 * @property {number} [cpu_threads_per_core] - Threads per CPU core
 * @property {string} [cpu_credits] - CPU credits mode for T2/T3 instances
 * @property {Record<string, string>} [tags] - Instance tags
 * @property {Record<string, string>} [volume_tags] - Tags for attached EBS volumes
 */
export interface BackendEC2Configuration {
	instance_type: string;
	ami_id?: string;
	key_name?: string;
	availability_zone?: string;
	subnet_id?: string;
	security_group_ids?: string[];
	iam_instance_profile?: string;
	root_block_device?: {
		volume_size?: number;
		volume_type?: "gp2" | "gp3" | "io1" | "io2" | "st1" | "sc1" | "standard";
		delete_on_termination?: boolean;
		encrypted?: boolean;
	};
	ebs_block_device?: Array<{
		device_name: string;
		volume_size?: number;
		volume_type?: "gp2" | "gp3" | "io1" | "io2" | "st1" | "sc1" | "standard";
		delete_on_termination?: boolean;
		encrypted?: boolean;
	}>;
	ebs_optimized?: boolean;
	monitoring?: boolean;
	disable_api_termination?: boolean;
	shutdown_behavior?: "stop" | "terminate";
	user_data?: string;
	user_data_replace_on_change?: boolean;
	associate_public_ip_address?: boolean;
	private_ip?: string;
	ipv6_address_count?: number;
	ipv6_addresses?: string[];
	tenancy?: "default" | "dedicated" | "host";
	host_id?: string;
	placement_group?: string;
	metadata_options?: {
		http_endpoint?: "enabled" | "disabled";
		http_tokens?: "optional" | "required";
		http_put_response_hop_limit?: number;
		instance_metadata_tags?: "enabled" | "disabled";
	};
	cpu_core_count?: number;
	cpu_threads_per_core?: number;
	cpu_credits?: "standard" | "unlimited";
	tags?: Record<string, string>;
	volume_tags?: Record<string, string>;
}

/**
 * Backend Subnet configuration
 * @interface BackendSubnetConfiguration
 * @property {string} cidr_block - Required IPv4 CIDR block for the subnet
 * @property {string} vpc_id - Required VPC ID
 * @property {string} availability_zone - Required availability zone
 * @property {string} [availability_zone_id] - Availability zone ID
 * @property {string} [description] - Subnet description
 * @property {boolean} [map_public_ip_on_launch] - Auto-assign public IP on launch
 * @property {string} [subnet_type] - Custom Darch field: 'public' or 'private'
 * @property {boolean} [assign_ipv6_address_on_creation] - Auto-assign IPv6 on creation
 * @property {string} [customer_owned_ipv4_pool] - Customer owned IPv4 pool
 * @property {boolean} [enable_dns64] - Enable DNS64
 * @property {boolean} [enable_resource_name_dns_a_record_on_launch] - Enable DNS A record
 * @property {boolean} [enable_resource_name_dns_aaaa_record_on_launch] - Enable DNS AAAA record
 * @property {string} [ipv6_cidr_block] - IPv6 CIDR block
 * @property {boolean} [ipv6_native] - IPv6-only subnet
 * @property {string} [outpost_arn] - AWS Outpost ARN
 * @property {string} [private_dns_hostname_type_on_launch] - DNS hostname type
 * @property {Record<string, string>} [tags] - Resource tags
 */
export interface BackendSubnetConfiguration {
	cidr_block: string;
	vpc_id: string;
	availability_zone: string;
	availability_zone_id?: string;
	description?: string;
	map_public_ip_on_launch?: boolean;
	subnet_type?: "public" | "private";
	assign_ipv6_address_on_creation?: boolean;
	customer_owned_ipv4_pool?: string;
	enable_dns64?: boolean;
	enable_resource_name_dns_a_record_on_launch?: boolean;
	enable_resource_name_dns_aaaa_record_on_launch?: boolean;
	ipv6_cidr_block?: string;
	ipv6_native?: boolean;
	outpost_arn?: string;
	private_dns_hostname_type_on_launch?: "ip-name" | "resource-name";
	tags?: Record<string, string>;
}

/**
 * Backend Security Group configuration
 * @interface BackendSecurityGroupConfiguration
 * @property {string} [name] - Security group name
 * @property {string} [name_prefix] - Creates unique name with this prefix
 * @property {string} [group_id] - Security group ID (output value)
 * @property {string} vpc_id - Required VPC ID
 * @property {string} [description] - Security group description
 * @property {BackendSecurityGroupRule[]} [ingress_rules] - Inbound traffic rules
 * @property {BackendSecurityGroupRule[]} [egress_rules] - Outbound traffic rules
 * @property {boolean} [revoke_rules_on_delete] - Revoke rules when deleting
 * @property {Record<string, string>} [tags] - Resource tags
 */
export interface BackendSecurityGroupConfiguration {
	name?: string;
	name_prefix?: string;
	group_id?: string;
	vpc_id: string;
	description?: string;
	ingress_rules?: BackendSecurityGroupRule[];
	egress_rules?: BackendSecurityGroupRule[];
	revoke_rules_on_delete?: boolean;
	tags?: Record<string, string>;
}

/**
 * Security group rule configuration for ingress or egress
 * @interface BackendSecurityGroupRule
 * @property {string} protocol - Protocol type: 'tcp', 'udp', 'icmp', 'icmpv6', 'all', or protocol number
 * @property {number} [from_port] - Start of port range
 * @property {number} [to_port] - End of port range
 * @property {string[]} [cidr_blocks] - IPv4 CIDR blocks to allow
 * @property {string[]} [ipv6_cidr_blocks] - IPv6 CIDR blocks to allow
 * @property {string} [source_security_group_id] - Source security group ID
 * @property {boolean} [self] - Allow traffic from the security group itself
 * @property {string[]} [prefix_list_ids] - AWS prefix list IDs
 * @property {string} [description] - Rule description
 */
export interface BackendSecurityGroupRule {
	protocol: "tcp" | "udp" | "icmp" | "icmpv6" | "all" | string;
	from_port?: number;
	to_port?: number;
	cidr_blocks?: string[];
	ipv6_cidr_blocks?: string[];
	source_security_group_id?: string;
	self?: boolean;
	prefix_list_ids?: string[];
	description?: string;
}

/**
 * Backend Internet Gateway configuration
 * @interface BackendInternetGatewayConfiguration
 * @property {string} [vpc_id] - VPC ID to attach the internet gateway to
 * @property {string} [description] - Internet gateway description
 * @property {boolean} [create_default_route_to_internet] - Custom Darch field for routing
 * @property {Record<string, string>} [tags] - Resource tags
 */
export interface BackendInternetGatewayConfiguration {
	vpc_id?: string;
	description?: string;
	create_default_route_to_internet?: boolean;
	tags?: Record<string, string>;
}

/**
 * Backend NAT Gateway configuration
 * @interface BackendNATGatewayConfiguration
 * @property {string} subnet_id - Required subnet ID for NAT Gateway placement
 * @property {string} [allocation_id] - Elastic IP allocation ID (required for public NAT)
 * @property {string} [connectivity_type] - Connectivity type: 'public' or 'private'
 * @property {string} [private_ip] - Private IPv4 address for private NAT Gateway
 * @property {boolean} [create_eip] - Custom Darch field: create Elastic IP automatically
 * @property {string} [description] - NAT Gateway description
 * @property {Record<string, string>} [tags] - Resource tags
 */
export interface BackendNATGatewayConfiguration {
	subnet_id: string;
	allocation_id?: string;
	connectivity_type?: "public" | "private";
	private_ip?: string;
	create_eip?: boolean;
	description?: string;
	tags?: Record<string, string>;
}

/**
 * Backend Route Table configuration
 * @interface BackendRouteTableConfiguration
 * @property {string} vpc_id - Required VPC ID
 * @property {Record<string, BackendRoute>} [routes] - Route definitions (map format)
 * @property {Record<string, BackendRouteTableAssociation>} [associations] - Subnet associations
 * @property {string[]} [propagating_vgws] - Virtual gateways for route propagation
 * @property {string} [description] - Route table description
 * @property {Record<string, string>} [tags] - Resource tags
 */
export interface BackendRouteTableConfiguration {
	vpc_id: string;
	routes?: Record<string, BackendRoute>;
	associations?: Record<string, BackendRouteTableAssociation>;
	propagating_vgws?: string[];
	description?: string;
	tags?: Record<string, string>;
}

/**
 * Individual route in a route table
 * @interface BackendRoute
 * @property {string} [destination_cidr_block] - Destination IPv4 CIDR block
 * @property {string} [destination_ipv6_cidr_block] - Destination IPv6 CIDR block
 * @property {string} [destination_prefix_list_id] - Destination prefix list ID
 * @property {string} [gateway_id] - Internet Gateway or Virtual Private Gateway ID
 * @property {string} [egress_only_gateway_id] - Egress Only Internet Gateway ID (IPv6)
 * @property {string} [instance_id] - EC2 instance ID as target
 * @property {string} [nat_gateway_id] - NAT Gateway ID
 * @property {string} [local_gateway_id] - Local Gateway ID
 * @property {string} [network_interface_id] - Network Interface ID
 * @property {string} [transit_gateway_id] - Transit Gateway ID
 * @property {string} [vpc_endpoint_id] - VPC Endpoint ID
 * @property {string} [vpc_peering_connection_id] - VPC Peering Connection ID
 * @property {string} [carrier_gateway_id] - Carrier Gateway ID
 * @property {string} [core_network_arn] - Core Network ARN
 */
export interface BackendRoute {
	destination_cidr_block?: string;
	destination_ipv6_cidr_block?: string;
	destination_prefix_list_id?: string;
	gateway_id?: string;
	egress_only_gateway_id?: string;
	instance_id?: string;
	nat_gateway_id?: string;
	local_gateway_id?: string;
	network_interface_id?: string;
	transit_gateway_id?: string;
	vpc_endpoint_id?: string;
	vpc_peering_connection_id?: string;
	carrier_gateway_id?: string;
	core_network_arn?: string;
}

/**
 * Route table association with a subnet or gateway
 * @interface BackendRouteTableAssociation
 * @property {string} [subnet_id] - Subnet ID to associate with route table
 * @property {string} [gateway_id] - Gateway ID to associate with route table
 */
export interface BackendRouteTableAssociation {
	subnet_id?: string;
	gateway_id?: string;
}

/**
 * Backend S3 (Simple Storage Service) bucket configuration
 * @interface BackendS3Configuration
 * @property {string} [bucket_name] - S3 bucket name (must be globally unique)
 * @property {string} [acl] - Access control list (e.g., 'private', 'public-read')
 * @property {boolean} [versioning_enabled] - Enable object versioning
 * @property {object} [encryption] - Encryption configuration
 * @property {Array} [lifecycle_rules] - Lifecycle management rules
 * @property {Record<string, string>} [tags] - Resource tags
 */
export interface BackendS3Configuration {
	bucket_name?: string;
	acl?: string;
	versioning_enabled?: boolean;
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

/**
 * Backend RDS (Relational Database Service) configuration
 * @interface BackendRDSConfiguration
 * @property {string} engine - Required database engine (e.g., 'mysql', 'postgres', 'mariadb')
 * @property {string} [engine_version] - Database engine version
 * @property {string} instance_class - Required instance type (e.g., 'db.t3.micro')
 * @property {number} [allocated_storage] - Storage size in GB
 * @property {string} [storage_type] - Storage type: 'gp2', 'gp3', 'io1'
 * @property {string} [db_name] - Initial database name
 * @property {string} [username] - Master username
 * @property {string} [password] - Master password
 * @property {string[]} [vpc_security_group_ids] - VPC security group IDs
 * @property {string} [db_subnet_group_name] - DB subnet group name
 * @property {boolean} [multi_az] - Enable Multi-AZ deployment
 * @property {boolean} [publicly_accessible] - Enable public accessibility
 * @property {number} [backup_retention_period] - Backup retention in days
 * @property {Record<string, string>} [tags] - Resource tags
 */
export interface BackendRDSConfiguration {
	engine: string;
	engine_version?: string;
	instance_class: string;
	allocated_storage?: number;
	storage_type?: string;
	db_name?: string;
	username?: string;
	password?: string;
	vpc_security_group_ids?: string[];
	db_subnet_group_name?: string;
	multi_az?: boolean;
	publicly_accessible?: boolean;
	backup_retention_period?: number;
	tags?: Record<string, string>;
}

/**
 * Backend AWS Region configuration
 * @interface BackendAWSRegionConfiguration
 * @property {string} region - AWS region code (e.g., 'us-east-1', 'eu-west-1')
 * @property {string} region_name - Human-readable region name
 * @property {string} description - Region description
 * @property {boolean} is_enabled - Whether the region is enabled
 * @property {boolean} is_default - Whether this is the default region
 * @property {Record<string, string>} [tags] - Resource tags
 */
export interface BackendAWSRegionConfiguration {
	region: string;
	region_name: string;
	description: string;
	is_enabled: boolean;
	is_default: boolean;
	tags?: Record<string, string>;
}

/**
 * Backend AWS Availability Zone configuration
 * @interface BackendAvailabilityZoneConfiguration
 * @property {string} availability_zone - Availability zone name (e.g., 'us-east-1a')
 * @property {string} description - Availability zone description
 * @property {boolean} is_enabled - Whether the AZ is enabled
 * @property {boolean} is_preferred - Whether this is a preferred AZ
 * @property {Record<string, string>} [tags] - Resource tags
 */
export interface BackendAvailabilityZoneConfiguration {
	availability_zone: string;
	description: string;
	is_enabled: boolean;
	is_preferred: boolean;
	tags?: Record<string, string>;
}

/**
 * Union type for all backend AWS resource configurations
 * @type {BackendAWSResourceConfiguration}
 */
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

/**
 * Position coordinates for a frontend resource in the visual editor
 * @interface FrontendPosition
 * @property {number} x - X-axis position in pixels
 * @property {number} y - Y-axis position in pixels
 */
export interface FrontendPosition {
	x: number;
	y: number;
}

/**
 * Dimensions for a frontend resource in the visual editor
 * @interface FrontendDimensions
 * @property {number} width - Width in pixels
 * @property {number} height - Height in pixels
 */
export interface FrontendDimensions {
	width: number;
	height: number;
}

/**
 * Frontend architecture metadata (camelCase version)
 * @interface FrontendArchitectureMetadata
 * @property {string} name - Architecture name
 * @property {string} [description] - Optional description
 * @property {string} version - Version identifier
 * @property {string} createdAt - Creation timestamp
 * @property {string} lastModified - Last modification timestamp
 * @property {string} provider - Cloud provider (e.g., 'aws', 'azure', 'gcp')
 * @property {string} [region] - AWS region
 * @property {string} [environment] - Deployment environment
 * @property {string} [project] - Project name
 * @property {Record<string, string>} [tags] - Additional metadata tags
 */
export interface FrontendArchitectureMetadata {
	name: string;
	description?: string;
	version: string;
	createdAt: string;
	lastModified: string;
	provider: string;
	region?: string;
	environment?: string;
	project?: string;
	tags?: Record<string, string>;
	[key: string]: any;
}

/**
 * A frontend resource representing an infrastructure component in the visual editor
 * @interface FrontendResource
 * @property {string} id - Unique resource identifier
 * @property {string} node_type - Node type: 'aws_service' or 'aws_container'
 * @property {string} resource_type - Resource type (e.g., 'ec2', 'vpc', 's3', 'subnet')
 * @property {string} name - Resource name
 * @property {string} icon - Icon identifier for visual representation
 * @property {FrontendPosition} position - Position in the visual editor
 * @property {FrontendDimensions} [dimensions] - Optional dimensions for the visual representation
 * @property {FrontendAWSResourceConfiguration} configuration - Resource-specific configuration
 * @property {string} [parent_id] - ID of parent container (for nested resources)
 */
export interface FrontendResource {
	id: string;
	node_type: "aws_service" | "aws_container";
	resource_type: string;
	name: string;
	icon: string;
	position: FrontendPosition;
	dimensions?: FrontendDimensions;
	configuration: FrontendAWSResourceConfiguration;
	parent_id?: string;
}

/**
 * Complete frontend architecture definition
 * @interface FrontendArchitectureData
 * @property {FrontendArchitectureMetadata} metadata - Architecture metadata
 * @property {FrontendResource[]} [resources] - List of infrastructure resources
 * @property {FrontendConnection[]} connections - Connections between resources
 * @property {object} [variables] - Terraform input variables
 * @property {object} [outputs] - Terraform output values
 */
export interface FrontendArchitectureData {
	metadata: FrontendArchitectureMetadata;
	resources?: FrontendResource[];
	connections: FrontendConnection[];
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

/**
 * Frontend VPC configuration (matches backend structure)
 * @interface FrontendVPCConfiguration
 */
export interface FrontendVPCConfiguration {
	cidr_block: string;
	description?: string;
	enable_dns_support?: boolean;
	enable_dns_hostnames?: boolean;
	instance_tenancy?: "default" | "dedicated";
	assign_generated_ipv6_cidr_block?: boolean;
	ipv6_cidr_block?: string;
	ipv6_ipam_pool_id?: string;
	ipv6_netmask_length?: number;
	tags?: Record<string, string>;
}

/**
 * Frontend EC2 configuration (matches backend structure)
 * @interface FrontendEC2Configuration
 */
export interface FrontendEC2Configuration {
	instance_type: string;
	ami_id?: string;
	key_name?: string;
	availability_zone?: string;
	subnet_id?: string;
	security_group_ids?: string[];
	iam_instance_profile?: string;
	root_block_device?: {
		volume_size?: number;
		volume_type?: "gp2" | "gp3" | "io1" | "io2" | "st1" | "sc1" | "standard";
		delete_on_termination?: boolean;
		encrypted?: boolean;
	};
	ebs_block_device?: Array<{
		device_name: string;
		volume_size?: number;
		volume_type?: "gp2" | "gp3" | "io1" | "io2" | "st1" | "sc1" | "standard";
		delete_on_termination?: boolean;
		encrypted?: boolean;
	}>;
	ebs_optimized?: boolean;
	monitoring?: boolean;
	disable_api_termination?: boolean;
	shutdown_behavior?: "stop" | "terminate";
	user_data?: string;
	user_data_replace_on_change?: boolean;
	associate_public_ip_address?: boolean;
	private_ip?: string;
	ipv6_address_count?: number;
	ipv6_addresses?: string[];
	tenancy?: "default" | "dedicated" | "host";
	host_id?: string;
	placement_group?: string;
	metadata_options?: {
		http_endpoint?: "enabled" | "disabled";
		http_tokens?: "optional" | "required";
		http_put_response_hop_limit?: number;
		instance_metadata_tags?: "enabled" | "disabled";
	};
	cpu_core_count?: number;
	cpu_threads_per_core?: number;
	cpu_credits?: "standard" | "unlimited";
	tags?: Record<string, string>;
	volume_tags?: Record<string, string>;
}

/**
 * Frontend Subnet configuration
 * @interface FrontendSubnetConfiguration
 */
export interface FrontendSubnetConfiguration {
	cidr_block: string;
	vpc_id: string;
	availability_zone: string;
	availability_zone_id?: string;
	description?: string;
	subnet_type?: "public" | "private";
	map_public_ip_on_launch?: boolean;
	assign_ipv6_address_on_creation?: boolean;
	customer_owned_ipv4_pool?: string;
	enable_dns64?: boolean;
	enable_resource_name_dns_a_record_on_launch?: boolean;
	enable_resource_name_dns_aaaa_record_on_launch?: boolean;
	ipv6_cidr_block?: string;
	ipv6_native?: boolean;
	outpost_arn?: string;
	private_dns_hostname_type_on_launch?: "ip-name" | "resource-name";
	tags?: Record<string, string>;
}

/**
 * Frontend AWS Region configuration
 * @interface FrontendAWSRegionConfiguration
 */
export interface FrontendAWSRegionConfiguration {
	region: string;
	region_name: string;
	description: string;
	is_enabled: boolean;
	is_default: boolean;
	tags: Record<string, string>;
}

/**
 * Frontend Availability Zone configuration
 * @interface FrontendAvailabilityZoneConfiguration
 */
export interface FrontendAvailabilityZoneConfiguration {
	availability_zone: string;
	description: string;
	is_enabled: boolean;
	is_preferred: boolean;
	tags: Record<string, string>;
}

/**
 * Frontend Security Group configuration
 * @interface FrontendSecurityGroupConfiguration
 */
export interface FrontendSecurityGroupConfiguration {
	name?: string;
	name_prefix?: string;
	group_id?: string;
	vpc_id: string;
	description?: string;
	ingress_rules: FrontendSecurityGroupRule[];
	egress_rules: FrontendSecurityGroupRule[];
	revoke_rules_on_delete?: boolean;
	tags?: Record<string, string>;
}

/**
 * Frontend Security Group rule configuration
 * @interface FrontendSecurityGroupRule
 */
export interface FrontendSecurityGroupRule {
	protocol: "tcp" | "udp" | "icmp" | "icmpv6" | "all" | string;
	from_port?: number;
	to_port?: number;
	cidr_blocks?: string[];
	ipv6_cidr_blocks?: string[];
	source_security_group_id?: string;
	self?: boolean;
	prefix_list_ids?: string[];
	description?: string;
}

/**
 * Frontend Internet Gateway configuration
 * @interface FrontendInternetGatewayConfiguration
 */
export interface FrontendInternetGatewayConfiguration {
	vpc_id?: string;
	description?: string;
	create_default_route_to_internet?: boolean;
	tags?: Record<string, string>;
}

/**
 * Frontend NAT Gateway configuration
 * @interface FrontendNATGatewayConfiguration
 */
export interface FrontendNATGatewayConfiguration {
	subnet_id: string;
	allocation_id?: string;
	connectivity_type?: "public" | "private";
	private_ip?: string;
	create_eip?: boolean;
	description?: string;
	tags?: Record<string, string>;
}

/**
 * Frontend Route Table configuration
 * @interface FrontendRouteTableConfiguration
 */
export interface FrontendRouteTableConfiguration {
	vpc_id: string;
	routes?: Record<string, FrontendRoute>;
	associations?: Record<string, FrontendRouteTableAssociation>;
	propagating_vgws?: string[];
	description?: string;
	tags?: Record<string, string>;
}

/**
 * Frontend route definition (matches backend structure)
 * @interface FrontendRoute
 */
export interface FrontendRoute {
	destination_cidr_block?: string;
	destination_ipv6_cidr_block?: string;
	destination_prefix_list_id?: string;
	gateway_id?: string;
	egress_only_gateway_id?: string;
	instance_id?: string;
	nat_gateway_id?: string;
	local_gateway_id?: string;
	network_interface_id?: string;
	transit_gateway_id?: string;
	vpc_endpoint_id?: string;
	vpc_peering_connection_id?: string;
	carrier_gateway_id?: string;
	core_network_arn?: string;
}

/**
 * Frontend route table association (matches backend structure)
 * @interface FrontendRouteTableAssociation
 */
export interface FrontendRouteTableAssociation {
	subnet_id?: string;
	gateway_id?: string;
}

/**
 * Frontend S3 configuration (matches backend structure)
 * @interface FrontendS3Configuration
 */
export interface FrontendS3Configuration {
	bucket_name?: string;
	acl?: string;
	versioning_enabled?: boolean;
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

/**
 * Frontend RDS configuration (matches backend structure)
 * @interface FrontendRDSConfiguration
 */
export interface FrontendRDSConfiguration {
	engine: string;
	engine_version?: string;
	instance_class: string;
	allocated_storage?: number;
	storage_type?: string;
	db_name?: string;
	username?: string;
	password?: string;
	vpc_security_group_ids?: string[];
	db_subnet_group_name?: string;
	multi_az?: boolean;
	publicly_accessible?: boolean;
	backup_retention_period?: number;
	tags?: Record<string, string>;
}

/**
 * Union type for all frontend AWS resource configurations
 * @type {FrontendAWSResourceConfiguration}
 */
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
	| FrontendS3Configuration
	| FrontendRDSConfiguration
	| Record<string, any>;

