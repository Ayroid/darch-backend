import fs from 'fs';
import path from 'path';
import { TerraformGenerator } from '../terraform-generator.js';

export class CLIService {
  /**
   * Run legacy CLI functionality for backward compatibility
   */
  static runCLI(): void {
    const templates = [
      "alb-autoscaling",
      "basic-ec2",
      "vpc-public-private",
      "vpc-2tier-webapp"
    ];

    const templateName = templates[3];

    // Get the correct path whether running from source or compiled
    const isCompiled = __filename.includes('dist');
    const basePath = isCompiled ? path.resolve('./') : path.resolve('./');
    const templatePath = isCompiled ? 'src/data/infra-templates/aws' : 'src/data/infra-templates/aws';

    const configPath = path.resolve(basePath, templatePath, `${templateName}.json`);
    const outputDir = path.resolve("./src/data/output");
    const outputPath = path.join(outputDir, `${templateName}.tf`);

    // Check if config file exists before trying to parse it
    if (!fs.existsSync(configPath)) {
      console.log(`⚠️ Template file not found: ${configPath}`);
      console.log('📁 Available templates should be placed in src/data/infra-templates/aws/');
      console.log('📋 Available templates:');
      templates.forEach(t => console.log(`   - ${t}.json`));
      return;
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const generator = new TerraformGenerator(config);
      const terraformCode = generator.generateTerraform();

      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(outputPath, terraformCode);

      console.log(`✅ Terraform ${templateName}.tf generated at: ${outputPath}`);
      console.log("🚀 Using new AST-based generator - no more interpolation issues!");

    } catch (error) {
      console.error("❌ Error:", error);
      process.exit(1);
    }
  }
}
