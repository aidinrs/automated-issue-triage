const sqlite3 = require("sqlite3")
const db = new sqlite3.Database(
  "../RapidRelease2019/database/sql/rapidrelease.db",
  "sqlite3.OPEN_READONLY"
)
const massive = require("massive")

async function main() {
  const pg = await massive({
    host: "127.0.0.1",
    port: 5432,
    database: "github",
    user: "postgres",
    password: "root",
  })

  db.serialize(function () {
    for (let i = 0; i < 2352; i++) {
      console.log(`batch ${i}`)

      db.each(
        `SELECT * FROM issues limit 1000 offset ${i * 1000}`,
        async function (err, row) {
          try {
            await pg.issues.insert({
              ...row,
              created_at: new Date(),
              closed_at: row.closed_at ? new Date() : null,
            })
          } catch (er) {
            console.log("eeeeeerrrrrrrrrroooooooorrr", er)
            console.log(row)
            process.exit(1)
          }
        }
      )
    }
  })

  db.close()
}

main().catch(console.log)
