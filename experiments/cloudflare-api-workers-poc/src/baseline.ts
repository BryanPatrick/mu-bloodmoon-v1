export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    return Response.json({
      ok: true,
      runtime: 'cloudflare-workers',
      path: url.pathname
    })
  }
}
