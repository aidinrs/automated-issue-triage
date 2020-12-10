import psycopg2
import psycopg2.extras
import functools
import re


connection = psycopg2.connect(user="postgres",
                              password="root",
                              host="127.0.0.1",
                              port="5432",
                              database="github")
cur = connection.cursor(cursor_factory=psycopg2.extras.DictCursor)


def get_word_vector(word):
  cur.execute(f'SELECT * from words where word=\'{word.lower()}\'') # check with hyphen
  wordVec = cur.fetchall()
  return wordVec


cur.execute(
    f'SELECT * from issues where tokens is not null and question is false ORDER BY random() limit 5000')
rows = cur.fetchall()
file = open("./dataset/all/nq_vectors.txt", "a")
missingsFile = open("./dataset/all/missing_words.txt", "a")
for row in rows:
  try:
    print(row['id'])
    tokens = row['tokens'].split(',')

    vectors = []
    for token in tokens:
      wordVec = get_word_vector(token)
      if(len(wordVec) > 0):
        # print(wordVec[0]['word'])
        # print(wordVec[0]['vector'])
        vectors.append(wordVec[0]['vector'])
      else:
        missingsFile.write(f'{row["id"]},{token}\n')
    
    file.write(f'{row["id"]},{row["sentence_count"]},{row["tokens_count"]},{",".join(vectors)},{1 if row["question"] else 0}\n')

  except Exception as e:
    print(f'error for id: {row["id"]}')
    print(e)

file.close()
connection.close()
