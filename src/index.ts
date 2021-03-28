import axios from "axios";
import { JSDOM } from "jsdom";
import R from "ramda";
import iconv from "iconv-lite";

type ScrapStruct = {
  name: string;
  selector: string;
  attr?: string;
  many?: boolean;
  nested?: ScrapStruct[];
  transform?: ((x: any) => any);
};

type Ele = Document | Element;

export const scrape = async (url: string, outs: ScrapStruct[]) => {
  const { data } = await axios.get(url, {
    /**
     * Output binary to let jsdom do encoding sniffing
     * to handle non utf8 charset such as big5
     *
     * https://github.com/jsdom/jsdom#encoding-sniffing
     */
    responseType: "arraybuffer",
  });
  const dom = new JSDOM(data);
  return R.mergeAll(outs.map((out) => scrapDocument(dom.window.document, out)));
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

// @ts-ignore
const mayTransform = (f: Function): ((x: any) => any) => R.defaultTo(R.identity, f);

const getTextOrAttr = (dom: Element, attr?: string) =>
  attr ? dom.getAttribute(attr) : dom.textContent;
