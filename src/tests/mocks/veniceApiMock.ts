 // Mock Venice API client for testing
export class VeniceApiMock {
  private static responses: Map<string, any> = new Map();
  private static delays: Map<string, number> = new Map();
  private static errors: Map<string, Error> = new Map();

  static setMockResponse(prompt: string, response: any) {
    this.responses.set(prompt, response);
  }

  static setMockDelay(prompt: string, delay: number) {
    this.delays.set(prompt, delay);
  }

  static setMockError(prompt: string, error: Error) {
    this.errors.set(prompt, error);
  }

  static async generateContent(prompt: string, options?: any) {
    const delay = this.delays.get(prompt) || 100;
    await new Promise(resolve => setTimeout(resolve, delay));

    const error = this.errors.get(prompt);
    if (error) {
      throw error;
    }

    const response = this.responses.get(prompt);
    if (response) {
      return response;
    }

    // Default mock response
    return {
      choices: [
        {
          message: {
            content: `Mock response for: ${prompt}`
          }
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      }
    };
  }

  static clearMocks() {
    this.responses.clear();
    this.delays.clear();
    this.errors.clear();
  }
}

// Mock factory functions
export const createMockVeniceApiResponse = (content: string, tokens?: { prompt: number; completion: number; total: number }) => ({
  choices: [
    {
      message: {
        content
      }
    }
  ],
  usage: {
    prompt_tokens: tokens?.prompt || 10,
    completion_tokens: tokens?.completion || 20,
    total_tokens: tokens?.total || 30
  }
});

export const createMockVeniceApiError = (message: string, status: number = 500) => {
  const error = new Error(message) as any;
  error.status = status;
  error.response = {
    status,
    data: { error: message }
  };
  return error;
}; 