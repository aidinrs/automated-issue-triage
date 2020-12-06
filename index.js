const massive = require("massive")
const marked = require("marked")
const lodash = require("lodash")
const { writeFileSync, appendFileSync } = require("fs")
const cheerio = require("cheerio")

marked.setOptions({
  renderer: new marked.Renderer(),
  // highlight: function(code, language) {
  //   const hljs = require('highlight.js');
  //   const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
  //   return hljs.highlight(validLanguage, code).value;
  // },
  pedantic: false,
  gfm: true,
  breaks: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  xhtml: false,
  mangle: false,
  headerIds: false,
})

async function selectAllByLebel(pg) {
  console.log(`selectAllByLabel`)
  const tags = [
    // ...require("./labels/bug.json"),
    // ...require("./labels/duplicate.json"),
    // ...require("./labels/enhancement.json"),
    // ...require("./labels/feature.json"),
    // ...require("./labels/improvement.json"),
    // ...require("./labels/wontfix.json"),
    ...require("./labels/question.json"),
  ]

  console.log(tags.length)
  await pg.issues.update(
    {
      "cleaned_labels in": tags,
      "closed_at is not": null,
    },
    { question: true }
  )
}

function getMarkdownText() {
  //   writeFileSync(
  //     `./test/test.html`,
  //     marked(`hi
  // *bold*
  // **bold**
  // ***bold***
  // ~~bold~~
  // >  said hee that
  // thoug sahll not
  // 1. asdna
  // 2. sdlks
  // 3. sdklcm asc
  // run:
  // \`npm install mocha\`
  // then do:
  // [link](http://google.com)
  // tasks:
  // - [x] Finish my changes
  // - [ ] Push my commits to GitHub
  // - [ ] Open a pull request
  //   `)
  //   )
  // writeFileSync(
  //   `./test/test2.html`,
  //   marked(
  //     `hi"What type of report is this:\n\n| Q  | A\n| ---| ---\n| Bug report? | \n| Feature request? |  Y\n| Enhancement? | \n\n## Description:\nAdd multiple email templates (e.g. a transactional template and a newsletter-style template)`
  //   )
  // )
}

async function writeRawDataset(pg) {
  for (let i = 0; i < 1; i++) {
    // console.log(`batch ${i}`)
    const rows = await pg.issues.find(
      {
        not_question: true,
        "text_body is": null,
      },
      {
        limit: 1000000,
        // offset: i * 1000,
      }
    )
    const data = []
    for (const row of rows) {
      console.log(row.id)
      if (row.body == null) {
        await pg.issues.update(
          {
            id: row.id,
          },
          { text_body: row.title }
        )
        continue
      }

      try {
        const body = marked(row.body)
        const html = cheerio.load(body)
        html(
          "img, table, ul, ol, pre, code, h1, h2, h3, h4, h5, h6, s, del"
        ).remove()
        const unescapedBody = lodash.unescape(html.text())

        await pg.issues.update(
          {
            id: row.id,
          },
          { text_body: `${row.title}. ${unescapedBody}` }
        )
      } catch (err) {
        console.log(err)
        continue
      }

      // writeFileSync(
      //   `./dataset/raw/${1}/${2}/${row.id}.txt`,
      //   `${row.id}\n1\n${row.title}\n${unescapedBody}`
      // )
    }
  }
}

async function main() {
  const pg = await massive({
    host: "127.0.0.1",
    port: 5432,
    database: "github",
    user: "postgres",
    password: "root",
  })

  // await selectAllByLebel(pg)
  // getMarkdownText()
  await writeRawDataset(pg)

  console.log("finish")
}

main().catch(console.log)
