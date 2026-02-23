import { cn, getPlaceholderImage } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names correctly", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
      expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
      expect(cn("foo", null, undefined, "bar")).toBe("foo bar");
    });

    it("should handle Tailwind class conflicts", () => {
      // twMerge should handle conflicting classes
      const result = cn("px-2", "px-4");
      expect(result).toBe("px-4"); // Last one wins
    });

    it("should handle conditional classes", () => {
      const isActive = true;
      const isDisabled = false;
      expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe("base active");
    });
  });

  describe("getPlaceholderImage", () => {
    it("should return placeholder image URL with default dimensions", () => {
      const url = getPlaceholderImage();
      expect(url).toContain("placehold.co");
      expect(url).toContain("600x600");
    });

    it("should return placeholder image URL with custom dimensions", () => {
      const url = getPlaceholderImage(800, 600);
      expect(url).toContain("placehold.co");
      expect(url).toContain("800x600");
    });

    it("should encode dimensions in URL", () => {
      const url = getPlaceholderImage(100, 200);
      expect(url).toMatch(/100x200/);
    });
  });
});


