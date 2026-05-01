"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ingestImage } from "@/lib/domain/receipt/receiptService";
import { extractReceiptFromImage } from "@/lib/llm/extractReceipt";
import {
  getIngredientNormalizer,
  getReceiptRepository,
} from "@/lib/persistence/mongo/factories";

export async function ingestReceiptImage(
  base64: string,
  mimeType: string,
): Promise<void> {
  const repo = await getReceiptRepository();
  const normalize = await getIngredientNormalizer();
  const receipt = await ingestImage(
    {
      receiptRepository: repo,
      extractReceiptFromImage,
      normalizeIngredients: normalize,
    },
    { base64, mimeType },
  );
  revalidatePath("/notas");
  revalidatePath("/precos");
  revalidatePath("/lista");
  redirect(`/notas/${receipt.id}`);
}
