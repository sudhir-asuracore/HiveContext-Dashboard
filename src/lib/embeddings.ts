export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const provider = (process.env.EMBEDDING_PROVIDER || 'gemini').toLowerCase();
  const model = process.env.EMBEDDING_MODEL;

  if (provider === 'bedrock') {
    const modelId = model || 'amazon.titan-embed-text-v2:0';
    try {
      const region = process.env.AWS_REGION || 'ap-south-1';
      // Fallback/standard HTTP call to AWS Bedrock Runtime if boto3/sdk is not available in node
      // Note: Bedrock invocation via standard fetch requires SigV4 signature or AWS SDK
      // @ts-ignore
      const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime').catch(() => ({ BedrockRuntimeClient: null, InvokeModelCommand: null }));
      if (BedrockRuntimeClient && InvokeModelCommand) {
        const client = new BedrockRuntimeClient({ region });
        const command = new InvokeModelCommand({
          modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({ inputText: text }),
        });
        const response = await client.send(command);
        const json = JSON.parse(new TextDecoder().decode(response.body));
        const values = json.embedding;
        return { embedding: values, model: modelId, dimensions: values.length };
      }
    } catch (e) {
      console.warn('Bedrock SDK invocation error, falling back to Gemini default:', e);
    }
  }

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const modelId = model || 'text-embedding-3-small';
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text, model: modelId }),
    });
    if (res.ok) {
      const data = await res.json();
      const values = data.data[0].embedding;
      return { embedding: values, model: modelId, dimensions: values.length };
    }
  }

  // Default Gemini provider
  const modelId = model || 'gemini-embedding-2';
  const apiKey = process.env.GEMINI_API_KEY || '';
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${modelId}`,
        content: { parts: [{ text }] },
      }),
    }
  );

  if (!geminiRes.ok) {
    throw new Error(`Gemini embedding API error (${geminiRes.status}): ${await geminiRes.text()}`);
  }

  const data = await geminiRes.json();
  const values = data.embedding.values;
  return {
    embedding: values,
    model: modelId,
    dimensions: values.length,
  };
}
