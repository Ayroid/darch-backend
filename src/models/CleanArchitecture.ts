/**
 * Clean Architecture Data Structure
 * 
 * This file defines a cleaner, more organized structure for architecture data
 * while maintaining backward compatibility with the existing system.
 */

export interface CleanArchitectureData {
  // Project metadata
  metadata: ProjectMetadata;
  
  // Infrastructure specification
  infrastructure: InfrastructureSpec;
  
  // Deployment configuration
  deployment: DeploymentConfig;
}

// ===== PROJECT METADATA =====
export interface ProjectMetadata {
  name: string;
  description?: string;
  version: string;
  
  // Cloud provider configuration
  provider: CloudProvider;
  
  // Environment and project info
  environment: string;
  project: string;
  
  // Timestamps
  createdAt: string;
  lastModified: string;
  
  // Tags for resource organization
  tags: Record<string, string>;
  
  // Optional metadata
  author?: string;
  team?: string;
  cost_center?: string;
}

export interface CloudProvider {
  name: 'aws' | 'azure' | 'gcp';
  region: string;
  availability_zones?: string[];
  credentials?: ProviderCredentials;
}

export interface ProviderCredentials {
  profile?: string;
  access_key_id?: string;
  secret_access_key?: string;
  role_arn?: string;
}

// ===== INFRASTRUCTURE SPECIFICATION =====
export interface InfrastructureSpec {
  // Network configuration
  network: NetworkConfiguration;
  
  // Compute resources
  compute: ComputeConfiguration;
  
  // Storage resources
  storage: StorageConfiguration;
  
  // Security configuration
  security: SecurityConfiguration;
  
  // Database resources
  database?: DatabaseConfiguration;
  
  // Load balancers
  load_balancers?: LoadBalancerConfiguration[];
  
  // Custom resources
  custom_resources?: CustomResourceConfiguration[];
}

// ===== NETWORK CONFIGURATION =====
export interface NetworkConfiguration {
  vpc: VPCConfiguration;
  subnets: SubnetConfiguration[];
  route_tables?: RouteTableConfiguration[];
  internet_gateways?: InternetGatewayConfiguration[];
  nat_gateways?: NATGatewayConfiguration[];
}

export interface VPCConfiguration {
  id: string;
  name: string;
  cidr_block: string;
  enable_dns_hostnames: boolean;
  enable_dns_support: boolean;
  tags?: Record<string, string>;
}

export interface SubnetConfiguration {
  id: string;
  name: string;
  vpc_id: string;
  cidr_block: string;
  availability_zone: string;
  type: 'public' | 'private' | 'database';
  map_public_ip_on_launch: boolean;
  tags?: Record<string, string>;
}

export interface RouteTableConfiguration {
  id: string;
  name: string;
  vpc_id: string;
  routes: RouteConfiguration[];
  subnet_associations: string[];
  tags?: Record<string, string>;
}

export interface RouteConfiguration {
  destination_cidr_block: string;
  gateway_id?: string;
  nat_gateway_id?: string;
  instance_id?: string;
}

export interface InternetGatewayConfiguration {
  id: string;
  name: string;
  vpc_id: string;
  tags?: Record<string, string>;
}

export interface NATGatewayConfiguration {
  id: string;
  name: string;
  subnet_id: string;
  allocation_id?: string;
  tags?: Record<string, string>;
}

// ===== COMPUTE CONFIGURATION =====
export interface ComputeConfiguration {
  instances: EC2Configuration[];
  launch_templates?: LaunchTemplateConfiguration[];
  auto_scaling_groups?: AutoScalingGroupConfiguration[];
}

export interface EC2Configuration {
  id: string;
  name: string;
  instance_type: string;
  ami_id: string;
  subnet_id: string;
  security_group_ids: string[];
  associate_public_ip_address: boolean;
  
  // Storage configuration
  root_block_device: BlockDeviceConfiguration;
  ebs_block_devices?: BlockDeviceConfiguration[];
  
