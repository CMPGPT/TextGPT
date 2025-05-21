import { getLogger } from '@/utils/logger';

// Initialize logger
const logger = getLogger('lib:mistral');

// Type definitions for Mistral API
export type MistralRole = 'system' | 'user' | 'assistant';

export interface MistralMessage {
  role: MistralRole;
  content: string;
}

export interface MistralChatCompletionRequest {
  model: string;
  messages: MistralMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  random_seed?: number;
  safe_prompt?: boolean;
}

export interface MistralChatCompletionChoice {
  index: number;
  message: MistralMessage;
  finish_reason: string;
}

export interface MistralChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: MistralChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Client for Mistral AI API interactions
 */
export class MistralClient {
  private apiKey: string;
  private baseUrl: string;
  
  /**
   * Initialize Mistral client
   */
  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY || '';
    this.baseUrl = 'https://api.mistral.ai/v1';
    
    if (!this.apiKey) {
      logger.error('Missing MISTRAL_API_KEY environment variable');
    }
  }
  
  /**
   * Chat completions API
   */
  chat = {
    completions: {
      create: async (params: MistralChatCompletionRequest): Promise<MistralChatCompletionResponse> => {
        try {
          logger.info('Making chat completion request', { model: params.model });
          
          const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
          });
          
          if (!response.ok) {
            const errorData = await response.text();
            logger.error('Mistral chat completion error', { 
              status: response.status, 
              statusText: response.statusText,
              error: errorData
            });
            throw new Error(`Mistral API error: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          return data as MistralChatCompletionResponse;
        } catch (error) {
          logger.error('Error in chat completion', { error });
          throw error;
        }
      }
    }
  };

  /**
   * Extract text from a PDF URL
   * @param pdfUrl URL of the PDF file
   * @returns Extracted text from the PDF
   */
  async extractTextFromPdf(pdfUrl: string): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      logger.info('Extracting text from PDF using Mistral API', { pdfUrl });
      
      // Use OCR endpoint for PDFs
      const response = await fetch(`${this.baseUrl}/ocr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          url: pdfUrl,
          options: {
            format: 'text'
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        logger.error('Mistral API error', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorData
        });
        
        return {
          success: false,
          error: `Mistral API error: ${response.status} ${response.statusText}`
        };
      }
      
      const data = await response.json();
      
      if (!data.text) {
        logger.warn('No text extracted from PDF', { pdfUrl });
        return {
          success: false,
          error: 'No text extracted from PDF'
        };
      }
      
      logger.info('Successfully extracted text from PDF', { 
        pdfUrl, 
        textLength: data.text.length 
      });
      
      return {
        success: true,
        text: data.text
      };
    } catch (error) {
      logger.error('Error extracting text from PDF', { error, pdfUrl });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during text extraction'
      };
    }
  }

  /**
   * Fallback method to extract text when OCR fails
   * Uses Mistral chat completion to attempt extraction
   */
  async fallbackTextExtraction(pdfUrl: string): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      logger.info('Attempting fallback text extraction using chat completion', { pdfUrl });
      
      const response = await this.chat.completions.create({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts and organizes text from PDFs.'
          },
          {
            role: 'user',
            content: `Extract all text content from this PDF: ${pdfUrl}. Return only the extracted text without any commentary or explanations.`
          }
        ],
        temperature: 0.0,
        max_tokens: 4096
      });
      
      const extractedText = response.choices[0]?.message?.content;
      
      if (!extractedText) {
        return {
          success: false,
          error: 'No text extracted in fallback method'
        };
      }
      
      return {
        success: true,
        text: extractedText
      };
    } catch (error) {
      logger.error('Error in fallback text extraction', { error, pdfUrl });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during fallback extraction'
      };
    }
  }
}

// Export singleton instance
export const mistralClient = new MistralClient(); 