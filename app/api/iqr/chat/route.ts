import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define message types based on OpenAI's API
interface Message {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

// Define function schemas for OpenAI function calling
const functionSchemas = [
  {
    name: "query_product_details",
    description: "Retrieve specific details about the product when the user asks about features, specifications, or capabilities that aren't covered in the context.",
    parameters: {
      type: "object",
      properties: {
        query: { 
          type: "string", 
          description: "The specific aspect of the product the user is asking about"
        }
      },
      required: ["query"]
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
  }
];

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      anonymous_id,
      business_id,
      product_id,
    } = await req.json();

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

    if (!product_id) {
      return NextResponse.json(
        { error: 'No product ID provided' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Step 1: Get business information
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('name, website_url, support_email, support_phone')
      .eq('id', business_id)
      .single();
    
    if (businessError) {
      console.error('Error fetching business data:', businessError);
      return NextResponse.json(
        { error: 'Failed to fetch business information' },
        { status: 500 }
      );
    }
    
    // Step 2: Get product information
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('name, description, system_prompt')
      .eq('id', product_id)
      .single();
    
    if (productError) {
      console.error('Error fetching product data:', productError);
      return NextResponse.json(
        { error: 'Failed to fetch product information' },
        { status: 500 }
      );
    }

    // Step 3: Get relevant PDF chunks using vector search
    const userQuery = messages[messages.length - 1].content;
    let relevantChunks: any[] = [];
    
    try {
      // Generate embedding for the user query
      const embedding = await generateEmbedding(userQuery);
      
      // Search for relevant PDF chunks using the embedding
      const { data: chunks, error: chunksError } = await supabase
        .rpc('match_pdf_chunks', {
          query_embedding: embedding,
          match_threshold: 0.7,
          match_count: 5,
          p_product_id: product_id
        });
      
      if (chunksError) {
        console.error('Error searching PDF chunks:', chunksError);
      } else if (chunks && chunks.length > 0) {
        relevantChunks = chunks;
      } else {
        // Fallback to a regular query if vector search fails or returns no results
        const { data: fallbackChunks, error: fallbackError } = await supabase
          .from('pdf_chunks')
          .select('content, metadata')
          .eq('product_id', product_id)
          .limit(5);
        
        if (!fallbackError && fallbackChunks) {
          relevantChunks = fallbackChunks;
        }
      }
    } catch (embeddingError) {
      console.error('Error with vector search:', embeddingError);
      
      // Fallback to a regular query
      const { data: fallbackChunks, error: fallbackError } = await supabase
        .from('pdf_chunks')
        .select('content, metadata')
        .eq('product_id', product_id)
        .limit(5);
      
      if (!fallbackError && fallbackChunks) {
        relevantChunks = fallbackChunks;
      }
    }

    // Step 4: Get previous chat history
    const { data: historyData, error: historyError } = await supabase
      .from('iqr_chat_messages')
      .select('role, content')
      .eq('business_id', business_id)
      .eq('user_phone', anonymous_id)
      .order('created_at', { ascending: true })
      .limit(10);
    
    if (historyError) {
      console.error('Error fetching chat history:', historyError);
    }

    // Step 5: Build the conversation with system prompt and context
    const systemPrompt = buildSystemPrompt(
      businessData,
      productData,
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

    // Detect if the query is likely asking for product details not covered in the context
    const isAskingForProductDetails = containsProductQuestion(userQuery);

    // Add guidance for function calling if needed
    if (isAskingForProductDetails) {
      conversationHistory.push({
        role: 'system',
        content: 'The user is asking about specific product details. If you don\'t have the complete information in your context, use the query_product_details function to search for more information.'
      });
    }

    // Step 6: Make API call to OpenAI with function calling
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
      const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
      
      let functionResult;
      
      // Handle different function calls
      if (functionName === 'query_product_details') {
        functionResult = await handleProductDetailsQuery(product_id, functionArgs.query);
      } else if (functionName === 'search_related_products') {
        functionResult = await handleRelatedProductsSearch(business_id, product_id, functionArgs.search_term);
      } else {
        functionResult = { error: 'Unknown function' };
      }
      
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

    // Step 7: Save messages to the database
    // Save user message
    const { error: userMsgError } = await supabase
      .from('iqr_chat_messages')
      .insert({
        business_id,
        product_id,
        user_phone: anonymous_id,
        role: 'user',
        content: userQuery
      });
    
    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
    }
    
    // Save assistant message
    const { error: assistantMsgError } = await supabase
      .from('iqr_chat_messages')
      .insert({
        business_id,
        product_id,
        user_phone: anonymous_id,
        role: 'assistant',
        content: aiResponse,
        metadata: functionCallUsed ? { function_call_used: true } : undefined
      });
    
    if (assistantMsgError) {
      console.error('Error saving assistant message:', assistantMsgError);
    }

    // Return the AI response
    return new NextResponse(aiResponse, {
      headers: {
        'X-Function-Call-Used': functionCallUsed ? 'true' : 'false'
      }
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate embeddings using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  
  return response.data[0].embedding;
}

// Helper function to build the system prompt
function buildSystemPrompt(
  business: any,
  product: any,
  relevantChunks: any[]
): string {
  // Base system prompt
  let systemPrompt = `You are a helpful product assistant for ${business.name}.`;
  
  // Add product-specific system prompt if available
  if (product.system_prompt) {
    systemPrompt += `\n\n${product.system_prompt}`;
  } else {
    systemPrompt += `\n\nYou are providing information about ${product.name}. ${product.description || ''}`;
  }
  
  // Add business contact information
  systemPrompt += `\n\nIf the customer needs to contact ${business.name} directly, provide the following information:`;
  
  if (business.website_url) {
    systemPrompt += `\n- Website: ${business.website_url}`;
  }
  if (business.support_email) {
    systemPrompt += `\n- Email: ${business.support_email}`;
  }
  if (business.support_phone) {
    systemPrompt += `\n- Phone: ${business.support_phone}`;
  }
  
  // Add information from PDF chunks
  if (relevantChunks.length > 0) {
    systemPrompt += `\n\nHere's specific information about this product that may be helpful for answering the user's question:\n\n`;
    
    relevantChunks.forEach((chunk, index) => {
      systemPrompt += `---\nInformation ${index + 1}:\n${chunk.content}\n---\n\n`;
    });
    
    systemPrompt += `Use the above information to answer the user's question accurately. If the information doesn't directly address their question, use the function calling capability to search for more specific information.`;
  }
  
  systemPrompt += `\n\nBe friendly, helpful, and concise in your responses. Always prioritize accuracy over speculation.`;
  
  return systemPrompt;
}

// Helper function to determine if a query is asking for product details
function containsProductQuestion(query: string): boolean {
  const productQuestionPatterns = [
    /what (is|are) the (feature|spec|specification|detail|information)/i,
    /how (does|do) (it|this product|the product) (work|function)/i,
    /can (it|this product|the product) (do|perform|handle)/i,
    /tell me (more|about) (the|this) product/i,
    /(feature|capability|specification)/i,
    /comparison|versus|alternative|similar/i
  ];
  
  return productQuestionPatterns.some(pattern => pattern.test(query));
}

// Handler for product details queries
async function handleProductDetailsQuery(productId: string, query: string) {
  try {
    const supabase = createClient();
    
    // First try to find more specific information in the PDF chunks
    const embedding = await generateEmbedding(query);
    
    const { data: chunks, error: chunksError } = await supabase
      .rpc('match_pdf_chunks', {
        query_embedding: embedding,
        match_threshold: 0.6, // Lower threshold for more results
        match_count: 8, // More chunks for detailed query
        p_product_id: productId
      });
    
    if (chunksError) {
      console.error('Error in detailed product search:', chunksError);
      return { 
        success: false, 
        message: "Couldn't find detailed product information",
        error: chunksError.message
      };
    }
    
    if (chunks && chunks.length > 0) {
      return {
        success: true,
        product_details: chunks.map((chunk: any) => chunk.content).join('\n\n'),
        metadata: {
          source: 'pdf_chunks',
          count: chunks.length
        }
      };
    }
    
    // If no results from chunks, check if there's additional product info
    const { data: productDetails, error: productError } = await supabase
      .from('product_details')
      .select('*')
      .eq('product_id', productId)
      .single();
    
    if (!productError && productDetails) {
      return {
        success: true,
        product_details: productDetails,
        metadata: {
          source: 'product_details'
        }
      };
    }
    
    // If we still don't have information, return a useful failure response
    return {
      success: false,
      message: "I couldn't find specific information about this aspect of the product. Would you like me to note this question for the business owner to address later?",
      metadata: {
        query: query,
        product_id: productId
      }
    };
  } catch (error: any) {
    console.error('Error handling product details query:', error);
    return {
      success: false,
      message: "An error occurred while fetching product details.",
      error: error.message
    };
  }
}

// Handler for related products search
async function handleRelatedProductsSearch(businessId: string, productId: string, searchTerm: string) {
  try {
    const supabase = createClient();
    
    // Get related products from the same business
    const { data: relatedProducts, error: relatedError } = await supabase
      .from('products')
      .select('id, name, description')
      .eq('business_id', businessId)
      .neq('id', productId) // Exclude current product
      .ilike('name', `%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (relatedError) {
      console.error('Error searching related products:', relatedError);
      return {
        success: false,
        message: "Couldn't find related products",
        error: relatedError.message
      };
    }
    
    if (relatedProducts && relatedProducts.length > 0) {
      return {
        success: true,
        related_products: relatedProducts,
        metadata: {
          search_term: searchTerm,
          count: relatedProducts.length
        }
      };
    }
    
    // If no direct matches, try a more generic search
    const { data: genericProducts, error: genericError } = await supabase
      .from('products')
      .select('id, name, description')
      .eq('business_id', businessId)
      .neq('id', productId)
      .limit(3);
    
    if (!genericError && genericProducts && genericProducts.length > 0) {
      return {
        success: true,
        related_products: genericProducts,
        message: `I couldn't find products specifically matching "${searchTerm}", but here are some other products from the same business:`,
        metadata: {
          search_term: searchTerm,
          generic_search: true
        }
      };
    }
    
    // If we still don't have information, return a useful failure response
    return {
      success: false,
      message: "I couldn't find any related products matching your query.",
      metadata: {
        search_term: searchTerm
      }
    };
  } catch (error: any) {
    console.error('Error handling related products search:', error);
    return {
      success: false,
      message: "An error occurred while searching for related products.",
      error: error.message
    };
  }
} 