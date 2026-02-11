import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as authLocal from "./auth-local";

let testCounter = 0;

describe("Local Authentication", () => {
  const getTestAdmin = () => ({
    username: `testadmin${testCounter++}`,
    email: `test${testCounter}@example.com`,
    password: "TestPassword123",
    fullName: "Test Admin User",
  });

  let testAdmin = getTestAdmin();

  describe("Password hashing", () => {
    it("should hash a password", async () => {
      const hash = await authLocal.hashPassword(testAdmin.password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(testAdmin.password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it("should verify a correct password", async () => {
      const hash = await authLocal.hashPassword(testAdmin.password);
      const isValid = await authLocal.verifyPassword(testAdmin.password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject an incorrect password", async () => {
      const hash = await authLocal.hashPassword(testAdmin.password);
      const isValid = await authLocal.verifyPassword("WrongPassword", hash);
      expect(isValid).toBe(false);
    });
  });

  describe("Admin creation and retrieval", () => {
    it("should create a new admin", async () => {
      testAdmin = getTestAdmin();
      const adminId = await authLocal.createLocalAdmin(testAdmin);
      expect(adminId).toBeDefined();
      expect(typeof adminId).toBe("number");
      expect(adminId).toBeGreaterThan(0);
    });

    it("should retrieve admin by username", async () => {
      testAdmin = getTestAdmin();
      await authLocal.createLocalAdmin(testAdmin);
      const admin = await authLocal.getAdminByUsername(testAdmin.username);
      expect(admin).toBeDefined();
      expect(admin?.username).toBe(testAdmin.username);
      expect(admin?.email).toBe(testAdmin.email);
      expect(admin?.fullName).toBe(testAdmin.fullName);
    });

    it("should return undefined for non-existent admin", async () => {
      const admin = await authLocal.getAdminByUsername("nonexistent");
      expect(admin).toBeUndefined();
    });
  });

  describe("Credential verification", () => {
    beforeEach(async () => {
      // Ensure we have a clean admin for testing
      testAdmin = getTestAdmin();
      await authLocal.createLocalAdmin(testAdmin);
    });

    it("should verify correct credentials", async () => {
      const admin = await authLocal.verifyAdminCredentials(
        testAdmin.username,
        testAdmin.password
      );
      expect(admin).toBeDefined();
      expect(admin?.username).toBe(testAdmin.username);
    });

    it("should reject incorrect password", async () => {
      const admin = await authLocal.verifyAdminCredentials(
        testAdmin.username,
        "WrongPassword"
      );
      expect(admin).toBeNull();
    });

    it("should reject non-existent user", async () => {
      const admin = await authLocal.verifyAdminCredentials(
        "nonexistent",
        testAdmin.password
      );
      expect(admin).toBeNull();
    });
  });

  describe("Admin status checks", () => {
    it("should detect when admins exist", async () => {
      testAdmin = getTestAdmin();
      await authLocal.createLocalAdmin(testAdmin);
      const hasAdmins = await authLocal.hasAnyAdmins();
      expect(hasAdmins).toBe(true);
    });
  });

  describe("Password changes", () => {
    it("should change admin password", async () => {
      testAdmin = getTestAdmin();
      const adminId = await authLocal.createLocalAdmin(testAdmin);
      const newPassword = "NewPassword123";

      await authLocal.changeAdminPassword(adminId, newPassword);

      // Old password should not work
      const oldPasswordCheck = await authLocal.verifyAdminCredentials(
        testAdmin.username,
        testAdmin.password
      );
      expect(oldPasswordCheck).toBeNull();

      // New password should work
      const newPasswordCheck = await authLocal.verifyAdminCredentials(
        testAdmin.username,
        newPassword
      );
      expect(newPasswordCheck).toBeDefined();
    });
  });

  describe("Admin activation/deactivation", () => {
    it("should deactivate an admin", async () => {
      testAdmin = getTestAdmin();
      const adminId = await authLocal.createLocalAdmin(testAdmin);
      await authLocal.deactivateAdmin(adminId);

      const admin = await authLocal.verifyAdminCredentials(
        testAdmin.username,
        testAdmin.password
      );
      expect(admin).toBeNull();
    });

    it("should activate an admin", async () => {
      testAdmin = getTestAdmin();
      const adminId = await authLocal.createLocalAdmin(testAdmin);
      await authLocal.deactivateAdmin(adminId);
      await authLocal.activateAdmin(adminId);

      const admin = await authLocal.verifyAdminCredentials(
        testAdmin.username,
        testAdmin.password
      );
      expect(admin).toBeDefined();
    });
  });

  describe("Admin deletion", () => {
    it("should delete an admin", async () => {
      testAdmin = getTestAdmin();
      const adminId = await authLocal.createLocalAdmin(testAdmin);
      await authLocal.deleteAdmin(adminId);

      const admin = await authLocal.getAdminByUsername(testAdmin.username);
      expect(admin).toBeUndefined();
    });
  });
});
