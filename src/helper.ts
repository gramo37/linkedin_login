import axios from "axios";
import path from "path";
import fs from "fs";

interface Cookie {
  domain: string;
  expirationDate?: number;
  hostOnly: boolean;
  httpOnly: boolean;
  name: string;
  path: string;
  sameSite?: string | null;
  secure: boolean;
  session: boolean;
  storeId?: string | null;
  value: string;
}

interface CookiesRequest {
  cookies: Cookie[];
}

const LINKEDIN_COOKIES_URL = "https://api.wokflo.in/api/v1/linkedin/cookies";
const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImdyYW1vcGFkaHkzOEBnbWFpbC5jb20iLCJ1c2VyX2lkIjoiYTBjMDdhMzktYjYyZC00MWNlLThlNzMtMTIyMjMwYzVkN2M3In0.TuOjfpw4XZH3_BW718S6pV2HvxXLRGus4EnRteK4DgU";

export async function sendLinkedinCookies(cookiesData: any) {
  try {
    const response = await axios.post(
      LINKEDIN_COOKIES_URL,
      { cookies: JSON.stringify(cookiesData?.cookies, null, 2) },
      {
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
          Authorization: `Bearer ${BEARER_TOKEN}`,
        },
      }
    );

    console.log("Cookies saved successfully", response);

    return response.data;
  } catch (error: any) {
    console.error(
      "Error sending LinkedIn cookies:",
      error.response?.data || error.message
    );
    throw error;
  }
}

export async function saveCookies(cookies: any, localStorageData: any, sessionStorageData: any) {
  const formattedCookies = cookies.map((cookie: any) => ({
    domain: cookie.domain,
    expirationDate: cookie.expires,
    hostOnly: cookie.domain.startsWith(".") ? false : true,
    httpOnly: cookie.httpOnly,
    name: cookie.name,
    path: cookie.path,
    sameSite:
      !cookie.sameSite || cookie.sameSite?.toLowerCase() === "none"
        ? "no_restriction"
        : cookie.sameSite || "Lax",
    secure: cookie.secure,
    session: !cookie.expires,
    storeId: null,
    value: cookie.value,
  }));

  const hasVisit = cookies.some((c: any) => c.name === "visit");

  if (!hasVisit) {
    formattedCookies.push({
      domain: ".linkedin.com",
      expirationDate: Math.floor(Date.now() / 1000) + 31536000, // 1 year from now
      hostOnly: false,
      httpOnly: false,
      name: "visit",
      path: "/",
      sameSite: "no_restriction",
      secure: true,
      session: false,
      storeId: null,
      value: "v=1&M",
    });
  }

  const filePath = path.join(__dirname, "linkedin_cookies.json");
  const formattedFilePath = path.join(__dirname, "formatted_cookies.json");
  const localstorageFilePath = path.join(__dirname, "localstorage_cookies.json");

  fs.writeFileSync(filePath, JSON.stringify({ rawCookies: cookies }, null, 2));

  fs.writeFileSync(
    formattedFilePath,
    JSON.stringify({ cookies: formattedCookies }, null, 2)
  );

  fs.writeFileSync(
    localstorageFilePath,
    JSON.stringify({ localStorageData, sessionStorageData }, null, 2)
  )

  console.log(JSON.stringify(formattedCookies, null, 2));

  await sendLinkedinCookies({ cookies: cookies });
}

const TARGET_SEQUENCE: Array<{ name: string; domain: string }> = [
  { name: "lms_ads", domain: ".linkedin.com" },
  { name: "_guid", domain: ".linkedin.com" },
  { name: "bcookie", domain: ".linkedin.com" },
  { name: "lms_analytics", domain: ".linkedin.com" },
  { name: "fptctx2", domain: ".linkedin.com" },
  { name: "li_at", domain: ".www.linkedin.com" },
  { name: "lang", domain: ".linkedin.com" },
  { name: "lidc", domain: ".linkedin.com" },
  { name: "AnalyticsSyncHistory", domain: ".linkedin.com" },
  { name: "bscookie", domain: ".www.linkedin.com" },
  { name: "dfpfpt", domain: ".linkedin.com" },
  { name: "JSESSIONID", domain: ".www.linkedin.com" },
  { name: "li_rm", domain: ".www.linkedin.com" },
  { name: "li_sugr", domain: ".linkedin.com" },
  { name: "li_theme", domain: ".www.linkedin.com" },
  { name: "li_theme_set", domain: ".www.linkedin.com" },
  { name: "liap", domain: ".linkedin.com" },
  { name: "timezone", domain: ".www.linkedin.com" },
  { name: "UserMatchHistory", domain: ".linkedin.com" },
  { name: "visit", domain: ".linkedin.com" },
];

export function sortLinkedInCookies(cookies: any) {
  const remaining = [...cookies];
  const ordered: any[] = [];

  const pull = (name: string, domain: string) => {
    const idx = remaining.findIndex(
      (c) => c.name === name && c.domain === domain
    );
    if (idx !== -1) {
      const [found] = remaining.splice(idx, 1);
      return found;
    }
    return null;
  };

  for (const spec of TARGET_SEQUENCE) {
    const cookie = pull(spec.name, spec.domain);
    if (cookie) ordered.push(cookie);
  }

//   if (remaining.length) {
//     ordered.push(...remaining);
//   }

  return ordered;
}
