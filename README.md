# Agentic App Backend - Venice API Integration

A sophisticated agentic application backend that leverages the Venice API to generate content, validate accuracy, and iteratively improve outputs through a multi-agent system with human-in-the-loop feedback.

## 🏗️ Architecture Overview

This system follows a multi-layered architecture with Express.js API layer, agent orchestration layer, and Venice API integration layer. Key components include:

- **Content Generator Agent**: Generates definition, LinkedIn post, and image from user topic
- **Web Search Critic Agent**: Validates factual accuracy using web search
- **Quality Critic Agent**: Evaluates overall content quality and suggests improvements
- **Workflow Manager**: Orchestrates the 3-cycle improvement loop

## 🚀 Features

- **3-Cycle Improvement Loop**: Automatically iterates on content until quality threshold is met
- **Human-in-the-Loop Review**: Triggers human review after 3 cycles if quality is insufficient
- **Venice API Integration**: Uses llama-3.2-3b model with function calling and web search
- **Structured Output Validation**: Ensures consistent, typed responses from AI agents
- **Comprehensive Error Handling**: Retry logic with exponential backoff
- **Real-time Workflow Tracking**: Monitor agent execution status and progress
- **Content Versioning**: Track content iterations across improvement cycles

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Venice API key
- TypeScript

## 🛠️ Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npm run prisma:migrate
npm run prisma:generate
```

5. Start the development server:
```bash
npm run dev
```

## 🔧 Configuration

### Environment Variables

```env
# Venice API Configuration
VENICE_API_KEY=your_venice_api_key
VENICE_BASE_URL=https://api.venice.ai/api/v1

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/agentic_app"

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=*
```

## 📡 API Endpoints

### Workflow Management

#### Start New Workflow
```http
POST /api/workflows/start
Content-Type: application/json

{
  "topic": "Artificial Intelligence in Healthcare",
  "maxCycles": 3,
  "qualityThreshold": 7.0
}
```

#### Get Workflow Status
```http
GET /api/workflows/:id
```

#### Submit Human Review
```http
POST /api/workflows/:id/human-review
Content-Type: application/json

{
  "action": "accept|improve|reject",
  "feedback": "Content looks good, minor improvements suggested",
  "customEdits": {
    "definition": "Custom definition if needed",
    "linkedinPost": "Custom LinkedIn post if needed",
    "imagePrompt": "Custom image prompt if needed"
  }
}
```

#### Get Content Version History
```http
GET /api/workflows/:id/versions
```

#### List All Workflows
```http
GET /api/workflows?page=1&limit=10&status=completed
```

#### Delete Workflow
```http
DELETE /api/workflows/:id
```

### Health Check
```http
GET /health
```

## 🔄 Workflow Execution Flow

1. **Content Generation**: Creates initial content (definition, LinkedIn post, image)
2. **Web Search Validation**: Fact-checks claims using Venice's web search capabilities
3. **Quality Assessment**: Evaluates coherence, engagement, and accuracy
4. **Quality Threshold Check**: If score ≥ threshold, workflow completes
5. **Improvement Loop**: If below threshold and cycles < max, generates improved version
6. **Human Review**: If max cycles reached without meeting threshold, requires human input

## 🤖 Agent System

### ContentGeneratorAgent
- Generates structured content using Venice API
- Supports iterative improvement with feedback
- Includes image generation with Venice SD models
- Validates output against predefined schemas

### WebSearchCriticAgent
- Performs web searches to validate factual claims
- Analyzes source reliability and credibility
- Provides confidence scores for each claim
- Generates recommendations for accuracy improvements

### QualityCriticAgent
- Evaluates content quality across multiple dimensions
- Provides structured improvement suggestions
- Calculates overall quality scores (0-100)
- Determines when content meets quality thresholds

## 🗄️ Database Schema

### Core Models

- **WorkflowRun**: Stores complete workflow execution data
- **ContentVersion**: Tracks content iterations across cycles
- **AgentResponse**: Logs individual agent responses and performance

### Key Relationships

- WorkflowRun → ContentVersion (one-to-many)
- WorkflowRun → AgentResponse (one-to-many)
- ContentVersion includes structured content data

## 🔍 Venice API Integration

### Supported Models
- **Primary**: `llama-3.2-3b` (function calling, web search, response schema)
- **Image Generation**: `venice-sd35` and other available models

### Capabilities
- **Function Calling**: For structured outputs and tool usage
- **Web Search**: For fact-checking and research
- **Response Schema**: Ensures consistent JSON outputs
- **Image Generation**: Creates visual content for posts

### Error Handling
- Exponential backoff retry logic
- Graceful degradation for failed requests
- Comprehensive logging for debugging

## 📊 Quality Scoring System

### Scoring Dimensions
- **Coherence** (0-100): Logical flow and clarity
- **Engagement** (0-100): LinkedIn suitability and appeal
- **Accuracy** (0-100): Factual correctness based on web search
- **Overall** (0-100): Weighted assessment of all factors

### Thresholds
- **Accept**: 80+ (automatic completion)
- **Improve**: 60-79 (continue improvement cycles)
- **Reject**: <60 (requires human review)

## 🧪 Development

### Running Tests
```bash
npm test
```

### Database Management
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

### Building for Production
```bash
npm run build
npm start
```

## 📈 Monitoring & Logging

### Structured Logging
- Request/response logging with correlation IDs
- Agent execution tracking with timing metrics
- Error logging with stack traces and context
- Performance metrics for API calls

### Health Monitoring
- Database connection health checks
- Venice API availability monitoring
- Workflow execution status tracking
- Resource usage metrics

## 🚨 Error Handling

### Retry Logic
- Exponential backoff for Venice API failures
- Maximum 3 retry attempts with jitter
- Circuit breaker pattern for repeated failures

### Graceful Degradation
- Fallback content generation on API failures
- Default quality scoring when analysis fails
- Human review escalation for critical errors

## 🔐 Security

### API Security
- Input validation and sanitization
- SQL injection prevention via Prisma ORM
- Rate limiting for API endpoints
- CORS configuration for cross-origin requests

### Data Protection
- Environment variable encryption
- Database connection security
- API key management best practices

## 📝 Example Usage

### Start a Workflow
```bash
curl -X POST http://localhost:3001/api/workflows/start \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Machine Learning in Finance",
    "maxCycles": 3,
    "qualityThreshold": 7.5
  }'
```

### Check Workflow Status
```bash
curl http://localhost:3001/api/workflows/workflow-id-123
```

### Submit Human Review
```bash
curl -X POST http://localhost:3001/api/workflows/workflow-id-123/human-review \
  -H "Content-Type: application/json" \
  -d '{
    "action": "improve",
    "feedback": "Add more specific examples and recent statistics"
  }'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the architecture design document

---

**Note**: This implementation focuses on the backend core logic as specified. Frontend components and visual workflow representations are not included in this scope. 
