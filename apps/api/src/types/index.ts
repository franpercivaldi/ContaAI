import { z } from 'zod'

export const InvoiceDTO = z.object({
  id: z.string().uuid(),
  number: z.string(),
  amount: z.number(),
  createdAt: z.string(),
})

export type Invoice = z.infer<typeof InvoiceDTO>
