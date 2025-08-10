// Utility functions for MotmaenBash extension

/**
 * Calculate SHA-256 hash of a string
 * @param {string} str - The string to hash
 * @returns {Promise<string>} - The hex string of the hash
 */
export async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert buffer to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Get the type name from type code
 * @param {number} type - Type code (1-4)
 * @returns {string} - Type name
 */
export function getTypeName(type) {
  switch (type) {
    case 1:
      return "PHISHING";
    case 2:
      return "SCAM";
    case 3:
      return "PONZI";
    case 4:
      return "OTHER";
    default:
      return "UNKNOWN";
  }
}

/**
 * Get the level name from level code
 * @param {number} level - Level code (1-4)
 * @returns {string} - Level name
 */
export function getLevelName(level) {
  switch (level) {
    case 1:
      return "ALERT";
    case 2:
      return "WARNING";
    case 3:
      return "NEUTRAL";
    case 4:
      return "INFO";
    default:
      return "UNKNOWN";
  }
}

/**
 * Get message based on security check result
 * @param {Object} result - Security check result
 * @returns {Object} - Message object with title, text, and icon
 */
export function getSecurityMessage(result) {
  if (!result || typeof result !== "object") {
    return {
      title: "وضعیت نامشخص",
      text: "اطلاعات کافی برای بررسی امنیت در دسترس نیست",
      icon: "/assets/images/icon_neutral.png",
      className: "status_title_nok",
    };
  }

  if (result.secure === true) {
    return {
      title: "درگاه پرداخت امن، مطمئن باش",
      text: "این درگاه پرداخت معتبر و امن است",
      icon: "/assets/images/icon_ok.png",
      className: "status_title_ok",
    };
  } else if (result.secure === false) {
    const type = typeof result.type === "number" ? result.type : 0;
    const level = typeof result.level === "number" ? result.level : 0;

    const typeName = getTypeName(type);
    const levelName = getLevelName(level);

    let title, text;

    switch (type) {
      case 1: // PHISHING
        title = "هشدار: درگاه پرداخت جعلی";
        text = "این درگاه پرداخت جعلی است و قصد سرقت اطلاعات شما را دارد";
        break;
      case 2: // SCAM
        title = "هشدار: کلاهبرداری";
        text = "این سایت با هدف کلاهبرداری ایجاد شده است";
        break;
      case 3: // PONZI
        title = "هشدار: طرح پانزی";
        text = "این سایت مرتبط با طرح‌های پانزی و کلاهبرداری مالی است";
        break;
      default: // OTHER
        title = "هشدار: سایت مشکوک";
        text = "این سایت در لیست سایت‌های مشکوک قرار دارد";
    }

    return {
      title: title || "هشدار: سایت مشکوک",
      text: text || "این سایت در لیست سایت‌های مشکوک قرار دارد",
      icon: "/assets/images/icon_danger.png",
      className: "status_title_danger",
      type: typeName,
      level: levelName,
    };
  } else {
    return {
      title: "این صفحه یک درگاه پرداخت نیست",
      text: "تنها در صورت مشاهده تیک سبز رنگ، مطمئن باش که یک درگاه امن و معتبر است",
      icon: "/assets/images/icon_128.png",
      className: "status_title_nok",
    };
  }
}

/**
 * Phishing attempt detection
 * @param {string} url
 * @returns {boolean}
 */
export function isPhishingURL(url) {
  if (!url || typeof url !== "string") return false;
  const phishingPatterns = [/login/i, /secure/i, /verify/i, /bank/i];
  return phishingPatterns.some((pattern) => pattern.test(url));
}

/**
 * navigation event and warning if suspicious
 * @param {string} url
 * @param {function} sendWarning
 */
export function handleNavigation(url, sendWarning) {
  if (isPhishingURL(url)) {
    sendWarning(
      getSecurityMessage({
        secure: false,
        type: 1,
        level: 2,
      })
    );
  }
}

/**
 * Check URL: valid secure shaparak gateway
 * @param {string} url
 * @returns {boolean}
 */
export function isSecureGateway(url) {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.protocol === "https:" &&
      /\.shaparak\.ir$/i.test(parsedUrl.hostname)
    );
  } catch {
    return false;
  }
}