  // Instance configuration
  key_pair?: string;
  user_data?: string;
  iam_instance_profile?: string;
  
  // Monitoring and maintenance
  monitoring?: boolean;
  detailed_monitoring?: boolean;
  disable_api_termination?: boolean;
  
  tags?: Record<string, string>;
}

export interface BlockDeviceConfiguration {
  device_name?: string;
  volume_type: 'gp2' | 'gp3' | 'io1' | 'io2' | 'st1' | 'sc1';
  volume_size: number;
  iops?: number;
  throughput?: number;
  encrypted: boolean;
  kms_key_id?: string;
  delete_on_termination: boolean;
}

export interface LaunchTemplateConfiguration {
  id: string;
  name: string;
  version?: string;
  instance_type: string;
  ami_id: string;
  security_group_ids: string[];
  user_data?: string;
  tags?: Record<string, string>;
}

export interface AutoScalingGroupConfiguration {
  id: string;
  name: string;
  launch_template_id: string;
  min_size: number;
  max_size: number;
  desired_capacity: number;
  vpc_zone_identifiers: string[];
  health_check_type: 'EC2' | 'ELB';
  health_check_grace_period?: number;
  tags?: Record<string, string>;
}

// ===== STORAGE CONFIGURATION =====
export interface StorageConfiguration {
  s3_buckets?: S3BucketConfiguration[];
  efs_file_systems?: EFSConfiguration[];
  ebs_volumes?: EBSVolumeConfiguration[];
}

export interface S3BucketConfiguration {
  id: string;
  name: string;
  bucket_name: string;
  
  // Access control
  acl?: string;
  public_read_access?: boolean;
  public_write_access?: boolean;
  
  // Encryption
  encryption?: S3EncryptionConfiguration;
  
  // Versioning
  versioning?: boolean;
  
  // Lifecycle
  lifecycle_rules?: S3LifecycleRule[];
  
  tags?: Record<string, string>;
}

export interface S3EncryptionConfiguration {
  sse_algorithm: 'AES256' | 'aws:kms';
  kms_key_id?: string;
}

export interface S3LifecycleRule {
  id: string;
  status: 'Enabled' | 'Disabled';
  expiration_days?: number;
  transition_rules?: S3TransitionRule[];
}

export interface S3TransitionRule {
  days: number;
  storage_class: 'STANDARD_IA' | 'ONEZONE_IA' | 'GLACIER' | 'DEEP_ARCHIVE';
}

export interface EFSConfiguration {
  id: string;
  name: string;
  performance_mode: 'generalPurpose' | 'maxIO';
  throughput_mode: 'provisioned' | 'bursting';
  encrypted: boolean;
  kms_key_id?: string;
  tags?: Record<string, string>;
}

export interface EBSVolumeConfiguration {
  id: string;
  name: string;
  availability_zone: string;
  size: number;
  type: 'gp2' | 'gp3' | 'io1' | 'io2' | 'st1' | 'sc1';
  iops?: number;
  encrypted: boolean;
  kms_key_id?: string;
  tags?: Record<string, string>;
}

// ===== SECURITY CONFIGURATION =====
export interface SecurityConfiguration {
  security_groups: SecurityGroupConfiguration[];
  nacls?: NACLConfiguration[];
  iam_roles?: IAMRoleConfiguration[];
  kms_keys?: KMSKeyConfiguration[];
}

export interface SecurityGroupConfiguration {
  id: string;
  name: string;
  description: string;
  vpc_id: string;
  ingress_rules: SecurityGroupRule[];
  egress_rules: SecurityGroupRule[];
  tags?: Record<string, string>;
}

export interface SecurityGroupRule {
  description?: string;
  from_port: number;
  to_port: number;
  protocol: string;
  cidr_blocks?: string[];
  ipv6_cidr_blocks?: string[];
  security_group_ids?: string[];
  self?: boolean;
}

export interface NACLConfiguration {
  id: string;
  name: string;
  vpc_id: string;
  subnet_ids: string[];
  ingress_rules: NACLRule[];
  egress_rules: NACLRule[];
  tags?: Record<string, string>;
}

