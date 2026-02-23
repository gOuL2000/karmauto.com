import {
  validateIranianPhone,
  validateStrongPassword,
  normalizePhone,
  registerSchema,
  loginSchema,
} from "@/lib/validations/auth";

describe("validateIranianPhone", () => {
  it("should validate correct phone numbers", () => {
    expect(validateIranianPhone("09123456789")).toBe(true);
    expect(validateIranianPhone("9123456789")).toBe(true);
    expect(validateIranianPhone("+989123456789")).toBe(true);
    expect(validateIranianPhone("00989123456789")).toBe(true);
  });

  it("should reject invalid phone numbers", () => {
    expect(validateIranianPhone("")).toBe(false);
    expect(validateIranianPhone("1234567890")).toBe(false);
    expect(validateIranianPhone("0912345678")).toBe(false); // Too short
    expect(validateIranianPhone("091234567890")).toBe(false); // Too long
    expect(validateIranianPhone("08123456789")).toBe(false); // Wrong prefix
  });

  it("should handle whitespace and formatting", () => {
    expect(validateIranianPhone("0912 345 6789")).toBe(true);
    expect(validateIranianPhone("0912-345-6789")).toBe(true);
  });
});

describe("validateStrongPassword", () => {
  it("should validate passwords with correct length", () => {
    const result = validateStrongPassword("password123");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject passwords that are too short", () => {
    const result = validateStrongPassword("12345");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("رمز عبور باید حداقل 6 کاراکتر باشد");
  });

  it("should reject passwords that are too long", () => {
    const longPassword = "a".repeat(129);
    const result = validateStrongPassword(longPassword);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("رمز عبور نمی‌تواند بیشتر از 128 کاراکتر باشد");
  });

  it("should accept minimum length password", () => {
    const result = validateStrongPassword("123456");
    expect(result.valid).toBe(true);
  });
});

describe("normalizePhone", () => {
  it("should normalize phone to standard format", () => {
    expect(normalizePhone("09123456789")).toBe("09123456789");
    expect(normalizePhone("9123456789")).toBe("09123456789");
    expect(normalizePhone("+989123456789")).toBe("09123456789");
    expect(normalizePhone("00989123456789")).toBe("09123456789");
  });

  it("should handle formatted phone numbers", () => {
    expect(normalizePhone("0912 345 6789")).toBe("09123456789");
    expect(normalizePhone("0912-345-6789")).toBe("09123456789");
  });

  it("should throw error for invalid phone numbers", () => {
    expect(() => normalizePhone("")).toThrow();
    expect(() => normalizePhone("1234567890")).toThrow();
    expect(() => normalizePhone("08123456789")).toThrow();
  });
});

describe("registerSchema", () => {
  it("should validate correct registration data", () => {
    const validData = {
      name: "علی احمدی",
      phone: "09123456789",
      password: "password123",
    };

    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject invalid name", () => {
    const invalidData = {
      name: "A", // Too short
      phone: "09123456789",
      password: "password123",
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject invalid phone", () => {
    const invalidData = {
      name: "علی احمدی",
      phone: "1234567890",
      password: "password123",
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject invalid password", () => {
    const invalidData = {
      name: "علی احمدی",
      phone: "09123456789",
      password: "12345", // Too short
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("should validate correct login data", () => {
    const validData = {
      phone: "09123456789",
      password: "password123",
    };

    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject empty phone", () => {
    const invalidData = {
      phone: "",
      password: "password123",
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject empty password", () => {
    const invalidData = {
      phone: "09123456789",
      password: "",
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});


