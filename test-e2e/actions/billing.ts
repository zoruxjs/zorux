import { F } from "zorux"

export const invoicePaid = {
  policy: "*",
  handler: async (c: any) => {
    const { email, amount } = await c.req.json()
    console.log(`Invoice ${amount} paid by ${email}`)
    return c.json({ success: true })
  },
}
