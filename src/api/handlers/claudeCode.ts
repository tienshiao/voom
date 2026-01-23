export function createClaudeCodeHandler() {
  return {
    async POST(req: Request) {
      const { prompt } = await req.json();
      console.log(prompt);
      setTimeout(() => process.exit(0), 100);
      return Response.json({ success: true });
    },
  };
}
