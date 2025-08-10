import { jest } from "@jest/globals";

import {
  getTypeName,
  getLevelName,
  getSecurityMessage,
  isPhishingURL,
  handleNavigation,
  isSecureGateway,
} from "./utils.js";

describe("Utils Module", () => {
  test("getTypeName returns correct type", () => {
    expect(getTypeName(1)).toBe("PHISHING");
    expect(getTypeName(2)).toBe("SCAM");
    expect(getTypeName(3)).toBe("PONZI");
    expect(getTypeName(4)).toBe("OTHER");
    expect(getTypeName(99)).toBe("UNKNOWN");
  });

  test("getLevelName returns correct level", () => {
    expect(getLevelName(1)).toBe("ALERT");
    expect(getLevelName(2)).toBe("WARNING");
    expect(getLevelName(3)).toBe("NEUTRAL");
    expect(getLevelName(4)).toBe("INFO");
    expect(getLevelName(99)).toBe("UNKNOWN");
  });

  test("getSecurityMessage for secure site", () => {
    const msg = getSecurityMessage({ secure: true });
    expect(msg.title).toMatch(/امن/);
    expect(msg.icon).toContain("icon_ok.png");
  });

  test("getSecurityMessage for phishing", () => {
    const msg = getSecurityMessage({ secure: false, type: 1, level: 1 });
    expect(msg.title).toMatch(/جعلی/);
    expect(msg.level).toBe("ALERT");
    expect(msg.type).toBe("PHISHING");
  });

  test("getSecurityMessage for scam", () => {
    const msg = getSecurityMessage({ secure: false, type: 2, level: 2 });
    expect(msg.title).toMatch(/کلاهبرداری/);
    expect(msg.level).toBe("WARNING");
    expect(msg.type).toBe("SCAM");
  });

  test("getSecurityMessage for neutral", () => {
    const msg = getSecurityMessage({});
    expect(msg.title).toMatch(/این صفحه یک درگاه پرداخت نیست/);
    expect(msg.icon).toContain("icon_128.png");
  });

  test("isPhishingURL detects phishing keywords", () => {
    expect(isPhishingURL("https://secure-bank.com/login")).toBe(true);
    expect(isPhishingURL("https://example.com")).toBe(false);
  });

  test("handleNavigation triggers warning for phishing", () => {
    const mockWarning = jest.fn();
    handleNavigation("https://bank-login.com", mockWarning);
    expect(mockWarning).toHaveBeenCalled();
  });

  test("handleNavigation does not trigger warning for safe URL", () => {
    const mockWarning = jest.fn();
    handleNavigation("https://example.com", mockWarning);
    expect(mockWarning).not.toHaveBeenCalled();
  });

  test("isSecureGateway detects valid shaparak gateway", () => {
    expect(isSecureGateway("https://bank.shaparak.ir")).toBe(true);
    expect(isSecureGateway("http://bank.shaparak.ir")).toBe(false);
    expect(isSecureGateway("https://google.com")).toBe(false);
  });
});
