/**
 * Architecture Data Models
 *
 * This module defines the core data structures for representing cloud architecture
 * diagrams and their conversion to Terraform configurations.
 *
 * The types support both frontend (visual editor) and backend (API) formats,
 * with the ArchitectureNormalizerService handling the conversion.
 */

// ============================================================================
// CORE ARCHITECTURE TYPES
// ============================================================================

/**
 * Metadata for an architecture definition
 */
export interface ArchitectureMetadata {
	name: string;
	description?: string;
	version: string;
	created_at: string;
	last_modified: string;
	provider: string;
	region?: string;
	environment?: string;
	project?: string;
	tags?: Record<string, string>;
}

/**
 * Complete architecture definition with resources and connections
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
 * Connection between two resources
 * Uses snake_case for Terraform compatibility
 */
export interface NodeConnection {
	id: string;
	source: string;
	target: string;
	source_handle?: string;
	target_handle?: string;
	type?: string;
}

// ============================================================================
// FRONTEND-SPECIFIC TYPES (Visual Editor)
// ============================================================================

/**
 * Position coordinates for a frontend resource
 */
export interface FrontendPosition {
	x: number;
	y: number;
}

/**
 * Dimensions for a frontend resource
 */
export interface FrontendDimensions {
	width: number;
	height: number;
}

/**
 * Frontend architecture metadata
 * Uses snake_case for consistency with backend
 */
export interface FrontendArchitectureMetadata {
	name: string;
	description?: string;
	version: string;
	created_at: string;
	last_modified: string;
	provider: string;
	region?: string;
	environment?: string;
	project?: string;
	tags?: Record<string, string>;
	[key: string]: any;
}

/**
 * A frontend resource representing an infrastructure component
 */
export interface FrontendResource {
	id: string;
	node_type: "aws_service" | "aws_container";
	resource_type: string;
	name: string;
	icon: string;
	position: FrontendPosition;
	dimensions?: FrontendDimensions;
	configuration: AWSResourceConfiguration;
	parent_id?: string;
}

/**
 * Frontend connection/edge structure
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
 * Complete frontend architecture definition
 */
export interface FrontendArchitectureData {
	metadata: FrontendArchitectureMetadata;
	resources?: FrontendResource[];
	connections: FrontendConnection[];
	variables?: Record<string, { description: string; type: string; default?: any }>;
	outputs?: Record<string, { description: string; value: string }>;
}

// ============================================================================
// FILE MANAGEMENT TYPES
// ============================================================================

/**
 * Information about a generated Terraform file (file metadata)
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
 */
export interface GeneratedTerraform {
	terraformCode: string;
	filename: string;
	outputPath: string;
	generatedAt: string;
}

// ============================================================================
// AWS RESOURCE CONFIGURATION TYPES
// ============================================================================

/**
 * VPC (Virtual Private Cloud) configuration
 */
export interface VPCConfiguration {
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
 * EC2 (Elastic Compute Cloud) instance configuration
 */
export interface EC2Configuration {
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
 * Subnet configuration
 */
export interface SubnetConfiguration {
	cidr_block: string;
	vpc_id?: string;
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
 * Security Group configuration
 */
export interface SecurityGroupConfiguration {
	name?: string;
	name_prefix?: string;
	group_id?: string;
	vpc_id?: string;
	description?: string;
	ingress_rules?: SecurityGroupRule[];
	egress_rules?: SecurityGroupRule[];
	revoke_rules_on_delete?: boolean;
	tags?: Record<string, string>;
}

/**
 * Security group rule configuration
 */
export interface SecurityGroupRule {
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
 * Internet Gateway configuration
 */
export interface InternetGatewayConfiguration {
	vpc_id?: string;
	description?: string;
	create_default_route_to_internet?: boolean;
	tags?: Record<string, string>;
}

/**
 * NAT Gateway configuration
 */
export interface NATGatewayConfiguration {
	subnet_id?: string;
	allocation_id?: string;
	connectivity_type?: "public" | "private";
	private_ip?: string;
	create_eip?: boolean;
	description?: string;
	tags?: Record<string, string>;
}

/**
 * Route Table configuration
 */
export interface RouteTableConfiguration {
	vpc_id?: string;
	routes?: Record<string, Route>;
	associations?: Record<string, RouteTableAssociation>;
	propagating_vgws?: string[];
	description?: string;
	tags?: Record<string, string>;
}

/**
 * Individual route definition
 */
export interface Route {
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
 * Route table association
 */
export interface RouteTableAssociation {
	subnet_id?: string;
	gateway_id?: string;
}

/**
 * S3 bucket configuration
 */
export interface S3Configuration {
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
 * RDS configuration
 */
export interface RDSConfiguration {
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
 * AWS Region configuration
 */
export interface AWSRegionConfiguration {
	region: string;
	region_name: string;
	description: string;
	is_enabled: boolean;
	is_default: boolean;
	tags?: Record<string, string>;
}

/**
 * Availability Zone configuration
 */
export interface AvailabilityZoneConfiguration {
	availability_zone: string;
	description: string;
	is_enabled: boolean;
	is_preferred: boolean;
	tags?: Record<string, string>;
}

/**
 * Union type for all AWS resource configurations
 */
export type AWSResourceConfiguration =
	| VPCConfiguration
	| EC2Configuration
	| SubnetConfiguration
	| SecurityGroupConfiguration
	| InternetGatewayConfiguration
	| NATGatewayConfiguration
	| RouteTableConfiguration
	| S3Configuration
	| RDSConfiguration
	| AWSRegionConfiguration
	| AvailabilityZoneConfiguration
	| Record<string, any>;

