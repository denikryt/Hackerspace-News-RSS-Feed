import { expect, it } from "vitest";
import { parseFeedBody } from "../../src/feedParser.js";
it("reports malformed remote XML without exposing parser input in its error", async () => {
    const secret = "PRIVATE_REMOTE_ELEMENT";
    try {
        await parseFeedBody({ xml: `<rss><channel><${secret}></bad></channel></rss>`, validation: {} });
        throw new Error("Expected parse error");
    }
    catch (error) {
        expect(error.code).toBe("parse_error");
        expect(error.message).not.toContain(secret);
    }
});
