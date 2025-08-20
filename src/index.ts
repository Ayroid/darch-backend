import fs from "fs";
import path from "path";
import { TerraformGenerator } from "./terraform-generator.js";

const templates = [
  "alb-autoscaling",
  "basic-ec2",
  "vpc-public-private",
  "vpc-2tier-webapp"
]

// Get template name from env or default to 'infra'
const templateName = templates[3];
const configPath = path.resolve(`./src/infra-templates/aws/${templateName}.json`);
const outputDir = path.resolve("./src/output");
const outputPath = path.join(outputDir, `${templateName}.tf`);

try {
  // Load JSON config
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  // Generate Terraform using the new AST-based approach
  const generator = new TerraformGenerator(config);
  const terraformCode = generator.generateTerraform();

  // Write output
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, terraformCode);

  console.log(`✅ Terraform ${templateName}.tf generated at: output/${templateName}.tf`);
  console.log("🚀 Using new AST-based generator - no more interpolation issues!");

} catch (error) {
  console.error("❌ Error:", error);
  process.exit(1);
}