export interface NACLRule {
  rule_number: number;
  protocol: string;
  rule_action: 'allow' | 'deny';
  from_port?: number;
  to_port?: number;
  cidr_block: string;
}

export interface IAMRoleConfiguration {
  id: string;
  name: string;
  assume_role_policy: string;
  policies?: string[];
  inline_policies?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface KMSKeyConfiguration {
  id: string;
  name: string;
  description: string;
  deletion_window?: number;
  enable_key_rotation?: boolean;
  policy?: string;
  tags?: Record<string, string>;
}

// ===== DATABASE CONFIGURATION =====
export interface DatabaseConfiguration {
  rds_instances?: RDSConfiguration[];
  aurora_clusters?: AuroraConfiguration[];
  dynamodb_tables?: DynamoDBConfiguration[];
}

export interface RDSConfiguration {
  id: string;
  name: string;
  engine: string;
  engine_version: string;
  instance_class: string;
  allocated_storage: number;
  max_allocated_storage?: number;
  storage_type: 'gp2' | 'gp3' | 'io1' | 'io2';
  
  // Network
  db_subnet_group_name: string;
  vpc_security_group_ids: string[];
  publicly_accessible: boolean;
  
  // Database configuration
  database_name?: string;
  username: string;
  password?: string;
  manage_master_user_password?: boolean;
  
  // Backup and maintenance
  backup_retention_period: number;
  backup_window?: string;
  maintenance_window?: string;
  
  // Monitoring
  performance_insights_enabled?: boolean;
  monitoring_interval?: number;
  
  // Encryption
  storage_encrypted: boolean;
  kms_key_id?: string;
  
  tags?: Record<string, string>;
}

export interface AuroraConfiguration {
  id: string;
  name: string;
  cluster_identifier: string;
  engine: 'aurora-mysql' | 'aurora-postgresql';
  engine_version: string;
  
  // Database configuration
  database_name?: string;
  master_username: string;
  master_password?: string;
  
  // Network
  db_subnet_group_name: string;
  vpc_security_group_ids: string[];
  
  // Instances
  instances: AuroraInstanceConfiguration[];
  
  // Backup
  backup_retention_period: number;
  preferred_backup_window?: string;
  preferred_maintenance_window?: string;
  
  // Encryption
  storage_encrypted: boolean;
  kms_key_id?: string;
  
  tags?: Record<string, string>;
}

export interface AuroraInstanceConfiguration {
  id: string;
  instance_class: string;
  publicly_accessible: boolean;
  performance_insights_enabled?: boolean;
  monitoring_interval?: number;
}

export interface DynamoDBConfiguration {
  id: string;
  name: string;
  table_name: string;
  
  // Schema
  hash_key: string;
  range_key?: string;
  attributes: DynamoDBAttribute[];
  
  // Capacity
  billing_mode: 'PAY_PER_REQUEST' | 'PROVISIONED';
  read_capacity?: number;
  write_capacity?: number;
  
  // Indexes
  global_secondary_indexes?: DynamoDBGSI[];
  local_secondary_indexes?: DynamoDBLSI[];
  
  // Features
  stream_enabled?: boolean;
  stream_view_type?: 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES';
  point_in_time_recovery?: boolean;
  
  // Encryption
  server_side_encryption?: boolean;
  kms_key_arn?: string;
  
  tags?: Record<string, string>;
}

export interface DynamoDBAttribute {
  name: string;
  type: 'S' | 'N' | 'B';
}

export interface DynamoDBGSI {
  name: string;
  hash_key: string;
  range_key?: string;
  read_capacity?: number;
  write_capacity?: number;
  projection_type: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
  non_key_attributes?: string[];
}

export interface DynamoDBLSI {
  name: string;
  range_key: string;
  projection_type: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
  non_key_attributes?: string[];
}

// ===== LOAD BALANCER CONFIGURATION =====
export interface LoadBalancerConfiguration {
  id: string;
  name: string;
  type: 'application' | 'network' | 'gateway';
  scheme: 'internet-facing' | 'internal';
  subnet_ids: string[];
  security_group_ids?: string[];
  
