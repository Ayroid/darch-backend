export interface ArchitectureData {
  metadata: {
    name: string;
    description?: string;
    version: string;
    createdAt: string;
    lastModified: string;
    provider: string;
  };
  nodes: ArchitectureNode[];
  connections: NodeConnection[];
  variables?: Record<string, any>;
  outputs?: Record<string, any>;
}

export interface ArchitectureNode {
  id: string;
  nodeType: 'awsService' | 'awsContainer';
  resourceType: string;
  name: string;
  configuration: Record<string, any>;
  parentId?: string;
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
