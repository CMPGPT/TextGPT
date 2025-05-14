import { NextRequest } from 'next/server';
import { openai, functionSchemas, parseFunctionCall, stripMarkdown } from '@/lib/openai';
import { supabaseAdmin } from '@/lib/supabase';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// Default system prompt if no persona is set
const DEFAULT_SYSTEM_PROMPT = `You are a helpful, friendly AI assistant. Your goal is to provide accurate and helpful information to the user.

Respond conversationally and be friendly while maintaining accuracy. If you don't know something, admit it rather than making up information.`;

// Helper function to verify Supabase and OpenAI configuration
const verifyConfigurations = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing. Please check environment variables.');
  }
  
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key missing. Please check environment variables.');
  }
};

export async function POST(req: NextRequest) {
  try {
    // Verify required configurations before proceeding
    verifyConfigurations();
    
    const { messages, user_id } = await req.json();
    
    console.log(`[CHAT] Processing request for user: ${user_id}`);
    
    // Get the current user
    let user: any;
    if (user_id) {
      // First try to get the user with full profile
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*, personas!inner(*)')
        .eq('id', user_id)
        .eq('is_deleted', false) // Only get non-deleted users
        .single();
      
      if (error || !data) {
        console.log(`[CHAT] User not found or deleted, creating new user with ID: ${user_id}`);
        // Check if user exists but is marked as deleted
        const { data: deletedUser } = await supabaseAdmin
          .from('users')
          .select('id, is_deleted')
          .eq('id', user_id)
          .single();
        
        // If user exists but is deleted, reset their data
        if (deletedUser && deletedUser.is_deleted) {
          console.log(`[CHAT] Resetting deleted user: ${user_id}`);
          // Get default persona
          const { data: persona } = await supabaseAdmin
            .from('personas')
            .select('*')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single();
          
          // Update user to undelete and reset their data
          const { data: resetUser, error: resetError } = await supabaseAdmin
            .from('users')
            .update({ 
              is_deleted: false,
              persona_id: persona.id,
              name: null,
              age: null,
              occupation: null,
              hobby: null
            })
            .eq('id', user_id)
            .select('*, personas!inner(*)')
            .single();
          
          if (resetError) {
            return new Response(JSON.stringify({ error: 'Failed to reset user' }), { status: 500 });
          }
          
          user = resetUser;
        } else {
          // If user doesn't exist, create a new one with default persona
          const { data: persona } = await supabaseAdmin
            .from('personas')
            .select('*')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single();
          
          const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({ id: user_id, persona_id: persona.id })
            .select('*, personas!inner(*)')
            .single();
          
          if (createError) {
            return new Response(JSON.stringify({ error: 'Failed to create user' }), { status: 500 });
          }
          
          user = newUser;
        }
      } else {
        user = data;
      }
      
      // Log the user data for debugging
      console.log(`[CHAT] User data: ${JSON.stringify({
        id: user.id,
        persona_id: user.persona_id,
        name: user.name,
        age: user.age,
        occupation: user.occupation,
        hobby: user.hobby,
        persona_name: user.personas?.name || 'Unknown'
      })}`);
    } else {
      console.log(`[CHAT] No user ID provided, creating temporary user`);
      // Create a temporary user ID
      const { data: persona } = await supabaseAdmin
        .from('personas')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();
      
      // Always create a fresh user when in temporary mode
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({ 
          persona_id: persona.id,
          is_deleted: false // Explicitly set as not deleted
        })
        .select('*, personas!inner(*)')
        .single();
      
      if (createError) {
        return new Response(JSON.stringify({ error: 'Failed to create user' }), { status: 500 });
      }
      
      user = newUser;
    }
    
    console.log(`[CHAT] User: ${user.id}, Current Persona: ${user.personas.name}`);
    
    // Save the user's messages to the database
    for (const message of messages) {
      if (message.role === 'user') {
        console.log(`[CHAT] Saving user message to history: ${message.content.substring(0, 50)}...`);
        await supabaseAdmin.from('chat_messages').insert([
          {
            user_id: user.id,
            role: 'user',
            content: message.content,
          },
        ]);
      }
    }
    
    // Get the user's chat history (last 20 messages)
    const { data: chatHistory } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    const historyMessages = chatHistory
      ? chatHistory
          .map((msg: { role: string; content: string }) => ({
            role: msg.role,
            content: msg.content,
            ...(msg.role === 'function' ? { name: JSON.parse(msg.content).name } : {})
          }))
          .reverse()
      : [];
    
    console.log(`[CHAT] Retrieved ${historyMessages.length} history messages`);
    
    // Build the system prompt based on the user's persona
    const systemPrompt = user.personas?.prompt || DEFAULT_SYSTEM_PROMPT;
    
    // Extract helpful context about the user's most recent message
    const lastUserMessage = messages.filter((m: {role: string, content: string}) => m.role === 'user').pop()?.content || '';
    
    // Improve the detection of persona-related queries
    const isAskingForPersonas = lastUserMessage.toLowerCase().match(/(?:what|which|list|show|available|tell me about|what are the|can you list).*(?:personas?|roles?|characters?|assistants?|modes?)/i) !== null;
    
    const isAskingToDelete = lastUserMessage.toLowerCase().includes('delete') &&
      (lastUserMessage.toLowerCase().includes('data') || 
       lastUserMessage.toLowerCase().includes('information') || 
       lastUserMessage.toLowerCase().includes('profile') || 
       lastUserMessage.toLowerCase().includes('everything') ||
       lastUserMessage.toLowerCase().includes('forget') ||
       lastUserMessage.toLowerCase().includes('account'));
       
    const isChangingPersona = lastUserMessage.toLowerCase().match(/(?:switch|change|use|activate|be|become|act as|set|choose)(?: the| a| your)? (?:personas?|roles?|characters?|assistants?|modes?)(?: to| as)?/i) !== null || 
                           lastUserMessage.toLowerCase().match(/(?:i want|i'd like|can you be|be a|can i talk to|talk to)(?: the| a)? ([a-z]+)(?:persona|assistant|role|character|mode)?/i) !== null;
    
    // New detections for profile-related queries
    const isAskingAboutProfile = lastUserMessage.toLowerCase().match(/(?:what|do you know|tell me|show me).*(?:my name|my age|my profile|my job|my hobby|about me|my occupation|my info|my information)/i) !== null;
    
    const isProvidingProfileInfo = lastUserMessage.toLowerCase().match(/(?:my name is|i am|i'm|my age is|i work as|my job is|my occupation is|my hobby is|i like to|i enjoy)/i) !== null;
    
    console.log(`[CHAT] Message intent - Personas: ${isAskingForPersonas}, Delete: ${isAskingToDelete}, Change Persona: ${isChangingPersona}, Profile Query: ${isAskingAboutProfile}, Profile Update: ${isProvidingProfileInfo}`);
    
    // Enhanced context prompt with clearer instructions for persona handling
    const aiContextPrompt = `
You are currently using the "${user.personas.name}" persona. The user's profile data that I have is:
- Name: ${user.name || 'Not provided yet'}
- Age: ${user.age || 'Not provided yet'}
- Occupation: ${user.occupation || 'Not provided yet'}
- Hobby: ${user.hobby || 'Not provided yet'}

IMPORTANT INSTRUCTIONS:

1. When the user asks about available personas, assistants, roles, or characters, you MUST use the get_personas function.
   Examples: "What personas are available?", "Show me the roles", "What characters can you be?", "Tell me about the personas"

2. When the user wants to switch personas, you MUST use the set_persona function with the requested persona name.
   Examples: "Switch to doctor", "Be a chef", "I want to talk to a travel guide", "Can you be a tutor?"

3. USER PROFILE MANAGEMENT:
   a. When a user asks about their stored information or profile details, ALWAYS use the get_user_profile function.
      Examples: "What's my name?", "Do you know my age?", "What do you know about me?", "What's my job?"
   
   b. When a user shares personal information that should be remembered, ALWAYS use the update_user_profile function.
      Examples: "My name is John", "I am 30 years old", "I work as a teacher", "My hobby is painting"
   
   c. When a user asks to delete their data or account, ALWAYS use the delete_user_data function.
      Examples: "Delete my account", "Remove my data", "Forget about me", "Delete everything you know about me"

4. For general conversation, respond naturally as your current persona.

The user doesn't see these capabilities directly, but you should respond to their requests naturally as if these are things you can do. Don't mention functions or capabilities directly.
`;
    
    // Create a response stream
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        // System and context prompts
        { role: 'system', content: systemPrompt },
        { role: 'system', content: aiContextPrompt },
        ...historyMessages,
        ...messages,
        // Add explicit guidance for persona-related requests
        ...(isAskingForPersonas ? [{
          role: 'system', 
          content: 'The user is specifically asking about available personas. You MUST use the get_personas function to respond appropriately.'
        }] : []),
        ...(isChangingPersona ? [{
          role: 'system',
          content: 'The user is trying to change personas. Extract the requested persona name and use the set_persona function.'
        }] : []),
        // Add explicit guidance for profile-related requests
        ...(isAskingAboutProfile ? [{
          role: 'system',
          content: 'The user is asking about their profile information. You MUST use the get_user_profile function to retrieve and share their stored information.'
        }] : []),
        ...(isProvidingProfileInfo ? [{
          role: 'system',
          content: 'The user is sharing personal information. You MUST use the update_user_profile function to save this information to their profile.'
        }] : []),
        ...(isAskingToDelete ? [{
          role: 'system',
          content: 'The user is asking to delete their data. You MUST use the delete_user_data function to handle this request appropriately.'
        }] : [])
      ],
      stream: true,
      tools: functionSchemas.map(schema => ({
        type: 'function',
        function: schema
      }))
    });
    
    const stream = OpenAIStream(response, {
      async onCompletion(completion, functionCallUsed) {
        // Don't save function call messages to chat history
        if (!functionCallUsed) {
          console.log(`[CHAT] Saving assistant message to history: ${completion.substring(0, 50)}...`);
          // Save the full message to history
          await supabaseAdmin.from('chat_messages').insert([
            {
              user_id: user.id,
              role: 'assistant',
              content: completion,
            },
          ]);
        }
      },
      user: user,
      systemPrompt: systemPrompt,
      historyMessages: historyMessages,
      messages: messages
    });
    
    // Return the response stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      }
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(JSON.stringify({ error: 'An error occurred during the chat' }), { status: 500 });
  }
}

// The OpenAIStream function implementation
const OpenAIStream = (
  response: any,
  options: {
    onCompletion?: (completion: string, functionCallUsed: boolean) => Promise<void> | void;
    user: any;
    systemPrompt?: string;
    historyMessages?: any[];
    messages?: any[];
  }
) => {
  const { onCompletion, user, systemPrompt, historyMessages = [], messages = [] } = options;
  
  let completion = '';
  let functionCallUsed = false;
  let isProcessingFunctionCall = false;
  let currentToolCall: any = null;
  
  // Return a readable stream
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      try {
        for await (const chunk of response) {
          // If there's tool_calls in the response
          if (chunk.choices[0]?.delta?.tool_calls) {
            functionCallUsed = true;
            isProcessingFunctionCall = true;
            
            const toolCall = chunk.choices[0]?.delta?.tool_calls[0];
            
            // If this is the first chunk with a tool call, initialize the current tool call
            if (toolCall?.function?.name && !currentToolCall) {
              currentToolCall = {
                id: toolCall.index || 0,
                function: {
                  name: toolCall.function.name,
                  arguments: toolCall.function.arguments || ''
                }
              };
              console.log(`[FUNCTION] Detected function call: ${toolCall.function.name}`);
            } else if (toolCall?.function?.arguments && currentToolCall) {
              // Append arguments if they come in chunks
              currentToolCall.function.arguments += toolCall.function.arguments;
            }
            
            // Don't send function call information to the client
            // We'll only send the final result
          } else if (!isProcessingFunctionCall && chunk.choices[0]?.delta?.content) {
            // For normal text content when not processing a function call
            const content = chunk.choices[0].delta.content;
            // Strip markdown from content
            const plainContent = stripMarkdown(content);
            completion += plainContent;
            controller.enqueue(encoder.encode(plainContent));
          }
          
          // Check if we've completed a function call
          if (chunk.choices[0]?.finish_reason === 'tool_calls' && isProcessingFunctionCall) {
            console.log(`[FUNCTION] Function call complete: ${currentToolCall?.function?.name || 'unknown'}`);
            console.log(`[FUNCTION] Arguments: ${currentToolCall?.function?.arguments || '{}'}`);
            
            try {
              // Get the complete function call
              const functionCall = parseFunctionCall(currentToolCall);
              
              if (functionCall) {
                let functionResult;
                
                try {
                  // Execute the appropriate function with proper error handling
                  switch (functionCall.name) {
                    case 'get_personas':
                      console.log(`[FUNCTION] Executing: get_personas`);
                      functionResult = await handleGetPersonas(user.id);
                      break;
                      
                    case 'set_persona':
                      const personaName = functionCall.arguments?.persona_name;
                      console.log(`[FUNCTION] Executing: set_persona with name: ${personaName}`);
                      functionResult = await handleSetPersona(user.id, personaName);
                      break;
                      
                    case 'delete_user_data':
                      console.log(`[FUNCTION] Executing: delete_user_data`);
                      functionResult = await handleDeleteUserData(user.id);
                      break;
                      
                    case 'update_user_profile':
                      // Validate input data before passing to function
                      {
                        const profileData: Record<string, any> = {};
                        let hasValidData = false;
                      
                        // Only include fields that are explicitly provided and not undefined
                        if (functionCall.arguments?.name !== undefined) {
                          profileData.name = functionCall.arguments.name;
                          hasValidData = true;
                        }
                      
                        if (functionCall.arguments?.age !== undefined) {
                          // Convert age to number or null if invalid
                          const ageNum = Number(functionCall.arguments.age);
                          profileData.age = !isNaN(ageNum) ? ageNum : null;
                          hasValidData = hasValidData || !isNaN(ageNum);
                        }
                      
                        if (functionCall.arguments?.occupation !== undefined) {
                          profileData.occupation = functionCall.arguments.occupation;
                          hasValidData = true;
                        }
                      
                        if (functionCall.arguments?.hobby !== undefined) {
                          profileData.hobby = functionCall.arguments.hobby;
                          hasValidData = true;
                        }
                      
                        // Only proceed if we have valid data to update
                        if (hasValidData) {
                          console.log(`[FUNCTION] Executing: update_user_profile with data: ${JSON.stringify(profileData)}`);
                          functionResult = await handleUpdateUserProfile(user.id, profileData);
                        } else {
                          console.log(`[FUNCTION] Skipping update_user_profile due to no valid data`);
                          functionResult = { 
                            success: false, 
                            message: 'No valid profile data provided'
                          };
                        }
                      }
                      break;
                      
                    case 'get_user_profile':
                      {
                        console.log(`[FUNCTION] Executing: get_user_profile`);
                        functionResult = await handleGetUserProfile(user.id);
                      }
                      break;
                      
                    default:
                      console.log(`[FUNCTION] Unknown function: ${functionCall.name}`);
                      functionResult = { success: false, message: 'Unknown function' };
                  }
                } catch (funcError) {
                  console.error(`[FUNCTION] Error executing function:`, funcError);
                  functionResult = { success: false, message: 'An error occurred while processing your request' };
                }
                
                console.log(`[FUNCTION] Result: ${JSON.stringify(functionResult)}`);
                
                // Save function call and result to chat history as hidden messages
                await supabaseAdmin.from('chat_messages').insert([
                  {
                    user_id: user.id,
                    role: 'function',
                    content: JSON.stringify({
                      name: functionCall.name,
                      arguments: functionCall.arguments,
                      result: functionResult
                    }),
                  },
                ]);
                
                // For function calls, send the function result to OpenAI to get a natural language response
                const functionResponse = await openai.chat.completions.create({
                  model: 'gpt-4o',
                  messages: [
                    // System and context prompts
                    { role: 'system', content: systemPrompt },
                    { role: 'system', content: `You are responding to a function call result. 
                    Use this context to formulate a natural, persona-appropriate response.
                    Format in a conversational way as if you're continuing the conversation.
                    Don't mention that you received function data or that you're processing a result.
                    Just incorporate the information naturally in your response as the "${user.personas.name}" persona.
                    
                    IMPORTANT FUNCTION RESULT GUIDELINES:
                    
                    1. For 'get_personas' results:
                      - List all the available personas clearly
                      - Mention which one is currently active
                      - Be enthusiastic about the options
                    
                    2. For 'set_persona' results:
                      - If successful, express enthusiasm about the new persona
                      - If failed, apologize and suggest available options
                      - Don't mention technical details of the failure
                      
                    3. For profile updates or data deletion:
                      - Confirm the action naturally
                      - Don't expose technical details` },
                    ...historyMessages,
                    ...messages,
                    { 
                      role: 'function', 
                      name: functionCall.name,
                      content: JSON.stringify(functionResult)
                    }
                  ],
                  temperature: 0.7 // Add some creativity to responses
                });
                
                // Get the assistant's response to the function result
                const aiResponse = functionResponse.choices[0].message.content || '';
                
                // Send the AI-generated response to the client
                controller.enqueue(encoder.encode(stripMarkdown(aiResponse)));
                completion = aiResponse;
                
                // Save the AI's response to the function call
                await supabaseAdmin.from('chat_messages').insert([
                  {
                    user_id: user.id,
                    role: 'assistant',
                    content: aiResponse,
                  },
                ]);
              }
            } catch (error) {
              console.error(`[ERROR] Error processing function call:`, error);
              controller.enqueue(encoder.encode("\n\nSorry, there was an error processing your request. Please try again."));
            } finally {
              // Reset for next potential function call
              isProcessingFunctionCall = false;
              currentToolCall = null;
            }
          } else if (chunk.choices[0]?.finish_reason && isProcessingFunctionCall) {
            // Handle case where the function call was interrupted
            isProcessingFunctionCall = false;
            currentToolCall = null;
          }
        }
        
        // After processing all chunks, call onCompletion with the full message
        if (onCompletion) {
          try {
            await onCompletion(completion, functionCallUsed);
          } catch (error) {
            console.error('[OPENAI] Error in onCompletion callback:', error);
          }
        }
        
        console.log('[OPENAI] Stream complete');
        controller.close();
      } catch (error) {
        console.error('[OPENAI] Error in stream processing:', error);
        controller.error(error);
      }
    },
    cancel() {
      // Handle cancellation of the stream if needed
      console.log('[OPENAI] Stream cancelled');
    }
  });
};

