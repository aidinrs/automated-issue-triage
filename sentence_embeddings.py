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

# modelBase = SentenceTransformer('distilbert-base-nli-mean-tokens')
modelLarge = SentenceTransformer('roberta-large-nli-stsb-mean-tokens')




def write_sentence_embeddings(file, row, model):
  try:
    print(row['id'])
    doc = row['tokens'].lower().replace(',', ' ')
    # print(doc)
    sentence_embeddings = model.encode(doc)

    file.write(f'{",".join(map(str, sentence_embeddings))},{"question" if row["question"] else "not_question"}\n')
  except Exception as e:
    print(f'error for id: {row["id"]}')
    print(e)  


def main():
  # fileBase = open("./dataset/sbert/vectors_distilbert-base-nli-mean-tokens_200t.csv", "a")
  fileLarge = open("./dataset/sbert/vectors_roberta-large-nli-stsb-mean-tokens_200t.csv", "a")

  # write csv header line
  # for i in range(0,768):
  #   fileBase.write(f'f{i},')
  # fileBase.write(f'label\n')
  for i in range(0,1024):
    fileLarge.write(f'f{i},')
  fileLarge.write(f'label\n')

  cur.execute("SELECT * from issues where question is true and eval_selected is true")
  rows = cur.fetchall()
  for row in rows:
    # write_sentence_embeddings(fileBase, row, modelBase)  
    write_sentence_embeddings(fileLarge, row, modelLarge)  
  
  cur.execute("SELECT * from issues where question is false and eval_selected is true")
  rows = cur.fetchall()
  for row in rows:
    # write_sentence_embeddings(fileBase, row, modelBase)  
    write_sentence_embeddings(fileLarge, row, modelLarge) 

  # fileBase.close()
  fileLarge.close()
  connection.close()

  # notify
  winsound.Beep(300, 200)


main()
