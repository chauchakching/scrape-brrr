# scrape-brrr

[![Build](https://github.com/chauchakching/scrape-brrr/actions/workflows/build.yml/badge.svg)](https://github.com/chauchakching/scrape-brrr/actions/workflows/build.yml) [![Version](https://img.shields.io/npm/v/scrape-brrr.svg)](https://www.npmjs.com/package/scrape-brrr) 


Simple web page scraping.

## Install

```bash
yarn add scrape-brrr
```

## Try it online

- [scrape motherfuckingwebsite.com](https://runkit.com/chauchakching/6061f6ca8d18a00019936c4c)
- [scrape first page of old.reddit.com](https://runkit.com/chauchakching/606478019d8de1001a80b81d)

## Examples

*The following examples use typescript style import. For plain nodejs, use

```js
const { scrape } = require('scrape-brrr')
```

### Dead-simple usage

```ts
/**
 *  <body>
 *    <div>
 *      <span>
 *        <p>sentence 1</p>
 *        <p>sentence 2</p>
 *        <p>sentence 3</p>
 *      </span>
 *    </div>
 *    <p>footer</p>
 *  </body> 
 */

import { scrape } from 'scrape-brrr'

const data = await scrape('http://website.com', 'div p:not(:first-child)')
// ["sentence 2", "sentence 3"]
```



### Scrape single item

```ts
/**
 *  <body>
 *    <div>Best wof</div>
 *    <span>Largest wof</span>
 *  </body> 
 */

import { scrape } from 'scrape-brrr'

const data = await scrape('http://website.com', [
  {
    name: 'stats',
    selector: 'div',
  },
  {
    name: 'another-stats',
    selector: 'span',
  },
])
// { 
//   stats: "Best wof"
//   "another-stats": "Largest wof"
// }
```

### Scrape multiple items

```ts
/**
 *  <body>
 *    <div>
 *      <span class="name">husky</span>
 *      <span class="name">golden</span>
 *    </div>
 *  </body> 
 */

import { scrape } from 'scrape-brrr'

const data = await scrape('http://website.com', [{
  name: 'bestWofs',
  selector: 'div .name',
  many: true
}])
// { bestWofs: ["husky", "golden"] }
```

### Nested fields

```ts
/**
 *  <body>
 *    <div>
 *      <span class="name">husky</span>
 *      <span class="name">golden</span>
 *    </div>
 *  </body> 
 */

import { scrape } from 'scrape-brrr'

const data = await scrape('http://website.com', [{
  name: 'bestWofs',
  selector: 'div',
  many: true,
  nested: [
    {
      name: 'name',
      selector: 'span',
    }
  ]
}])
// { 
//   bestWofs: [
//     { name: "husky" }, 
//     { name: "golden" },
//   ]
// }
```

### Extract link / HTML element attribute

```ts
/**
 *  <body>
 *    <span class="title" id="best">Best wof</div>
 *    <a href="/other-stats">other stats</a>
 *  </body> 
 */

import { scrape } from 'scrape-brrr'

const data = await scrape('http://website.com', [
  {
    name: 'key',
    selector: 'span',
    attr: 'id'
  },
  {
    name: 'otherLink',
    selector: 'a',
    attr: 'href'
  },
])
// { 
//   key: "best",
//   otherLink: "/other-stats"
// }
```

### Transform

```ts
/**
 *  <body>
 *    <div>
 *      <span class="rank">1</span>
 *      <span class="name">husky</span>
 *    </div>
 *    <div>
 *      <span class="rank">2</span>
 *      <span class="name">golden</span>
 *    </div>
 *  </body> 
 */

import { scrape } from 'scrape-brrr'

const data = await scrape('http://website.com', [{
  name: 'best',
  selector: 'div',
  many: true,
  nested: [
    {
      name: 'rank',
      selector: '.rank',
    },
    {
      name: 'name',
      selector: '.name',
    }
  ],
  transform: arr => arr[0]
}])
// { 
//   best: { name: "husky" },
// }
```

### Website with dynamic content by js

Use puppeteer to load page with javascript to scrape dynamic content.

```ts
/**
 *  <body>
 *    <h1>
 *      tick tok tick tok
 *    </h1>
 *    <script>
 *      document.querySelector('h1').textContent = 'boom!'
 *    </script>
 *  </body>
 */

import { scrape } from 'scrape-brrr'

const data = await scrape('http://website.com', 'h1', { dynamic: true })
// ["boom!"]
```

### Scrape new reddit website

Might not get the data correctly due to change of html structure.

```ts
const { scrape } = require("scrape-brrr");
const numeral = require('numeral')

async function scrapeNewReddit() {
  const url = "https://reddit.com/";
  const data = await scrape(url, [
    {
      name: "posts",
      selector: ".Post",
      many: true,
      nested: [
        {
          name: "title",
          selector: "h3",
        },
        {
          name: "votes",
          selector: "div:first-child div div div",
          transform: str => numeral(str).value(),
        },
        {
          name: "link",
          selector: "a[data-click-id=body]",
          attr: "href",
        },
      ],
    },
  ], { dynamic: true });
  console.log(data);
}

scrapeNewReddit();
// { 
//   posts: [
//     {
//       title: 'GME Megathread for April 01, 2021',
//       votes: 11800,
//       link: '/r/wallstreetbets/comments/mhu8tg/gme_megathread_for_april_01_2021/'
//     },
//     ...
//   ]
// }
```

## Other features

- Handle non-utf8 charset response from server (e.g. chinese encoding `big5`)

## Development

```bash
yarn install

yarn test
```