import { Router } from "express";
import puppeteer from "puppeteer-core";
import { saveCookies, sortLinkedInCookies } from "./helper";
const sleep = (ms: any) => new Promise((res) => setTimeout(res, ms));

const token = "2SrMqbZO9BcDnfX674a128642139c10f7ca72cd4200d63a93";
const timeout = 300000;

const hybrid = async (username: string, password: string) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://production-sfo.browserless.io?token=${token}`,
  });

  const context = await browser.createBrowserContext({});

  const page = await context.newPage();

  await page.goto("https://www.linkedin.com", { waitUntil: "networkidle2" });

  await sleep(3000);
  // const page = await browser.newPage();

  // 1) Go to LinkedIn login page
  await page.goto("https://www.linkedin.com/login", {
    waitUntil: "networkidle2",
  });

  // 2) Enter credentials
  await page.type("input#username", username);
  await page.type("input#password", password);

  // 3) Click login
  await page.click("button.btn__primary--large.from__button--floating");

  // 4) Create CDP session for live URL
  const cdp: any = await page.createCDPSession();
  const { liveURL } = await cdp.send("Browserless.liveURL", {
    resizable: true,
    interactable: true,
    quality: 50,
    timeout,
  });

  console.log("Live URL:", liveURL);

  const waitForLiAt = async () => {
    let liAtCookie;
    for (let i = 0; i < 20; i++) {
      await sleep(2000);
      const cookies = await page.cookies();

      const localStorageData = await page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) data[key] = localStorage.getItem(key) || "";
        }
        return data;
      });

      const sessionStorageData = await page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) data[key] = sessionStorage.getItem(key) || "";
        }
        return data;
      });

      liAtCookie = cookies.find((c) => c.name === "li_at");
      if (liAtCookie?.value) {
        const sortedCookies = sortLinkedInCookies(cookies);

        return { cookies: sortedCookies, liAtCookie, localStorageData, sessionStorageData };
      }
      await sleep(2000); // wait 2 sec then retry
    }
    return null;
  };

  const checklogin = async () => {
    await sleep(2000);
    if (page.url().includes("/feed")) {
      console.log("Login successful, waiting for li_at...");

      await sleep(5000);

      const result = await waitForLiAt();
      if (result) {
        const { cookies, localStorageData, sessionStorageData } = result;
        await sleep(5000);
        await saveCookies(cookies, localStorageData, sessionStorageData);
        console.log("Cookies saved successfully!");
        await browser.close();
      } else {
        console.log("li_at not found after waiting.");
        await browser.close();
      }
    } else {
      setTimeout(checklogin, 3000);
    }
  };

  setTimeout(checklogin, 10000);

  // Safety timeout: close browser if user forgets to close iframe
  setTimeout(async () => {
    console.log("Timeout reached. Closing browser...");
    await browser.close();
  }, timeout);

  // 6) Return live URL to frontend
  return liveURL;
};

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "Hello from Express API!" });
});

router.post("/echo", async (req, res) => {
  const username = "";
  const password = "";
  const liveURL = await hybrid(username, password);
  res.json({ received: req.body, liveURL });
});

router.post("terminate", async (req, res) => {});

export default router;
