import { ArchitectureParserService, ParsedArchitecture } from '../../../src/services/ArchitectureParserService';
import { ArchitectureData, ArchitectureNode, NodeConnection } from '../../../src/models/Architecture';

describe('ArchitectureParserService', () => {
    // Helper function to create valid ArchitectureData for tests
  function createArchitectureData(
    nodes: Partial<ArchitectureNode>[] = [],
    connections: Partial<NodeConnection>[] = []
  ): ArchitectureData {
    const baseMetadata = {
      name: 'test-architecture',
      version: '1.0.0',
      provider: 'aws',
      createdAt: '2025-09-19T12:00:00.000Z',
      lastModified: '2025-09-19T12:00:00.000Z'
    };

    const processedNodes: ArchitectureNode[] = nodes.map((node, index) => ({
      id: node.id || `node-${index}`,
      resourceType: node.resourceType || 'aws-vpc',
      name: node.name || `resource-${index}`,
      nodeType: (node.nodeType as 'awsService' | 'awsContainer') || 'awsService',
      icon: node.icon || 'default',
      position: node.position || { x: 0, y: 0 },
      dimensions: node.dimensions || { width: 100, height: 50 },
      configuration: node.configuration || {},
      ...(node.parentId && { parentId: node.parentId })
    }));

    const processedConnections: NodeConnection[] = connections.map((conn, index) => ({
      id: conn.id || `connection-${index}`,
      source: conn.source || `node-${index}`,
      target: conn.target || `node-${index + 1}`,
      sourceHandle: conn.sourceHandle,
      targetHandle: conn.targetHandle,
      type: conn.type || 'default'
    }));

    return {
      metadata: baseMetadata,
      nodes: processedNodes,
      connections: processedConnections
    };
  }

  describe('parseArchitecture', () => {
    describe('Happy Path Tests', () => {
      it('should successfully parse valid architecture data with basic resources', () => {
        const architectureData = createArchitectureData([
          {
            id: 'vpc-1',
            resourceType: 'aws-vpc',
            name: 'main-vpc',
            icon: 'vpc',
            configuration: {
              cidr_block: '10.0.0.0/16',
              enable_dns_hostnames: true,
              enable_dns_support: true
            }
          }
        ]);

        const result = ArchitectureParserService.parseArchitecture(architectureData);

        expect(result).toBeDefined();
        expect(result.nodes).toHaveLength(1);
        expect(result.nodes[0].terraformModule).toBe('networking/vpc');
        expect(result.nodes[0].configuration.cidr_block).toBe('10.0.0.0/16');
        expect(result.metadata.provider).toBe('aws');
        expect(result.validation.valid).toBe(true);
        expect(result.validation.errors).toHaveLength(0);
      });

      it('should correctly map all supported AWS resource types', () => {
        const architectureData = createArchitectureData([
          { id: 'vpc-1', resourceType: 'aws-vpc', name: 'vpc', icon: 'vpc', configuration: { cidr_block: '10.0.0.0/16' } },
          { id: 'subnet-1', resourceType: 'aws-subnet', name: 'subnet', icon: 'subnet', configuration: { cidr_block: '10.0.1.0/24', availability_zone: 'us-east-1a' } },
          { id: 'igw-1', resourceType: 'aws-internet-gateway', name: 'igw', icon: 'internet-gateway', configuration: { vpc_id: 'vpc-1' } },
          { id: 'rt-1', resourceType: 'aws-route-table', name: 'rt', icon: 'route-table', configuration: { vpc_id: 'vpc-1' } },
          { id: 'sg-1', resourceType: 'aws-security-group', name: 'sg', icon: 'security-group', configuration: { name: 'test-sg' } },
          { id: 'ec2-1', resourceType: 'aws-ec2', name: 'instance', icon: 'ec2', configuration: { instance_type: 't3.micro' } },
          { id: 's3-1', resourceType: 'aws-s3', name: 'bucket', icon: 's3', configuration: { bucket_name: 'test-bucket' } }
        ]);

        const result = ArchitectureParserService.parseArchitecture(architectureData);

        const moduleMap = new Map(result.nodes.map(node => [node.id, node.terraformModule]));
        
        expect(moduleMap.get('vpc-1')).toBe('networking/vpc');
        expect(moduleMap.get('subnet-1')).toBe('networking/subnet');
        expect(moduleMap.get('igw-1')).toBe('networking/internet-gateway');
        expect(moduleMap.get('rt-1')).toBe('networking/route-table');
        expect(moduleMap.get('sg-1')).toBe('security/security-group');
        expect(moduleMap.get('ec2-1')).toBe('compute/ec2');
        expect(moduleMap.get('s3-1')).toBe('storage/s3');
      });

      it('should apply default configurations when optional fields are missing', () => {
        const architectureData = createArchitectureData([
          {
            id: 'minimal-node',
            resourceType: 'aws-vpc',
            name: 'minimal-vpc',
            icon: 'vpc',
            configuration: {}
          }
        ]);

        const result = ArchitectureParserService.parseArchitecture(architectureData);

        expect(result.nodes[0].configuration.tags).toBeDefined();
        expect(result.nodes[0].position).toEqual({ x: 0, y: 0 });
        expect(result.nodes[0].dimensions).toEqual({ width: 100, height: 50 });
        expect(result.metadata.tags).toHaveProperty('Environment');
        expect(result.metadata.tags).toHaveProperty('ManagedBy', 'Darch');
      });

      it('should handle empty architecture data gracefully', () => {
        const emptyArchitectureData = createArchitectureData();

        const result = ArchitectureParserService.parseArchitecture(emptyArchitectureData);

        expect(result.nodes).toHaveLength(0);
        expect(result.connections).toHaveLength(0);
        expect(result.validation.valid).toBe(true);
      });
    });

    describe('Validation Tests', () => {
      it('should validate required fields for each resource type', () => {
        const architectureData = createArchitectureData([
          { id: 'invalid-vpc', resourceType: 'aws-vpc', name: 'vpc', icon: 'vpc', configuration: {} },
          { id: 'invalid-igw', resourceType: 'aws-internet-gateway', name: 'igw', icon: 'igw', configuration: {} }
        ]);

        const result = ArchitectureParserService.parseArchitecture(architectureData);

        expect(result.validation.valid).toBe(false);
        expect(result.validation.errors.length).toBeGreaterThan(0);
        
        const vpcErrors = result.validation.errors.filter(e => e.nodeId === 'invalid-vpc');
        const igwErrors = result.validation.errors.filter(e => e.nodeId === 'invalid-igw');
        
        expect(vpcErrors.some(e => e.field === 'cidr_block')).toBe(true);
        expect(igwErrors.some(e => e.field === 'vpc_id')).toBe(true);
      });

      it('should validate CIDR block formats', () => {
        const architectureData = createArchitectureData([
          {
            id: 'invalid-cidr-vpc',
            resourceType: 'aws-vpc',
            name: 'vpc',
            icon: 'vpc',
            configuration: { cidr_block: 'invalid-cidr' }
          }
        ]);

        const result = ArchitectureParserService.parseArchitecture(architectureData);

        expect(result.validation.valid).toBe(false);
        expect(result.validation.errors.some(e => 
          e.field === 'cidr_block' && e.message.includes('Invalid CIDR')
        )).toBe(true);
      });

      it('should generate security warnings for overly permissive rules', () => {
        const architectureData = createArchitectureData([
          {
            id: 'insecure-sg',
            resourceType: 'aws-security-group',
            name: 'insecure-sg',
            icon: 'security-group',
            configuration: {
              name: 'insecure-sg',
              ingress_rules: [
                {
                  from_port: 22,
                  to_port: 22,
                  protocol: 'tcp',
                  cidr_blocks: ['0.0.0.0/0']
                }
              ]
            }
          }
        ]);

        const result = ArchitectureParserService.parseArchitecture(architectureData);

        expect(result.validation.warnings.some(w => 
          w.type === 'security' && w.message.includes('0.0.0.0/0')
        )).toBe(true);
      });
    });

    describe('Unsupported Resource Handling', () => {
      it('should log warnings for unsupported resources and use fallback module', () => {
        const architectureData = createArchitectureData([
          {
            id: 'unsupported-resource',
            resourceType: 'aws-unknown-service',
            name: 'unknown',
            icon: 'unknown',
            configuration: {}
          }
        ]);

        const result = ArchitectureParserService.parseArchitecture(architectureData);

        const unsupportedNode = result.nodes.find(n => n.id === 'unsupported-resource');
        expect(unsupportedNode?.terraformModule).toBe('compute/ec2'); // fallback
        expect(result.validation.valid).toBe(true); // Should not fail, just warn
      });

      it('should not crash when processing malformed node data', () => {
        const architectureData = createArchitectureData([
          {
            id: 'malformed-node',
            resourceType: '', // empty resource type
            name: 'malformed',
            icon: 'malformed',
            configuration: {}
          }
        ]);

        expect(() => {
          ArchitectureParserService.parseArchitecture(architectureData);
        }).not.toThrow();
      });
    });

    describe('Edge Cases', () => {
      it('should handle connections without proper node references', () => {
        const invalidConnectionsData = createArchitectureData(
          [{ id: 'existing-node', resourceType: 'aws-vpc', name: 'vpc', icon: 'vpc', configuration: { cidr_block: '10.0.0.0/16' } }],
          [{ source: 'existing-node', target: 'non-existing-node' }]
        );

        const result = ArchitectureParserService.parseArchitecture(invalidConnectionsData);

        expect(result.validation.valid).toBe(false);
        expect(result.validation.errors.some(e => 
          e.message.includes('non-existent target node')
        )).toBe(true);
      });
    });
  });

  describe('mapResourceTypeToModule', () => {
    it('should map new resource types correctly', () => {
      const testCases = [
        { resourceType: 'aws-internet-gateway', expected: 'networking/internet-gateway' },
        { resourceType: 'internet-gateway', expected: 'networking/internet-gateway' },
        { resourceType: 'igw', expected: 'networking/internet-gateway' },
        { resourceType: 'aws-route-table', expected: 'networking/route-table' },
        { resourceType: 'route-table', expected: 'networking/route-table' },
        { resourceType: 'rt', expected: 'networking/route-table' }
      ];

      for (const testCase of testCases) {
        const architectureData = createArchitectureData([
          {
            id: 'test-node',
            resourceType: testCase.resourceType,
            name: 'test',
            icon: 'test',
            configuration: {}
          }
        ]);

        const result = ArchitectureParserService.parseArchitecture(architectureData);
        expect(result.nodes[0].terraformModule).toBe(testCase.expected);
      }
    });
  });
});
