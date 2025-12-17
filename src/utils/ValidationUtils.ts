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

    // Check resources
    if (!data.resources || !Array.isArray(data.resources)) {
      errors.push('resources must be an array');
    } else if (data.resources.length === 0) {
      errors.push('At least one resource is required');
    } else {
      data.resources.forEach((item: any, index: number) => {
        // Only validate essential backend fields, not frontend-specific fields like 'position'
        const itemFields = ['id', 'resourceType', 'name'];
        const missingItemFields = this.validateRequiredFields(item, itemFields);
        errors.push(...missingItemFields.map(field => `resources[${index}].${field} is required`));
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
