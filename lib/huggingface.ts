import { InferenceClient } from "@huggingface/inference";

const IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell";

function getApiKey(): string {
  const raw = process.env.HUGGINGFACE_API_KEY?.trim();

  if (!raw) {
    throw new Error("HUGGINGFACE_API_KEY не задан в .env.local");
  }

  return raw.replace(/^\[|\]$/g, "");
}

export async function generateImage(prompt: string): Promise<string> {
  const client = new InferenceClient(getApiKey());

  return client.textToImage(
    {
      model: IMAGE_MODEL,
      inputs: prompt,
      provider: "auto",
      parameters: { num_inference_steps: 4 },
    },
    { outputType: "dataUrl" },
  );
}
