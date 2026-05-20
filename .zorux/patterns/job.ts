// ─── Job Pattern ───
// Background job. Runs via worker with retry support.
// Edit the perform function below.

export default {
  name: "my-job",
  description: "Describe what this job does",

  async perform(args: any): Promise<void> {
    const { /* destructure args */ } = args

    try {
      // Your job logic here

      console.log(`[job] Completed: ${JSON.stringify(args)}`)
    } catch (err: any) {
      console.error(`[job] Failed: ${err.message}`)
      throw err // Will trigger retry
    }
  },
}
