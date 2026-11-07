import { describe, expect, it } from "vitest";
import { ping } from "../src/services/ping.js";

describe("ping service", () => {
  it("replies pong", () => {
    expect(ping()).toEqual({ reply: "pong" });
  });
  it("echoes the message", () => {
    expect(ping("hi")).toEqual({ reply: "pong: hi" });
  });
});
