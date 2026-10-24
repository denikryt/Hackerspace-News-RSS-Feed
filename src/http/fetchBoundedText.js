// Own the complete attempt lifetime: connecting, receiving headers and reading
// decompressed body bytes share one deadline. Never trust Content-Length alone.
export async function fetchBoundedText({ url, fetchImpl = fetch, headers, timeoutMs, maxBodyBytes, signal }) {
    if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1 || !Number.isFinite(timeoutMs) || timeoutMs <= 0)
        throw new TypeError('Invalid HTTP resource limits');
    const controller = new AbortController();
    let reader;
    let bytesRead = 0;
    let timer;
    let rejectAbort;
    const aborted = new Promise((_, reject) => { rejectAbort = reject; });
    const abort = () => { controller.abort(); rejectAbort(failure('timeout', bytesRead, maxBodyBytes)); };
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(abort, timeoutMs);
    const withinDeadline = operation => Promise.race([Promise.resolve(operation), aborted]);
    try {
        if (signal?.aborted)
            throw failure('timeout', 0, maxBodyBytes);
        const response = await withinDeadline(fetchImpl(url, { redirect: 'follow', headers, signal: controller.signal }));
        if (!response.body || typeof response.body.getReader !== 'function')
            throw failure('invalid_stream', 0, maxBodyBytes);
        reader = response.body.getReader();
        const declared = response.headers.get('content-length');
        if (declared && /^\d+$/.test(declared) && Number(declared) > maxBodyBytes)
            throw failure('response_too_large', 0, maxBodyBytes);
        const decoder = new TextDecoder();
        const chunks = [];
        while (true) {
            const { done, value } = await withinDeadline(reader.read());
            if (done)
                break;
            if (!(value instanceof Uint8Array))
                throw failure('invalid_stream', bytesRead, maxBodyBytes);
            bytesRead += value.byteLength;
            if (bytesRead > maxBodyBytes)
                throw failure('response_too_large', bytesRead, maxBodyBytes);
            chunks.push(decoder.decode(value, { stream: true }));
        }
        chunks.push(decoder.decode());
        return { text: chunks.join(''), bytesRead, status: response.status, ok: response.ok, finalUrl: response.url || url, contentType: response.headers.get('content-type') || '' };
    }
    catch (error) {
        // Cancellation may itself fail or stall; cleanup must not mask the cause.
        controller.abort();
        if (reader)
            Promise.resolve(reader.cancel()).catch(() => { });
        if (error?.code && ['timeout', 'response_too_large', 'invalid_stream'].includes(error.code))
            throw error;
        const safe = failure(error?.name === 'AbortError' ? 'timeout' : 'fetch_error', bytesRead, maxBodyBytes);
        safe.cause = safeNetworkCause(error);
        throw safe;
    }
    finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        try {
            reader?.releaseLock();
        }
        catch { }
    }
}
// Safe diagnostics contain policy metadata, never a remote error/body string.
function failure(code, bytesRead, maxBodyBytes) {
    const error = new Error(`${code}: bytes=${bytesRead}, limit=${maxBodyBytes}`);
    error.code = code;
    error.bytesRead = bytesRead;
    error.maxBodyBytes = maxBodyBytes;
    if (code === 'timeout')
        error.name = 'AbortError';
    return error;
}
// Retain retry codes without retaining arbitrary remote exception messages.
function safeNetworkCause(error, depth = 0) {
    if (!error || typeof error !== "object" || depth > 8)
        return undefined;
    return { code: typeof error.code === "string" && /^[A-Z_]+$/.test(error.code) ? error.code : undefined, cause: safeNetworkCause(error.cause, depth + 1), ...(error instanceof AggregateError ? { errors: error.errors.map(e => safeNetworkCause(e, depth + 1)) } : {}) };
}
