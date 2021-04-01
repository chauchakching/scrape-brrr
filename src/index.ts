import axios from "axios";
import { JSDOM } from "jsdom";
import R from "ramda";
import puppeteer from "puppeteer";

/**
 * Config of scraping instructions and result data structure
 */
type ScrapStruct = {
  name: string;

  /**
   * CSS selector
   */
  selector: string;

  /**
   * HTML element attribute to extract from
   */
  attr?: string;

  /**
   * If true, return a list of results
   */
  many?: boolean;

  /**
   * Create a nested data object.
   * Children selectors will be applied to parent dom but not the root dom.
   */
  nested?: ScrapStruct[];

  /**
   * Transform the extracted value
   */
  transform?: (x: any) => any;
};

type Options = {
  /**
   * Handle dynamic content by using puppeteer to load the page
   */
  dynamic?: boolean;
};

type Ele = Document | Element;

/**
 * The scraping function
 * @param url target url
 * @param outs scraping config, or a CSS selector string
 * @returns scraping result object
 */
export const scrape = async (
  url: string,
  outs: ScrapStruct[] | string,
  options?: Options
) => {
  const data = options?.dynamic
    ? await getResposneDataFromPuppeteer(url)
    : await getResponseDataFromAxios(url);

  const dom = new JSDOM(data);

  /**
   * handle dead simple usage
   */
  if (typeof outs === "string") {
    const selector = outs;
    return scrapDocument(dom.window.document, {
      name: "tmp",
      selector,
      many: true,
      // @ts-ignore
    }).tmp;
  }

  return R.mergeAll(outs.map((out) => scrapDocument(dom.window.document, out)));
};

const getResponseDataFromAxios = async (url: string) => {
  const { data } = await axios.get(url, {
    /**
     * Output binary to let jsdom do encoding sniffing
     * to handle non utf8 charset such as big5
     *
     * https://github.com/jsdom/jsdom#encoding-sniffing
     */
    responseType: "arraybuffer",
  });
  return data;
};

const getResposneDataFromPuppeteer = async (url: string) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  await browser.close();
  return html;
};

const scrapDocument = (dom: Ele, out: ScrapStruct): Object => {
  if (!out.many) {
    const selectedDom = dom.querySelector(out.selector);
    return { [out.name]: finalTransformations(selectedDom, out) };
  }
  const selectedDoms = Array.from(dom.querySelectorAll(out.selector));
  return {
    [out.name]: R.pipe<Element[], any, any>(
      R.map((dom: Element): any =>
        out.nested
          ? R.pipe(
              R.map((subOpt: ScrapStruct) => scrapDocument(dom, subOpt)),
              R.mergeAll
            )(out.nested)
          : getTextOrAttr(dom, out.attr)
      ),
      mayTransform(out.transform)
    )(selectedDoms),
  };
};

const finalTransformations = (dom: Element, out: ScrapStruct) =>
  mayTransform(out.transform)(getTextOrAttr(dom, out.attr));

const mayTransform = (f: Function): ((x: any) => any) =>
  // @ts-ignore
  R.defaultTo(R.identity, f);

const getTextOrAttr = (dom: Element, attr?: string) =>
  attr ? dom.getAttribute(attr) : dom.textContent;
