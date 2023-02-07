"use strict";
const path = require("path");
const fs = require("fs");
const https = require("https");
const { executablePath } = require("puppeteer");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

console.log("Gathering parameters...");

// prepare id

const firstArg = (process.argv[2] || "").trim();
const galleryId = parseInt(firstArg, 10) ? firstArg : "";
if (!galleryId) {
  console.error(
    "First argument is missing. It must be a nhentai.net gallery identifier (they're a small numerical sequence)."
  );
  process.exit(1);
}

console.log("Gallery identifier:", galleryId);

// prepare urls

const galleryUrl = new URL(`g/${galleryId}/`, "https://nhentai.net/");

console.log("Gallery URL:", galleryUrl.toString());

// prepare storage

const secondArg = (process.argv[3] || "").trim();

const storageRootPath =
  !secondArg || secondArg.startsWith("/")
    ? secondArg
    : path.join("./", secondArg);

if (storageRootPath) {
  console.log("Downloads folder:", storageRootPath);
} else {
  console.log("Not storing images.");
}

// general config

const isHeadless =
  !!process.env.SCRAP_HEADLESS && process.env.SCRAP_HEADLESS !== "false";

console.log("Display browser:", isHeadless ? "no" : "yes");

// scrap!
console.log();

(async () => {
  console.log("Launching navigation...");

  const browser = await puppeteer.launch({
    headless: isHeadless,
    executablePath: executablePath(),
  });

  try {
    // init

    const page = await browser.newPage();

    await page.goto(galleryUrl.toString());

    console.log("Paused while anti-bot page is bypassed.");
    const secondsToWait = parseInt(process.env.SECONDS_TO_WAIT || 10, 10);
    console.log("Waiting", secondsToWait, "seconds.");
    await page.waitForTimeout(secondsToWait * 1000);
    console.log("Ok, unpaused and moving forward.");

    console.log();

    // title

    const title = await page.evaluate(
      () => document.querySelector("#info h1.title").textContent
    );

    console.log("Title:", title);

    // pages

    const pagesQttStr = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#info .tag-container.field-name"))
        .map((el) => el.textContent)
        .map(
          (textContent) =>
            textContent.match(/Pages:\s*\n?\s*(?<pagesQtt>\d+)/)?.groups
              .pagesQtt
        )
        .find((it) => it)
    );
    const pagesQtt = parseInt(pagesQttStr, 10);

    console.log("Pages", pagesQtt);

    // images

    const someImageSrc = await page.evaluate(
      () => document.querySelector("#thumbnail-container img").src
    );
    const someImageUrl = new URL(someImageSrc);

    const imagesRootPathname = someImageUrl.pathname.replace(/\d+t.jpg/, "");
    const imagesBase = `${galleryUrl.protocol}//i.${galleryUrl.hostname}/`;
    const imageRootUrl = new URL(imagesRootPathname, imagesBase);

    console.log("Images root URL:", imageRootUrl.toString());

    const imagesUrls = Array(pagesQtt)
      .fill("")
      .map((_, index) => new URL(`${index + 1}.jpg`, imageRootUrl));

    console.log("Printing images URLs...");
    console.log(imagesUrls.map((it) => it.toString()).join("\n"));

    // downloads
    if (!storageRootPath) {
      console.log("Bye!");
      return;
    }

    console.log();
    console.log("Preparing for download...");

    if (fs.existsSync(storageRootPath)) {
      console.log("Existing root folder found.");
    } else {
      console.log("Creating root folder...");
      fs.mkdirSync(storageRootPath);
      console.log("Done.");
    }

    const storageGaleryPath = path
      .join(storageRootPath, `${galleryId} - ${title}`)
      .replaceAll(" ", "_");
    console.log("Gallery folder:", storageGaleryPath);
    if (fs.existsSync(storageGaleryPath)) {
      console.log("Existing gallery folder found.");
    } else {
      console.log("Creating gallery folder...");
      fs.mkdirSync(storageGaleryPath);
      console.log("Done.");
    }

    console.log();
    console.log("Downloading now.");
    const downloadPromiseMakers = imagesUrls.map(
      (imageUrl, index) => () =>
        new Promise((resolve) => {
          process.stdout.write(imageUrl.toString() + " ... ");

          const filename = `${index + 1}.jpg`;
          const filePath = path.join(storageGaleryPath, filename);

          if (fs.existsSync(filePath)) {
            console.log("Already existed.");
            return resolve();
          }

          https.get(imageUrl, (response) => {
            const fileStream = fs.createWriteStream(filePath);
            response.pipe(fileStream);
            fileStream.on("finish", () => {
              fileStream.close();
              console.log("Created", filePath);
              return resolve();
            });
          });
        })
    );

    await downloadPromiseMakers.reduce(
      (acc, makeDownloadPromise) => acc.then(makeDownloadPromise),
      Promise.resolve()
    );

    console.log("Done.");
  } catch (error) {
    console.error("Error while scrapping:", error);
  } finally {
    await browser.close();
  }
})();
