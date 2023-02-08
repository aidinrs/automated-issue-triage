# automated-issue-triage
One of the issues faced by the maintainers of popular open source software is the triage of newly
reported issues. To address this problem, I implemented a tool using NLP techniques and compared
performance several Machine Learning alorgithms in this task.  

To implement this tool, data from thousands of public Github repositores were analyzed. 
I developed dozens of regular expressions to normalize the input from issues submitted to
these repostitoreis and calcualte BERT embeddings of them. Several classifiers using for
various Machine Learning algorthims  were trained by these embeddings.

Paper link: http://dx.doi.org/10.13140/RG.2.2.32323.48164
