export interface TerraformModule {
  name: string;
  category: string;
  path: string;
  description: string;
  version: string;
  variables: ModuleVariable[];
  outputs: ModuleOutput[];
  dependencies: string[];
  tags: string[];
}

export interface ModuleVariable {
  name: string;
  description: string;
  type: string;
  default?: any;
  required: boolean;
  validation?: VariableValidation;
}

export interface VariableValidation {
  condition: string;
  error_message: string;
}

export interface ModuleOutput {
  name: string;
  description: string;
  value: string;
  sensitive?: boolean;
}

export interface ModuleMetadata {
  name: string;
  category: string;
  description: string;
  version: string;
  author: string;
  source: string;
  documentation: string;
  examples: string[];
  dependencies: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ModuleConfiguration {
  module_name: string;
  source: string;
  variables: Record<string, any>;
  depends_on?: string[];
}

export interface GeneratedModule {
  name: string;
  source: string;
  variables: Record<string, any>;
  outputs?: Record<string, string>;
}
