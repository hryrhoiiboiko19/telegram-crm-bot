import { describe, it, expect } from "vitest";
import {
  leftPaginationArrow,
  rightPaginationArrow,
  buildOrderKeyboard,
} from "../../src/bot/handlers/admin-keyboard.js";
import type { BotContext } from "../../src/bot/types/index.js";

function fakeCtx(): BotContext {
  return {
    t: ((key: string) => key) as never,
  } as unknown as BotContext;
}

describe("admin-keyboard", () => {
  describe("leftPaginationArrow", () => {
    it("is disabled (noop) at offset 0", () => {
      const b = leftPaginationArrow(0);
      expect(b.callback_data).toBe("noop");
      expect(b.text).toBe("⬛");
    });

    it("points to previous offset otherwise", () => {
      const b = leftPaginationArrow(3);
      expect(b.callback_data).toBe("admin_order_pagination_offset_2");
      expect(b.text).toBe("⬅️");
    });
  });

  describe("rightPaginationArrow", () => {
    it.each([
      [0, 3, "➡️", "admin_order_pagination_offset_1"],
      [1, 3, "➡️", "admin_order_pagination_offset_2"],
    ])(
      "offset %i with total %i shows forward arrow",
      (offset, total, text, data) => {
        const b = rightPaginationArrow(offset, total);
        expect(b.text).toBe(text);
        expect(b.callback_data).toBe(data);
      },
    );

    it("is disabled on the last page", () => {
      const b = rightPaginationArrow(2, 3);
      expect(b.callback_data).toBe("noop");
      expect(b.text).toBe("⬛");
    });

    it("is disabled when total equals offset+1", () => {
      const b = rightPaginationArrow(4, 5);
      expect(b.callback_data).toBe("noop");
    });
  });

  describe("buildOrderKeyboard", () => {
    it("produces confirm, cancel and pagination rows", () => {
      const kb = buildOrderKeyboard(fakeCtx(), 42, 0, 3);
      expect(kb).toHaveLength(3);
      expect(kb[0][0].callback_data).toBe("admin_confirm_order_42");
      expect(kb[1][0].callback_data).toBe("admin_cancel_order_42");
      expect(kb[2]).toHaveLength(3);
      expect(kb[2][0].callback_data).toBe("noop"); // left disabled at 0
      expect(kb[2][2].callback_data).toBe("admin_order_pagination_offset_1"); // right enabled
    });
  });
});