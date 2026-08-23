const BACKEND_BASE_URL = "http://170.9.37.157:8000";

export default async function handler(req, res) {
  try {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers["content-length"];

    const method = req.method || "GET";
    const shouldSendBody = method !== "GET" && method !== "HEAD";
    const body = shouldSendBody && req.body != null
      ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body))
      : undefined;

    const response = await fetch(`${BACKEND_BASE_URL}/simulate/model2`, {
      method,
      headers,
      body,
    });

    const responseText = await response.text();

    res.status(response.status);
    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("content-type", contentType);
    }
    res.send(responseText);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy request failed";
    res.status(502).json({ error: message });
  }
}
