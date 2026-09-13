export async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const {done,value} = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, {stream:true});
      // Normalize CRLF only after complete lines arrive, including split network chunks.
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const event = buffer.slice(0,boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const data = event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (data) yield data;
      }
      if (done) break;
    }
    if (buffer.trim()) throw new Error('The AIP stream ended with an incomplete event. Please retry.');
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
