const massive = require("massive")
const marked = require("marked")
const lodash = require("lodash")
const { writeFileSync, appendFileSync } = require("fs")
const cheerio = require("cheerio")

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

const regs = [
  [/^\s*\n/g, ""], // remove empty lines
  [/^.*(├|└|─).*\n/g, ""], // remove dependency trees
  [
    /--- End of stack trace from previous location where exception was thrown ---/gi,
    "",
  ], //remove
  [/--- End of inner exception stack trace ---/gi, ""], //remove
  [/^\s*\n/g, ""], // remove empty lines again

  [
    // /(?:[\uD83C\uDF00-\uD83D\uDDFF]|[\uD83E\uDD00-\uD83E\uDDFF]|[\uD83D\uDE00-\uD83D\uDE4F]|[\uD83D\uDE80-\uD83D\uDEFF]|[\u2600-\u26FF]\uFE0F?|[\u2700-\u27BF]\uFE0F?|\u24C2\uFE0F?|[\uD83C\uDDE6-\uD83C\uDDFF]{1,2}|[\uD83C\uDD70\uD83C\uDD71\uD83C\uDD7E\uD83C\uDD7F\uD83C\uDD8E\uD83C\uDD91-\uD83C\uDD9A]\uFE0F?|[\u0023\u002A\u0030-\u0039]\uFE0F?\u20E3|[\u2194-\u2199\u21A9-\u21AA]\uFE0F?|[\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55]\uFE0F?|[\u2934\u2935]\uFE0F?|[\u3030\u303D]\uFE0F?|[\u3297\u3299]\uFE0F?|[\uD83C\uDE01\uD83C\uDE02\uD83C\uDE1A\uD83C\uDE2F\uD83C\uDE32-\uD83C\uDE3A\uD83C\uDE50\uD83C\uDE51]\uFE0F?|[\u203C\u2049]\uFE0F?|[\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE]\uFE0F?|[\u00A9\u00AE]\uFE0F?|[\u2122\u2139]\uFE0F?|\uD83C\uDC04\uFE0F?|\uD83C\uDCCF\uFE0F?|[\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA]\uFE0F?)/,
    /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu,
    " ",
  ], // emoji replace with space
  [/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/, " "], // replace with space
  [
    /([\b\s+]:\)+|[\b\s+]:\(+|[\b\s+]-_-|[\b\s+]=+\)+|[\b\s+]:D|[\b\s+]:'\(|[\b\s+];\)|[\b\s+]:P|[\b\s+]:(\|\\|\/)|[\b\s+]:[Oo])/g,
    "  ",
  ], // replace emoticons with double space

  // comments
  [/\/\* .+ \*\//g, " "], // remove
  [/\/\*.+\*\//g, " "], // remove
  [/^##+[^#]+##+/g, " "],
  [/^\*\*+[^\*]+\*\*+/g, " "],

  [/^\s*\n/g, ""], // remove empty lines

  // logs
  [/^.*Error:.+\n(npm ERR!.+\n){1,}/gm, ""], // remove, node js error log
  [/PHP Fatal error:.*\n/g, " "], // remove
  [/((npm|gyp|node-pre-gyp) ERR!.*\n){1,}/gm, ""], // remove, node js error log
  [
    /((npm|gyp|node-pre-gyp) (http|verb|info|INFO|Info|warn|WARN|Warn|uninstall|install|help).*\n){2,}/gim,
    "",
  ], // remove, node js log
  
  [/(^\[.+\].*\n){2,}/gm, ""], // remove
  [/(^(info|debug|warn|error|trace):.*\n){2,}/gim, ""], // remove
  [
    /(^(VERB|verb|Verbose|Verbose|VERBOSE|info|Info|INFO|debug|Debug|DEBUG|warn|Warn|WARN|error|ERROR|Error|trace|Trace|TRACE).*\n){3,}/gim,
    "",
  ], //replace with log line
  
  [
    /(^\[(VERB|verb|Verbose|Verbose|VERBOSE|info|Info|INFO|debug|Debug|DEBUG|warn|Warn|WARN|error|ERROR|Error|trace|Trace|TRACE|WArning|warning|WARNING|DBUG|EROR)\].*\n)/gim,
    "",
  ], // remove

  // cmd
  [/^root@.+\n/gi, ""], // remove
  [/^PS .+>.+\n/gi, ""], // remove
  [
    /^\$( )?(java|javac|npm|docker|curl|ls|cd|grep|mkdir|php|python|node|mysql|psql|cp|mv|hg|echo|dpkg|apt|sudo|ll|kubectl|touch|git|wget|uname|md5sum|apm|atom|less|head|tail|nvm|systemctl|journalctl|service|aws|terraform|vagrant|youtube|vi|nano|emacs|pwd|ping|trace|cat|make|whoami|lxc|diff|du|df|gunzip|tar|argo|rubocop|gulp|webpack|yarn|dotnet|pip|ruby|cmake|fleet|ssh|scp|bazel|helm|ps|eval|ipconfig|ifconfig|ufw|adb|source|gem|snap|bash|ant|composer|where|locate|date|locale|minikube|rvm|man|conda|brew|virtualenv|export|oc|tsuru|(~)?\.\/.+|(~)?\/.+|.:\\.+).+\n/gi,
    "",
  ], // remove popoular commands lines
  [/(mysql>.+;\n|mysql>.+\n(->.+\n){1,}.+;)/gim, ""], // remove
  [/postgres=#.+;\n/gi, ""], // remove
  [/^Query OK,.+\n/g, ""], // remove
  [/^INSERT \d+ \d+\n/g, ""], // remove
  [/^[\d]{1,} rows in set.+\n/g, ""], // remove
  [/\(\d+ rows\)/g, ""], // remove

  [/^\s*\n/g, ""], // remove empty lines

  // tables
  [/(\+|\|)---.+---(\+|\|)/g, ""], // remove
  [/(\+|\|)===.+===(\+|\|)/g, ""], // remove
  [/\|.*\|/g, ""], // remove
  [/---.+---/g, ""], // remove

  [/^\s*\n/g, ""], // remove empty lines
 

  // gibber
  [/```.*?```/g, " "], // remove ```
  [/^\s*\n/g, ""], // remove empty lines
  [/`.*?`/g, " "], // remove `...`
  [/^\s*\n/g, ""], // remove empty lines

  [/<(.+)( .+?)?>(.*\n){0,200}?.*<\/\1>/gm, ""], // remove proper html tags, test in code XXXXXXXX
  [/^\s*\n/g, ""], // remove empty lines
  
  [/^\s*\n/g, ""], // remove empty lines

  // exceptions
  [/Caused by:.+\n(^\s+at .*\n){0,}\s+\.\.\..+/gim, ""],
  [/Caused by:.+\n(^\s+at .*\n){1,}/gim, ""],
  [/^.+Exception:.+\n.+\n(^\s+at .*\n){0,}\s+\.\.\..+/gim, ""],
  [/^.+Exception:.+\n(^\s+at .*\n){1,}/gim, ""],
  [/^.+Exception:.*\n.+=.+\n(^\s+at .*\n){1,}\s+\.\.\..+/gim, ""],
  [/^.+Exception:.*\n.+=.+\n(^\s+at .*\n){1,}/gim, ""],
  [/^.*java\..+\..*Exception.*\n(^\s+at .*\n){1,}\s+\.\.\..+/gim, ""],
  [/^.*java\..+\..*Exception.*\n(^\s+at .*\n){1,}/gim, ""],
  [/^.*sun\.io\..*Exception.*\n(^\s+at .*\n){1,}\s+\.\.\..+/gim, ""],
  [/^.*sun\.io\..*Exception.*\n(^\s+at .*\n){1,}/gim, ""],
  [/^.*org\..+\..*Exception.*\n(^\s+at .*\n){1,}\s+\.\.\..+/gim, ""],
  [/^.*org\..+\..*Exception.*\n(^\s+at .*\n){1,}/gim, ""],
  [/^.*com\..+\..*Exception.*\n(^\s+at .*\n){1,}\s+\.\.\..+/gim, ""],
  [/^.*com\..+\..*Exception.*\n(^\s+at .*\n){1,}/gim, ""],
  [/java\.Lang\..*Error.*\n(^\s+at .*\n){1,}\s+\.\.\..+/gim, ""],
  [/java\.Lang\..*Error.*\n(^\s+at .*\n){1,}/gim, ""],
  [/^.+Error:.+\n(^\s+at .*\n){1,}/gim, ""],
  [/^(e|E)rror:.+\n(^\s+at .*\n){1,}/gim, ""],
  [/Sys.+Exception:.+\n.+name:.+\n(^\s+at .*\n){1,}/gim, ""],
  [/Exception of type:.+\n(^\s+at .*\n){1,}/gim, ""],
  [/Exception info:.+\n(^\s+at .*\n){1,}/gim, ""],
  [/^.+Exception:.+\n(^\s+in .*\n){1,}/gim, ""],
  [/(Stack trace|stacktrace|StackTrace|Stacktrace).+\n(^\s+at .*\n){1,}/gim, ""],
  [/(Stack trace|stacktrace|StackTrace|Stacktrace):\n(^#\d{1,}.+\n){1,}/gim, ""],
  [
    /(Stack trace|stacktrace|StackTrace|Stacktrace):\n(^\d{1,} .+\n){1,}  thrown in.+\n/gim,
    "",
  ],
  [/(Stack trace|stacktrace|StackTrace|Stacktrace):\n(^\d{1,} .+\n){1,}/gim, ""],
  [/^.*Warning:.+\n(^\s+in .*\n){2,}/gim, ""],
  [
    /(Stack trace|stacktrace|StackTrace|Stacktrace):.+\n(^\s+in .*\n){2,}/gim,
    "",
  ],
  [/(^#\d{1,} .+\n){4,}/gim, ""],
  [/(^\s+at .*\n){2,}/gim, ""],
  [/(^\s+in .*\n){4,}/gim, ""],

  [/^\s*\n/g, ""], // remove empty lines

  // uri
  [
    /(http|https|ftp):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/g,
    " ",
  ], //url
  [/^(http|https|ftp?):\/\/([a-zA-Z\.]*(:[0-9]*)?(?:\/[a-zA-Z0-9]*)*)?$/g, " "], // url
  [
    /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/g,
    " ",
  ], // url
  [/(\w+:\/\/)(.+@)*([\w\d\.]+)(:[\d]+){0,1}\/*(.*?)\s/gi, " "], // url put space end of replacement
  [
    /(ssh):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/gi,
    " ",
  ], //url

  [/file:\/\/(.*?)\s/, " "], // filepath, put space end of replacement
  [/git@.+\..+:.+\/.+\.git/, " "], // url

  // IPv4
  [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b(:\w{1,6})/, " ip "], // IP_TOKEN
  [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/gi, " "], // IP_TOKEN

  [/^\s*\n/g, ""], // remove empty lines

  // semver
  [
    /(\S+)@[vV]?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/g,
    " ",
  ], //package with semver ssh@1.2.5
  [
    /(\S+)@[vV]?(~|\^|=|>|<|>=|<=)(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/g,
    " ",
  ], //package with semver ssh@1.2.5
  [
    /(v|V){0,1}(~|\^|=|>|<|>=|<=)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/g,
    " ",
  ], //package with semver ~1.2.5
  [/((v|V)\d{1,10}(\.\d{1,10})?)/g, " "],

  [/^\s*\n/g, ""], // remove empty lines

  // email
  [
    /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gi,
    " email ",
  ], // email

  [/^\s*\n/g, ""], // remove empty lines

  // issue number
  [/#\d{2,10}/, " "], // replace with nothing

  [/^\s*\n/g, ""], // remove empty lines

  // date time
  [/\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}-[0-3]?\d-[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d-[0-3]?\d-\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\/[0-3]?\d\/[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\/[0-3]?\d\/\d{4}(T| |_)[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\.[0-3]?\d\.[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\.[0-3]?\d\.\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}_[0-3]?\d_[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d_[0-3]?\d_\d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4} [0-3]?\d [0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d [0-3]?\d \d{4}(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-]\d{1,7}|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d\.\d+/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}[0-3]?\d[0-3]?\d(T| |_|-)[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

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

  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d \d{4}/gi, " AIDIN_DATETIME_TOKEN "], // case insensitive, use i flag
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt|\S{1,5}) \d{4}/gi, " AIDIN_DATETIME_TOKEN "], // case insensitive, use i flag
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d\.\d{1,7} \d{4}/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d [ap][m]/gi, " AIDIN_DATETIME_TOKEN "], // case insensitive, use i flag
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} [0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "], // case insensitive, use i flag

  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(\S+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(.+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt) \d{1,7} \(\S+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt) \d{1,7} \(.+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d [ap][m]/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4} [0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(\S+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(.+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt) \d{1,7} \(\S+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt) \d{1,7} \(.+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d [ap][m]/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}(,)? [0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(\S+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(.+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt) \d{1,7} \(\S+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt) \d{1,7} \(.+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d [ap][m]/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}\s+\d{4} - [0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}:[0-2]\d:[0-5]\d:[0-5]\d [+-]\d{0,7}/gi, " AIDIN_DATETIME_TOKEN "],

  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d [+-]\d{1,7} \(\S+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d [+-]\d{1,7} \(.+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d [+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],

  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(\S+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7} \(.+\)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?,\s+\d{1,2}\s+(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?) \d{4} [0-2]\d:[0-5]\d:[0-5]\d [ap][m]/gi, " AIDIN_DATETIME_TOKEN "],

  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d [1-2]\d{3}( GMT)?/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d [1-2]\d{3}( UTC)?/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d\.\d{1,7} \d{4}/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d\.\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d \w{2,4} \d{4}/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d [ap][m]/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}(,)? [0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?, (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2},\s+\d{4},\s+[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?, (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2},\s+\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)?, (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2},\s+\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/(mon|tue(s)?|wed(nes)?|Thu(r)?(s)?|fri|sat(ur)?|sun)(day)? \d{1,2} (Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] \w{1,5}/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2}, \d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d( )?[ap][m]/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2},\s+\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{1,2}-(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)-\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d \w+\/\w+/gi, " AIDIN_DATETIME_TOKEN "],

  [/\d{1,2}-(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)-\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d\.\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{1,2}-(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)-\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{1,2}-(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)-\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d [+-]\d{0,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{1,2}-(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)-\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{1,2}-(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)-\d{4}::[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d\.\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d (utc|gmt)/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d [+-]\d{0,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}\s+[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}::[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/^\s*\n/g, ""], // remove empty lines

  // mentions
  [/\S+@\S+/gi, " "], // remove
  // [/@(param|line|\w+\.\w{2,7})/gi, " "], // first remove gibber
  [/@@\w*/gi, " "], // first remove gibber
  [/@[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}\/\S+/gi, " "], // user repos
  [/@[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}/gi, " "], // username mention from https://github.com/shinnn/github-username-regex

  // date
  [/\d{4}-[0-3]?\d-[0-3]?\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d-[0-3]?\d-\d{4}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\/[0-3]?\d\/[0-3]?\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\/[0-3]?\d\/\d{4}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}\.[0-3]?\d\.[0-3]?\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d\.[0-3]?\d\.\d{4}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}_[0-3]?\d_[0-3]?\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d_[0-3]?\d_\d{4}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4} [0-3]?\d [0-3]?\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-3]?\d [0-3]?\d \d{4}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{4}[0-3]?\d[0-3]?\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2} \d{4}/gi, " AIDIN_DATETIME_TOKEN "],
  [/\d{1,2}\/(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\/\d{4}/gi, " AIDIN_DATETIME_TOKEN "],

  // time
  [/[0-2]\d:[0-5]\d:[0-5]\d[+-]\d{1,7}/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-2]\d:[0-5]\d:[0-5]\d\.\d+( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-2]\d:[0-5]\d:[0-5]\d\.\d+ (gmt|utc)/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-2]\d:[0-5]\d:[0-5]\d\.\d+/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm] [+-][0-2]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-2]\d:[0-5]\d:[0-5]\d( )?[AaPp][Mm]/gi, " AIDIN_DATETIME_TOKEN "],
  [/[0-2]\d:[0-5]\d:[0-5]\d/gi, " AIDIN_DATETIME_TOKEN "],

  [/^\s*\n/g, ""], // remove empty lines
  
  [/(^.*AIDIN_DATETIME_TOKEN.*\n){3,}/gim, ""], // remove
  [/AIDIN_DATETIME_TOKEN/g, " "],
  
  [/^\s*\n/g, ""], // remove empty lines
  
  [/^`(.*\n){0,}?.*`/gim, ""], // remove ` ... `
  [/^Uncaught Error:.+/gi, " error message "], // node js error message
  
  // gibber
  [/<\?php(.*\n){0,200}?.*\?>/gim, ""], // remove multiline php tags
  [/<\?php.+\?>/gi, " "], // remove php tags
  [/<\?(.*\n){0,200}?.*\?>/gim, " "], // remove tags
  [/<\?.+\?>/gi, ""], // remove

  [/^.+\{(.*\n){0,200}?.*\}/gim, ""], // remove
  [/\[(.*\n){0,200}?.*\]/gim, " "], // remove

  [/^(.*\[.+\].*\n){3,}/gim, ""], // remove logs
  [/(^\d{1,} .+\n){10,}/gim, ""], // remove
  [/^\s*\n/g, ""], // remove empty lines

  [/^(.+=()?.+\n){3,}/gim, ""], // remove = pattern lines
  [/^(.{0,40}:()?.{0,50}\n){3,}/gim, ""], // remove env like configs (os: ubuntu)
  [/^\s*\n/g, ""], // remove empty lines
  
  [/^.+\{(.*\n){0,200}?.*\}/gim, ""], // remove
  [/\[(.*\n){0,200}?.*\]/gim, " "], // remove
  
  [/^\s*\n/g, ""], // remove empty lines

  // remaining stack traces
  [/^(.+.(java|php|go|js|vue|jsx|cpp|scala|py|groovy|css|asp|aspx|rb|cs|cc|clj|hs|es6|jsm|swift):.+\n){2,}/gim, ""], // stack trace

  [/^\s*\n/g, ""], // remove empty lines

  // path
  [/\w:(\\\S+){2,}/gi, " file path "], // windows style path
  [/~(\/\S+){1,}/gi, " file path "], // path
  [/(\.|\S+)?(\/\S+){2,}/gi, " file path "], //path
  [/(\.)?\.(\/\S+){1,}/gi, " file path "], // path
  
  [/^\s*\n/g, ""], // remove empty lines

  // config
  [/--\w+(-\w+)*(=[\S]+)?/gi, " "], // command flag config token
  [/\s-\w+(-\w+)+(=[\S]+)?/gi, " "], // command flag config token
  [/[\s\n]-\w[\s\n]/gi, " "], // remove command flags config token

  [/^\s*\n/g, ""], // remove empty lines

  // gibber
  [/(^.*0x.*\n){3,}/gim, ""], // removes 0x4845 lines

  [/^\s*\n/g, ""], // remove empty lines

  [/"\s*"/gi, " "],
  [/'\s*'/gi, " "],
  [/`\s*`/gi, " "],
  
  [/\bWIP\b/gi, "work in progress"],
  [/\bPR\b/gi, "development"],

  [/^\s*\n/g, ""], // remove empty lines
  
  [/([\S]+[!"#\$%&\\'\(\)\*\+,-\.\/:;<=>\?@\[\]\^_\{\|\}~`]+){2,}[^\s\.!?]+/gi, " "], // remove all gibber
  [/(\d+[!"#\$%&\\'\(\)\*\+,-\.\/:;<=>\?@\[\]\^_\{\|\}~`]+){1,}[\d]+/g, " "], // remove mix of digits and punctutaions
  [/([!"#\$%&\\'\(\)\*\+,-\.\/:;<=>\?@\[\]\^_\{\|\}~`]+){1,}[\d]+/g, " "], // remove mix of digits and punctutaions

  [/\d+/g, " "], // remove digits
  [/["#\$%&\\'\(\)\*\+\/<=>@\[\]\^_\{\|\}~`]+/gi, " "], // remove special characters except [!?.,:;-]

  [/^\s*\n/g, ""], // remove empty lines
  
]

async function cleanDataset(pg) {
  for (let i = 0; i < 1; i++) {
    const rows = await pg.issues.find(
      {
        // id: 331734424,
        not_question: true,
        "text_body is not": null,
        "cleaned_text_body is": null,
      },
      {
        limit: 500000,
        // offset: i * 1000,
        // offset: 50000,
      }
    )
    for (const row of rows) {
      try {
        console.log(row.id)

        let cleanedBody = row.text_body
        for(const contractionRegexpKey of Object.keys(contractions)){
          cleanedBody = cleanedBody.replace(contractionRegexpKey, contractions[contractionRegexpKey])
          // console.log(`replacing ${contractionRegexpKey} with ${contractions[contractionRegexpKey]}`)
        }
        console.log(`finished contractions`)
        
        for(const regexp of regs){
          cleanedBody = cleanedBody.replace(regexp[0], regexp[1])
          // console.log(`replacing ${regexp[0]} with ${regexp[1]}`)
        }
        console.log(`finished regexps`)

        await pg.issues.update(
          {
            id: row.id,
          },
          { cleaned_text_body: cleanedBody }
        )

//         appendFileSync(
//           `./dataset/cleaned.txt`,
//           `${row.id}
// ${row.text_body}
// YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
// ${cleanedBody}
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// `)
      } catch (err) {
        console.log(`failed at ${row.id}`)
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

  await cleanDataset(pg)

  console.log("finish")
}

main().catch(console.log)