  // Listeners
  listeners: LoadBalancerListener[];
  
  // Target groups
  target_groups: TargetGroupConfiguration[];
  
  tags?: Record<string, string>;
}

export interface LoadBalancerListener {
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS' | 'UDP' | 'TCP_UDP';
  ssl_policy?: string;
  certificate_arn?: string;
  default_action: ListenerAction;
}

export interface ListenerAction {
  type: 'forward' | 'redirect' | 'fixed-response';
  target_group_arn?: string;
  redirect?: RedirectAction;
  fixed_response?: FixedResponseAction;
}

export interface RedirectAction {
  protocol?: 'HTTP' | 'HTTPS';
  port?: string;
  host?: string;
  path?: string;
  query?: string;
  status_code: '301' | '302';
}

export interface FixedResponseAction {
  content_type: string;
  message_body?: string;
  status_code: string;
}

export interface TargetGroupConfiguration {
  id: string;
  name: string;
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS' | 'UDP' | 'TCP_UDP';
  vpc_id: string;
  target_type: 'instance' | 'ip' | 'lambda';
  
  // Health check
  health_check: HealthCheckConfiguration;
  
  // Targets
  targets: TargetConfiguration[];
  
  tags?: Record<string, string>;
}

export interface HealthCheckConfiguration {
  enabled: boolean;
  healthy_threshold: number;
  unhealthy_threshold: number;
  timeout: number;
  interval: number;
  path?: string;
  matcher?: string;
  port?: string;
  protocol?: 'HTTP' | 'HTTPS' | 'TCP';
}

export interface TargetConfiguration {
  id: string;
  port?: number;
  availability_zone?: string;
}

// ===== CUSTOM RESOURCES =====
export interface CustomResourceConfiguration {
  id: string;
  name: string;
  type: string;
  provider: string;
  configuration: Record<string, any>;
  dependencies?: string[];
  tags?: Record<string, string>;
}

// ===== DEPLOYMENT CONFIGURATION =====
export interface DeploymentConfig {
  // Terraform configuration
  terraform: TerraformConfig;
  
  // Dependencies between resources
  dependencies: ResourceDependency[];
  
  // Variables and outputs
  variables?: Record<string, VariableDefinition>;
  outputs?: Record<string, OutputDefinition>;
  
  // Deployment strategy
  strategy: DeploymentStrategy;
}

export interface TerraformConfig {
  version: string;
  backend?: BackendConfiguration;
  required_providers: Record<string, ProviderRequirement>;
}

export interface BackendConfiguration {
  type: 's3' | 'azurerm' | 'gcs' | 'local';
  configuration: Record<string, any>;
}

export interface ProviderRequirement {
  source: string;
  version: string;
}

export interface ResourceDependency {
  source: string;
  target: string;
  type: 'explicit' | 'implicit';
  relationship: 'contains' | 'depends_on' | 'secures' | 'connects_to';
}

export interface VariableDefinition {
  type: string;
  description?: string;
  default?: any;
  sensitive?: boolean;
  validation?: VariableValidation[];
}

export interface VariableValidation {
  condition: string;
  error_message: string;
}

export interface OutputDefinition {
  description?: string;
  value: string;
  sensitive?: boolean;
}

export interface DeploymentStrategy {
  type: 'single' | 'rolling' | 'blue_green';
  parallel_deployments?: number;
  rollback_on_failure?: boolean;
  timeout?: number;
}

// ===== UTILITY TYPES =====
export interface ResourcePosition {
  x: number;
  y: number;
}

export interface ResourceDimensions {
  width: number;
  height: number;
}

// ===== CONVERSION UTILITIES =====
export interface LegacyToCleanConverter {
  convertFromLegacy(legacyData: any): CleanArchitectureData;
  convertToLegacy(cleanData: CleanArchitectureData): any;
}
