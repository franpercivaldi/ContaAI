// apps/api/src/core/llm-invoice.ts
import { z } from 'zod';

const InvoiceLlmSchema = z.object({
  tipo_factura: z.string().nullable().optional(),
  punto_venta: z.number().nullable().optional(),
  numero_comprobante: z.number().nullable().optional(),
  condicion_iva: z.string().nullable().optional(),
  razon_social_cliente: z.string().nullable().optional(),
  razon_social_emisor: z.string().nullable().optional(),
  cuit_cliente: z.string().nullable().optional(),
  cuit_emisor: z.string().nullable().optional(),
  fecha_emision: z.string().nullable().optional(), // YYYY-MM-DD
  monto_iva: z.number().nullable().optional(),
  monto_total: z.number().nullable().optional()
});

export type LlmInvoiceData = z.infer<typeof InvoiceLlmSchema>;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

if (!OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY no está definido; el extractor LLM no va a funcionar.');
}

export async function extractInvoiceWithLlm(text: string): Promise<LlmInvoiceData | null> {
  if (!OPENAI_API_KEY) {
    return null;
  }

  const systemPrompt = `
    Eres un extractor de datos de facturas argentinas.

    Debes leer el texto completo de la factura y devolver SOLO un JSON con este esquema:

    {
        "tipo_factura": "A | B | C | ... o null si no se encuentra",
        "punto_venta": número o null,
        "numero_comprobante": número o null,
        "condicion_iva": string o null,
        "razon_social_cliente": string o null,
        "razon_social_emisor": string o null,
        "cuit_cliente": string (11 dígitos) o null,
        "cuit_emisor": string (11 dígitos) o null,
        "fecha_emision": "YYYY-MM-DD" o null,
        "monto_iva": número (en pesos argentinos) o null,
        "monto_total": número (en pesos argentinos) o null
    }

    Reglas IMPORTANTES:
    - Si NO estás 100% seguro de un dato, ponlo en null.
    - Los números deben ser numéricos, no strings.
    - La fecha debe ser siempre YYYY-MM-DD o null.
    - NO devuelvas explicaciones, solo el JSON.
    `;

    const userPrompt = `
        Texto de la factura:

        """ 
        ${text}
        """
    `;

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.0
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Error llamando a OpenAI:', res.status, errText);
    return null;
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('No se pudo parsear el JSON devuelto por OpenAI:', e, content);
    return null;
  }

  const safe = InvoiceLlmSchema.safeParse(parsed);
  if (!safe.success) {
    console.error('Respuesta de OpenAI no matchea el esquema:', safe.error.format());
    return null;
  }

  return safe.data;
}
