/**
 * Simple admin authentication utility.
 * Stores password in localStorage - NOT secure, but simple for D&D campaign.
 */

const ADMIN_PASSWORD = "galacticstocks123"; // Must match backend

export const adminAuth = {
  /**
   * Login with admin password.
   * @param password - Password to verify
   * @returns true if authenticated
   */
  login: (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("adminPassword", password);
      return true;
    }
    return false;
  },

  /**
   * Check if user is currently authenticated.
   * @returns true if admin password is stored
   */
  isAuthenticated: (): boolean => {
    return localStorage.getItem("adminPassword") === ADMIN_PASSWORD;
  },

  /**
   * Get stored admin password.
   * @returns admin password or null
   */
  getPassword: (): string | null => {
    return localStorage.getItem("adminPassword");
  },

  /**
   * Logout and clear stored password.
   */
  logout: () => {
    localStorage.removeItem("adminPassword");
  }
};
