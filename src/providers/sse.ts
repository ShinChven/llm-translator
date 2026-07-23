export async function readSse(
  response: Response,
  onData: (data: string) => void,
): Promise<void> {
  if (!response.body) throw new Error("The provider returned an empty stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";

    for (const event of events) {
      const data = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data) onData(data);
    }

    if (done) {
      if (buffer.trim()) {
        const data = buffer
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data) onData(data);
      }
      break;
    }
  }
}

export async function providerError(response: Response): Promise<Error> {
  let message = `${response.status} ${response.statusText}`;
  try {
    const body = (await response.json()) as {
      error?: { message?: string } | string;
    };
    if (typeof body.error === "string") message = body.error;
    else if (body.error?.message) message = body.error.message;
  } catch {
    // Keep the HTTP status when a provider does not return JSON.
  }
  return new Error(message);
}
