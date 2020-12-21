import psycopg2
import psycopg2.extras
import numpy
import tensorflow_hub as hub
import winsound
import tensorflow as tf


connection = psycopg2.connect(user="postgres",
                              password="root",
                              host="127.0.0.1",
                              port="5432",
                              database="github")
cur = connection.cursor(cursor_factory=psycopg2.extras.DictCursor)

# embed = hub.load("F:/use/")
embed = hub.load("F:/universal-sentence-encoder-large_5/")



def write_sentence_embeddings(file, row):
  try:
    print(row['id'])
    doc = row['tokens'].lower().replace(',', ' ')
    sentence_embeddings = embed([doc])
    file.write(f'{",".join(map(str, sentence_embeddings.numpy()[0]))},{"question" if row["question"] else "not_question"}\n')
  except Exception as e:
    print(f'error for id: {row["id"]}')
    print(e)  


def main():
  fileBase = open("./dataset/use/use_large_v5_200t.csv", "a")

  # write csv header line
  for i in range(0,512):
    fileBase.write(f'f{i},')
  fileBase.write(f'label\n')

  cur.execute("SELECT * from issues where eval_selected is true")
  rows = cur.fetchall()
  for row in rows:
    write_sentence_embeddings(fileBase, row)  
  

  fileBase.close()
  connection.close()

  # notify
  winsound.Beep(300, 200)


main()
