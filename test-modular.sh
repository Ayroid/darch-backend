curl -X POST http://localhost:5000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d @test-terraform-request.json