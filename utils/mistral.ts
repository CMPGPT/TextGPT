import OpenAI from 'openai';

export interface MistralClientOptions {
  apiKey: string;
  baseURL?: string;
}

export class MistralClient {
  private client: OpenAI;

  constructor(options: MistralClientOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL || 'https://api.mistral.ai/v1',
    });
  }

  get chat() {
    return this.client.chat;
  }

  get embeddings() {
    return this.client.embeddings;
  }
} 