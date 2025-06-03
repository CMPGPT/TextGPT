import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define message types based on OpenAI's API
interface _Message {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

// Define function schemas for OpenAI function calling
const functionSchemas = [
  {
    name: "get_product_details",
    description: "Get detailed information about a specific product when the user asks about product features, specifications, or capabilities.",
    parameters: {
      type: "object",
      properties: {
        product_name: { 
          type: "string", 
          description: "The name or partial name of the product to search for"
        },
        attribute: {
          type: "string",
          description: "Optional specific attribute or aspect of the product the user is asking about"
        }
      },
      required: ["product_name"]
    }
  },
  {
    name: "list_all_products",
    description: "List all products available from this business when the user asks about available products or product options.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "search_related_products",
    description: "Search for related products when the user asks about alternatives, comparisons, or similar products.",
    parameters: {
      type: "object",
      properties: {
        search_term: { 
          type: "string", 
          description: "The search term to find related products"
        }
      },
      required: ["search_term"]
    }
  },
  {
    name: "get_business_information",
    description: "Get information about the business when the user asks about contact details, support options, or general information about the company.",
    parameters: {
      type: "object",
      properties: {
        attribute: { 
          type: "string", 
          description: "Optional specific attribute of the business information like 'contact', 'support', 'website', etc."
        }
      }
    }
  }
];

export async function POST(req: NextRequest) {
  try {
    console.log('[API] IQR Chat API: Request received');
    
    const {
      messages,
      anonymous_id,
      business_id,
    } = await req.json();

    console.log(`[API] IQR Chat API: Processing request for business ${business_id}`);

    // Validate required parameters
    if (!messages || !messages.length) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    if (!anonymous_id) {
      return NextResponse.json(
        { error: 'No anonymous ID provided' },
        { status: 400 }
      );
    }

    if (!business_id) {
      return NextResponse.json(
        { error: 'No business ID provided' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Step 1: Get business information
    console.log(`[API] Fetching business information for business ${business_id}`);
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('name, website_url, support_email, support_phone')
      .eq('id', business_id)
      .single();
    
    if (businessError) {
      console.error('[API] Error fetching business data:', businessError);
      return NextResponse.json(
        { error: 'Failed to fetch business information' },
        { status: 500 }
      );
    }
    
    console.log(`[API] Successfully retrieved business information: ${businessData.name}`);
    
    // Step 2: Get all products for the business
    console.log(`[API] Fetching products for business ${business_id}`);
    const { data: fetchedProducts, error: productsError } = await supabase
      .from('products')
      .select('id, name, description, system_prompt')
      .eq('business_id', business_id)
      .eq('status', 'ready');
    
    if (productsError) {
      console.error('[API] Error fetching products data:', productsError);
      return NextResponse.json(
        { error: 'Failed to fetch products information' },
        { status: 500 }
      );
    }

    // Use empty array if no products found
    const productsData = fetchedProducts || [];
    
    console.log(`[API] Retrieved ${productsData.length} products for business ${business_id}`);
    
    // Step 3: Get the user query from the last message
    const userQuery = messages[messages.length - 1].content;
    console.log(`[API] User query: "${userQuery.substring(0, 100)}${userQuery.length > 100 ? '...' : ''}"`);
    
    // Step 4: Generate embeddings for the query to find relevant PDF chunks
    let relevantChunks = [];
    try {
      const embedding = await generateEmbedding(userQuery);
      console.log(`[API] Generated embedding for vector search using model: text-embedding-ada-002`);
      
      // Use match_pdf_chunks_all RPC function for vector search across all products
      const { data: matchingChunks, error: matchError } = await supabase.rpc(
        'match_pdf_chunks_all',
        {
          query_embedding: embedding,
          match_threshold: 0.3,
          match_count: 10
        }
      );
      
      console.log(`[API] Vector search params: model=text-embedding-ada-002, threshold=0.3, count=10`);
      
      if (matchError) {
        console.error('[API] Error with vector search:', matchError);
      } else if (matchingChunks && matchingChunks.length > 0) {
        console.log(`[API] Raw vector matches:`, matchingChunks.map((c: any) => ({
          id: c.id,
          product_id: c.product_id,
          similarity: c.similarity
        })));
        
        // Filter to only include chunks for this business's products
        const filteredChunks = matchingChunks.filter((chunk: any) => {
          const product = productsData.find(p => p.id === chunk.product_id);
          return product !== undefined; // Only include chunks from products that belong to this business
        });
        relevantChunks = filteredChunks;
        console.log(`[API] Found ${filteredChunks.length} relevant PDF chunks via vector search for this business`);
      } else {
        console.log(`[API] No relevant chunks found via vector search`);
      }
    } catch (embeddingError) {
      console.error('[API] Error with vector search:', embeddingError);
      
      // Fallback to a regular query
      const { data: fallbackChunks, error: fallbackError } = await supabase
        .from('pdf_chunks')
        .select('content, metadata, product_id')
        .in('product_id', productsData.map(p => p.id))
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!fallbackError && fallbackChunks) {
        relevantChunks = fallbackChunks;
        console.log(`[API] Found ${fallbackChunks.length} chunks using fallback query after error`);
      }
    }

    // Step 5: Get previous chat history
    console.log(`[API] Fetching chat history for user ${anonymous_id}`);
    const { data: historyData, error: historyError } = await supabase
      .from('iqr_chat_messages')
      .select('role, content')
      .eq('business_id', business_id)
      .eq('user_phone', anonymous_id)
      .order('created_at', { ascending: true })
      .limit(10);
    
    if (historyError) {
      console.error('[API] Error fetching chat history:', historyError);
    } else {
      console.log(`[API] Retrieved ${historyData?.length || 0} messages from chat history`);
    }

    // Step 6: Build the conversation with system prompt and context
    console.log(`[API] Building system prompt and conversation history`);
    const systemPrompt = buildSystemPrompt(
      businessData,
      productsData,
      relevantChunks
    );
    
    const conversationHistory: ChatCompletionMessageParam[] = [];
    
    // Add system prompt
    conversationHistory.push({
      role: 'system',
      content: systemPrompt
    });
    
    // Add chat history if available
    if (historyData && historyData.length > 0) {
      historyData.forEach(message => {
        if (message.role === 'user' || message.role === 'assistant') {
          conversationHistory.push({
            role: message.role,
            content: message.content
          });
        }
      });
    }
    
    // Add the current user message
    conversationHistory.push({
      role: 'user',
      content: userQuery
    });

    // Step 7: Make API call to OpenAI with function calling
    console.log(`[API] Sending request to OpenAI`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: conversationHistory,
      temperature: 0.7,
      max_tokens: 1000,
      tools: functionSchemas.map(schema => ({
        type: 'function',
        function: schema
      }))
    });

    let aiResponse = '';
    let functionCallUsed = false;
    
    // Check if the model called a function
    if (completion.choices[0].message.tool_calls && completion.choices[0].message.tool_calls.length > 0) {
      functionCallUsed = true;
      const toolCall = completion.choices[0].message.tool_calls[0];
      
      // Parse the function call arguments
      const functionName = toolCall.function.name;
      let functionArgs: Record<string, any> = {};
      
      try {
        functionArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch (parseError) {
        console.error('[API] Error parsing function arguments:', parseError);
        functionArgs = {};
      }
      
      console.log(`[API] Function called by OpenAI: ${functionName}`);
      let functionResult;
      
      try {
        // Handle different function calls
        if (functionName === 'get_product_details') {
          functionResult = await handleGetProductDetails(business_id, productsData, functionArgs.product_name as string, functionArgs.attribute as string);
        } else if (functionName === 'list_all_products') {
          functionResult = await handleListAllProducts(productsData);
        } else if (functionName === 'search_related_products') {
          functionResult = await handleRelatedProductsSearch(business_id, functionArgs.search_term as string);
        } else if (functionName === 'get_business_information') {
          functionResult = await handleGetBusinessInformation(businessData, functionArgs.attribute as string);
        } else {
          functionResult = { error: 'Unknown function' };
        }
      } catch (funcError: any) {
        console.error(`[API] Error calling function ${functionName}:`, funcError);
        functionResult = { error: `Error executing function: ${funcError.message || 'Unknown error'}` };
      }
      
      console.log(`[API] Function result retrieved, making second call to OpenAI`);
      
      // Call OpenAI again with the function result
      const functionResponseCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          ...conversationHistory,
          {
            role: 'assistant',
            content: null,
            tool_calls: [toolCall]
          },
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult)
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      aiResponse = functionResponseCompletion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
    } else {
      aiResponse = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
    }

    console.log(`[API] Generated response, length: ${aiResponse.length} chars`);

    // Step 8: Save messages to the database
    // Save user message
    const { error: userMsgError } = await supabase
      .from('iqr_chat_messages')
      .insert({
        business_id,
        product_id: null, // No specific product
        user_phone: anonymous_id,
        role: 'user',
        content: userQuery
      });
    
    if (userMsgError) {
      console.error('[API] Error saving user message:', userMsgError);
    }
    
    // Save assistant message
    const { error: assistantMsgError } = await supabase
      .from('iqr_chat_messages')
      .insert({
        business_id,
        product_id: null, // No specific product
        user_phone: anonymous_id,
        role: 'assistant',
        content: aiResponse,
        metadata: functionCallUsed ? { function_call_used: true } : undefined
      });
    
    if (assistantMsgError) {
      console.error('[API] Error saving assistant message:', assistantMsgError);
    }

    // Return the AI response
    console.log(`[API] IQR Chat API: Request completed successfully`);
    return new NextResponse(aiResponse, {
      headers: {
        'X-Function-Call-Used': functionCallUsed ? 'true' : 'false'
      }
    });
  } catch (error) {
    console.error('[API] Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate embeddings using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  
  return response.data[0].embedding;
}

// Helper function to build the system prompt
function buildSystemPrompt(
  business: any,
  products: any[],
  relevantChunks: any[]
): string {
  // Base system prompt
  const businessName = business.name ? business.name.trim() : "IQR Business";
  let systemPrompt = `You are a helpful product assistant for ${businessName}.`;
  
  // Add business contact information
  systemPrompt += `\n\nBusiness Information:`;
  systemPrompt += `\n- Name: ${businessName}`;
  
  if (business.website_url) {
    systemPrompt += `\n- Website: ${business.website_url}`;
  }
  if (business.support_email) {
    systemPrompt += `\n- Email: ${business.support_email}`;
  }
  if (business.support_phone) {
    systemPrompt += `\n- Phone: ${business.support_phone}`;
  }
  
  // Add product information
  if (products.length === 0) {
    systemPrompt += `\n\nThis business currently has no products listed. If the user asks about products, kindly inform them that there are no products listed yet from this business.`;
  } else {
    systemPrompt += `\n\nThis business offers ${products.length} product(s). You can access detailed information about any product using the get_product_details function or list all products using the list_all_products function.`;
  }
  
  // Add information from PDF chunks
  if (relevantChunks.length > 0) {
    systemPrompt += `\n\nHere's specific information that may be helpful for answering the user's question:\n\n`;
    
    relevantChunks.forEach((chunk, index) => {
      systemPrompt += `---\nInformation ${index + 1}:\n${chunk.content}\n---\n\n`;
    });
  }
  
  systemPrompt += `\nIf you don't have enough information to answer the user's question accurately, use the appropriate function to fetch more details. Be friendly, helpful, and concise in your responses. Always prioritize accuracy over speculation.`;
  
  // Add instruction to avoid Markdown formatting and preserve special characters
  systemPrompt += "\n\nIMPORTANT: DO NOT format your responses using Markdown. Provide plain text responses without any special formatting. Preserve all special characters, abbreviations, and proper nouns exactly as written, especially product names like 'OG Kush' rather than 'O Kush'.";
  
  return systemPrompt;
}

// Function handler implementations
async function handleGetProductDetails(businessId: string, products: any[], productName: string, _attribute?: string): Promise<any> {
  console.log(`[API] Running function: handleGetProductDetails for "${productName}"`);
  
  if (products.length === 0) {
    return {
      error: "There are no products listed yet from this business.",
      available_products: []
    };
  }
  
  // First try exact match (case-insensitive)
  let matchedProduct = products.find(p => 
    p.name.toLowerCase() === productName.toLowerCase()
  );
  
  // If no exact match, try partial match (case-insensitive)
  if (!matchedProduct) {
    matchedProduct = products.find(p => 
      p.name.toLowerCase().includes(productName.toLowerCase()) ||
      productName.toLowerCase().includes(p.name.toLowerCase())
    );
  }
  
  if (!matchedProduct) {
    return { 
      error: `I couldn't find any product matching "${productName}".`,
      available_products: products.map(p => p.name)
    };
  }
  
  // Create a copy with properly preserved name and description
  const formattedProduct = {
    ...matchedProduct,
    name: matchedProduct.name.trim(),
    description: matchedProduct.description
  };
  
  // Return the product details
  return {
    product: formattedProduct
  };
}

async function handleListAllProducts(products: any[]): Promise<any> {
  console.log(`[API] Running function: handleListAllProducts`);
  
  if (products.length === 0) {
    return {
      message: "There are no products listed yet from this business.",
      products: []
    };
  }
  
  return {
    products: products.map(p => ({
      name: p.name,
      description: p.description
    }))
  };
}

async function handleRelatedProductsSearch(businessId: string, searchTerm: string): Promise<any> {
  console.log(`[API] Running function: handleRelatedProductsSearch for "${searchTerm}"`);
  
  const supabase = createClient();
  
  // This could be improved with vector search
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description')
    .eq('business_id', businessId)
    .eq('status', 'ready')
    .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  
  if (error) {
    console.error('[API] Error searching for related products:', error);
    return { error: 'Failed to search for related products' };
  }
  
  if (!data || data.length === 0) {
    return { 
      message: "There are no products listed yet from this business that match your search.",
      matching_products: []
    };
  }
  
  return {
    matching_products: data
  };
}

async function handleGetBusinessInformation(business: any, attribute?: string): Promise<any> {
  console.log(`[API] Running function: handleGetBusinessInformation ${attribute ? `for attribute: ${attribute}` : ''}`);
  
  // Ensure business name is always properly formatted
  const formattedBusiness = {
    ...business,
    name: business.name ? business.name.trim() : 'Test Business'
  };
  
  if (!attribute) {
    // Return all business information
    return { business: formattedBusiness };
  }
  
  // Handle specific attribute requests
  const attributeLower = attribute.toLowerCase();
  
  if (attributeLower.includes('contact') || attributeLower.includes('support')) {
    return {
      contact_information: {
        website: formattedBusiness.website_url,
        email: formattedBusiness.support_email,
        phone: formattedBusiness.support_phone
      }
    };
  }
  
  if (attributeLower.includes('website')) {
    return { website: formattedBusiness.website_url };
  }
  
  if (attributeLower.includes('name') || attributeLower.includes('about')) {
    return { 
      name: formattedBusiness.name
    };
  }
  
  // Return all information if attribute is not recognized
  return { business: formattedBusiness };
} 