#!/bin/bash

echo "=== TERRAFORM SYNTAX DRY TEST ==="
echo ""

echo "✅ Found $var_refs variable references"
echo "✅ Found $local_refs local references"
echo "✅ Found $data_refs data source references"
echo "✅ Found $resource_refs resource references"
echo ""
echo "🏷️  RESOURCE VALIDATION:"
echo ""
data_sources=$(grep -c "^data " "$TERRAFORM_FILE")
echo "📊 Resource count:"
echo "   - Providers: $providers"
echo "   - Variables: $variables"
echo "   - Locals: $locals"
echo "   - Data sources: $data_sources"
echo "   - Resources: $resources"
echo "   - Outputs: $outputs"
echo ""
echo "🔒 SECURITY GROUP VALIDATION:"
echo ""
echo ""
echo "📦 HEREDOC VALIDATION:"
echo ""
echo ""
echo "🎯 OVERALL ASSESSMENT:"
echo ""
grep -q "provider \"aws\"" "$TERRAFORM_FILE" && ((passed_checks++))
grep -q "ingress {" "$TERRAFORM_FILE" && grep -q "egress {" "$TERRAFORM_FILE" && ((passed_checks++))
echo ""
echo "=== DRY TEST COMPLETE ==="

for TERRAFORM_FILE in ../src/output/*.tf; do
  echo "📁 Analyzing file: $TERRAFORM_FILE"
  echo ""

  # Check if file exists
  if [ ! -f "$TERRAFORM_FILE" ]; then
      echo "❌ Error: Terraform file not found!"
      continue
  fi

  echo "✅ File exists and is readable"
  echo ""

  # Basic syntax checks
  echo "🔍 BASIC SYNTAX VALIDATION:"
  echo ""

  # Check for balanced braces
  open_braces=$(grep -o '{' "$TERRAFORM_FILE" | wc -l)
  close_braces=$(grep -o '}' "$TERRAFORM_FILE" | wc -l)

  if [ "$open_braces" -eq "$close_braces" ]; then
      echo "✅ Balanced braces: $open_braces opening, $close_braces closing"
  else
      echo "❌ Unbalanced braces: $open_braces opening, $close_braces closing"
  fi

  # Check for balanced brackets
  open_brackets=$(grep -o '\[' "$TERRAFORM_FILE" | wc -l)
  close_brackets=$(grep -o '\]' "$TERRAFORM_FILE" | wc -l)

  if [ "$open_brackets" -eq "$close_brackets" ]; then
      echo "✅ Balanced brackets: $open_brackets opening, $close_brackets closing"
  else
      echo "❌ Unbalanced brackets: $open_brackets opening, $close_brackets closing"
  fi

  # Check for balanced quotes (simplified)
  quote_count=$(grep -o '"' "$TERRAFORM_FILE" | wc -l)
  if [ $((quote_count % 2)) -eq 0 ]; then
      echo "✅ Even number of quotes: $quote_count (likely balanced)"
  else
      echo "⚠️  Odd number of quotes: $quote_count (check for unmatched quotes)"
  fi

  echo ""
  echo "🏗️  TERRAFORM STRUCTURE VALIDATION:"
  echo ""

  # Check for required provider block
  if grep -q "provider \"aws\"" "$TERRAFORM_FILE"; then
      echo "✅ AWS provider block found"
  else
      echo "❌ AWS provider block missing"
  fi

  # Check variable syntax (without quotes on type)
  echo ""
  echo "📝 Variable type constraints check:"
  if grep -q 'type = "string"' "$TERRAFORM_FILE"; then
      echo "❌ Found quoted type constraints (deprecated in Terraform 0.12+)"
      grep -n 'type = "' "$TERRAFORM_FILE"
  else
      echo "✅ No quoted type constraints found"
  fi

  if grep -q 'type = string' "$TERRAFORM_FILE"; then
      echo "✅ Found modern unquoted type constraints"
  fi

  # Check for Terraform references
  echo ""
  echo "🔗 Reference syntax check:"
  if grep -q '\${' "$TERRAFORM_FILE"; then
      echo "⚠️  Found old interpolation syntax \${...} (deprecated in Terraform 0.12+)"
      grep -n '\${' "$TERRAFORM_FILE"
  else
      echo "✅ No old interpolation syntax found"
  fi

  # Check for proper references
  var_refs=$(grep -c 'var\.' "$TERRAFORM_FILE")
  local_refs=$(grep -c 'local\.' "$TERRAFORM_FILE")
  data_refs=$(grep -c 'data\.' "$TERRAFORM_FILE")
  resource_refs=$(grep -c -E 'aws_[a-zA-Z_]+\.[a-zA-Z_]+\.' "$TERRAFORM_FILE")

  echo "✅ Found $var_refs variable references"
  echo "✅ Found $local_refs local references"
  echo "✅ Found $data_refs data source references"
  echo "✅ Found $resource_refs resource references"

  echo ""
  echo "🏷️  RESOURCE VALIDATION:"
  echo ""

  # Count different resource types
  providers=$(grep -c "^provider " "$TERRAFORM_FILE")
  variables=$(grep -c "^variable " "$TERRAFORM_FILE")
  locals=$(grep -c "^locals " "$TERRAFORM_FILE")
  data_sources=$(grep -c "^data " "$TERRAFORM_FILE")
  resources=$(grep -c "^resource " "$TERRAFORM_FILE")
  outputs=$(grep -c "^output " "$TERRAFORM_FILE")

  echo "📊 Resource count:"
  echo "   - Providers: $providers"
  echo "   - Variables: $variables"
  echo "   - Locals: $locals"
  echo "   - Data sources: $data_sources"
  echo "   - Resources: $resources"
  echo "   - Outputs: $outputs"

  echo ""
  echo "🔒 SECURITY GROUP VALIDATION:"
  echo ""

  # Check ingress/egress blocks
  if grep -q "ingress {" "$TERRAFORM_FILE" && grep -q "egress {" "$TERRAFORM_FILE"; then
      echo "✅ Security group has both ingress and egress rules"
  else
      echo "⚠️  Security group missing ingress or egress rules"
  fi

  # Check for overly permissive rules
  if grep -q "0.0.0.0/0" "$TERRAFORM_FILE"; then
      echo "⚠️  Found rules open to all IPs (0.0.0.0/0) - review for security"
      grep -n "0.0.0.0/0" "$TERRAFORM_FILE"
  fi

  echo ""
  echo "📦 HEREDOC VALIDATION:"
  echo ""

  # Check heredoc syntax
  heredoc_start=$(grep -c "<<-EOF" "$TERRAFORM_FILE")
  heredoc_end=$(grep -c "^[[:space:]]*EOF" "$TERRAFORM_FILE")

  if [ "$heredoc_start" -eq "$heredoc_end" ]; then
      echo "✅ Balanced heredoc markers: $heredoc_start start, $heredoc_end end"
  else
      echo "❌ Unbalanced heredoc markers: $heredoc_start start, $heredoc_end end"
  fi

  echo ""
  echo "🎯 OVERALL ASSESSMENT:"
  echo ""

  # Calculate score
  total_checks=10
  passed_checks=0

  [ "$open_braces" -eq "$close_braces" ] && ((passed_checks++))
  [ "$open_brackets" -eq "$close_brackets" ] && ((passed_checks++))
  [ $((quote_count % 2)) -eq 0 ] && ((passed_checks++))
  grep -q "provider \"aws\"" "$TERRAFORM_FILE" && ((passed_checks++))
  ! grep -q 'type = "string"' "$TERRAFORM_FILE" && ((passed_checks++))
  ! grep -q '\${' "$TERRAFORM_FILE" && ((passed_checks++))
  [ "$var_refs" -gt 0 ] && ((passed_checks++))
  grep -q "ingress {" "$TERRAFORM_FILE" && grep -q "egress {" "$TERRAFORM_FILE" && ((passed_checks++))
  [ "$heredoc_start" -eq "$heredoc_end" ] && ((passed_checks++))
  [ "$resources" -gt 0 ] && ((passed_checks++))

  score=$((passed_checks * 100 / total_checks))

  if [ "$score" -ge 90 ]; then
      echo "🎉 EXCELLENT: Score $score% ($passed_checks/$total_checks checks passed)"
      echo "   Terraform file appears to be well-formed and follows best practices!"
  elif [ "$score" -ge 75 ]; then
      echo "✅ GOOD: Score $score% ($passed_checks/$total_checks checks passed)"
      echo "   Terraform file is mostly correct with minor issues"
  elif [ "$score" -ge 50 ]; then
      echo "⚠️  NEEDS WORK: Score $score% ($passed_checks/$total_checks checks passed)"
      echo "   Terraform file has several issues that should be addressed"
  else
      echo "❌ POOR: Score $score% ($passed_checks/$total_checks checks passed)"
      echo "   Terraform file has significant issues and may not work correctly"
  fi

  echo ""
  echo "=== DRY TEST COMPLETE ==="
  echo ""
done
