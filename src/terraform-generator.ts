import fs from "fs";
import path from "path";

interface TerraformBlock {
  type: 'provider' | 'variable' | 'locals' | 'data' | 'resource' | 'output';
  resourceType?: string;
  name: string;
  attributes: Record<string, any>;
}

class TerraformGenerator {
  private blocks: TerraformBlock[] = [];

  constructor(private jsonConfig: any) {
    this.parseJsonToBlocks();
  }

  private parseJsonToBlocks(): void {
    for (const [key, value] of Object.entries(this.jsonConfig)) {
      switch (key) {
        case 'provider':
        case 'providers':
          this.parseProviders(value as Record<string, any>);
          break;
        case 'variable':
        case 'variables':
          this.parseVariables(value as Record<string, any>);
          break;
        case 'locals':
          this.parseLocals(value as Record<string, any>);
          break;
        case 'data':
          this.parseDataSources(value as Record<string, any>);
          break;
        case 'resource':
        case 'resources':
          this.parseResources(value as Record<string, any>);
          break;
        case 'output':
        case 'outputs':
          this.parseOutputs(value as Record<string, any>);
          break;
      }
    }
  }

  private parseProviders(providers: Record<string, any>): void {
    for (const [providerName, config] of Object.entries(providers)) {
      // Remove hardcoded credentials if present
      const filteredConfig: Record<string, any> = { ...config };
      delete filteredConfig["access_key"];
      delete filteredConfig["secret_key"];
      // Add version constraint best practice
      if (!filteredConfig["version"]) {
        filteredConfig["version"] = "~> 5.0";
      }
      this.blocks.push({
        type: 'provider',
        name: providerName,
        attributes: filteredConfig
      });
    }
  }

  private parseVariables(variables: Record<string, any>): void {
    for (const [varName, config] of Object.entries(variables)) {
      // Enforce description and type
      if (!config.description) {
        config.description = `Description for ${varName}`;
      }
      if (!config.type) {
        config.type = "string";
      }
      // Add sensitive = true for likely secrets
      if (/secret|password|key/i.test(varName) && config.sensitive === undefined) {
        config.sensitive = true;
      }
      this.blocks.push({
        type: 'variable',
        name: varName,
        attributes: config
      });
    }
  }

  private parseLocals(locals: Record<string, any>): void {
    this.blocks.push({
      type: 'locals',
      name: 'locals',
      attributes: locals
    });
  }

  private parseDataSources(dataSources: Record<string, any>): void {
    for (const [dataType, instances] of Object.entries(dataSources)) {
      for (const [instanceName, config] of Object.entries(instances as Record<string, any>)) {
        this.blocks.push({
          type: 'data',
          resourceType: dataType,
          name: instanceName,
          attributes: config
        });
      }
    }
  }

  private parseResources(resources: Record<string, any>): void {
    for (const [resourceType, instances] of Object.entries(resources)) {
      for (const [instanceName, config] of Object.entries(instances as Record<string, any>)) {
        // Warn if AMI is hardcoded
        if (resourceType === "aws_instance" && typeof config.ami === "string" && config.ami.startsWith("ami-")) {
          config["# ami_warning"] = "# WARNING: Hardcoded AMI. Use a data source for latest AMI.";
        }
        // Warn if SSH is open to 0.0.0.0/0
        if (resourceType === "aws_security_group" && config.ingress) {
          for (const rule of config.ingress) {
            if (rule.from_port === 22 && rule.cidr_blocks && rule.cidr_blocks.includes("0.0.0.0/0")) {
              rule["# ssh_warning"] = "# WARNING: SSH open to the world. Restrict in production.";
            }
          }
        }
        // Warn if tags are missing
        if ((resourceType === "aws_instance" || resourceType === "aws_security_group") && !config.tags) {
          config["# tags_warning"] = "# WARNING: Add tags for resource management.";
        }
        this.blocks.push({
          type: 'resource',
          resourceType: resourceType,
          name: instanceName,
          attributes: config
        });
      }
    }
  }

  private parseOutputs(outputs: Record<string, any>): void {
    for (const [outputName, config] of Object.entries(outputs)) {
      this.blocks.push({
        type: 'output',
        name: outputName,
        attributes: config
      });
    }
  }

  private formatValue(value: any, indent: number = 0, context?: { blockType?: string; attributeName?: string }): string {
    const spaces = '  '.repeat(indent);

    if (value === null || value === undefined) {
      return 'null';
    }

    if (typeof value === 'boolean' || typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'string') {
      // Convert old-style interpolation to new-style
      const modernRef = this.convertOldInterpolation(value);
      if (this.isTerraformReference(modernRef)) {
        return modernRef;
      }

      // Handle variable type constraints without quotes (Terraform 0.12+ syntax)
      if (context?.blockType === 'variable' && context?.attributeName === 'type') {
        return value; // Return type constraints without quotes
      }

      // Handle multi-line strings with heredoc syntax
      if (value.includes('\n')) {
        const lines = value.split('\n');
        // Use heredoc for multi-line strings
        let result = '<<-EOF\n';
        lines.forEach(line => {
          result += `    ${line}\n`;
        });
        result += '    EOF';
        return result;
      }

      // Escape quotes and newlines for single-line strings
      const escapedValue = value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');

      return `"${escapedValue}"`;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';

      // Check if array contains objects
      if (value.some(item => typeof item === 'object' && item !== null)) {
        const items = value.map(item => {
          if (typeof item === 'object' && item !== null) {
            return this.formatObject(item, indent + 1);
          }
          return `${spaces}  ${this.formatValue(item, 0, context)}`;
        }).join(',\n');
        return `[\n${items}\n${spaces}]`;
      } else {
        // Simple array
        const items = value.map(item => this.formatValue(item, 0, context)).join(', ');
        return `[${items}]`;
      }
    }

    if (typeof value === 'object') {
      return this.formatObject(value, indent);
    }

    return `"${value}"`;
  }

