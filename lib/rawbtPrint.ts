import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";

// 32 columns is the documented standard for 58mm thermal paper at normal
// font (confirmed this printer is 58mm) — the blank margin seen on a test
// print isn't a column-count problem, it's the printer's own print head
// being physically narrower than the paper roll, which is common on cheap
// pocket thermal printers. Bigger/bolder text is what actually makes the
// printed content visually use more of that width; a wider `columns` value
// would just wrap or clip lines without a wider print head to back it up.
const COLUMNS = 32;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Encoder = any;

function n(value: string | number | null | undefined): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

function dashLine(columns = COLUMNS): string {
  return "-".repeat(columns);
}

// Prints "label ... value" on one line, with just the value in bold (bold
// doesn't change character width, so this is safe with the column math).
// Falls back to label / right-aligned bold value on two lines if it can't
// fit on one — never overlaps or gets silently clipped.
function printRow(e: Encoder, left: string, right: string, columns = COLUMNS): Encoder {
  if (left.length + right.length + 1 > columns) {
    return e
      .line(left)
      .align("right")
      .bold(true)
      .line(right)
      .bold(false)
      .align("left");
  }
  const pad = columns - left.length - right.length;
  return e
    .text(left)
    .text(" ".repeat(pad))
    .bold(true)
    .text(right)
    .bold(false)
    .newline();
}

// Prints a headline figure much larger than the rest of the receipt — the
// one number a customer actually needs to read at a glance.
function printBigAmount(e: Encoder, label: string, value: string): Encoder {
  return e
    .bold(true)
    .line(label)
    .align("right")
    .width(2)
    .height(2)
    .line(value)
    .width(1)
    .height(1)
    .align("left")
    .bold(false);
}

