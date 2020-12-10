import psycopg2
import psycopg2.extras
import numpy
from sentence_transformers import SentenceTransformer
import winsound


connection = psycopg2.connect(user="postgres",
                              password="root",
                              host="127.0.0.1",
                              port="5432",
                              database="github")
cur = connection.cursor(cursor_factory=psycopg2.extras.DictCursor)

# model = SentenceTransformer('distilbert-base-nli-mean-tokens')
model = SentenceTransformer('roberta-large-nli-stsb-mean-tokens')




def write_sentence_embeddings(file, row):
  try:
    print(row['id'])
    doc = row['tokens'].lower().replace(',', ' ')
    # print(doc)
    sentence_embeddings = model.encode(doc)

    # file.write(f'{numpy.array2string(sentence_embeddings, separator= ",", prefix= "", suffix=""max_line_width=numpy.inf)},{1 if row["question"] else 0}\n')
    file.write(f'{",".join(map(str, sentence_embeddings))},{"question" if row["question"] else "not_question"}\n')
  except Exception as e:
    print(f'error for id: {row["id"]}')
    print(e)  


def main():
  file = open("./dataset/sbert/vectors_30k_roberta_large_nli_stsb_mean_tokens.csv", "a")

  # write csv header line
  for i in range(0,768):
    file.write(f'f{i},')
  file.write(f'label\n')

  cur.execute("SELECT * from issues where tokens is not null and question is true and tokens_count <= 100 and tokens_count >=5 and sentence_count <= 10 and text_lang='en'")
  rows = cur.fetchall()
  for row in rows:
    write_sentence_embeddings(file, row)  
  
  cur.execute("SELECT * from issues where tokens is not null and question is false and tokens_count <= 100 and tokens_count >=5 and sentence_count <= 10 and text_lang='en' ORDER BY random() limit 50000")
  rows = cur.fetchall()
  for row in rows:
    write_sentence_embeddings(file, row)  

  file.close()
  connection.close()

  # notify
  winsound.Beep(300, 200)


main()
