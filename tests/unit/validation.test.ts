import { describe, it, expect } from "vitest";
import { UserInsertSchema, OrderInsertSchema } from "../../src/database/validation.js";

describe("validation schemas", () => {
  describe("UserInsertSchema.phone", () => {
    const valid = "+380501234567";
    it("accepts a valid Ukrainian phone", () => {
      expect(UserInsertSchema.shape.phone.safeParse(valid).success).toBe(true);
    });

    it.each(["380501234567", "+38050123456", "+3805012345678", "+390501234567", "abc"])(
      "rejects invalid phone %s",
      (bad) => {
        expect(UserInsertSchema.shape.phone.safeParse(bad).success).toBe(false);
      },
    );

    it("accepts null and undefined (optional)", () => {
      expect(UserInsertSchema.shape.phone.safeParse(null).success).toBe(true);
      expect(UserInsertSchema.shape.phone.safeParse(undefined).success).toBe(true);
    });
  });

  describe("UserInsertSchema.languageCode", () => {
    it("accepts a 2-char code", () => {
      expect(UserInsertSchema.shape.languageCode.safeParse("en").success).toBe(true);
    });
    it("rejects a 5-char region tag", () => {
      expect(UserInsertSchema.shape.languageCode.safeParse("en-US").success).toBe(false);
    });
  });

  describe("OrderInsertSchema.serviceType", () => {
    it("rejects too short", () => {
      expect(OrderInsertSchema.shape.serviceType.safeParse("ab").success).toBe(false);
    });
    it("accepts valid length", () => {
      expect(OrderInsertSchema.shape.serviceType.safeParse("plumbing").success).toBe(true);
    });
    it("rejects too long", () => {
      expect(
        OrderInsertSchema.shape.serviceType.safeParse("x".repeat(256)).success,
      ).toBe(false);
    });
  });

  describe("OrderInsertSchema.description", () => {
    it("accepts null", () => {
      expect(OrderInsertSchema.shape.description.safeParse(null).success).toBe(true);
    });
    it("rejects empty string", () => {
      expect(OrderInsertSchema.shape.description.safeParse("").success).toBe(false);
    });
    it("accepts valid min length", () => {
      expect(OrderInsertSchema.shape.description.safeParse("leak").success).toBe(true);
    });
  });

  describe("OrderInsertSchema.status", () => {
    it.each(["pending", "confirmed", "completed", "cancelled"])("accepts %s", (s) => {
      expect(OrderInsertSchema.shape.status.safeParse(s).success).toBe(true);
    });
    it("rejects unknown status", () => {
      expect(OrderInsertSchema.shape.status.safeParse("unknown").success).toBe(false);
    });
  });

  describe("OrderInsertSchema.userId", () => {
    it("rejects 0 and negative", () => {
      expect(OrderInsertSchema.shape.userId.safeParse(0).success).toBe(false);
      expect(OrderInsertSchema.shape.userId.safeParse(-1).success).toBe(false);
    });
    it("accepts positive integer", () => {
      expect(OrderInsertSchema.shape.userId.safeParse(5).success).toBe(true);
    });
  });
});