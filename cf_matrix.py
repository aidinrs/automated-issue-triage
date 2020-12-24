import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns


categories = ['Not question', 'Question']

all = [
  # USE
  {
    "data": np.array([[15444, 2565],[4064, 8586]]),
    "file": "./report/use-knn.png",
    "title": "k-NN - Universal Sentence Encoder"
  }, {
    "data": np.array([[13071, 4938],[4836, 7814]]),
    "file": "./report/use-j48.png",
    "title": "Decision Tree(C4.5) - Universal Sentence Encoder"
  }, {
    "data": np.array([[15586, 2423],[3192, 9458]]),
    "file": "./report/use-logistic.png",
    "title": "Logistic Regression - Universal Sentence Encoder"
  }, {
    "data": np.array([[16417, 1592],[4831, 7819]]),
    "file": "./report/use-rf.png",
    "title": "Random Forest - Universal Sentence Encoder"
  }, {
    "data": np.array([[16456, 1553],[5136, 7514]]),
    "file": "./report/use-svm.png",
    "title": "SVM - Universal Sentence Encoder"
  },
  #S-BERT
  {
    "data": np.array([[12372, 5746],[3487, 9054]]),
    "file": "./report/sbert-knn.png",
    "title": "k-NN - Sentence-BERT"
  }, {
    "data": np.array([[11964, 6154],[5985, 6556]]),
    "file": "./report/sbert-j48.png",
    "title": "Decision Tree(C4.5) - Sentence-BERT"
  }, {
    "data": np.array([[15287, 2831],[3786, 8755]]),
    "file": "./report/sbert-logistic.png",
    "title": "Logistic Regression - Sentence-BERT"
  }, {
    "data": np.array([[15746, 2372],[6412, 6129]]),
    "file": "./report/sbert-rf.png",
    "title": "Random Forest - Sentence-BERT"
  }, {
    "data": np.array([[15727, 2391],[3784, 8757]]),
    "file": "./report/sbert-svm.png",
    "title": "SVM - Sentence-BERT"
  }
] 

for cf_matrix in all:
  group_names = ["True Neg","False Pos", "False Neg","True Pos"]
  group_counts = ["{0:0.0f}".format(value) for value in cf_matrix["data"].flatten()]
  # group_percentages = ["{0:.2%}".format(value) for value in cf_matrix.flatten()/np.sum(cf_matrix)]
  # labels = [f"{v1}\n{v2}\n{v3}" for v1, v2, v3 in zip(group_names,group_counts,group_percentages)]
  labels = [f"{v1}\n{v2}" for v1, v2 in zip(group_names,group_counts)]
  labels = np.asarray(labels).reshape(2,2)
  sns.heatmap(cf_matrix["data"], annot=labels, fmt='', cmap='Blues', xticklabels=categories,yticklabels=categories)
  plt.ylabel('True label')
  plt.xlabel('Predicted label')
  plt.title(cf_matrix["title"])
  plt.savefig(cf_matrix["file"])
  plt.clf()

