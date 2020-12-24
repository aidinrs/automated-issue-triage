import psycopg2
import psycopg2.extras
import functools
import nltk
import re

from nltk.tokenize import sent_tokenize, word_tokenize
from langdetect import detect


nltk.download('stopwords')
nltk.download('punkt')
# nltk.download('crubadan')

# cls = textcat.TextCat()
connection = psycopg2.connect(user="postgres",
                              password="root",
                              host="127.0.0.1",
                              port="5432",
                              database="github")
cur = connection.cursor(cursor_factory=psycopg2.extras.DictCursor)



def remove_words(tokens):
  filtered_tokens = [token for token in tokens if len(token) > 1] # remove one character words
  return filtered_tokens

def tokenize(sentences):
  tokens = []
  for s in sentences:
    temp = word_tokenize(s)
    tokens += [token.strip() for token in temp]
  return tokens

def remove_puncts(tokens):
  pattern = r'[!\?\.,:;\-\d]'
  newTokens = []
  for token in tokens: 
    temp = re.sub(pattern, '', token)
    if (len(temp) > 0):
      newTokens.append(temp)
  return newTokens

# for i in range(0, 10):
# print(
#     f'SELECT * from issues where labels like \'%question%\' limit 1000 offset {i}')
# print(f'batch {i}')
cur.execute(f'SELECT * from issues where cleaned_text_body is not null')
rows = cur.fetchall()
for row in rows:
  try:
    print(row['id'])
    
    sentences = sent_tokenize(row['cleaned_text_body'])
    if(len(sentences) == 0):
      continue
    
    tokens = remove_puncts(tokenize(sentences))
    tokens = remove_words(tokens)
    if(len(tokens) == 0):
      continue
    
    lang = detect(' '.join(tokens))
    # print(lang)

    cur.execute(f'UPDATE issues set sentence_count={len(sentences)}, tokens_count={len(tokens)}, tokens=\'{",".join(tokens)}\',text_lang=\'{lang}\' where ID = \'{row["id"]}\'')
    
    connection.commit()

  except Exception as e:
    print(f'error for id: {row["id"]}')
    print(e)

connection.close()
