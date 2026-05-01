import { z } from "zod";
import { generateObject } from "ai";
import { getCurrentProviderTag, getModel } from "@/lib/llm/provider/sdk";
import { buildExtractReceiptPrompt } from "@/lib/llm/prompts/extractReceipt";

const extractedItemSchema = z.object({
  rawName: z.string().min(1),
  rawQuantity: z.string().min(1).nullable(),
  unitPrice: z.number().int().nonnegative().nullable(),
  totalPrice: z.number().int().nonnegative(),
});

const extractedReceiptSchema = z.object({
  purchaseDate: z.string().min(1).nullable(),
  store: z.string().min(1).nullable(),
  total: z.number().int().nonnegative().nullable(),
  items: z.array(extractedItemSchema),
});

export type ExtractedReceipt = z.infer<typeof extractedReceiptSchema>;

export interface ExtractInput {
  base64: string;
  mimeType: string;
}

export interface ExtractResult {
  result: ExtractedReceipt;
  modelUsed: string;
}

export type ExtractReceiptFromImageFn = (input: ExtractInput) => Promise<ExtractResult>;

export async function extractReceiptFromImage(
  input: ExtractInput,
): Promise<ExtractResult> {
  const prompt = buildExtractReceiptPrompt();
  try {
    const { object } = await generateObject({
      model: getModel("receipt_vision"),
      schema: extractedReceiptSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image",
              image: input.base64,
              mediaType: input.mimeType,
            },
          ],
        },
      ],
    });
    return {
      result: object,
      modelUsed: getCurrentProviderTag("receipt_vision"),
    };
  } catch (err) {
    const message = (err as Error).message ?? "Erro desconhecido na extracao.";
    throw new Error(`Falha ao extrair nota fiscal: ${message}`);
  }
}
