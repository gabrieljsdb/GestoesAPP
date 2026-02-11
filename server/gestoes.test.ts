import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: undefined,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("gestoes router", () => {
  describe("list (public)", () => {
    it("should return all gestoes with members", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.gestoes.list();

      expect(Array.isArray(result)).toBe(true);
      // Each gestao should have members array
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("members");
        expect(Array.isArray(result[0].members)).toBe(true);
      }
    });
  });

  describe("export (public)", () => {
    it("should return gestoes in JSON format", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.gestoes.export();

      expect(result).toHaveProperty("gestoes");
      expect(Array.isArray(result.gestoes)).toBe(true);
      
      // Check structure matches expected format
      if (result.gestoes.length > 0) {
        const gestao = result.gestoes[0];
        expect(gestao).toHaveProperty("period");
        expect(gestao).toHaveProperty("members");
        expect(Array.isArray(gestao.members)).toBe(true);
      }
    });
  });

  describe("create (admin only)", () => {
    it("should create a new gestao with members", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.gestoes.create({
        period: "2026/2028",
        startActive: false,
        members: ["Presidente: Dr. Test", "Vice: Dra. Test"],
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });

    it("should reject non-admin users", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.gestoes.create({
          period: "2026/2028",
          members: [],
        })
      ).rejects.toThrow();
    });
  });

  describe("update (admin only)", () => {
    it("should update an existing gestao", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // First create a gestao
      const created = await caller.gestoes.create({
        period: "2028/2030",
        members: [],
      });

      // Then update it
      const result = await caller.gestoes.update({
        id: created.id,
        period: "2028/2031",
        startActive: true,
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe("delete (admin only)", () => {
    it("should delete a gestao and its members", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Create a gestao
      const created = await caller.gestoes.create({
        period: "2030/2032",
        members: ["Test Member"],
      });

      // Delete it
      const result = await caller.gestoes.delete({
        id: created.id,
      });

      expect(result).toEqual({ success: true });
    });
  });
});

describe("members router", () => {
  describe("create (admin only)", () => {
    it("should create a new member for a gestao", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // First create a gestao
      const gestao = await caller.gestoes.create({
        period: "2032/2034",
        members: [],
      });

      // Then add a member
      const result = await caller.members.create({
        gestaoId: gestao.id,
        name: "Presidente: Dr. New Member",
        displayOrder: 0,
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });
  });

  describe("update (admin only)", () => {
    it("should update an existing member", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Create gestao and member
      const gestao = await caller.gestoes.create({
        period: "2034/2036",
        members: ["Original Name"],
      });

      const members = await caller.members.list({ gestaoId: gestao.id });
      const memberId = members[0].id;

      // Update member
      const result = await caller.members.update({
        id: memberId,
        name: "Updated Name",
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe("delete (admin only)", () => {
    it("should delete a member", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Create gestao with member
      const gestao = await caller.gestoes.create({
        period: "2036/2038",
        members: ["To Be Deleted"],
      });

      const members = await caller.members.list({ gestaoId: gestao.id });
      const memberId = members[0].id;

      // Delete member
      const result = await caller.members.delete({
        id: memberId,
      });

      expect(result).toEqual({ success: true });
    });
  });
});
