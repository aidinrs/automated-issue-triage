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
          /^\n/, // remove empty lines
          /--- End of stack trace from previous location where exception was thrown ---/, //remove
          /--- End of inner exception stack trace ---/, //remove

          /(?:[\uD83C\uDF00-\uD83D\uDDFF]|[\uD83E\uDD00-\uD83E\uDDFF]|[\uD83D\uDE00-\uD83D\uDE4F]|[\uD83D\uDE80-\uD83D\uDEFF]|[\u2600-\u26FF]\uFE0F?|[\u2700-\u27BF]\uFE0F?|\u24C2\uFE0F?|[\uD83C\uDDE6-\uD83C\uDDFF]{1,2}|[\uD83C\uDD70\uD83C\uDD71\uD83C\uDD7E\uD83C\uDD7F\uD83C\uDD8E\uD83C\uDD91-\uD83C\uDD9A]\uFE0F?|[\u0023\u002A\u0030-\u0039]\uFE0F?\u20E3|[\u2194-\u2199\u21A9-\u21AA]\uFE0F?|[\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55]\uFE0F?|[\u2934\u2935]\uFE0F?|[\u3030\u303D]\uFE0F?|[\u3297\u3299]\uFE0F?|[\uD83C\uDE01\uD83C\uDE02\uD83C\uDE1A\uD83C\uDE2F\uD83C\uDE32-\uD83C\uDE3A\uD83C\uDE50\uD83C\uDE51]\uFE0F?|[\u203C\u2049]\uFE0F?|[\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE]\uFE0F?|[\u00A9\u00AE]\uFE0F?|[\u2122\u2139]\uFE0F?|\uD83C\uDC04\uFE0F?|\uD83C\uDCCF\uFE0F?|[\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA]\uFE0F?)/, //remove emojis
          /([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/, // remove emojis
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
          /^(.*\[.+\].*\n){3,}/,
          /^Uncaught Error:.+/, // replace with nothing

          /(^.*[\d]{1,2}:[\d]{1,2}:[\d]{1,2}.*\n){3,}/, //replace with log line
          /(^\[.+\].*\n){2,}/, //replace with log line
          // /(\d{2,4}\/\d{2,4}\/\d{2,4}.+\n){3,}/, //replace with log line
          /(^(info|debug|warn|error|trace):.*\n){2,}/, //replace with log line
          /(^(VERB|verb|Verbose|Verbose|VERBOSE|info|Info|INFO|debug|Debug|DEBUG|warn|Warn|WARN|error|ERROR|Error|trace|Trace|TRACE).*\n){3,}/, //replace with log line

          /(^\d{1,} .+\n){10,}/, // remove
          /(\[(VERB|verb|Verbose|Verbose|VERBOSE|info|Info|INFO|debug|Debug|DEBUG|warn|Warn|WARN|error|ERROR|Error|trace|Trace|TRACE|WArning|warning|WARNING|DBUG|EROR)\].*\n)/, // remove

          // cmd
          /^root@.+\n/, // remove
          /^PS .+\n/, // remove
          /^\$.+\n/, // remove
          /(mysql>.+;\n|mysql>.+\n(->.+\n){1,}.+;)/, // sql
          /postgres=#.+;\n/, // sql
          /^Query OK,.+\n/, // sql
          /^[\d]{1,} rows in set.+\n/, // sql

          // tables
          /\+---.+---\+/, // remove
          /\|.*\|/, // remove
          /---.+---/, // remove

          // comments
          /\/\/ .*/, // remove, after file path
          /\/\* .+ \*\//, // remove
          /\/\*.+\*\//, // remove
          /\/\*.+\//, // remove
          /^##.*/, // remove
          /\*\\.*\n/, // remove
          /\/\*.*?\*\//, // remove check**
          /\/\*(.*\n){1,200}.*\*\//, // remove

          // gibber
          /^(.+=()?.+\n){3,}/, // remove
          /^(.{0,40}:()?.{0,50}\n){3,}/, // remove

          /```.*?```/, // remove
          /`.*?`/, // remove
          /```(.*\n){0,200}?.*```/, // remove
          /`(.*\n){0,200}?.*`/, // remove
          /\{.*?\}/, // remove
          /\{(.*\n){0,200}?.*\}/, // remove
          /\[.*?\]/, // remove
          /\[(.*\n){0,200}?.*\]/, // remove
          /".*?"/, //remove
          /"(.*\n){0,200}?.*"\]"/, // remove

          // tags
          /<\?php.+\?>/, // remove
          /<\?.+\?>>/, // remove
          /<\?= .+ ?>/, // tags

          ///(^.+\.go.*\n){3,}/, //apply after uri reg exp
          /<\?php .+ ?>/,

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
          /(\S+)@[vV]?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/, //package with semver ssh@1.2.5
          /(\S+)@[vV]?(~|\^|=|>|<|>=|<=)(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/, //package with semver ssh@1.2.5
          /(v|V){0,1}(~|\^|=|>|<|>=|<=)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/, //package with semver ~1.2.5
          /((v|V)\d{1,10}(\.\d{1,10})?)/,

          // email
          /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gi, // email

          // issue number
          /#\d{2,10}/, // replace with nothing

          // date time
          /\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/,
          /\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/,

          /[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/,
          /[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/,

          /\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/,
          /\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/,

          /[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/,
          /[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d/,

          /\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/,
          /\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/,

          /[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/,
          /[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/,

          /\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/,
          /\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/,

          /[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/,
          /[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/,

          /\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/,
          /\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/,

          /[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/,
          /[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/,

          /\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          /\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          /\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/,
          /\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/,

          // /[0-3]?\d[0-3]?\d\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
          // /[0-3]?\d[0-3]?\d\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/,
          // /[0-3]?\d[0-3]?\d\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          // /[0-3]?\d[0-3]?\d\d{4}(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/,
          // /[0-3]?\d[0-3]?\d\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          // /[0-3]?\d[0-3]?\d\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          // /[0-3]?\d[0-3]?\d\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/,
          // /[0-3]?\d[0-3]?\d\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          // /[0-3]?\d[0-3]?\d\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          // /[0-3]?\d[0-3]?\d\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          // /[0-3]?\d[0-3]?\d\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/,

          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d \d{4}/, // case insensitive, use i flag
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt|\S{1,5}) \d{4}/, // case insensitive, use i flag
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d\.\d{1,7} \d{4}/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d [ap][m]/, // case insensitive, use i flag
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d/, // case insensitive, use i flag

          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(\S+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(.+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7}/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt) \d{1,7} \(\S+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt) \d{1,7} \(.+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d [ap][m]/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d/,

          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(\S+\)/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(.+\)/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7}/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt) \d{1,7} \(\S+\)/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt) \d{1,7} \(.+\)/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d [ap][m]/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d/,

          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(\S+\)/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(.+\)/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7}/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt) \d{1,7} \(\S+\)/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt) \d{1,7} \(.+\)/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d [ap][m]/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d/,

          /\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}:[0-2]\d:[0-5]\d:[0-5]\d [+-]\d{0,7}/,

          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d [+-]\d{1,7} \(\S+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d [+-]\d{1,7} \(.+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d [+-]\d{1,7}/,

          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(\S+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(.+\)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7}/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d [ap][m]/,

          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d [1-2]\d{3}( GMT)?/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d [1-2]\d{3}( UTC)?/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d\.\d{1,7} \d{4}/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d\.\d{1,7}/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d \w{2,4} \d{4}/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d [ap][m]/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d/,

          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?, (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2},\s+\d{4},\s+[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?, (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2},\s+\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?, (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2},\s+\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d/,

          /(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? \d{1,2} (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] \w{1,5}/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}, \d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d( )?[ap][m]/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2},\s+\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d/,
          /\d{1,2}-(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)-\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d \w+\/\w+/,

          /\d{1,2}-(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)-\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d\.\d{1,7}/,
          /\d{1,2}-(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)-\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)/,
          /\d{1,2}-(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)-\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d [+-]\d{0,7}/,
          /\d{1,2}-(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)-\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d/,
          /\d{1,2}-(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)-\d{4}::[0-2]\d:[0-5]\d:[0-5]\d/,

          /\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d\.\d{1,7}/,
          /\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)/,
          /\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d [+-]\d{0,7}/,
          /\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d/,
          /\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}::[0-2]\d:[0-5]\d:[0-5]\d/,

          // mentions
          /\w+@\w+/, // first remove gibber
          /@(param|line|\w+\.\w{2,7})/, // first remove gibber
          /@@\w+/, // first remove gibber
          /@[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}/, // user mention from https://github.com/shinnn/github-username-regex

          //ipv6
          ///(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/,

          // date
          /\d{4}-[0-3]?\d-[0-3]?\d/,
          /[0-3]?\d-[0-3]?\d-\d{4}/,
          /\d{4}\/[0-3]?\d\/[0-3]?\d/,
          /[0-3]?\d\/[0-3]?\d\/\d{4}/,
          /\d{4}\.[0-3]?\d\.[0-3]?\d/,
          /[0-3]?\d\.[0-3]?\d\.\d{4}/,
          /\d{4}_[0-3]?\d_[0-3]?\d/,
          /[0-3]?\d_[0-3]?\d_\d{4}/,
          /\d{4} [0-3]?\d [0-3]?\d/,
          /[0-3]?\d [0-3]?\d \d{4}/,
          /\d{4}[0-3]?\d[0-3]?\d/,
          /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}/,
          /\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}/,

          // time
          /[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/,
          /[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/,
          /[0-2]\d:[0-5]\d:[0-5]\d\.\d+ (gmt|utc)/,
          /[0-2]\d:[0-5]\d:[0-5]\d\.\d+/,
          /[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/,
          /[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/,
          /[0-2]\d:[0-5]\d:[0-5]\d/,

          // remaining stack traces
          /^(.+.(java|php|go|js|vue|jsx|cpp|scala|py|groovy|css|asp|aspx|rb|cs|cc|clj|hs|es6|jsm|swift):.+\n){2,}/, // stack trace

          // gibber
          /([a-zA-Z0-9]+[!"#\$%&\\'\(\)\*\+,-\.\/:;<=>\?@\[\]\^_\{\|\}~`]+)+[a-zA-Z0-9]*/, // remove all gibber
        ]

        let a = [
          "org.opensolaris.opengrok.index.IndexDatabase.indexDown(IndexDatabase.java:561)",
          // language detection
          // @mentions
          // Removing Accented Characters (résumé)
          // Expanding Contractions
          // named entity recognition
          // check with or wihour hypehn from word embeddings database
          // 2- remove everythin in brackets [.+]
          // 3- replace --aaa-bbb with a special token -> COMMAND_FLAG, CONFIG
          // 4- replace file path with token /var/log/containers -> FILE_PATH
          // 6- replace org.jooq.exception.DataChangedException name spaces -> NAME_SPACE
          // 7- replace plugin/kubernetes like phrases with token -> NAME_SPACE
          // 8- replace nopods=true or --net=mynet like phrases with token -> CONFIG
          // 9- replace nopods:true and "nopods: true" like phrases to token -> CONFIG
          // 10- replace rancher-ha.sh or /etc/aa/rancher-ha.sh with -> FILE_NAME
          // 12- replace sync_error_idc with token -> identifier
          // 14- should replace functoin calls ? build_connect_url() -> FUNCTION_CALL
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
