export class ValidationUtils {
  /**
   * Check if required fields are present in object
   */
  static validateRequiredFields(obj: any, requiredFields: string[]): string[] {
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      if (!obj || obj[field] === undefined || obj[field] === null) {
        missingFields.push(field);
      }
    }
    
    return missingFields;
  }

  /**
   * Validate architecture data structure
   */
  static validateArchitectureData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data) {
      errors.push('Architecture data is required');
      return { isValid: false, errors };
    }

    // Check metadata
    if (!data.metadata) {
      errors.push('metadata is required');
    } else {
      const metadataFields = ['name', 'version', 'createdAt', 'lastModified', 'provider'];
      const missingMetadata = this.validateRequiredFields(data.metadata, metadataFields);
      errors.push(...missingMetadata.map(field => `metadata.${field} is required`));
    }

    // Check nodes
    if (!data.nodes || !Array.isArray(data.nodes)) {
      errors.push('nodes must be an array');
    } else {
      data.nodes.forEach((node: any, index: number) => {
        const nodeFields = ['id', 'nodeType', 'resourceType', 'name', 'position'];
        const missingNodeFields = this.validateRequiredFields(node, nodeFields);
        errors.push(...missingNodeFields.map(field => `nodes[${index}].${field} is required`));
      });
    }

    // Check connections
    if (!data.connections || !Array.isArray(data.connections)) {
      errors.push('connections must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
