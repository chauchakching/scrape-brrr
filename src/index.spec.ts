import { startTestServer } from "./test/server";
import { scrape } from "./index";
import { promisify } from "util";
import { Server } from "http";
import R from "ramda";

const domain = "http://localhost";
const port = "8081";
const host = `${domain}:${port}`;
const indexUrl = `${host}/index.html`;

let server: Server;

beforeAll(async () => {
  server = await startTestServer();
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

afterAll(() => {
  server.close();
});

describe("scrape", () => {
  it("dead simple usage", async () => {
    await expect(scrape(indexUrl, "ol li")).resolves.toEqual([
      "item 1",
      "item 2",
      "item 3",
    ]);
  });

  it("handle some css selector", async () => {
    await expect(
      scrape(indexUrl, "ul li:not(:first-child) p")
    ).resolves.toEqual(["mary"]);
  });

  it("single item", async () => {
    await expect(
      scrape(indexUrl, [{ name: "title", selector: "h1" }])
    ).resolves.toEqual({ title: "header 1" });
  });

  it("many items", async () => {
    await expect(
      scrape(indexUrl, [
        {
          name: "items",
          selector: "ol li",
          many: true,
        },
      ])
    ).resolves.toEqual({ items: ["item 1", "item 2", "item 3"] });
  });

  it("many fields", async () => {
    await expect(
      scrape(indexUrl, [
        { name: "title", selector: "h1" },
        { name: "subtitle", selector: "h2" },
      ])
    ).resolves.toEqual({ title: "header 1", subtitle: "header 2" });
  });

  it("nested data in items", async () => {
    await expect(
      scrape(indexUrl, [
        {
          name: "winners",
          selector: "ul li",
          many: true,
          nested: [
            {
              name: "rank",
              selector: "span",
            },
            {
              name: "name",
              selector: "p",
            },
          ],
        },
      ])
    ).resolves.toEqual({
      winners: [
        { rank: "1", name: "john" },
        { rank: "2", name: "mary" },
      ],
    });
  });

  it("custom attribute", async () => {
    await expect(
      scrape(indexUrl, [
        {
          name: "profileUrls",
          selector: "ul li a",
          attr: "href",
          many: true,
        },
      ])
    ).resolves.toEqual({
      profileUrls: ["/john", "/mary"],
    });
  });

  describe("transform", () => {
    it("single data", async () => {
      await expect(
        scrape(indexUrl, [
          { name: "title", selector: "h1", transform: R.reverse },
        ])
      ).resolves.toEqual({ title: "1 redaeh" });
    });

    it("nested data", async () => {
      await expect(
        scrape(indexUrl, [
          {
            name: "ranks",
            selector: "ul li",
            many: true,
            nested: [
              {
                name: "rank",
                selector: "span",
              },
              {
                name: "name",
                selector: "p",
              },
            ],
            transform: R.pipe(
              R.groupBy<Object, string>(R.prop("rank")),
              // @ts-ignore
              R.map(R.map(R.prop("name")))
            ),
          },
        ])
      ).resolves.toEqual({
        ranks: {
          1: ["john"],
          2: ["mary"],
        },
      });
    });
  });

  it("handle chinese charset big5", async () => {
    await expect(
      scrape(`${domain}:${port}/big5`, [{ name: "word", selector: "#chinese" }])
    ).resolves.toEqual({ word: "中文字" });
  });

  it("handle dynamic website", async () => {
    await expect(
      scrape(`${host}/dynamic.html`, "h1", { dynamic: true })
    ).resolves.toEqual(["dynamic header"]);
  });
});
