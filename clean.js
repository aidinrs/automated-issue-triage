const massive = require("massive")
const marked = require("marked")
const lodash = require("lodash")
const { writeFileSync, appendFileSync } = require("fs")
const cheerio = require("cheerio")

async function concatRawDataset(pg) {
  for (let i = 0; i < 1; i++) {
    const rows = await pg.issues.find(
      {
        not_question: true,
        "text_body is not": null,
      },
      {
        limit: 500000,
        // offset: i * 1000,
        offset: 50000,
      }
    )
    for (const row of rows) {
      console.log(row.id)

      try {
        const regs = [
          /--- End of stack trace from previous location where exception was thrown ---/, //remove
          /--- End of inner exception stack trace ---/, //remove

          // exceptions
          /Caused by:.+\n(^\s+at .*\n){0,}\s+\.\.\..+/,
          /Caused by:.+\n(^\s+at .*\n){1,}/,
          /^.+Exception:.+\n.+\n(^\s+at .*\n){0,}\s+\.\.\..+/,
          /^.+Exception:.+\n(^\s+at .*\n){1,}/,
          /^.+Exception:.*\n.+=.+\n(^\s+at .*\n){1,}\s+\.\.\..+/,
          /^.+Exception:.*\n.+=.+\n(^\s+at .*\n){1,}/,
          /java\..+\..*Exception.*\n(^\s+at .*\n){1,}\s+\.\.\..+/,
          /java\..+\..*Exception.*\n(^\s+at .*\n){1,}/,
          /^sun\.io\..*Exception.*\n(^\s+at .*\n){1,}\s+\.\.\..+/,
          /^sun\.io\..*Exception.*\n(^\s+at .*\n){1,}/,
          /^org\..+\..*Exception.*\n(^\s+at .*\n){1,}\s+\.\.\..+/,
          /^org\..+\..*Exception.*\n(^\s+at .*\n){1,}/,
          /^com\..+\..*Exception.*\n(^\s+at .*\n){1,}\s+\.\.\..+/,
          /^com\..+\..*Exception.*\n(^\s+at .*\n){1,}/,
          /java\.Lang\..*Error.*\n(^\s+at .*\n){1,}\s+\.\.\..+/,
          /java\.Lang\..*Error.*\n(^\s+at .*\n){1,}/,

          /^.+Error:.+\n(^\s+at .*\n){1,}/,
          /^(e|E)rror:.+\n(^\s+at .*\n){1,}/,

          /Sys.+Exception:.+\n.+name:.+\n(^\s+at .*\n){1,}/,
          /Exception of type:.+\n(^\s+at .*\n){1,}/,
          /Exception info:.+\n(^\s+at .*\n){1,}/,
          /^.+Exception:.+\n(^\s+in .*\n){1,}/,

          /(Stack trace|stacktrace|StackTrace|Stacktrace).+\n(^\s+at .*\n){1,}/,

          /(Stack trace|stacktrace|StackTrace|Stacktrace):\n(^#\d{1,}.+\n){1,}  thrown in.+\n/,
          /(^#\d{1,}.+\n){1,}  thrown in.+\n/,
          /(Stack trace|stacktrace|StackTrace|Stacktrace):\n(^#\d{1,}.+\n){1,}/,
          /(^#\d{1,} .+\n){4,}/,

          /(Stack trace|stacktrace|StackTrace|Stacktrace):\n(^\d{1,} .+\n){1,}  thrown in.+\n/,
          /(Stack trace|stacktrace|StackTrace|Stacktrace):\n(^\d{1,} .+\n){1,}/,

          /Warning:.+\n(^\s+in .*\n){2,}/,
          /(Stack trace|stacktrace|StackTrace|Stacktrace):.+\n(^\s+in .*\n){2,}/,

          /(^\s+at .*\n){2,}/,
          /(^\s+in .*\n){4,}/,

          // logs
          /^.*Error:.+\n(npm ERR!.+\n){1,}/, // node js error log
          /(npm ERR!.*\n){1,}/, // node js error log
          /(gyp ERR!.*\n){1,}/, // node js error log
          /(npm (http|verb|info|INFO|Info|warn|WARN|Warn|uninstall|install|help).*\n){2,}/, // node js log

          /^Uncaught Error:.+/, // replace with nothing

          /(^.*[\d]{1,2}:[\d]{1,2}:[\d]{1,2}.*\n){3,}/, //replace with log line
          /(^\[.+\].*\n){2,}/, //replace with log line
          // /(\d{2,4}\/\d{2,4}\/\d{2,4}.+\n){3,}/, //replace with log line
          /(^(info|debug|warn|error|trace):.*\n){2,}/, //replace with log line
          /(^(VERB|verb|Verbose|Verbose|VERBOSE|info|Info|INFO|debug|Debug|DEBUG|warn|Warn|WARN|error|ERROR|Error|trace|Trace|TRACE).*\n){3,}/, //replace with log line
          /(^\d{1,} .+\n){10,}/, // remove
          /(\[(VERB|verb|Verbose|Verbose|VERBOSE|info|Info|INFO|debug|Debug|DEBUG|warn|Warn|WARN|error|ERROR|Error|trace|Trace|TRACE|WArning|warning|WARNING|DBUG|EROR)\].*\n)/, // remove

          /(mysql>.+;\n|mysql>.+\n(->.+\n){1,}.+;)/, // sql
          /postgres=#.+;\n/, // sql
          /^Query OK,.+\n/, // sql
          /^[\d]{1,} rows in set.+\n/, // sql

          // tables
          /\+---.+---\+/, // replace with nothing
          /\|.*\|/, // replace with nothing
          /---.+---/, // replace with nothing

          // comments
          /\/\/ .*/, // replace with nothing
          /\/\* .+ \*\//, // replace with nothing
          /\/\*.+\*\//, // replace with nothing
          /\/\*.+\//, // replace with nothing
          /^##.*/, // replace with nothing

          // uri
          /(http|https|ftp):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/, //url
          /^(cc|https?):\/\/([a-zA-Z\.]*(:[0-9]*)?(?:\/[a-zA-Z0-9]*)*)?$/, // url
          /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/, // url
          /(\w+:\/\/)(.+@)*([\w\d\.]+)(:[\d]+){0,1}\/*(.*?)\s/, // url put space end of replacement
          /(ssh):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/, //url

          /file:\/\/(.*?)\s/, // filepath, put space end of replacement
          /git@.+\..+:.+\/.+\.git/, // url

          // IP
          /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b(:\w{1,6})/, // IP_TOKEN
          /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IP_TOKEN

          // semver
          /(\S+)@(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/, //package with semver ssh@1.2.5
          /(\S+)@(~|\^|=|>|<|>=|<=)(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/, //package with semver ssh@1.2.5
          /(v|V){0,1}(~|\^|=|>|<|>=|<=)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/, //package with semver ~1.2.5
          /((v|V)\d{1,10}(\.\d{1,10})?)/,

          // email
          /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gi, // email

          // issue number
          /#\d{2,10}/, // replace with nothing

          // date time
          /\d{4}-[0-3]\d-[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/, // ISO
          /\d{4}-[0-3]\d-[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/, // ISO
          /\d{4}-[0-3]\d-[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}-[0-3]\d-[0-3]\d(T| )[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}-[0-3]\d-[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /\d{4}-[0-3]\d-[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /\d{4}-[0-3]\d-[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d/,

          /\d{4}\/[0-3]\d\/[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}\/[0-3]\d\/[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /\d{4}\/[0-3]\d\/[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}\/[0-3]\d\/[0-3]\d(T| )[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}\/[0-3]\d\/[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /\d{4}\/[0-3]\d\/[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /\d{4}\/[0-3]\d\/[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d/,

          /\d{4}\.[0-3]\d\.[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}\.[0-3]\d\.[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /\d{4}\.[0-3]\d\.[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}\.[0-3]\d\.[0-3]\d(T| )[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}\.[0-3]\d\.[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /\d{4}\.[0-3]\d\.[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /\d{4}\.[0-3]\d\.[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d/,

          /\d{4}_[0-3]\d_[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}_[0-3]\d_[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /\d{4}_[0-3]\d_[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}_[0-3]\d_[0-3]\d(T| )[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}_[0-3]\d_[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /\d{4}_[0-3]\d_[0-3]\d(T| )[0-2]\d:[0-5]\d:[0-5]\d/,

          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun) (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d \d{4}/, // case insensitive, use i flag
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun) (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt|\S{1,5}) \d{4}/, // case insensitive, use i flag
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun) (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d\.\d{1,7} \d{4}/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun) (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d/, // case insensitive, use i flag

          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun) (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT[+-]\d{1,7} \(\S+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun) (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT[+-]\d{1,7} \(.+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun) (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT[+-]\d{1,7}/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun) (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT \d{1,7} \(\S+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun) (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT \d{1,7} \(.+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun) (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d/,

          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT[+-]\d{1,7} \(\S+\)/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT[+-]\d{1,7} \(.+\)/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT[+-]\d{1,7}/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT \d{1,7} \(\S+\)/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT \d{1,7} \(.+\)/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d/,

          /\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}:[0-2]\d:[0-5]\d:[0-5]\d [+-]\d{0,7}/,

          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun),\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d [+-]\d{1,7} \(\S+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun),\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d [+-]\d{1,7} \(.+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun),\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d [+-]\d{1,7}/,

          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun),\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT[+-]\d{1,7} \(\S+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun),\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT[+-]\d{1,7} \(.+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun),\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT[+-]\d{1,7}/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun),\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d GMT/,

          /\d{1,2}\/\d{1,2}\/\d{1,2}(T| )[0-2]\d:[0-5]\d:[0-5]\d:\d{1,3} \w{1,5}/, //

          // tags
          /<\?php.+\?>/, // remove
          /<\?.+\?>>/, // remove
          /<\?= .+ ?>/, // tags

          /(^.+\.go.*\n){3,}/, //apply after uri reg exp
          /<\?php .+ ?>/,
        ]

        let a = [
          " @ shareChanges.js:30",
          "org.opensolaris.opengrok.index.IndexDatabase.indexDown(IndexDatabase.java:561)",
          "PS /home/chythu>",
          "$",
          "root@local:",
          // language detection
          // #tags
          // @mentions
          // remove emojis
          // Removing Accented Characters (résumé)
          // Expanding Contractions
          // named entity recognition
          // common time formats
          // check with or wihour hypehn from word embeddings database
          // 2- remove everythin in brackets [.+]
          // 3- replace --aaa-bbb with a special token -> COMMAND_FLAG, CONFIG
          // 4- replace file path with token /var/log/containers -> FILE_PATH
          // 6- replace org.jooq.exception.DataChangedException name spaces -> NAME_SPACE
          // 7- replace plugin/kubernetes like phrases with token -> NAME_SPACE
          // 8- replace nopods=true or --net=mynet like phrases with token -> CONFIG
          // 9- replace nopods:true and "nopods: true" like phrases to token -> CONFIG
          // 10- replace rancher-ha.sh or /etc/aa/rancher-ha.sh with -> FILE_NAME
          // 11- replace 1.1.0, v1.1.0, v1.1, V2 with token -> VERSION_IDENTIFIER
          // 12- replace sync_error_idc with token -> identifier
          // 13- replace #51234 with token -> ISSUE_LINK
          // 14- should replace functoin calls ? build_connect_url() -> FUNCTION_CALL
          // 15- replace URIs with token -> URI
          // 16- replace LoginByUsername or loginByUsernameunit (camel case) -> IDENTIFIER
          // PACKAGE
          // COMMAND
        ]

        appendFileSync(
          `./dataset/concat.txt`,
          `${row.text_body}
_____________________________________________________________________________________________________________________
`
        )
      } catch (err) {
        console.log(err)
        continue
      }
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

  await concatRawDataset(pg)

  console.log("finish")
}

main().catch(console.log)
