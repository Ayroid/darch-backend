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

    console.log('[VALIDATION UTILS] Validating architecture data');

    if (!data) {
      errors.push('Architecture data is required');
      console.log('[VALIDATION UTILS] No data provided');
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

    // Check resources
    if (!data.resources || !Array.isArray(data.resources)) {
      errors.push('resources must be an array');
      console.log('[VALIDATION UTILS] Resources not array or missing');
    } else if (data.resources.length === 0) {
      errors.push('At least one resource is required');
      console.log('[VALIDATION UTILS] No resources found');
    } else {
      console.log('[VALIDATION UTILS] Validating', data.resources.length, 'resources');
      data.resources.forEach((item: any, index: number) => {
        // Check for id and name (always required)
        if (!item.id) {
          errors.push(`resources[${index}].id is required`);
        }
        if (!item.name) {
          errors.push(`resources[${index}].name is required`);
        }
        
        // Check for resourceType OR resource_type (support both formats)
        if (!item.resourceType && !item.resource_type) {
          errors.push(`resources[${index}].resourceType or resource_type is required`);
          console.log(`[VALIDATION UTILS] Resource ${index} missing resource type. Has keys:`, Object.keys(item));
        }
        
        // Check for nodeType OR node_type (support both formats)
        if (!item.nodeType && !item.node_type) {
          errors.push(`resources[${index}].nodeType or node_type is required`);
        }
      });
    }

    // Check connections
    if (!data.connections || !Array.isArray(data.connections)) {
      errors.push('connections must be an array');
    }

    console.log('[VALIDATION UTILS] Validation complete:', {
      isValid: errors.length === 0,
      errorsCount: errors.length,
      errors: errors.slice(0, 5)
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
