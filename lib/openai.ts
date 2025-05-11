import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';

// Verify OpenAI API key is set
const verifyOpenAIConfig = () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key is missing. Please check your environment variables.');
    throw new Error('OpenAI API key is required. Please check your environment variables.');
  }
  return process.env.OPENAI_API_KEY;
};

// Create OpenAI client instance with error handling
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'missing-api-key',
});

// Define the function schemas for OpenAI function calling
export const functionSchemas = [
  {
    name: "get_personas",
    description: "Return all available personas. ALWAYS call this when the user asks about available personas, roles, personalities, or character options. Keywords to detect: 'what personas', 'which personas', 'available personas', 'personas available', 'different personas', 'list personas', 'show personas'.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "set_persona",
    description: "Activate a persona for this user. ONLY call this when the user EXPLICITLY asks you to change your persona or to be a different type of assistant. Do not call for general conversation or casual mentions of roles.",
    parameters: {
      type: "object",
      properties: { persona_name: { type: "string" } },
      required: ["persona_name"]
    }
  },
  {
    name: "delete_user_data",
    description: "Delete all personal data and chat history for GDPR compliance. ALWAYS call this when the user asks to delete their data, remove their information, or mentions privacy concerns with clear intent like 'delete my account', 'remove my data', 'forget about me', 'remove my information', etc.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "update_user_profile",
    description: "Update the user's profile information. ALWAYS call this when the user explicitly shares personal information that should be saved OR when they directly ask you to save/update specific information. Examples: 'My name is John', 'I am 30 years old', 'My job is software engineer', 'My hobby is painting', 'Save my name as Sarah', 'Update my age to 25', etc.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The user's full name" },
        age: { type: "integer", description: "The user's age in years" },
        occupation: { type: "string", description: "The user's job or profession" },
        hobby: { type: "string", description: "The user's hobby or interest" }
      }
    }
  },
  {
    name: "get_user_profile",
    description: "Retrieve the user's profile information. ALWAYS call this when the user asks about what information is stored about them OR asks about their own information. Examples: 'what data do you have about me', 'show me my profile', 'what's my name', 'do you know my age', 'what's my job', 'what do you know about me', etc.",
    parameters: { type: "object", properties: {} }
  }
];

// Type definitions for the function calls
export type FunctionCall = {
  name: string;
  arguments: Record<string, any>;
};

// Return type for get_personas function
export type Persona = {
  id: string;
  name: string;
  short_desc: string | null;
  active?: boolean;
};

