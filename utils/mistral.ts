import OpenAI from 'openai';

export interface MistralClientOptions {
  apiKey: string;
  baseURL?: string;
}

export interface OCRDocument {
  type: 'document_url' | 'image_url';
  document_url?: string;
  image_url?: string;
}

export interface OCRRequestParams {
  model: string;
  document: OCRDocument;
  include_image_base64?: boolean;
}

export interface OCRPage {
  index: number;
  markdown: string;
  images?: Array<{
    image_base64: string;
    bbox: { x: number; y: number; width: number; height: number };
    page_index: number;
  }>;
}

export interface OCRResponse {
  pages: OCRPage[];
  model: string;
  usage_info: {
    pages_processed: number;
    doc_size_bytes: number | null;
  };
}

export class MistralClient {
  private client: OpenAI;
  private apiKey: string;
  private baseURL: string;

  constructor(options: MistralClientOptions) {
    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL || 'https://api.mistral.ai/v1';
    
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: this.baseURL,
    });
  }

  get chat() {
    return this.client.chat;
  }

  get embeddings() {
    return this.client.embeddings;
  }
  
  /**
   * Process a document using Mistral's OCR API
   * @param params OCR request parameters
   * @returns OCR processing results
   */
  async ocr(params: OCRRequestParams): Promise<OCRResponse> {
    const response = await fetch(`${this.baseURL}/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral OCR API error: ${response.status} - ${errorText || 'No response body'}`);
    }
    
    return await response.json() as OCRResponse;
  }
} 