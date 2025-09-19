import { describe, it, expect } from '@jest/globals';
import { ValidationUtils } from '../../../src/utils/ValidationUtils';

describe('ValidationUtils', () => {
  describe('validateRequiredFields', () => {
    it('should return empty array when all required fields are present', () => {
      const obj = {
        name: 'test',
        version: '1.0.0',
        provider: 'aws'
      };
      const requiredFields = ['name', 'version', 'provider'];

      const missing = ValidationUtils.validateRequiredFields(obj, requiredFields);

      expect(missing).toEqual([]);
    });

    it('should return missing fields when some are undefined', () => {
      const obj = {
        name: 'test',
        provider: 'aws'
        // version is missing
      };
      const requiredFields = ['name', 'version', 'provider'];

      const missing = ValidationUtils.validateRequiredFields(obj, requiredFields);

      expect(missing).toEqual(['version']);
    });

    it('should return missing fields when some are null', () => {
      const obj = {
        name: 'test',
        version: null,
        provider: 'aws'
      };
      const requiredFields = ['name', 'version', 'provider'];

      const missing = ValidationUtils.validateRequiredFields(obj, requiredFields);

      expect(missing).toEqual(['version']);
    });

    it('should return all fields when object is null', () => {
      const requiredFields = ['name', 'version', 'provider'];

      const missing = ValidationUtils.validateRequiredFields(null, requiredFields);

      expect(missing).toEqual(['name', 'version', 'provider']);
    });

    it('should return all fields when object is undefined', () => {
      const requiredFields = ['name', 'version', 'provider'];

      const missing = ValidationUtils.validateRequiredFields(undefined, requiredFields);

      expect(missing).toEqual(['name', 'version', 'provider']);
    });

    it('should handle empty required fields array', () => {
      const obj = { name: 'test' };
      const requiredFields: string[] = [];

      const missing = ValidationUtils.validateRequiredFields(obj, requiredFields);

      expect(missing).toEqual([]);
    });

    it('should handle nested field access', () => {
      const obj = {
        metadata: {
          name: 'test'
        }
      };

      // This tests direct field access, not nested - ValidationUtils doesn't handle nested by default
      const missing = ValidationUtils.validateRequiredFields(obj, ['metadata']);

      expect(missing).toEqual([]);
    });
  });

  describe('validateArchitectureData', () => {
    it('should validate complete architecture data successfully', () => {
      const validArchitecture = {
        metadata: {
          name: 'test-architecture',
          version: '1.0.0',
          createdAt: '2025-09-19T12:00:00.000Z',
          lastModified: '2025-09-19T12:00:00.000Z',
          provider: 'aws'
        },
        nodes: [
          {
            id: 'node-1',
            nodeType: 'awsService',
            resourceType: 'aws-vpc',
            name: 'vpc',
            position: { x: 0, y: 0 }
          }
        ],
        connections: []
      };

      const result = ValidationUtils.validateArchitectureData(validArchitecture);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject null or undefined architecture data', () => {
      const result = ValidationUtils.validateArchitectureData(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Architecture data is required');
    });

    it('should require metadata object', () => {
      const architectureWithoutMetadata = {
        nodes: [],
        connections: []
      };

      const result = ValidationUtils.validateArchitectureData(architectureWithoutMetadata);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('metadata is required');
    });

    it('should validate metadata required fields', () => {
      const architectureWithIncompleteMetadata = {
        metadata: {
          name: 'test'
          // missing version, createdAt, lastModified, provider
        },
        nodes: [],
        connections: []
      };

      const result = ValidationUtils.validateArchitectureData(architectureWithIncompleteMetadata);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('metadata.version is required');
      expect(result.errors).toContain('metadata.createdAt is required');
      expect(result.errors).toContain('metadata.lastModified is required');
      expect(result.errors).toContain('metadata.provider is required');
    });

    it('should require nodes to be an array', () => {
      const architectureWithInvalidNodes = {
        metadata: {
          name: 'test',
          version: '1.0.0',
          createdAt: '2025-09-19T12:00:00.000Z',
          lastModified: '2025-09-19T12:00:00.000Z',
          provider: 'aws'
        },
        nodes: 'not-an-array',
        connections: []
      };

      const result = ValidationUtils.validateArchitectureData(architectureWithInvalidNodes);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('nodes must be an array');
    });

    it('should validate node required fields', () => {
      const architectureWithIncompleteNode = {
        metadata: {
          name: 'test',
          version: '1.0.0',
          createdAt: '2025-09-19T12:00:00.000Z',
          lastModified: '2025-09-19T12:00:00.000Z',
          provider: 'aws'
        },
        nodes: [
          {
            id: 'node-1',
            nodeType: 'awsService'
            // missing resourceType, name, position
          }
        ],
        connections: []
      };

      const result = ValidationUtils.validateArchitectureData(architectureWithIncompleteNode);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('nodes[0].resourceType is required');
      expect(result.errors).toContain('nodes[0].name is required');
      expect(result.errors).toContain('nodes[0].position is required');
    });

    it('should validate multiple nodes independently', () => {
      const architectureWithMultipleIncompleteNodes = {
        metadata: {
          name: 'test',
          version: '1.0.0',
          createdAt: '2025-09-19T12:00:00.000Z',
          lastModified: '2025-09-19T12:00:00.000Z',
          provider: 'aws'
        },
        nodes: [
          {
            id: 'node-1',
            nodeType: 'awsService',
            resourceType: 'aws-vpc',
            name: 'vpc',
            position: { x: 0, y: 0 }
          },
          {
            id: 'node-2',
            nodeType: 'awsService'
            // missing resourceType, name, position
          }
        ],
        connections: []
      };

      const result = ValidationUtils.validateArchitectureData(architectureWithMultipleIncompleteNodes);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('nodes[1].resourceType is required');
      expect(result.errors).toContain('nodes[1].name is required');
      expect(result.errors).toContain('nodes[1].position is required');
      // First node should be valid, so no errors for nodes[0]
      expect(result.errors.filter(e => e.includes('nodes[0]'))).toHaveLength(0);
    });

    it('should require connections to be an array', () => {
      const architectureWithInvalidConnections = {
        metadata: {
          name: 'test',
          version: '1.0.0',
          createdAt: '2025-09-19T12:00:00.000Z',
          lastModified: '2025-09-19T12:00:00.000Z',
          provider: 'aws'
        },
        nodes: [],
        connections: 'not-an-array'
      };

      const result = ValidationUtils.validateArchitectureData(architectureWithInvalidConnections);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('connections must be an array');
    });

    it('should handle missing nodes and connections', () => {
      const architectureWithMissingArrays = {
        metadata: {
          name: 'test',
          version: '1.0.0',
          createdAt: '2025-09-19T12:00:00.000Z',
          lastModified: '2025-09-19T12:00:00.000Z',
          provider: 'aws'
        }
        // nodes and connections are missing
      };

      const result = ValidationUtils.validateArchitectureData(architectureWithMissingArrays);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('nodes must be an array');
      expect(result.errors).toContain('connections must be an array');
    });

    it('should accumulate all validation errors', () => {
      const completelyInvalidArchitecture = {
        // missing metadata
        nodes: 'not-an-array',
        connections: 'not-an-array'
      };

      const result = ValidationUtils.validateArchitectureData(completelyInvalidArchitecture);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('metadata is required');
      expect(result.errors).toContain('nodes must be an array');
      expect(result.errors).toContain('connections must be an array');
    });
  });

  describe('Edge Cases', () => {
    it('should handle objects with prototype properties', () => {
      const obj = Object.create({ inheritedProp: 'value' });
      obj.name = 'test';

      const missing = ValidationUtils.validateRequiredFields(obj, ['name', 'inheritedProp']);

      // Should not find inherited properties
      expect(missing).toContain('inheritedProp');
    });

    it('should handle empty strings as valid values', () => {
      const obj = {
        name: '',
        version: '1.0.0',
        provider: 'aws'
      };
      const requiredFields = ['name', 'version', 'provider'];

      const missing = ValidationUtils.validateRequiredFields(obj, requiredFields);

      expect(missing).toEqual([]);
    });

    it('should handle zero as valid value', () => {
      const obj = {
        count: 0,
        version: '1.0.0'
      };
      const requiredFields = ['count', 'version'];

      const missing = ValidationUtils.validateRequiredFields(obj, requiredFields);

      expect(missing).toEqual([]);
    });

    it('should handle false as valid value', () => {
      const obj = {
        enabled: false,
        version: '1.0.0'
      };
      const requiredFields = ['enabled', 'version'];

      const missing = ValidationUtils.validateRequiredFields(obj, requiredFields);

      expect(missing).toEqual([]);
    });
  });
});
