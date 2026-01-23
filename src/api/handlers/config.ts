export function createConfigHandler() {
  return {
    GET() {
      return Response.json({
        claudeCodeMode: !!process.env.CLAUDECODE,
      });
    },
  };
}