// Function handlers
async function handleGetPersonas(userId: string) {
  try {
    console.log(`[FUNCTION] Getting all personas for user ${userId}`);
  
    // First, log the available personas to help with debugging
    const { data: allPersonas, error: debugError } = await supabaseAdmin
      .from('personas')
      .select('id, name');
      
    if (debugError) {
      console.error(`[FUNCTION] Error in debug personas query:`, debugError);
    } else {
      console.log(`[FUNCTION] Debug - Found ${allPersonas?.length || 0} personas in database:`, 
        allPersonas?.map((p: { name: string }) => p.name).join(', ') || 'none');
    }
    
    // Now get the full persona data
    const { data: personas, error } = await supabaseAdmin
      .from('personas')
      .select('id, name, short_desc');
  
    if (error) {
      console.error(`[FUNCTION] Error getting personas:`, error);
      return { success: false, message: 'Failed to fetch personas', error: error.message };
    }
  
    if (!personas || personas.length === 0) {
      console.log(`[FUNCTION] No personas found in database`);
      return { 
        success: false, 
        message: 'No personas available in the system',
        personas: []
      };
    }
  
    // Get the user's current persona
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('persona_id')
      .eq('id', userId)
      .single();
  
    if (userError) {
      console.error(`[FUNCTION] Error getting user persona:`, userError);
    }
  
    // Mark the active persona
    const personasWithActive = personas.map((persona: { id: string; name: string; short_desc: string }) => ({
      ...persona,
      active: user && persona.id === user.persona_id,
    }));
  
    console.log(`[FUNCTION] Successfully retrieved ${personasWithActive.length} personas`);
    console.log(`[FUNCTION] Active persona:`, 
      personasWithActive.find((p: { id: string; name: string; short_desc: string; active: boolean }) => p.active)?.name || 'None');
    
    return { 
      success: true, 
      personas: personasWithActive,
      message: `Found ${personasWithActive.length} personas`
    };
  } catch (error) {
    console.error(`[FUNCTION] Error in handleGetPersonas:`, error);
    return { 
      success: false, 
      message: 'An error occurred fetching personas',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function handleSetPersona(userId: string, personaName: string) {
  try {
    if (!personaName) {
      return { success: false, message: 'No persona name provided' };
    }
  
    console.log(`[FUNCTION] Setting persona to "${personaName}" for user ${userId}`);
    
    // Log all personas for debugging
    const { data: allPersonas } = await supabaseAdmin
      .from('personas')
      .select('id, name');
      
    console.log(`[FUNCTION] Debug - Available personas:`, 
      allPersonas?.map((p: { name: string }) => p.name).join(', ') || 'none');
    
    // First try an exact match (case insensitive)
    const { data: exactMatches, error: exactError } = await supabaseAdmin
      .from('personas')
      .select('*')
      .ilike('name', personaName);
  
    if (exactError) {
      console.error(`[FUNCTION] Error in exact persona match:`, exactError);
    }
  
    // If exact match found
    if (exactMatches && exactMatches.length > 0) {
      const persona = exactMatches[0];
      console.log(`[FUNCTION] Found exact persona match: ${persona.name} (${persona.id})`);
      
      // Update user's persona
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ persona_id: persona.id })
        .eq('id', userId);
  
      if (updateError) {
        console.error(`[FUNCTION] Error updating user persona:`, updateError);
        return { success: false, message: 'Failed to update persona', error: updateError.message };
      }
      
      return { success: true, persona, message: `Successfully switched to ${persona.name} persona` };
    }
  
    // Try finding by partial match if no exact match
    console.log(`[FUNCTION] No exact match found, trying partial match for: ${personaName}`);
    const { data: partialMatches, error: partialError } = await supabaseAdmin
      .from('personas')
      .select('*')
      .ilike('name', `%${personaName}%`);
    
    if (partialError) {
      console.error(`[FUNCTION] Error in partial persona match:`, partialError);
    }
    
    if (partialMatches && partialMatches.length > 0) {
      const bestMatch = partialMatches[0]; // Just use the first match for simplicity
      console.log(`[FUNCTION] Found partial match: ${bestMatch.name} (${bestMatch.id})`);
      
      // Update user's persona
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ persona_id: bestMatch.id })
        .eq('id', userId);
      
      if (updateError) {
        console.error(`[FUNCTION] Error updating user persona:`, updateError);
        return { success: false, message: 'Failed to update persona', error: updateError.message };
      }
  
      return { 
        success: true, 
        persona: bestMatch,
        message: `Switched to the ${bestMatch.name} persona (matched from "${personaName}")`
      };
    }
    
    // No matches found
    console.log(`[FUNCTION] No persona matches found for: ${personaName}`);
    return { 
      success: false, 
      message: `Persona "${personaName}" not found. Available personas: ${allPersonas?.map((p: { name: string }) => p.name).join(', ') || 'none'}`
    };
  } catch (error) {
    console.error(`[FUNCTION] Error in handleSetPersona:`, error);
    return { 
      success: false, 
      message: 'An error occurred setting persona',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function handleDeleteUserData(userId: string) {
  try {
    console.log(`[FUNCTION] Deleting user data for ${userId}`);
  
    // Soft delete user by setting is_deleted to true and clearing personal data
    const { data: _data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        is_deleted: true,
        name: null,
        age: null,
        occupation: null,
        hobby: null
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error(`[FUNCTION] Error deleting user data:`, error);
      return { 
        success: false, 
        message: `Failed to delete user data: ${error.message}` 
      };
    }
    
    // Delete chat history
    const { error: deleteChatsError } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .eq('user_id', userId);
    
    if (deleteChatsError) {
      console.error(`[FUNCTION] Error deleting chat history:`, deleteChatsError);
      // Continue with the operation even if history deletion fails
    }
  
    console.log(`[FUNCTION] Successfully deleted data for user ${userId}`);
    return { success: true, message: "Your profile and chat history have been deleted successfully." };
  } catch (error) {
    console.error(`[FUNCTION] Error in handleDeleteUserData:`, error);
    return { success: false, message: 'An error occurred deleting user data' };
  }
}

async function handleUpdateUserProfile(userId: string, data: any) {
  try {
    if (!data || Object.keys(data).length === 0) {
      return { success: false, message: 'No profile data provided' };
    }
  
    console.log(`[FUNCTION] Updating profile for user ${userId} with data:`, data);
  
    // Use direct Supabase update instead of API route to avoid cross-API calls
    const { data: updatedData, error } = await supabaseAdmin
      .from('users')
      .update(data)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error(`[FUNCTION] Error updating user profile:`, error);
      return { 
        success: false, 
        message: `Failed to update profile: ${error.message}`
      };
    }
    
    console.log(`[FUNCTION] Successfully updated profile for user ${userId}`);
    return { 
      success: true, 
      data: updatedData 
    };
  } catch (error) {
    console.error(`[FUNCTION] Error in handleUpdateUserProfile:`, error);
    return { success: false, message: 'An error occurred updating profile' };
  }
}

async function handleGetUserProfile(userId: string) {
  try {
    console.log(`[FUNCTION] Getting profile for user ${userId}`);
  
    // Use direct Supabase query instead of API route to avoid cross-API calls
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('name, age, occupation, hobby, is_deleted')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error(`[FUNCTION] Error getting user profile:`, error);
      return { 
        success: false, 
        message: `Failed to get profile: ${error.message}` 
      };
    }
    
    if (data.is_deleted) {
      return { 
        success: false, 
        message: 'User account has been deleted' 
      };
    }
    
    return { success: true, profile: data };
  } catch (error) {
    console.error(`[FUNCTION] Error in handleGetUserProfile:`, error);
    return { success: false, message: 'An error occurred getting profile' };
  }
} 