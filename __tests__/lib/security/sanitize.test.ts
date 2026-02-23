import {
  sanitizeHtml,
  sanitizeString,
  sanitizeNumber,
  sanitizeArray,
  sanitizeObject,
} from "@/lib/security/sanitize";

describe("sanitizeHtml", () => {
  it("should remove script tags", () => {
    const html = '<p>Hello</p><script>alert("XSS")</script>';
    const sanitized = sanitizeHtml(html);
    expect(sanitized).not.toContain("<script>");
    expect(sanitized).toContain("<p>Hello</p>");
  });

  it("should remove event handlers", () => {
    const html = '<p onclick="alert(\'XSS\')">Click me</p>';
    const sanitized = sanitizeHtml(html);
    expect(sanitized).not.toContain("onclick");
  });

  it("should allow safe tags", () => {
    const html = "<b>Bold</b> <i>Italic</i> <a href='#'>Link</a>";
    const sanitized = sanitizeHtml(html);
    expect(sanitized).toContain("<b>");
    expect(sanitized).toContain("<i>");
    expect(sanitized).toContain("<a"); // Tag might have attributes
  });
});

describe("sanitizeString", () => {
  it("should remove null bytes", () => {
    const input = "Hello\0World";
    const sanitized = sanitizeString(input);
    expect(sanitized).not.toContain("\0");
  });

  it("should remove control characters", () => {
    const input = "Hello\x01World";
    const sanitized = sanitizeString(input);
    expect(sanitized).not.toContain("\x01");
  });

  it("should trim whitespace", () => {
    const input = "  Hello World  ";
    const sanitized = sanitizeString(input);
    expect(sanitized).toBe("Hello World");
  });

  it("should handle non-string input", () => {
    expect(sanitizeString(null as any)).toBe("");
    expect(sanitizeString(123 as any)).toBe("");
  });
});

describe("sanitizeNumber", () => {
  it("should return number as-is if valid", () => {
    expect(sanitizeNumber(123)).toBe(123);
    expect(sanitizeNumber(0)).toBe(0);
    expect(sanitizeNumber(-10)).toBe(-10);
  });

  it("should parse string numbers", () => {
    expect(sanitizeNumber("123")).toBe(123);
    expect(sanitizeNumber("45.67")).toBe(45.67);
  });

  it("should return 0 for invalid input", () => {
    expect(sanitizeNumber("abc")).toBe(0);
    expect(sanitizeNumber(null)).toBe(0);
    expect(sanitizeNumber(undefined)).toBe(0);
    expect(sanitizeNumber(Infinity)).toBe(0);
  });
});

describe("sanitizeArray", () => {
  it("should return empty array for non-array input", () => {
    expect(sanitizeArray(null)).toEqual([]);
    expect(sanitizeArray("string")).toEqual([]);
  });

  it("should return array as-is if no validator", () => {
    const input = [1, 2, 3];
    expect(sanitizeArray(input)).toEqual([1, 2, 3]);
  });

  it("should filter array with validator", () => {
    const validator = (item: unknown): item is number => typeof item === "number";
    const input = [1, "two", 3, "four", 5];
    expect(sanitizeArray(input, validator)).toEqual([1, 3, 5]);
  });
});

describe("sanitizeObject", () => {
  it("should return empty object for non-object input", () => {
    expect(sanitizeObject(null, ["key"])).toEqual({});
    expect(sanitizeObject("string", ["key"])).toEqual({});
  });

  it("should only include allowed keys", () => {
    const input = { a: 1, b: 2, c: 3 };
    const allowed = ["a", "b"];
    expect(sanitizeObject(input, allowed)).toEqual({ a: 1, b: 2 });
  });

  it("should exclude disallowed keys", () => {
    const input = { a: 1, b: 2, c: 3 };
    const allowed = ["a"];
    expect(sanitizeObject(input, allowed)).toEqual({ a: 1 });
  });
});

