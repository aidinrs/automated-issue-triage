const massive = require("massive")
const lodash = require("lodash")
const { writeFileSync, appendFileSync, createReadStream } = require("fs")
const stream = require("stream")
const readline = require("readline")
const byline = require("byline")

class DBWritable extends stream.Writable {
  constructor(db, options) {
    options = options || {}
    super(options)
    this.pg = db
    this.i = 0
  }
  async _write(line, encoding, callback) {
    const temp = line.split(" ")
    const vector = temp.splice(1).join(" ")
    if (this.i % 20000 === 0) {
      console.log(`inserting ${this.i}: ${temp[0]}`)
      console.log(`vector: ${vector}`)
      console.log("---------------------------------------")
    }
    this.i = this.i + 1
    // return new Promise((resolve, reject) => {
    // this.pg.words.insert({ word: temp[0], vector: vector }).then(resolve).catch(reject)
    // })

    await this.pg.words.insert({ word: temp[0], vector: vector })
    callback()
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

  const instream = createReadStream(
    "E:/uOttawa/CSI 5137B Applications of NLP and ML in Software Engineering/project/word-embeddings/enwiki_20180420_win10_100d.txt",
    { encoding: "utf8" }
  )

  const outstream = new DBWritable(pg, {
    highWaterMark: 64 * 1024 * 1024,
    encoding: "utf8",
    defaultEncoding: "utf8",
    decodeStrings: false,
  })
  const rl = byline(instream)
  rl.pipe(outstream)
}

main().catch(console.log)