// Uint8Array -> base64, byte-safe (btoa() needs a binary string, so this
// must NOT go through TextDecoder/UTF-8 — ESC/POS bytes aren't valid UTF-8).
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Hands ESC/POS bytes off to the RawBT app via its `rawbt:base64,` URL
 * scheme (https://rawbt.ru/intents.html). RawBT must be installed and the
 * Amigos Technology pocket printer must already be paired/selected inside
 * RawBT's own Bluetooth printer settings — this only triggers the print
 * job, it doesn't manage the Bluetooth connection itself.
 */
export function sendToRawBT(bytes: Uint8Array) {
  window.location.href = "rawbt:base64," + uint8ToBase64(bytes);
}

type QuotationReceiptItem = {
  product_name: string;
  weight: string;
  wastage_weight: string;
  rate: string;
  mc: string;
};

type QuotationReceiptScrap = {
  scrap_name: string;
  scrap_weight: string;
  scrap_less: string;
  scrap_weight_after_less: string;
  rate: string;
  total: string;
  status: "pending" | "estimated" | "locked";
};

export type QuotationReceiptData = {
  quotation_number: string;
  created_at: string;
  gst: string;
  total: string;
  less: string | null;
  items: QuotationReceiptItem[];
  scraps: QuotationReceiptScrap[];
};

// Mirrors app/quotation/[id]/print/page.tsx's on-screen thermal slip layout.
export function buildQuotationReceipt(data: QuotationReceiptData): Uint8Array {
  const createdAt = new Date(data.created_at);
  const date = createdAt.toLocaleDateString("en-IN");
  const time = createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const items = data.items;
  const totalWeight = items.reduce((sum, i) => sum + n(i.weight) + n(i.wastage_weight), 0);
  const rate = n(items[0]?.rate);
  const value = totalWeight * rate;
  const mcSum = items.reduce((sum, i) => sum + n(i.mc), 0);
  const gst = n(data.gst);
  const totalAfterGst = n(data.total);
  const less = n(data.less);
  const newProductTotal = totalAfterGst - less;

  const lockedScraps = data.scraps.filter((s) => s.status === "locked");
  const oldScrapTotal = lockedScraps.reduce((sum, s) => sum + n(s.total), 0);
  const amount = newProductTotal - oldScrapTotal;

  let e: Encoder = new ReceiptPrinterEncoder({ columns: COLUMNS })
    .initialize()
    .align("center")
    .bold(true)
    .line("APPACHI JEWELLERY")
    .bold(false)
    .align("left");

  e = printRow(e, "QUOTATION NUM", "DATE");
  e = printRow(e, data.quotation_number, date);
  e = printRow(e, "", time);
  e = e.line(dashLine());

  for (const item of items) {
    e = printRow(e, item.product_name, n(item.weight).toFixed(3));
    e = printRow(e, "Wastage", n(item.wastage_weight).toFixed(3));
  }

  e = e.line(dashLine());
  e = printRow(e, "", totalWeight.toFixed(3));
  e = printRow(e, "Rate", rate.toFixed(2));
  e = printRow(e, "", value.toFixed(2));
  e = printRow(e, "MC", mcSum.toFixed(2));
  e = printRow(e, "GST 3%", gst.toFixed(2));
  e = e.line(dashLine());
  e = printRow(e, "", totalAfterGst.toFixed(2));
  e = printRow(e, "Less If", less.toFixed(2));
  e = e.line(dashLine());
  e = printRow(e, "", newProductTotal.toFixed(2));

  if (lockedScraps.length > 0) {
    e = e.align("center").line("SCRAP").align("left");
    for (const scrap of lockedScraps) {
      e = printRow(e, scrap.scrap_name, n(scrap.scrap_weight).toFixed(3));
      e = printRow(e, "Less", n(scrap.scrap_less).toFixed(3));
      e = e.line(dashLine());
      e = printRow(e, "", n(scrap.scrap_weight_after_less).toFixed(3));
      e = printRow(e, "", n(scrap.rate).toFixed(2));
      e = printRow(e, "", n(scrap.total).toFixed(2));
    }
  }

  e = e.line(dashLine());
  e = printRow(e, "NEW PRODUCT TOTAL", newProductTotal.toFixed(2));
  e = printRow(e, "OLD SCRAP TOTAL", oldScrapTotal.toFixed(2));
  e = e.line(dashLine());
  e = printBigAmount(e, "AMOUNT", amount.toFixed(2));
  e = e.newline(3).cut();

  return e.encode();
}

export type ScrapReceiptData = {
  scrap_number: string;
  category: string;
  scrap_name: string;
  scrap_weight: string;
  scrap_less: string;
  scrap_weight_after_less: string;
  rate: string;
  total: string;
  quotation_number: string | null;
};

// Mirrors app/scrap/[id]/print/page.tsx's on-screen slip layout.
export function buildScrapReceipt(data: ScrapReceiptData): Uint8Array {
  let e: Encoder = new ReceiptPrinterEncoder({ columns: COLUMNS })
    .initialize()
    .align("center")
    .bold(true)
    .line("APPACHI JEWELLERY")
    .bold(false)
    .line("Scrap Estimation Slip")
    .align("left")
    .line(dashLine());

  e = printRow(e, "Scrap No.", data.scrap_number);
  if (data.quotation_number) {
    e = printRow(e, "Quotation No.", data.quotation_number);
  }
  e = printRow(e, "Ornament Type", data.category);
  e = printRow(e, "Scrap Name", data.scrap_name);
  e = printRow(e, "Scrap Weight", n(data.scrap_weight).toFixed(3) + " g");
  e = printRow(e, "Less", n(data.scrap_less).toFixed(3) + " g");
  e = printRow(e, "Wt After Less", n(data.scrap_weight_after_less).toFixed(3) + " g");
  e = printRow(e, "Rate", n(data.rate).toFixed(2));
  e = e.line(dashLine());
  e = printBigAmount(e, "TOTAL", n(data.total).toFixed(2));
  e = e.newline(3).cut();

  return e.encode();
}
