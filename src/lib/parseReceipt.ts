// Parse the bank receipt text inside the QR code
// Sample format:
//   Nom client : RECTORAT ET SERVICES COMMUNS
//   Numéro compte : 10012 - 00272772201 -  07
//   Montant versé    : 3 000 XAF
//   Remettant : ATYAM  MFOU'OU  FELECITE  BRUNA

export interface ParsedReceipt {
  clientName: string | null;
  accountNumber: string | null;
  amount: number | null;
  remettant: string | null;
}

function pickValue(text: string, labelRegex: RegExp): string | null {
  const m = text.match(labelRegex);
  if (!m) return null;
  return m[1].replace(/\s+/g, " ").trim();
}

export function parseReceipt(raw: string): ParsedReceipt {
  const text = raw.replace(/\r/g, "");

  const clientName = pickValue(text, /Nom\s*client\s*:\s*([^\n]+)/i);
  const accountNumber = pickValue(text, /Num[ée]ro\s*compte\s*:\s*([^\n]+)/i);
  const amountStr = pickValue(text, /Montant\s*vers[ée]?\s*:\s*([^\n]+)/i);
  const remettant = pickValue(text, /Remettant\s*:\s*([^\n]+)/i);

  let amount: number | null = null;
  if (amountStr) {
    const n = amountStr.replace(/[^\d]/g, "");
    if (n) amount = parseInt(n, 10);
  }

  return { clientName, accountNumber, amount, remettant };
}