  // Convert old-style ${...} interpolation to new-style references
  private convertOldInterpolation(value: string): string {
    // Replace all ${...} with just ... (if it's a valid Terraform reference)
    return value.replace(/\$\{([a-zA-Z0-9_\.]+)\}/g, (match, ref) => ref);
  }

  private formatObject(obj: Record<string, any>, indent: number): string {
    const spaces = '  '.repeat(indent);
    const entries = Object.entries(obj).map(([key, value]) => {
      return `${spaces}  ${key} = ${this.formatValue(value, indent + 1)}`;
    });
    return `{\n${entries.join('\n')}\n${spaces}}`;
  }

  private isTerraformReference(value: string): boolean {
    // Modern Terraform references (no ${} needed)
    const patterns = [
      /^var\./,
      /^local\./,
      /^data\./,
      /^aws_/,
      /^azurerm_/,
      /^google_/,
      /^module\./,
      /^terraform\./
    ];

    return patterns.some(pattern => pattern.test(value));
  }

  private formatBlock(block: TerraformBlock): string {
    let result = '';

    switch (block.type) {
      case 'provider':
        result += `provider "${block.name}" {\n`;
        break;
      case 'variable':
        result += `variable "${block.name}" {\n`;
        break;
      case 'locals':
        result += `locals {\n`;
        break;
      case 'data':
        result += `data "${block.resourceType}" "${block.name}" {\n`;
        break;
      case 'resource':
        result += `resource "${block.resourceType}" "${block.name}" {\n`;
        break;
      case 'output':
        result += `output "${block.name}" {\n`;
        break;
    }

    // Format attributes with special handling for blocks
    result += this.formatAttributes(block.attributes, 1, block.type);

    result += '}\n';
    return result;
  }

  private formatAttributes(attributes: Record<string, any>, indent: number, blockType?: string): string {
    let result = '';
    const spaces = '  '.repeat(indent);

    for (const [key, value] of Object.entries(attributes)) {
      if (this.isBlockAttribute(key, value)) {
        result += this.formatBlockAttribute(key, value, indent);
      } else {
        const context = { blockType, attributeName: key };
        result += `${spaces}${key} = ${this.formatValue(value, indent, context)}\n`;
      }
    }

    return result;
  }

  private isBlockAttribute(key: string, value: any): boolean {
    // These attributes should be rendered as blocks, not as array assignments
    const blockAttributes = [
      'filter', 'ingress', 'egress', 'rule', 'block_device_mappings',
      'ebs_block_device', 'ephemeral_block_device', 'root_block_device',
      'network_interface', 'placement_group', 'credit_specification'
    ];

    return blockAttributes.includes(key) && Array.isArray(value);
  }

  private formatBlockAttribute(key: string, value: any[], indent: number): string {
    let result = '';
    const spaces = '  '.repeat(indent);
    const nextSpaces = '  '.repeat(indent + 1);

    for (const item of value) {
      result += `${spaces}${key} {\n`;

      if (typeof item === 'object' && item !== null) {
        for (const [itemKey, itemValue] of Object.entries(item)) {
          result += `${nextSpaces}${itemKey} = ${this.formatValue(itemValue, indent + 1)}\n`;
        }
      }

      result += `${spaces}}\n`;
    }

    return result;
  }

  public generateTerraform(): string {
    let terraform = `# Generated Terraform Configuration\n\n` +
      `# Best Practices:\n` +
      `# - Use 'terraform fmt' and 'terraform validate' before applying.\n` +
      `# - Use remote state for team environments.\n` +
      `# - Never hardcode credentials or AMI IDs.\n` +
      `# - Restrict security group rules.\n` +
      `# - Use modules for reusable patterns.\n\n`;

    // Group blocks by type for better organization
    const blockGroups = {
      provider: this.blocks.filter(b => b.type === 'provider'),
      variable: this.blocks.filter(b => b.type === 'variable'),
      locals: this.blocks.filter(b => b.type === 'locals'),
      data: this.blocks.filter(b => b.type === 'data'),
      resource: this.blocks.filter(b => b.type === 'resource'),
      output: this.blocks.filter(b => b.type === 'output')
    };

    // Generate in logical order
    for (const [groupName, blocks] of Object.entries(blockGroups)) {
      if (blocks.length > 0) {
        blocks.forEach(block => {
          terraform += this.formatBlock(block) + '\n';
        });
      }
    }

    return terraform.trim();
  }
}

// Main execution
function main() {
  try {
    // Load configuration
    const configPath = path.resolve("./src/ec2.json");
    const outputPath = path.resolve("./src/output/main.tf");

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    // Generate Terraform
    const generator = new TerraformGenerator(config);
    const terraformCode = generator.generateTerraform();

    // Write output
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, terraformCode);

    console.log("✅ Terraform main.tf generated successfully!");
    console.log(`📄 Output written to: ${outputPath}`);

  } catch (error) {
    console.error("❌ Error generating Terraform:", error);
    process.exit(1);
  }
}

// Export for testing
export { TerraformGenerator };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
