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

async function selectAllByLabel(pg) {
  console.log(`selectAllByLabel`)
  const tags = [
    ...require("./labels/used_bug.json"),
    ...require("./labels/used_duplicate.json"),
    ...require("./labels/used_enhancement.json"),
    ...require("./labels/used_feature.json"),
    ...require("./labels/used_improvement.json"),
    ...require("./labels/used_wontfix.json"),
    ...require("./labels/used_question.json"),
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

  await writeRawDataset(pg)

  console.log("finish")
}

main().catch(console.log)