// Helper function to parse function arguments from OpenAI response
export function parseFunctionCall(functionCall: any): FunctionCall | null {
  if (!functionCall || !functionCall.function) {
    console.error('[OPENAI] Invalid function call object:', functionCall);
    return null;
  }

  try {
    console.log(`[OPENAI] Parsing function call: ${functionCall.function.name}`);
    
    // Clean up JSON arguments - sometimes OpenAI sends malformed JSON
    let args = functionCall.function.arguments || '{}';
    
    // If arguments is empty but we have a function name
    if (!args.trim() && functionCall.function.name) {
      console.log(`[OPENAI] Empty arguments for function: ${functionCall.function.name}, using empty object`);
      args = '{}';
    }
    
    // Try different approaches to parse JSON
    let parsedArgs: Record<string, any> = {};
    let success = false;
    
    // First attempt: direct parse
    try {
      parsedArgs = JSON.parse(args);
      success = true;
    } catch (_parseError) {
      console.warn(`[OPENAI] Initial JSON parse failed, attempting to fix JSON: ${args}`);
      
      // Second attempt: try to extract valid JSON by finding the first '{' and last '}'
      try {
        const startIndex = args.indexOf('{');
        const endIndex = args.lastIndexOf('}');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          const potentialJson = args.substring(startIndex, endIndex + 1);
          console.log(`[OPENAI] Extracted potential JSON: ${potentialJson}`);
          parsedArgs = JSON.parse(potentialJson);
          success = true;
        }
      } catch (_extractError) {
        console.warn('[OPENAI] JSON extraction failed');
      }
      
      // Third attempt: handle concatenated JSON objects like {"name": "sabbir"}{"age": 22}
      if (!success) {
        try {
          const allObjects = {};
          let currentPos = 0;
          let startBracePos, endBracePos;
          
          // Find all JSON objects by locating pairs of braces
          while ((startBracePos = args.indexOf('{', currentPos)) !== -1) {
            endBracePos = args.indexOf('}', startBracePos);
            if (endBracePos === -1) break;
            
            const objectStr = args.substring(startBracePos, endBracePos + 1);
            try {
              const obj = JSON.parse(objectStr);
              // Merge all properties into one object
              Object.assign(allObjects, obj);
              success = true;
            } catch (_objError) {
              console.warn(`[OPENAI] Failed to parse object segment: ${objectStr}`);
            }
            
            currentPos = endBracePos + 1;
          }
          
          if (success) {
            console.log(`[OPENAI] Successfully merged multiple JSON objects: ${JSON.stringify(allObjects)}`);
            parsedArgs = allObjects;
          }
        } catch (_mergeError) {
          console.warn('[OPENAI] Failed to merge JSON objects');
        }
      }
      
      // Fourth attempt: try to strip potential quote issues
      if (!success) {
        try {
          // Sometimes the JSON has extra quotes or escape characters
          const cleanedJson = args
            .replace(/\\"/g, '"')         // Replace escaped quotes
            .replace(/\s+/g, ' ')         // Normalize whitespace
            .replace(/"\{/g, '{')         // Fix beginning quotes
            .replace(/\}"/g, '}')         // Fix ending quotes
            .replace(/(['"])(\w+)(['"]):/g, '"$2":'); // Ensure property names are quoted correctly
          
          console.log(`[OPENAI] Cleaned JSON: ${cleanedJson}`);
          parsedArgs = JSON.parse(cleanedJson);
          success = true;
        } catch (_cleanError) {
          console.error('[OPENAI] All JSON parsing attempts failed');
        }
      }
    }
    
    // If we couldn't parse the JSON, use an empty object
    if (!success) {
      console.log('[OPENAI] Using empty object for arguments due to parsing failure');
      parsedArgs = {}; 
    }
    
    console.log(`[OPENAI] Function arguments (${success ? 'parsed' : 'default'}): ${JSON.stringify(parsedArgs)}`);
    
    return {
      name: functionCall.function.name,
      arguments: parsedArgs,
    };
  } catch (error) {
    console.error('[OPENAI] Failed to parse function call:', error);
    // Return a default object for the function if parsing fails
    if (functionCall && functionCall.function && functionCall.function.name) {
      return {
        name: functionCall.function.name,
        arguments: {},
      };
    }
    return null;
  }
}

// Function to log API events to our logs table
export async function logOpenAIEvent(
  event: string, 
  metadata: Record<string, any> = {},
  level: 'info' | 'warn' | 'error' = 'info'
) {
  console.log(`[OPENAI] [${level.toUpperCase()}] ${event}`, metadata);
  
  try {
    // Log to Supabase
    await supabaseAdmin.from('logs').insert({
      level,
      message: event,
      metadata
    });
  } catch (error) {
    console.error('[OPENAI] Failed to log event to database:', error);
  }
}

// Utility function to strip markdown formatting from text
export function stripMarkdown(text: string): string {
  if (!text) return '';
  
  // Replace markdown headings with plain text
  text = text.replace(/^#+\s+(.*)$/gm, '$1');
  
  // Replace bold with plain text
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  
  // Replace italic with plain text
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  
  // Replace code blocks with plain text
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match
      .replace(/^```.*$/m, '')
      .replace(/^```$/m, '')
      .trim();
  });
  
  // Replace inline code with plain text
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // Replace list items
  text = text.replace(/^[*-]\s+(.*)$/gm, '$1');
  text = text.replace(/^\d+\.\s+(.*)$/gm, '$1');
  
  // Replace links with just the text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  return text;
} 