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
          [/^\n/g, ""], // remove empty lines
          [/^.*(├|└|─).*\n/g, ""], // remove dependency trees
          [
            /--- End of stack trace from previous location where exception was thrown ---/gi,
            "",
          ], //remove
          [/--- End of inner exception stack trace ---/gi, ""], //remove
          [/^\n/g, ""], // remove empty lines again

          [
            /(?:[\uD83C\uDF00-\uD83D\uDDFF]|[\uD83E\uDD00-\uD83E\uDDFF]|[\uD83D\uDE00-\uD83D\uDE4F]|[\uD83D\uDE80-\uD83D\uDEFF]|[\u2600-\u26FF]\uFE0F?|[\u2700-\u27BF]\uFE0F?|\u24C2\uFE0F?|[\uD83C\uDDE6-\uD83C\uDDFF]{1,2}|[\uD83C\uDD70\uD83C\uDD71\uD83C\uDD7E\uD83C\uDD7F\uD83C\uDD8E\uD83C\uDD91-\uD83C\uDD9A]\uFE0F?|[\u0023\u002A\u0030-\u0039]\uFE0F?\u20E3|[\u2194-\u2199\u21A9-\u21AA]\uFE0F?|[\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55]\uFE0F?|[\u2934\u2935]\uFE0F?|[\u3030\u303D]\uFE0F?|[\u3297\u3299]\uFE0F?|[\uD83C\uDE01\uD83C\uDE02\uD83C\uDE1A\uD83C\uDE2F\uD83C\uDE32-\uD83C\uDE3A\uD83C\uDE50\uD83C\uDE51]\uFE0F?|[\u203C\u2049]\uFE0F?|[\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE]\uFE0F?|[\u00A9\u00AE]\uFE0F?|[\u2122\u2139]\uFE0F?|\uD83C\uDC04\uFE0F?|\uD83C\uDCCF\uFE0F?|[\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA]\uFE0F?)/,
            " ",
          ], // replace with space
          [
            /([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/,
            " ",
          ], // replace with space
          [
            /([\b\s+]:\)+|[\b\s+]:\(+|[\b\s+]-_-|[\b\s+]=+\)+|[\b\s+]:D|[\b\s+]:'\(|[\b\s+];\)|[\b\s+]:P|[\b\s+]:(\|\\|\/)|[\b\s+]:[Oo])/g,
            "  ",
          ], // replace emoticons with double space

          [/^\n/g, ""], // remove empty lines

          // logs
          [/^.*Error:.+\n(npm ERR!.+\n){1,}/g, ""], // remove, node js error log
          [/((npm|gyp|node-pre-gyp) ERR!.*\n){1,}/, ""], // remove, node js error log
          [
            /((npm|gyp|node-pre-gyp) (http|verb|info|INFO|Info|warn|WARN|Warn|uninstall|install|help).*\n){2,}/gi,
            "",
          ], // remove, node js log
          [/^(.*\[.+\].*\n){3,}/g, ""], // remove logs
          [/^Uncaught Error:.+/gi, " error message "], // node js error message

          [/(^\[.+\].*\n){2,}/g, ""], // remove
          [/(^(info|debug|warn|error|trace):.*\n){2,}/gi, ""], // remove
          [
            /(^(VERB|verb|Verbose|Verbose|VERBOSE|info|Info|INFO|debug|Debug|DEBUG|warn|Warn|WARN|error|ERROR|Error|trace|Trace|TRACE).*\n){3,}/gi,
            "",
          ], //replace with log line

          [/(^\d{1,} .+\n){10,}/g, ""], // remove
          [
            /(^\[(VERB|verb|Verbose|Verbose|VERBOSE|info|Info|INFO|debug|Debug|DEBUG|warn|Warn|WARN|error|ERROR|Error|trace|Trace|TRACE|WArning|warning|WARNING|DBUG|EROR)\].*\n)/gi,
            "",
          ], // remove

          // cmd
          [/^root@.+\n/gi, ""], // remove
          [/^PS .+>.+\n/gi, ""], // remove
          [
            /^\$( )?(java|javac|npm|docker|curl|ls|cd|grep|mkdir|php|python|node|mysql|psql|cp|mv|hg|echo|dpkg|apt|sudo|ll|kubectl|touch|git|wget|uname|md5sum|apm|atom|less|head|tail|nvm|systemctl|journalctl|service|aws|terraform|vagrant|youtube|vi|nano|emacs|pwd|ping|trace|cat|make|whoami|lxc|diff|du|df|gunzip|tar|argo|rubocop|gulp|webpack|yarn|dotnet|pip|ruby|cmake|fleet|ssh|scp|bazel|helm|ps|eval|ipconfig|ifconfig|ufw|adb|source|gem|snap|bash|ant|composer|where|locate|date|locale|minikube|rvm|man|conda|brew|virtualenv|export|oc|tsuru|(~)?\.\/.+|(~)?\/.+|.:\\.+).+\n/gi,
            "",
          ], // remove popoular commands lines
          [/(mysql>.+;\n|mysql>.+\n(->.+\n){1,}.+;)/gi, ""], // remove
          [/postgres=#.+;\n/gi, ""], // remove
          [/^Query OK,.+\n/g, ""], // remove
          [/^INSERT \d+ \d+\n/g, ""], // remove
          [/^[\d]{1,} rows in set.+\n/g, ""], // remove
          [/\(\d+ rows\)/g, ""], // remove

          [/^\n/g, ""], // remove empty lines

          // tables
          [/(\+|\|)---.+---(\+|\|)/g, ""], // remove
          [/(\+|\|)===.+===(\+|\|)/g, ""], // remove
          [/\|.*\|/g, ""], // remove
          [/---.+---/g, ""], // remove

          [/^\n/g, ""], // remove empty lines

          // comments
          // /\/\/ .*/, // remove, after file path
          [/\/\* .+ \*\//g, " "], // remove
          [/\/\*.+\*\//, " "], // remove
          /\/\*.+\//, // remove
          /^##.*/, // remove XXXXXXXX
          /\*\\.*\n/, // remove XXXXXXX
          /\/\*.*?\*\//, // remove check**
          /\/\*(.*\n){0,200}?.*\*\//, // remove XXXXXXXX

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
          /<.*?>/, //remove XXXXXXXXXXX is wrong
          /<.+>(.*\n){0,200}?.*<\/.+>/, // remove XXXXXXXXXXXXX

          // tags
          /<\?php.+\?>/, // remove XXXXXXXXXXXX
          /<\?.+\?>>/, // remove
          /<\?= .+ ?>/, // tags

          ///(^.+\.go.*\n){3,}/, //apply after uri reg exp
          /<\?php .+ ?>/, // XXXXXXXXXXXX

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

          // uri
          /(http|https|ftp):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/, //url
          /^(cc|https?):\/\/([a-zA-Z\.]*(:[0-9]*)?(?:\/[a-zA-Z0-9]*)*)?$/, // url
          /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/, // url
          /(\w+:\/\/)(.+@)*([\w\d\.]+)(:[\d]+){0,1}\/*(.*?)\s/, // url put space end of replacement
          /(ssh):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/, //url

          /file:\/\/(.*?)\s/, // filepath, put space end of replacement
          /git@.+\..+:.+\/.+\.git/, // url

          // IPv4
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

          // path
          /\w:(\\\S+){2,}/, // windows style path
          /~(\/\S+){1,}/, // path
          /(\.|\S+)?(\/\S+){2,}/, //path
          /\.(\/\S+){1,}/, // path

          // config
          /--\w+(-\w+)*(=[\S]+)?/, // command flag config token
          /\s-\w+(-\w+)+(=[\S]+)?/, // command flag config token
          /[\s\n]-\w[\s\n]/, // remove command flags config token

          // /([^\s\.]+\.){2,}([^\s\.]+)/, // remove - namespaces XXXXXXX

          // /\s[a-z]+([A-Z][a-z]+){2,}/, // camelcase XXXXXXXXXXXX

          // gibber
          /(^.*0x.*\n){2,}/, // removes 0x4845 lines
          /(^.*DATETIME_TOKEN.*\n){3,}/, // remove

          // /([^\s!"#\$%&\\'\(\)\*\+,-\.\/:;<=>\?@\[\]\^_\{\|\}~`]+[!"#\$%&\\'\(\)\*\+,-\.\/:;<=>\?@\[\]\^_\{\|\}~`]+){2,}[^\s\.!?]+/, // remove all gibber
          /([\S]+[!"#\$%&\\'\(\)\*\+,-\.\/:;<=>\?@\[\]\^_\{\|\}~`]+){2,}[^\s\.!?]+/, // remove all gibber
          // /[\S]+[!"#\$%&\\'\(\)\*\+,-\.\/:;<=>\?@\[\]\^_\{\|\}~`]{2,}[^\s\.!?]+/, //
        ]

        // let a = [
        // "org.opensolaris.opengrok.index.IndexDatabase.indexDown(IndexDatabase.java:561)",
        // 7- replace plugin/kubernetes like phrases with token -> NAME_SPACE
        // 9- replace nopods:true and "nopods: true" like phrases to token -> CONFIG
        // 12- replace sync_error_idc with token -> identifier
        // 14- should replace functoin calls ? build_connect_url() -> FUNCTION_CALL
        // 16- replace LoginByUsername or loginByUsernameunit (camel case) -> IDENTIFIER
        // COMMAND
        // duplicate words \b([A-Z]{3,})\s+\1\b
        // ]

        const contractions = {
          "ain't": "are not",
          "aren't": "are not",
          "can't": "can not",
          "can't've": "can not have",
          "'cause": "because",
          "could've": "could have",
          "couldn't": "could not",
          "couldn't've": "could not have",
          "didn't": "did not",
          "doesn't": "does not",
          "don't": "do not",
          "hadn't": "had not",
          "hadn't've": "had not have",
          "hasn't": "has not",
          "here's": "here is",
          "haven't": "have not",
          "he'd": "he would",
          "he'd've": "he would have",
          "he'll": "he will",
          "he'll've": "he will have",
          "he's": "he is",
          "how'd": "how did",
          "how're": "how are",
          "how'd'y": "how do you",
          "how'll": "how will",
          "how's": "how is",
          "I'd": "I would",
          "I'd've": "I would have",
          "I'll": "I will",
          "I'll've": "I will have",
          "I'm": "I am",
          "I've": "I have",
          "isn't": "is not",
          "it'd": "it would",
          "it'd've": "it would have",
          "it'll": "it will",
          "it'll've": "it will have",
          "it's": "it is",
          "let's": "let us",
          "ma'am": "madam",
          "mayn't": "may not",
          "might've": "might have",
          "mightn't": "might not",
          "mightn't've": "might not have",
          "must've": "must have",
          "mustn't": "must not",
          "mustn't've": "must not have",
          "needn't": "need not",
          "needn't've": "need not have",
          "o'clock": "of the clock",
          "oughtn't": "ought not",
          "shan't": "shall not",
          "sha'n't": "shall not",
          "she'd": "she would",
          "she'll": "she will",
          "she's": "she is",
          "should've": "should have",
          "shouldn't": "should not",
          "that'd": "that would",
          "that's": "that is",
          "there'd": "there would",
          "there's": "there is",
          "they'd": "they would",
          "they'll": "they will",
          "they're": "they are",
          "they've": "they have",
          "to've": "to have",
          "wasn't": "was not",
          "we'd": "we would",
          "we'll": "we will",
          "we're": "we are",
          "we've": "we have",
          "weren't": "were not",
          "what'll": "what will",
          "what're": "what are",
          "what's": "what is",
          "what've": "what have",
          "when's": "when is",
          "when've": "when have",
          "where'd": "where did",
          "where's": "where is",
          "where've": "where have",
          "who'll": "who will",
          "who's": "who is",
          "who've": "who have",
          "why's": "why is",
          "why've": "why have",
          "will've": "will have",
          "won't": "will not",
          "would've": "would have",
          "wouldn't": "would not",
          "wouldn't've": "would not have",
          "y'all": "you all",
          "you'd": "you would",
          "you'd've": "you would have",
          "you'll": "you will",
          "you're": "you are",
          "you've": "you have",
          "'em": " them",
          "doin'": "doing",
          "goin'": "going",
          "nothin'": "nothing",
          "somethin'": "something",
          "havin'": "having",
          "lovin'": "loving",
          "'coz": "because",
          thats: "that is",
          whats: "what is",
          ima: "I am going to",
          gonna: "going to",
          gotta: "got to",
          wanna: "want to",
          woulda: "would have",
          gimme: "give me",
          asap: "as soon as possible",
        }

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
