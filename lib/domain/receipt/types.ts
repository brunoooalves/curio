export interface ReceiptItem {
  id: string;
  rawName: string;
  canonicalName: string | null;
  rawQuantity: string | null;
  unitPrice: number | null;
  totalPrice: number;
}

export interface Receipt {
  id: string;
  purchaseDate: string;
  store: string | null;
  total: number;
  items: ReceiptItem[];
  rawExtraction: unknown;
  modelUsed: string;
  createdAt: string;
  updatedAt: string;
}
