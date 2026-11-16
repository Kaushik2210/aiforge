import { describe, expect, it } from "vitest";
import { listQuests } from "./quests";
import { REALMS } from "./realms";

describe("REALMS", () => {
  it("marks a realm open, with the right quest count, exactly when it has built quests", () => {
    const quests = listQuests();
    for (const realm of REALMS) {
      const built = quests.filter((q) => q.realm === realm.n);
      expect(realm.questCount ?? 0, `realm ${realm.n} questCount`).toBe(built.length);
      expect(Boolean(realm.quest), `realm ${realm.n} open`).toBe(built.length > 0);
      if (realm.quest) expect(built.map((q) => q.id), `realm ${realm.n} first quest`).toContain(realm.quest);
    }
  });
  it("lists the 23 realms in order", () => {
    expect(REALMS.map((r) => r.n)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
  });
});
